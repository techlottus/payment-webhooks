import { Injectable, RawBodyRequest } from '@nestjs/common';
require('dotenv').config();
import { env } from 'process';
const stripe = require('stripe')(env.STRIPE_API_KEY);
@Injectable()
export class StripeService {
  async populateStrapi(request: RawBodyRequest<Request>, response: any) {
    console.log('request: ', request);
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
        const req = await this.checkoutSessionCompleted(event)
        console.log('req: ', req);

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
  }

  async checkoutSessionCompleted(event: any) {
    const checkoutSessionCompleted = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
      {
        expand: ['customer', 'line_items',  'payment_intent', 'subscription', 'subscription.latest_invoice', 'subscription.latest_invoice.charge', 'invoice'],
      }
    );
    const {
      id,
      payment_intent,
      created,
      subscription,
      subscription: { latest_invoice, latest_invoice: { charge } },
      line_items,
      payment_status,
      amount_total,
      customer_details: { email, phone },
      metadata,
      payment_method_types,
      customer
    } = checkoutSessionCompleted
    const request = {
      cs_id: id,
      payment_id: payment_intent,
      product_name: line_items.data[0].description,
      phone,
      customer_id: customer,
      order_id: '',
      date: new Date(created),
      subscription_id: subscription,
      status: payment_status,
      amount: amount_total / 100,
      email,
      metadata,
      payment_method_types
    }
    console.log('checkoutSessionCompleted: ', checkoutSessionCompleted , '\n');
    console.log('charge: ', charge , '\n');
    console.log('latest_invoice: ', latest_invoice , '\n');
    console.log('line_items.data[0]: ', line_items.data[0] , '\n');
    return request
  }
}
