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
        const paymentObs = this.utilsService.postStrapi('track-payments', strapiReq)
        if (strapiReq) {
          // console.log('strapiReq: ', strapiReq);

          paymentObs.pipe(
            catchError((err) => {
              console.log('payment data error', err)
              console.log('payment data error', err.response.data)
              console.log('payment data error', err.response.data.error)
              return of({
                error: true,
                ...err.data.error
              })
            }),
            mergeMap(paymentRes => {
              console.log('paymentRes: ', paymentRes);

              if (paymentRes.error) return of(paymentRes)
              const payment = paymentRes.data.data
              const attrs = payment.attributes
              console.log('attrs.extra_fields: ', attrs.extra_fields);
              const name = this.stripeService.getField(attrs.extra_fields, 'nombredelalumno', 'name').value
              console.log('name: ', name);
              // return of(paymentRes)
              const year = new Date().getFullYear()
              const month = new Date().getMonth()
              const day = new Date().getDate()
              const hours = new Date().getHours()
              const minutes = new Date().getMinutes()
              const seconds = new Date().getSeconds()

              const date = env.NODE_ENV === 'production' ?
                new Date(year, month, day, hours + 24, minutes, seconds).toUTCString() :
                new Date(year, month, day, hours, minutes, seconds + 30).toUTCString()
              console.log('attrs: ', attrs);
              console.log('attrs.product_name: ', attrs.product_name);

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
                        "provider": attrs.metadata.provider
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
              console.log('name: ', name);

              const curp = this.stripeService.getField(res.payment.attributes?.extra_fields, 'curp').value
              console.log('curp: ', curp);

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
      case 'subscription_schedule.updated':
        const subscriptionScheduleUpdated = event.data.object;
        // console.log('subscriptionScheduleUpdated: ', subscriptionScheduleUpdated);

        // Then define and call a function to handle the event subscription_schedule.updated
        break;
        // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

}