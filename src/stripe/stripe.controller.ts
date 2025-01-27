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
                        "card": attrs.card_last_4,
                        "total_payment": attrs.metadata.iterations,
                        "current_payment": 1
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
        this.utilsService.fetchStrapi('track-subscriptions',[`filters[subscription_id][$eq]=${invoice.subscription}`] ).pipe(
          mergeMap(tracksub => {
            // console.log('tracksub.data.data[0]: ', tracksub.data.data[0]);
            // const trackingObs = this.utilsService.postStrapi('track-subscriptions?populate=*', sub)
            const track = tracksub.data.data[0].attributes
            // console.log('track: ', track);
            
            return this.utilsService.postSelfWebhook('/email/send', {
                template_id: track.metadata.payment_reminder_template,
                params: {
                  "card": track.card_last_4,
                  "course": track.metadata?.name,
                  "first_name": JSON.parse(track.metadata?.extra_fields)?.name,
                  "payment_day": invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString() : '',
                  "payment_amount": invoice.amount_due / 100,
                },
                to: [track.email],
                from: "admisiones",
                scope: "payment",
              }).pipe(catchError((err, caught) => {
                console.log('err: ', err);
                return caught
              }))
          })
        ).subscribe(res => {
          // console.log(res);
          
        })


        // sub.subscribe(res => {

        // send reminder email
        // "payment_reminder_template": 25

          
        // })
        response.status(200).send('product managed by other pipeline')

        // Then define and call a function to handle the event subscription_schedule.updated
        break;
      case 'invoice.payment_succeeded':
        const p_succeeded = event.data.object;

        // console.log('p_succeeded: ', p_succeeded);
        if (p_succeeded.billing_reason === 'subscription_cycle') {
          const tracksub = this.utilsService.fetchStrapi('track-subscriptions', [`filters[subscription_id][$eq]=${p_succeeded.subscription}`, 'populate=*']).pipe(
            catchError((err, caught) => {
              console.log(err);
              
              return caught
            })
          )

          tracksub.pipe(
          mergeMap(tracksub => {
            // console.log('tracksub.data.data[0]: ', tracksub.data.data[0]);
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
            return this.utilsService.putStrapi(`track-subscriptions`, {...tracksub.data.data[0], phases, status: 'active'}, tracksub.data.data[0]?.id, ['populate=*'])
          }),
          mergeMap(tracksub => {

            // template: !!attrs.metadata.payment_template
            //       ? 
            // console.log('tracksub: ', tracksub);
            // console.log('tracksub.data: ', tracksub.data);
            const track = tracksub.data.data?.attributes
            // console.log('track: ', track);

            const current_payment = track.phases.filter((phase) => phase.phase_status === 'active')[0].phase_index

            return this.utilsService.postSelfWebhook('/email/send', {
                template_id: track.metadata.payment_template,
                params: {
                  "amount": p_succeeded.amount_paid / 100,
                  "course": track.metadata?.name,
                  "program": track.metadata?.name,
                  "first_name": p_succeeded.customer_name,
                  "file_number": p_succeeded.payment_intent,
                  "payment_date": new Date(p_succeeded.created * 1000).toLocaleDateString(),
                  "provider": p_succeeded.metadata?.provider,
                  "card": track.card_last_4,
                  "total_payment": track.metadata?.iterations,
                  "current_payment": current_payment
                },
                to: [track.email],
                from: "admisiones",
                scope: "payment",
              }).pipe(catchError((err, caught) => {
                console.log('err: ', err);
                return caught
              }))
          })
        ).subscribe(res => {
          // console.log(res);
          response.status(200).send()
          
        })
        } else {

          response.status(200).send('product managed by other pipeline')
          
        }
 
        break;

      case 'invoice.payment_failed':
        // hacer pruebas de correo de error
        const p_failed = event.data.object;
        // console.log('p_failed: ', p_failed);
        if (p_failed.billing_reason === 'subscription_cycle') {
          const tracksub = this.utilsService.fetchStrapi('track-subscriptions', [`filters[subscription_id][$eq]=${p_failed.subscription}`, 'populate=*']).pipe(
            catchError((err, caught) => {
              console.log(err);
              
              return caught
            })
          )

        tracksub.pipe(
          mergeMap(tracksub => {
            // console.log('tracksub.data.data[0]: ', tracksub.data.data[0]);
            const track = tracksub.data.data[0]?.attributes
            const phases = track?.phases.map(phase => {

              // console.log('is start same as period end');
              // console.log(new Date(phase.start_date).toDateString() === new Date(p_failed.period_end * 1000).toDateString());
              const phase_status = () => {
                if (new Date(phase.start_date).toDateString() === new Date(p_failed.period_end * 1000).toDateString()) {
                  return 'unpaid'
                } else if (new Date(phase.start_date).toDateString() < new Date(p_failed.period_end * 1000).toDateString()) {
                  return 'finished'
                } else if (new Date(phase.start_date).toDateString() > new Date(p_failed.period_end * 1000).toDateString()) {
                  return 'pending'
                }
              }
              const newPhase = {
                ...phase,
                phase_status: phase_status()
              }

              
              if (newPhase.phase_status === 'unpaid') {
                return {
                  ...newPhase,
                  charge_id: p_failed.charge,
                  invoice_id: p_failed.id,
                  invoice_status: p_failed.status,
                }
              } else {
                return newPhase
              }
            })
            return this.utilsService.putStrapi(`track-subscriptions`, {...tracksub.data.data[0], phases, status: 'unpaid'}, tracksub.data.data[0]?.id, ['populate=*'])
          }),
          mergeMap(tracksub => {
            // console.log('tracksub: ', tracksub);
            // console.log('tracksub.data: ', tracksub.data);
            const track = tracksub.data.data?.attributes
            // console.log('track: ', track);
            

            return this.utilsService.postSelfWebhook('/email/send', {
                template_id: track.metadata.payment_error_template,
                params: {
                  "first_name": JSON.parse(track.metadata?.extra_fields)?.name,
                  "course": track.metadata?.name,
                  "card": track.card_last_4,
                  "payment_day": p_failed.next_payment_attempt ? new Date(p_failed.next_payment_attempt * 1000).toLocaleDateString() : '',
                },
                to: [track.email],
                from: "admisiones",
                scope: "payment",
              }).pipe(catchError((err, caught) => {
                console.log('err: ', err);
                return caught
              }))
          })
        ).subscribe(res => {
          // console.log(res);
          response.status(200).send()
          
        })
        } else {

          response.status(200).send('product managed by other pipeline')
          
        }
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
        const sub_deleted = event.data.object;
        // console.log('subscriptionUpdated: ', subscriptionUpdated);
        // const rawSub =  await this.stripeService.getSubscription(subscriptionUpdated.id)
        // const sub = await rawSub
        console.log('sub_deleted: ', sub_deleted);
        const subs =  await this.stripeService.getSubscription(sub_deleted.id)

        this.utilsService.fetchStrapi('track-subscriptions',[`filters[subscription_id][$eq]=${sub_deleted.id}`] ).pipe(
          mergeMap(tracksub => {
            if (tracksub?.data?.data[0]) {
              const trackingObs = this.utilsService.postStrapi('track-subscriptions?populate=*', subs)
              const subPhases = tracksub?.data?.data[0]?.attributes?.phases
              const last_phase = subPhases && subPhases.length ? subPhases[subPhases?.length - 1] : null
              const phases = last_phase
                ? [
                    ...tracksub?.data?.data[0]?.attributes?.phases,
                    {
                      ...last_phase,
                      phase_status: last_phase.invoice_status === 'paid' ? 'finished' : last_phase.phase_status
                    }
                  ]
                : tracksub?.data?.data[0]?.attributes?.phases
              const trackingUpdateObs = tracksub.data.data[0]?.id 
                ? this.utilsService.putStrapi(`track-subscriptions`, {...subs, phases}, tracksub.data.data[0]?.id)
                : of(tracksub)
              return subs && !tracksub.data.data[0]
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
            } else {
              return of(tracksub)
            }
          })
        ).subscribe(res => {
          console.log(res);
          
        })
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