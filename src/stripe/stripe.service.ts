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
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        // stripe.  
        try {
          const strapiReq = await this.checkoutSessionCompleted(event)
          const paymentObs = this.utilsService.postStrapi('track-payments', strapiReq)
          
          paymentObs.subscribe(res => {
            if (!!res.data.error) {
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
    const checkout_session_id = event.data.object.id
    const checkoutSessionCompleted = await stripe.checkout.sessions.retrieve(
      checkout_session_id,
      {
        expand: [
          'customer',
          'line_items',
          'payment_link',
          'subscription',
          'subscription.latest_invoice',
          'subscription.latest_invoice.charge',
          'invoice'
        ],
      }
    );
    console.log('checkoutSessionCompleted: ', checkoutSessionCompleted);
    
    
    const cs_id = checkoutSessionCompleted.id
    // console.log('cs_id: ', cs_id);
    
    const line_items = checkoutSessionCompleted.line_items
    // console.log('line_items: ', line_items);
    
    const status = checkoutSessionCompleted.payment_status
    // console.log('status: ', status);
    
    const amount_total = checkoutSessionCompleted.amount_total
    // console.log('amount_total: ', amount_total);
    
    const email = checkoutSessionCompleted.customer_details.email
    // console.log('email: ', email);
    
    const phone = checkoutSessionCompleted.customer_details.phone
    // console.log('phone: ', phone);
    
    const metadata = checkoutSessionCompleted.metadata
    // console.log('metadata: ', metadata);
    
    const extra_fields = checkoutSessionCompleted.custom_fields
    // console.log('extra_fields: ', extra_fields);
    
    // console.log('checkoutSessionCompleted.customer: ', checkoutSessionCompleted.customer);
    const customer_id = checkoutSessionCompleted.customer ?  checkoutSessionCompleted.customer.id : ''
    // console.log('customer_id: ', customer_id);
    
    const payment_method_types = checkoutSessionCompleted.payment_method_types
    // console.log('payment_method_types: ', payment_method_types);
    
    const after_completion = checkoutSessionCompleted.payment_link.after_completion
    // console.log('after_completion: ', after_completion);
    
    const type = after_completion.type
    // console.log('type: ', type);
    
    // console.log('checkoutSessionCompleted.payment_intent: ', checkoutSessionCompleted.payment_intent);
    
    const payment_id = !!checkoutSessionCompleted.subscription ? checkoutSessionCompleted?.subscription?.latest_invoice?.charge?.payment_intent : checkoutSessionCompleted.payment_intent
    // console.log('payment_id: ', payment_id);
    
    const subscription_id = !!checkoutSessionCompleted.subscription ? checkoutSessionCompleted?.subscription?.latest_invoice?.charge?.id : null
    // console.log('subscription_id: ', subscription_id);

    // console.log('payment_id: ', payment_id);
    const typeform_url = after_completion[type].url.replace('{CHECKOUT_SESSION_ID}', cs_id)
    
    const payment_intent = await stripe.paymentIntents.retrieve(payment_id, {
      expand: [
        'payment_method'
      ]
    })
    // console.log('payment_intent: ', payment_intent);
    const order_id = checkoutSessionCompleted.subscription ? checkoutSessionCompleted?.subscription?.latest_invoice?.charge?.id : payment_intent.latest_charge
    // console.log('order_id: ', order_id);

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
      payment_method_type: payment_method_types[0],
      card_type: payment_intent.payment_method.card.funding,
      extra_fields
    }
    // console.log('request: ', request);

    // console.log('checkoutSessionCompleted: ', checkoutSessionCompleted , '\n');
    // console.log('charge: ', charge , '\n');
    // console.log('latest_invoice: ', latest_invoice , '\n');
    // console.log('line_items.data[0]: ', line_items.data[0] , '\n');
    return request
  }
}
