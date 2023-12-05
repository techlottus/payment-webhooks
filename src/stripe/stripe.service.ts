import { Injectable, RawBodyRequest } from '@nestjs/common';
require('dotenv').config();
import { env } from 'process';
import { catchError } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';
const stripe = require('stripe')(env.STRIPE_API_KEY);
@Injectable()
export class StripeService {
  constructor(private utilsService: UtilsService) {}

  async populateStrapi(request: RawBodyRequest<Request>, response: any) {
    const sig = request.headers['stripe-signature'];
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(request.rawBody, sig, env.WEBHOOK_SECRET);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    // console.log('event: ', event);
    // console.log('event.data.object: ', event.data.object);
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        // stripe.  
        try {
          const strapiReq = await this.checkoutSessionCompleted(event)
          
          this.utilsService.postStrapi('track-payments', strapiReq).subscribe(res => {
            console.log('res: ', res);
            if (res.data.data) {
              console.log('res.data.data: ', res.data.data);
              response.send();
            }
          })
        } catch (error) {
          response.status(error.status).send(`Webhook Error: ${error.message}`)
          
          console.error(error);
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
  
    // response.send();
  }

  async checkoutSessionCompleted(event: any) {
    const checkoutSessionCompleted = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
      {
        expand: ['customer', 'line_items',  'payment_intent', 'subscription', 'subscription.latest_invoice', 'subscription.latest_invoice.charge', 'invoice'],
      }
    );
    const {
      id: cs_id,
      created,
      subscription: { id: subscription_id, latest_invoice: { charge: { id: order_id, payment_intent: payment_id } } },
      line_items,
      payment_status: status,
      amount_total,
      customer_details: { email, phone },
      metadata,
      customer: { id: customer_id},
      payment_method_types
    } = checkoutSessionCompleted
    const request = {
      cs_id,
      payment_id,
      product_name: line_items.data[0].description,
      phone,
      customer_id,
      order_id,
      date: new Date(created),
      subscription_id,
      status,
      amount: amount_total / 100,
      email,
      metadata: JSON.stringify(metadata, null, 2),
      payment_method_type: payment_method_types[0]
    }
    // console.log('checkoutSessionCompleted: ', checkoutSessionCompleted , '\n');
    // console.log('charge: ', charge , '\n');
    // console.log('latest_invoice: ', latest_invoice , '\n');
    // console.log('line_items.data[0]: ', line_items.data[0] , '\n');
    return request
  }
}
