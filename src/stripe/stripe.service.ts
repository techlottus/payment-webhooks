import { Injectable } from '@nestjs/common';
import { env } from 'process';
require('dotenv').config();

const stripe = require('stripe')(env.STRIPE_API_KEY);
const flows = ['ATR', 'EUONLINE', 'EUPROVIDER']

@Injectable()
export class StripeService {
  async populateCS(event: any) {
    
    if (!flows.includes(event.data.object.metadata.flow)) {
      return false
    }
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
          'invoice',
          'total_details.breakdown'
        ],
      }
    );
    // console.log('checkoutSessionCompleted: ', checkoutSessionCompleted);
    console.log('checkoutSessionCompleted.total_details: ', checkoutSessionCompleted.total_details);
    console.log('checkoutSessionCompleted.total_details.breakdown.discounts[0]: ', checkoutSessionCompleted.total_details.breakdown.discounts[0]);
    
    
    const cs_id = checkoutSessionCompleted.id
    // console.log('cs_id: ', cs_id);
    
    const line_items = checkoutSessionCompleted.line_items
    // console.log('line_items: ', line_items);
    // console.log('line_items.data[0]: ', line_items.data[0]);
    // console.log('line_items.data[0][0]: ', line_items.data[0][0]);
    
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
    const customFields = checkoutSessionCompleted?.custom_fields || {}
    const MExtraFields = JSON.parse(checkoutSessionCompleted?.metadata?.extra_fields) || {}
    
    const extra_fields = { ...customFields, ...MExtraFields }
    // console.log('extra_fields: ', extra_fields);
    
    // console.log('checkoutSessionCompleted.customer: ', checkoutSessionCompleted.customer);
    const customer_id = checkoutSessionCompleted.customer ?  checkoutSessionCompleted.customer.id : ''
    // console.log('customer_id: ', customer_id);
    
    const payment_method_types = checkoutSessionCompleted.payment_method_types
    // console.log('payment_method_types: ', payment_method_types);
    
    const after_completion = checkoutSessionCompleted?.payment_link?.after_completion || null
    // console.log('after_completion: ', after_completion);
    
    const type = after_completion?.type || null
    // console.log('type: ', type);
    
    // console.log('checkoutSessionCompleted.payment_intent: ', checkoutSessionCompleted.payment_intent);
    
    const payment_id = !!checkoutSessionCompleted.subscription ? checkoutSessionCompleted?.subscription?.latest_invoice?.charge?.payment_intent : checkoutSessionCompleted.payment_intent
    // console.log('payment_id: ', payment_id);
    
    // console.log('checkoutSessionCompleted.subscription: ', checkoutSessionCompleted.subscription);
    const subscription_id = !!checkoutSessionCompleted.subscription ? checkoutSessionCompleted?.subscription?.id : null
    // console.log('subscription_id: ', subscription_id);

    // console.log('payment_id: ', payment_id);
    const typeform_url = after_completion ? after_completion[type].url?.replace('{CHECKOUT_SESSION_ID}', cs_id) : null
    
    const payment_intent = await stripe.paymentIntents.retrieve(payment_id, {
      expand: [
        'payment_method'
      ]
    })
    // console.log('payment_intent: ', payment_intent);
    const order_id = checkoutSessionCompleted.subscription ? checkoutSessionCompleted?.subscription?.latest_invoice?.charge?.id : payment_intent.latest_charge
    // console.log('order_id: ', order_id);
    // if (metadata.SFlevel === 'Educación Continua' || metadata.SFcampus === 'UTC A TU RITMO' ) {
    
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
      metadata: {...metadata, typeform_url},
      payment_method_type: payment_method_types[0],
      card_type: payment_intent.payment_method.card.funding,
      extra_fields,
      payment_gateway: 'Stripe'
    }
    // console.log('request: ', request);

    // console.log('checkoutSessionCompleted: ', checkoutSessionCompleted , '\n');
    // console.log('charge: ', charge , '\n');
    // console.log('latest_invoice: ', latest_invoice , '\n');
    // console.log('line_items.data[0]: ', line_items.data[0] , '\n');
    return request
    // }
    return false
  }
  generateSubscriptionSchedule(subscription_id: string, iterations: number) {
    const subscription_schedule = stripe.subscription_schedule.create({
      from_subscription: subscription_id,
    })
    console.log('subscription_schedule: ', subscription_schedule);

    const { phases, id, current_phase } = subscription_schedule

    const new_subscription_schedule = stripe.subscription_schedule.update(id, {
      phases: [
        {
          items: [
            {
              price: phases[0].items[0].price,
            },
          ],
          iterations,
          start_date: current_phase.start_date,
        },
      ],
      end_behavior: 'cancel',
    })
    return new_subscription_schedule
    
  }
  getField(fields: any[], key: string, optkey?: string) {
    // console.log('fields: ', fields);
    try {
      return fields?.reduce((acc, field) => {
        if (field.key === key) {
          acc = field[field.type]
        } else if (field.key === optkey) {
          acc = field[field.type]
        }
        return acc
      }, '')
    } catch (error) {
      return { value: Object.keys(fields).filter(innerkey => innerkey === key || innerkey === optkey).map(key => fields[key])[0] }
    }
  }
}
