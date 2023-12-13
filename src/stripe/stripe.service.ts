import { HttpException, Injectable, RawBodyRequest } from '@nestjs/common';
require('dotenv').config();
import { env } from 'process';
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
          const paymentObs = this.utilsService.postStrapi('track-payments', strapiReq)
          
          paymentObs.subscribe(res => {
            if (!res.data.data) {
              throw new HttpException({
                message: res.data.error.message
              }, res.data.error.status);
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
  }

  async checkoutSessionCompleted(event: any) {
    const checkoutSessionCompleted = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
      {
        expand: [
          'customer',
          'line_items',
          'payment_intent',
          'payment_link',
          'subscription',
          'subscription.latest_invoice',
          'subscription.latest_invoice.charge',
          'invoice'
        ],
      }
    );
    // console.log('checkoutSessionCompleted: ', checkoutSessionCompleted);
    console.log('checkoutSessionCompleted.payment_intent: ', checkoutSessionCompleted.payment_intent);
    
    const {
      id: cs_id,
      subscription: { id: subscription_id, latest_invoice: { charge: { id: order_id, payment_intent: payment_id } } },
      line_items,
      payment_status: status,
      amount_total,
      customer_details: { email, phone },
      metadata,
      customer: { id: customer_id},
      payment_method_types,
      payment_link: { after_completion, after_completion: { type } }
    } = checkoutSessionCompleted

    const typeform_url = after_completion[type].url.replace('{CHECKOUT_SESSION_ID}', cs_id)
    const payment_intent = await stripe.paymentIntents.retrive(payment_id, {
      expand: [
        'payment_method'
      ]
    })

    console.log('payment_intent: ', payment_intent);
    console.log('payment_intent.payment_method: ', payment_intent.payment_method);

    const request = {
      cs_id,
      payment_id,
      product_name: line_items.data[0].description,
      phone,
      customer_id,
      order_id,
      date: new Date(event.created * 1000),
      subscription_id,
      status,
      amount: `${amount_total / 100}`,
      email,
      metadata: { ...metadata, typeform_url },
      payment_method_type: payment_method_types[0]
    }
    // console.log('checkoutSessionCompleted: ', checkoutSessionCompleted , '\n');
    // console.log('charge: ', charge , '\n');
    // console.log('latest_invoice: ', latest_invoice , '\n');
    // console.log('line_items.data[0]: ', line_items.data[0] , '\n');
    return request
  }
}
