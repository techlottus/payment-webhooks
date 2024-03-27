import { Controller, HttpException, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { env } from 'process';
import { catchError, combineLatest, mergeMap, of, take } from 'rxjs';
require('dotenv').config();
import * as schedule  from "node-schedule";
import * as xml2js from "xml2js"

import { UtilsService } from 'src/utils/utils.service';
import { StripeService } from './stripe.service';
const stripe = require('stripe')(env.STRIPE_API_KEY);

@Controller('stripe')
export class StripeController {
  constructor(private utilsService: UtilsService, private stripeService: StripeService) {}

  @Post('/new')
  async webhook(@Req() request: RawBodyRequest<Request>, @Res() response: any ) {
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
                 console.log('payment data error', err.data.error)
                 return of({ error: true, ...err.data.error})
               }),
               mergeMap(paymentRes => {
                // console.log('paymentRes: ', paymentRes);
                
                 if (paymentRes.error) return of(paymentRes)
                 const payment = paymentRes.data.data
                 const attrs = payment.attributes
                 const name = this.stripeService.getField(attrs.extra_fields, 'nombredelalumno').value
                 // console.log('name: ', name);
                 // return of(paymentRes)
 
                 return combineLatest({
                   payment: of(payment),
                   template: this.utilsService.postSelfWebhook('/email/compile', { template_id: attrs.metadata.payment_template,
                     params: {
                       "amount": attrs.amount,
                       "program": attrs.product_name,
                       "First_name": name,
                       "file_number": attrs.payment_id,
                       "payment_date": attrs.date,
                       "provider": attrs.metadata.provider
                     }
                   })
                 })
               }),
               catchError((err) => {
                 console.log('compile error', err?.data?.error)
                 return of({ error: true, ...err?.data?.error})
               }),
               mergeMap(res => {
                // console.log('res: ', res);

                 if (res.error) return of(res)
 
                 const { compiled, template: { subject, priority } } = res.template.data
                 return combineLatest({
                   payment: of(res.payment),
                   template: of(res.template),
                   send: this.utilsService.postSelfWebhook('/email/salesforce/send', {
                     template: compiled,
                     subject,
                     toAddress: res.payment.attributes.email,
                     priority
                   }).pipe(catchError((err, caught) => {
                    console.log('err: ', err);
                    return caught
                  }))
                 })
                 // this.sendFollowUpmail(name)
 
               })
             ).subscribe(res => {
              // console.log('res: ', res);

               const name = this.stripeService.getField(res.payment.attributes.extra_fields, 'nombredelalumno').value
               const curp = this.stripeService.getField(res.payment.attributes.extra_fields, 'curp').value
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
                 this.utilsService.postSelfWebhook('/inscriptions/new', { cs_id: res.payment.attributes.cs_id } ).subscribe()
               }
               const sendMessage = (data, scope, error) => {
                 this.SendSlackMessage(data, scope, error)
               }
               const sendFollowUpMail = (data) => {
                 this.sendFollowUpMail(data)
               }
               xml2js.parseString(res.send.data,  function (err, result) {
                  // console.dir(result);
                  // console.dir(result['soapenv:Envelope']);
                  if (result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].success[0] === 'false') {
                    // treat error
                    data.send =  {
                      fields: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].fields,
                      message: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].message,
                      statusCode: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].statusCode,
                    }
                    sendMessage(data, 'payment email', data.send)
                    // console.dir(result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].fields);
                    // console.dir(result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].message);
                    // console.dir(result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].statusCode);
  
                    // console.dir(data);
                  } else {
                    data.send = {
                      current: result['soapenv:Envelope']['soapenv:Header'][0].LimitInfoHeader[0].limitInfo[0].current[0],
                      limit: result['soapenv:Envelope']['soapenv:Header'][0].LimitInfoHeader[0].limitInfo[0].limit[0],
                      type: result['soapenv:Envelope']['soapenv:Header'][0].LimitInfoHeader[0].limitInfo[0].type[0],
                    }
                  }
                  if(data.payment.metadata.flow === "EUPROVIDER") {
                    const year = new Date().getFullYear()
                    const month = new Date().getMonth()
                    const day = new Date().getDate()
                    const hours = new Date().getHours()
                    const minutes = new Date().getMinutes()
                    const seconds = new Date().getSeconds()

                    const date = env.NODE_ENV === 'production'
                      ? new Date(year, month, day, hours + 24, minutes , seconds)
                      : new Date(year, month, day, hours, minutes, seconds + 30)

                    const job = schedule.scheduleJob(date, function() {
                      sendFollowUpMail(data)
                    });
                  }
               });
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
  sendFollowUpMail(data) {
    // console.log('data followUp: ', data);
    if (data.payment.metadata.flow !== 'EUPROVIDER') return data
    return combineLatest({
      payment: of(data.payment),
      template: this.utilsService.postSelfWebhook('/email/compile', {
        template_id: data.payment.metadata.follow_up_template,
        params: {
          "provider": data.payment.metadata.provider,
          "first_name": data.payment.name,
          "program_name": data.payment.product_name
        }
      })
    })
    .pipe(
      mergeMap((compileRes: any) => {
        // subject: compileRes.template.data.subject.replace('{{provider}}',compileRes.payment.metadata.provider),
        // console.log('compileRes: ', compileRes);
        
        return combineLatest({
          payment: of(compileRes.payment),
          template: of(compileRes.template.data),
          send:  this.utilsService.postSelfWebhook('/email/salesforce/send', {
            template: compileRes.template.data.compiled,
            subject: compileRes.template.data.template.subject.replace('{{provider}}',compileRes.payment.metadata.provider),
            toAddress: compileRes.payment.email,
            priority: compileRes.template.data.template.priority
          })
        })
      })
    ).subscribe(res => {
      // console.log('res: ', res);
      const sendMessage = (data, scope, error) => {
        this.SendSlackMessage(data, scope, error)
      }
      xml2js.parseString(res.send.data,  function (err, result) {
        // console.dir(result);
        // console.dir(result['soapenv:Envelope']);
        if (result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].success[0] === 'false') {
          // treat error
          data.send =  {
            fields: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].fields,
            message: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].message,
            statusCode: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].statusCode,
          }
          sendMessage(data, 'follow up email', data.send)
          // console.dir(result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].fields);
          // console.dir(result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].message);
          // console.dir(result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].statusCode);

          // console.dir(data);
        } 
        // else {
        //   data.send = {
        //     current: result['soapenv:Envelope']['soapenv:Header'][0].LimitInfoHeader[0].limitInfo[0].current[0],
        //     limit: result['soapenv:Envelope']['soapenv:Header'][0].LimitInfoHeader[0].limitInfo[0].limit[0],
        //     type: result['soapenv:Envelope']['soapenv:Header'][0].LimitInfoHeader[0].limitInfo[0].type[0],
        //   }

        // }
      });
    })
  }

  SendSlackMessage(data: any, scope: string, error: string) {

    const labels = {
      email: 'Correo electrónico',
      name: 'Nombre',
      phone: 'Teléfono',
      cs_id: 'Checkout Session Id',
    }
    const fields = {
      cs_id: data.payment.cs_id,
      name: data.payment.name,
      phone: data.payment.phone,
      email: data.payment.email
    }
    // console.log(data);
    
    // send slack message with error
    const metadata = {
      scope,
      product_name: data.payment.product_name,
      error,
      paymentsID: data.payment.id,
    }
    const slackMessage = this.utilsService.generateSlackErrorMessage(labels, metadata, fields)
    // console.log('slackMessage: ', slackMessage);
    
    this.utilsService.postSlackMessage(slackMessage).subscribe()

  }

}
