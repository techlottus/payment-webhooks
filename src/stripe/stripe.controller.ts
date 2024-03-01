import { Controller, HttpException, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { env } from 'process';
import { catchError, mergeMap, of } from 'rxjs';
require('dotenv').config();

import { UtilsService } from 'src/utils/utils.service';
import { StripeService } from './stripe.service';
const stripe = require('stripe')(env.STRIPE_API_KEY);

@Controller('stripe')
export class StripeController {
  constructor(private utilsService: UtilsService, private stripeService: StripeService) {}

  @Post('/new')
  async webhook(@Req() request: RawBodyRequest<Request>, @Res() response: any ) {
    // console.log("request: ", request);
    try {
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
          try {
            const strapiReq = await this.stripeService.populateCS(event)
            const paymentObs = this.utilsService.postStrapi('track-payments', strapiReq)
            
            paymentObs.subscribe(paymentRes => {
              if (!!paymentRes.data.error) {
                throw new HttpException({
                  message: paymentRes.data.error.message
                }, paymentRes.data.error.status);
              } else {
                this.utilsService.postSelfWebhook('/email/compile', { template_id: 1, params: {
                  "first_name": "Diana Pelaez",
                  "campus": "prueba ula online",
                  "start_date": "17/2/24",
                  "email": "test@test.test",
                  "password": "password"
                } })
                  .pipe(
                    catchError((err) => {
                      console.log(err)
                      return of({ error: true, ...err})
                    }),
                    mergeMap(emailRes => {
                      if (emailRes.error) {
                        return of(emailRes)
                      }
                      console.log(emailRes);
                      
                      return of(emailRes.data)
                      // const { compiled, params, template: { subject, priority } } = emailRes.data
                      // return this.utilsService.postSelfWebhook('/email/salesforce/send', { template: JSON.parse(compiled), subject, toAddress: paymentRes.data.data.attributes.email, priority })

                    })
                  ).subscribe(data => console.log(data))
              }

            })
          } catch (error) {
            console.error(error.message);
            response.status(error.status).send(`Webhook Error: ${error.message}`)
          }
          // Then define and call a function to handle the event checkout.session.completed
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
      
      response.send();
    } catch (error) {
      console.error(error.message)
    }
    
  }


}
