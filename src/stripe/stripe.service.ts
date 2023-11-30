import { Injectable, RawBodyRequest } from '@nestjs/common';
require('dotenv').config();
import { env } from 'process';
const stripe = require('stripe')(env.STRIPE_API_KEY);
@Injectable()
export class StripeService {
  async populateStrapi(request: RawBodyRequest<Request>, response: any) {
    console.log('request: ', request);
    const sig =  JSON.parse((request.rawBody).toString('utf-8')).headers['stripe-signature'];
    // const sig = request.headers['stripe-signature'];
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(request.rawBody, sig, env.WEBHOOK_SECRET);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    console.log('event: ', event);
    console.log('event.data.object: ', event.data.object);
    // Handle the event
  
    switch (event.type) {
      case 'checkout.session.completed':
        // stripe.  
        const session = await stripe.checkout.sessions.retrieve(
          event.data.object.id,
          {
            expand: ['customer', 'line_items', 'line_items.product', 'payment_intent', 'subscription', 'subscription.latest_invoice', 'invoice'],
          }
        );
        const checkoutSessionCompleted = event.data.object;
        const {
          id,
          payment_intent,
          created,
          subscription,
          payment_status,
          amount_total,
          customer_details: { email },
          metadata,
          payment_method_types
        } = checkoutSessionCompleted
        const request = {
          checkout_session_id: id,
          payment_intent_id: payment_intent,
          payment_date: new Date(created),
          subscription_id: subscription,
          status: payment_status,
          amount: amount_total / 100,
          email,
          metadata,
          payment_method_types
        }
        console.log('request: ', request , '\n');
        console.log('session: ', session , '\n');
        console.log('session.subscription.latest_invoice: ', session.subscription.latest_invoice , '\n');
        console.log('session.line_items.data[0]: ', session.line_items.data[0] , '\n');
        // Then define and call a function to handle the event checkout.session.completed
        break;
      case 'checkout.session.expired':
        const checkoutSessionExpired = event.data.object;
        console.log('checkoutSessionExpired: ', checkoutSessionExpired);
      // Then define and call a function to handle the event checkout.session.expired
      break;
      case 'subscription_schedule.updated':
        const subscriptionScheduleUpdated = event.data.object;
        console.log('subscriptionScheduleUpdated: ', subscriptionScheduleUpdated);
  
        // Then define and call a function to handle the event subscription_schedule.updated
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
  // server.js
//
// Use this sample code to handle webhook events in your integration.
//
// 1) Paste this code into a new file (server.js)
//
// 2) Install dependencies
//   npm install stripe
//   npm install express
//
// 3) Run the server on http://localhost:4242
//   node server.js

// The library needs to be configured with your account's secret key.
// Ensure the key is kept out of any version control system you might be using.



// This is your Stripe CLI webhook secret for testing your endpoint locally.
// const endpointSecret = ;
// app.use(
//   ( req, res, next ) => {
//     if (req.originalUrl === '/webhook') {
//       next();
//     } else {
//       express.json()(req, res, next);
//     }
//   }
// );

// app.post('/webhook', express.raw({type: '*/*'}), async (request, response) => {
  

  // Return a 200 response to acknowledge receipt of the event
  // response.send();
// });
// app.use(express.json())
// app.listen(4242, () => console.log('Running on port 4242'));
}
