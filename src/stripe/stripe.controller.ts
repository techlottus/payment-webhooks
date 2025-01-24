import { Controller, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { env } from 'process';
import { catchError, combineLatest, mergeMap, of } from 'rxjs';
require('dotenv').config();
import { UtilsService } from 'src/utils/utils.service';
import { StripeService } from './stripe.service';
import { ErrorManagerService } from 'src/utils/error-manager.service';
const stripe = require('stripe')(env.STRIPE_API_KEY);

@Controller('stripe')
export class StripeController {
  constructor(private utilsService: UtilsService, private stripeService: StripeService,public errorManager: ErrorManagerService) {}

  @Post('/new')
  async webhook(@Req() request: RawBodyRequest < Request > , @Res() response: any) {
    // console.log("request: ", request);

    const sig = request.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(request.rawBody, sig, env.WEBHOOK_SECRET);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':

        const strapiReq = await this.stripeService.populateCS(event)
        const paymentObs = this.utilsService.postStrapi('track-payments?populate=*', strapiReq) 
        if (strapiReq) {
          // console.log('strapiReq: ', strapiReq);

          paymentObs.pipe(
            catchError((err) => {
              console.log('payment data error', err.response.data.error.details.errors)
              return of({
                error: true,
                ...err.data.error
              })
            }),
            mergeMap( paymentRes => {
              // console.log('paymentRes: ', paymentRes);
              if (paymentRes.error) return of(paymentRes)
              const payment = paymentRes.data.data
              const attrs = payment.attributes
              const getsub = () => {
                return this.stripeService.generateSubscriptionSchedule(attrs.subscription_id, attrs.metadata.iterations, {...attrs.metadata, cs_id: attrs.cs_id})
              }
              return combineLatest({
                payment: of (paymentRes),
                subscription: !!attrs.metadata.iterations ?
                  of(getsub()) :
                  of (false)
              })

            }),
            mergeMap(subscriptionRes => { 

              const subscriptionSchedule = subscriptionRes.subscription

              // console.log('subscriptionSchedule: ', subscriptionSchedule);
              
              const payment = subscriptionRes.payment.data.data
              const attrs = payment.attributes
              // console.log('attrs.extra_fields: ', attrs.extra_fields);
              const name = this.stripeService.getField(attrs.extra_fields, 'nombredelalumno', 'name').value
              // console.log('name: ', name);
              // return of(subscriptionRes)
              const year = new Date().getFullYear()
              const month = new Date().getMonth()
              const day = new Date().getDate()
              const hours = new Date().getHours()
              const minutes = new Date().getMinutes()
              const seconds = new Date().getSeconds()

              const date = env.NODE_ENV === 'production' ?
                new Date(year, month, day, hours + 24, minutes, seconds).toUTCString() :
                new Date(year, month, day, hours, minutes, seconds + 30).toUTCString()
              // console.log('attrs: ', attrs);
              // console.log('attrs.product_name: ', attrs.product_name);

              return combineLatest({
                payment: of (payment),
                template: !!attrs.metadata.payment_template
                  ? this.utilsService.postSelfWebhook('/email/send', {
                      template_id: attrs.metadata.payment_template,
                      params: {
                        "amount": attrs.amount,
                        "course": attrs.product_name,
                        "program": attrs.product_name,
                        "first_name": name,
                        "file_number": attrs.payment_id,
                        "payment_date": attrs.date,
                        "provider": attrs.metadata.provider,
                      },
                      to: [attrs.email],
                      from: "admisiones",
	                    scope: "payment",
                    }).pipe(catchError((err, caught) => {
                      console.log('err: ', err);
                      return caught
                    }))
                  : of(false),
                template_invoice: !!attrs.metadata.invoice_template ?
                  this.utilsService.postSelfWebhook('/email/send', {
                    template_id: attrs.metadata.invoice_template,
                    params: {
                      "first_name": name
                    },
                    to: [attrs.email],
                    from: "admisiones",
                    scope: "invoice",
                  }).pipe(catchError((err, caught) => {
                    console.log('err: ', err);
                    return caught
                  })) : of (false),
                follow_up_template: attrs.metadata.flow === "EUPROVIDER" ?
                  this.utilsService.postSelfWebhook('/email/send', {
                    template_id: attrs.metadata.follow_up_template,
                    params: {
                      "provider": attrs.metadata.provider,
                      "first_name": name,
                      "program_name": attrs.product_name
                    },
                    to: [attrs.email],
                    from: "admisiones",
                    scope: "invoice",
                    "o:deliverytime": date
                  }).pipe(catchError((err, caught) => {
                    console.log('err: ', err);
                    return caught
                  })) : of (false)
              
              })
            }),
            catchError((err) => {
              console.log('compile error', err)
              console.log('compile error', err?.data)
              return of({
                error: true,
                ...err?.data?.error
              })
            }),
            mergeMap(res => {
              if (res.error) {
                return of(res)
              }
              const name = this.stripeService.getField(res.payment.attributes?.extra_fields, 'nombredelalumno', 'name').value
              // console.log('name: ', name);

              const curp = this.stripeService.getField(res.payment.attributes?.extra_fields, 'curp').value
              // console.log('curp: ', curp);

              const data = {
                payment: {
                  ...res.payment.attributes,
                  id: res.payment.id,
                  name,
                  curp
                },
                send: {},

              }
              if (data.payment.metadata.flow === 'EUONLINE') {
                return this.utilsService.postSelfWebhook('/inscriptions/new', {
                  cs_id: res.payment.attributes.cs_id
                })
              } else {
                return of(res)
              }
            })
          ).subscribe(res => {
            response.send();
          })
        } else {
          response.status(200).send('product managed by other pipeline')
        }
        break;
      case 'checkout.session.expired':
        const checkoutSessionExpired = event.data.object;
        // console.log('checkoutSessionExpired: ', checkoutSessionExpired);
        // Then define and call a function to handle the event checkout.session.expired
        break;
      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;
        // console.log('subscriptionUpdated: ', subscriptionUpdated);
        // console.log('sub: ', sub);
        const sub =  await this.stripeService.getSubscription(subscriptionUpdated.id)

        this.utilsService.fetchStrapi('track-subscriptions',[`filters[subscription_id][$eq]=${subscriptionUpdated.id}`] ).pipe(
          mergeMap(tracksub => {
            // console.log('tracksub.data.data[0]: ', tracksub.data.data[0]);
            const trackingObs = this.utilsService.postStrapi('track-subscriptions?populate=*', sub)
            const trackingUpdateObs = tracksub.data.data[0]?.id 
              ? this.utilsService.putStrapi(`track-subscriptions`, {...sub, phases: tracksub?.data?.data[0]?.attributes?.phases}, tracksub.data.data[0]?.id)
              : of(tracksub)
            return sub && !tracksub.data.data[0]
              ? combineLatest({
                  tracking: trackingObs.pipe(
                    catchError((err) => {
                      console.log('subscription data error', err)
                      return of({
                        error: true,
                        ...err
                      })
                    }),
                  ),
                  tracksub: of(tracksub)
                })
              : combineLatest({
                  tracking: trackingUpdateObs.pipe(
                    catchError((err) => {
                      console.log('subscription data error', err)
                      return of({
                        error: true,
                        ...err
                      })
                    }),
                  ),
                  tracksub: of(tracksub)
                })
          })
        ).subscribe(res => {
          // console.log(res);
          
        })
        response.status(200).send('product managed by other pipeline')

        // Then define and call a function to handle the event subscription_schedule.updated
        break;
      case 'invoice.upcoming':
        const invoice = event.data.object;
        // console.log('subscriptionUpdated: ', subscriptionUpdated);
        // const rawSub =  await this.stripeService.getSubscription(subscriptionUpdated.id)
        // const sub = await rawSub
        // console.log('invoice: ', invoice);
        // console.log('sub.default_payment_method: ', sub.default_payment_method);

        // sub.subscribe(res => {
          
        // })
        response.status(200).send('product managed by other pipeline')

        // Then define and call a function to handle the event subscription_schedule.updated
        break;
      case 'invoice.payment_succeeded':
        const p_succeeded = event.data.object;

        console.log('p_succeeded: ', p_succeeded);
        if (p_succeeded.billing_reason === 'subscription_cycle') {
          const tracksub = this.utilsService.fetchStrapi('track-subscriptions', [`filters[subscription_id][$eq]=${p_succeeded.subscription}`, 'populate=*']).pipe(
            catchError((err, caught) => {
              console.log(err);
              
              return caught
            })
          )

          tracksub.pipe(
          mergeMap(tracksub => {
            console.log('tracksub.data.data[0]: ', tracksub.data.data[0]);
            const track = tracksub.data.data[0]?.attributes
            const phases = track?.phases.map(phase => {

              // console.log('is start same as period end');
              // console.log(new Date(phase.start_date).toDateString() === new Date(p_succeeded.period_end * 1000).toDateString());
              const phase_status = () => {
                if (new Date(phase.start_date).toDateString() === new Date(p_succeeded.period_end * 1000).toDateString()) {
                  return 'active'
                } else if (new Date(phase.start_date).toDateString() < new Date(p_succeeded.period_end * 1000).toDateString()) {
                  return 'finished'
                } else if (new Date(phase.start_date).toDateString() > new Date(p_succeeded.period_end * 1000).toDateString()) {
                  return 'pending'
                }
              }
              const newPhase = {
                ...phase,
                phase_status: phase_status()
              }

              
              if (newPhase.phase_status === 'active') {
                return {
                  ...newPhase,
                  charge_id: p_succeeded.charge,
                  invoice_id: p_succeeded.id,
                  invoice_status: p_succeeded.status,
                }
              } else {
                return newPhase
              }
            })
            return this.utilsService.putStrapi(`track-subscriptions`, {...tracksub.data.data[0], phases}, tracksub.data.data[0]?.id)
          }),
          mergeMap(tracksub => {
            return of(tracksub)
          })
        ).subscribe(res => {
          // console.log(res);
          response.status(200).send()
          
        })
        } else {


          

          // console.log('payment: ', payment);

          response.status(200).send('product managed by other pipeline')
          
        }
          // p_succeeded.subscription
          // p_succeeded.id
          // p_succeeded.charge
          // p_succeeded.status

          // p_succeeded.period_start
          // p_succeeded.period_end
          // p_succeeded.billing_reason: 'subscription_create',


        // Then define and call a function to handle the event subscription_schedule.updated
        break;

      case 'invoice.payment_failed':
        const p_failed = event.data.object;
        // console.log('subscriptionUpdated: ', subscriptionUpdated);
        // const rawSub =  await this.stripeService.getSubscription(subscriptionUpdated.id)
        // const sub = await rawSub
        // console.log('p_failed: ', p_failed);
        // console.log('sub.default_payment_method: ', sub.default_payment_method);

        // sub.subscribe(res => {
          
        // })
        response.status(200).send('product managed by other pipeline')

        // Then define and call a function to handle the event subscription_schedule.updated
        break;
      case 'customer.subscription.deleted':
      // runs when subscriptions ends
        const sub_deleted = event.data.object;
        // console.log('subscriptionUpdated: ', subscriptionUpdated);
        // const rawSub =  await this.stripeService.getSubscription(subscriptionUpdated.id)
        // const sub = await rawSub
        console.log('sub_deleted: ', sub_deleted);
        // console.log('sub.default_payment_method: ', sub.default_payment_method);

        // sub.subscribe(res => {
          
        // })
        response.status(200).send('product managed by other pipeline')

        // Then define and call a function to handle the event subscription_schedule.updated
        break;
        // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

}