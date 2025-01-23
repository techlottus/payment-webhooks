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
    
    const metadata = checkoutSessionCompleted.metadata.extra_fields 
      ? {...checkoutSessionCompleted.metadata, extra_fields: null}
      : checkoutSessionCompleted.metadata

    // console.log('metadata: ', metadata);
    const customFields = checkoutSessionCompleted?.custom_fields || {}
    const MExtraFields = JSON.parse(checkoutSessionCompleted?.metadata?.extra_fields) || {}
    
    const extra_fields = { ...customFields, ...MExtraFields }
    // console.log('extra_fields: ', extra_fields);
    const discount = checkoutSessionCompleted.total_details.breakdown.discounts[0]
    console.log('discount: ', discount);
    
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
    console.log('payment_intent: ', payment_intent);
    console.log('payment_intent.payment_method: ', payment_intent.payment_method);
    console.log('payment_intent.payment_method?.card?.last4: ', payment_intent.payment_method?.card?.last4);
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
      payment_gateway: 'Stripe',
      card_last_4: payment_intent.payment_method.card?.last4,
    }
    // console.log('request: ', request);

    // console.log('checkoutSessionCompleted: ', checkoutSessionCompleted , '\n');
    // console.log('charge: ', charge , '\n');
    // console.log('latest_invoice: ', latest_invoice , '\n');
    // console.log('line_items.data[0]: ', line_items.data[0] , '\n');
    if (discount) {
      return {
        ...request,
        coupons: {
          discount_id: discount?.discount?.id,
          amount_off: discount?.discount?.coupon?.amount_off,
          percent_off: discount?.discount?.coupon?.percent_off,
          promotion_code: discount?.discount?.promotion_code,
          coupon_id: discount?.discount?.coupon?.id,
        }
      }
    } else {
      return request
    }
    // }
  }
  async generateSubscriptionSchedule(subscription_id: string, iterations: number, metadata: any) {
    const subscription = await stripe.subscriptions.retrieve(subscription_id)
    const subscription_schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription_id,
    })
    console.log('subscription_schedule: ', subscription_schedule);

    const { phases, id, current_phase } = subscription_schedule

    let start_date = null
    let end_date = null
    const currentDate = new Date(current_phase.start_date * 1000)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const day = currentDate.getDate()
    const hours = currentDate.getHours()
    const minutes = currentDate.getMinutes()
    const seconds = currentDate.getSeconds()
    const miliseconds = currentDate.getMilliseconds()
    console.log('subscription.discount: ', subscription.discount?.id);
    console.log('subscription.discount?.coupon: ', subscription.discount?.coupon?.id);
    console.log('subscription.discount?.promotion_code: ', subscription.discount?.promotion_code);


    const phasesArray = []
    for (let index = 0; index < iterations; index++) {
      switch (subscription.plan.interval) {
        case 'day':
          start_date = new Date(year, month, day + (subscription.plan.interval_count * (index)), hours, minutes, seconds, miliseconds)
          end_date = new Date(year, month, day + (subscription.plan.interval_count * (index + 1)), hours, minutes, seconds, miliseconds)
          break;
        case 'month':
          start_date = new Date(year, month + (subscription.plan.interval_count * (index)), day, hours, minutes, seconds, miliseconds)
          end_date = new Date(year, month + (subscription.plan.interval_count * (index + 1)), day, hours, minutes, seconds, miliseconds)
          break;
        case 'year':
          start_date = new Date(year + (subscription.plan.interval_count * (index)), month, day, hours, minutes, seconds, miliseconds)
          end_date = new Date(year + (subscription.plan.interval_count * (index + 1)), month, day, hours, minutes, seconds, miliseconds)
          break;
      
        default:
          break;
      }
      if (index === 0) {
        phasesArray.push({
          items: [
            {
              price: phases[0].items[0].price,
              discounts: [{
                promotion_code: subscription.discount?.promotion_code
              }]
            },
          ],
          start_date: phases[0].start_date,
          end_date: end_date.getTime() / 1000,
        })
      } else {

        
        console.log('start_date: ', start_date);
        console.log('end_date: ', end_date);
        
        phasesArray.push({
          items: [
            {
              price: phases[0].items[0].price,
              discounts: [{
                promotion_code: subscription.discount?.promotion_code
              }]
            },
          ],
          proration_behavior: 'none',
          start_date: start_date.getTime() / 1000,
          end_date: end_date.getTime() / 1000,
        })
      }
      
    }

    const new_subscription_schedule = await stripe.subscriptionSchedules.update(id, {
      phases: phasesArray,
      metadata: {
        iterations,
        ...metadata
      },
      end_behavior: 'cancel',
      proration_behavior: 'none',
    })
    console.log('new_subscription_schedule: ', new_subscription_schedule);

    return new_subscription_schedule
    
  }


  async getSubscription(subscription_id: string) {
    const rawSub = await stripe.subscriptions.retrieve(subscription_id,{
        expand: [
          'schedule',
          'default_payment_method',
          'latest_invoice',
        ],
      })

    const sub = await rawSub
    console.log('subscription: ', sub);
    if (sub.schedule) {
      
      const test = {
        cs_id: sub.schedule.metadata.cs_id,
        subscription_id: sub.id,
        metadata:sub.schedule.metadata ,
        customer_id: sub.customer,
        email: sub.default_payment_method.billing_details.email,
        start_date: new Date(sub.start_date * 1000),
        end_date: new Date(sub.schedule.phases[sub.schedule.phases.length - 1]?.end_date * 1000),
        phase_quantity: sub.schedule.phases.length,
        status: sub.status,
        current_phase_end: new Date(sub.current_period_end * 1000),
        current_phase_start: new Date(sub.current_period_start * 1000),
        card_last_4: sub.default_payment_method.card.last4,
        phases: sub.schedule.phases.map((phase, index) => {
          return  {
            start_date: new Date(phase.start_date * 1000),
            end_date: new Date(phase.end_date * 1000),
            phase_index: index + 1,
            invoice_id: index === 0 ? sub.latest_invoice.id : null,
            invoice_status: index === 0 ? sub.latest_invoice.status : null,
            phase_status: sub.current_period_start === phase.start_date ? 'active' : 'pending',
            charge_id: index === 0 ? sub.latest_charge : null
          }
        }),
      }
      console.log(test);
      return test
    } else {
      return false
    }


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
