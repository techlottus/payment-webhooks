import { Controller, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { catchError, of, mergeMap, combineLatest } from 'rxjs';
import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import * as xml2js from 'xml2js';
import { env } from 'process';
require('dotenv').config();

import { UtilsService } from 'src/utils/utils.service';

@Controller('flywire')
export class FlywireController {
  constructor(private utilsService: UtilsService) {}

  @Post('/webhook')
  webhook(@Res() response: Response, @Req() request: Request) {
    const flywireDigest = request.headers['x-flywire-digest'];
    const selfToken = request.headers['self-token'];
    console.log('Headers: ', request.headers);
    const sharedSecret = env.FW_SECRET;
    const has = createHmac('sha256', sharedSecret)
      .update(JSON.stringify(request.body))
      .digest('base64');

    const isValidToken = selfToken
      ? selfToken === env.SELF_TOKEN
      : has === flywireDigest

    if (!isValidToken) {
      response.status(HttpStatus.UNAUTHORIZED).json([]);
      return [];
    }

    const extractExtraFields = (obj) => {
      const { metadatalottus, ...rest } = obj.extra_fields;
      return rest;
    };

    const data = request.body;
    console.log('Data: ', data);
    if (data.event_type !== 'guaranteed') {
      response.status(HttpStatus.OK).json([]);
      return [];
    }
    const payerPhone = !!data.data.payer.phone ? data.data.payer.phone.split(' ')[1] : data.data.fields.student_phone ;
    const strapiReq = {
      cs_id: data.data.payment_id,
      payment_id: data.data.payment_id,
      product_name: data.data.fields.program_name,
      phone: payerPhone,
      customer_id: null,
      order_id: null,
      date: data.event_date,
      subscription_id: null,
      status: data.data.status,
      amount: `${data.data.amount_to / 100}`,
      email: data.data.payer.email,
      metadata: JSON.parse(data.data.fields.metadatalottus),
      payment_method_type: data.data.payment_method.type,
      card_type: data.data.payment_method.card_classification,
      extra_fields: extractExtraFields({ extra_fields: data.data.fields }),
      payment_gateway: 'Flywire',
    };
    const paymentObs = this.utilsService.postStrapi(
      'track-payments',
      strapiReq,
    );
    paymentObs
      .pipe(



    mergeMap(paymentRes => {
      // console.log('paymentRes: ', paymentRes);

      // if (paymentRes.error) return of(paymentRes)

      const payment = paymentRes.data.data;
      const attrs = payment.attributes;
      const metadata = attrs.metadata;
      const name = attrs.extra_fields.student_first_name;
      // console.log('name: ', name);
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
      // console.log(date);

      return combineLatest({
        payment: of (payment),
        template: !!metadata.payment_template
          ? this.utilsService.postSelfWebhook('/email/send', {
              template_id: metadata.payment_template,
              params: {
                "amount": attrs.amount,
                "course": attrs.product_name,
                "First_name": name,
                "file_number": attrs.payment_id,
                "payment_date": attrs.date,
                "provider": metadata.provider
              },
              to: [attrs.email],
              from: "admisiones",
              scope: "payment",
            }).pipe(catchError((err, caught) => {
              console.log('err: ', err);
              return caught
            }))
          : of(false),
        template_invoice: !!metadata.invoice_template ?
          this.utilsService.postSelfWebhook('/email/send', {
            template_id: metadata.invoice_template,
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
        follow_up_template: metadata.flow === "EUPROVIDER" ?
          this.utilsService.postSelfWebhook('/email/send', {
            template_id: metadata.follow_up_template,
            params: {
              "provider": metadata.provider,
              "first_name": attrs.name,
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
      console.log('compile error', err?.data?.error)
      return of({
        error: true,
        ...err?.data?.error
      })
    }),
    mergeMap(res => {
      const data = {
        payment: {
          ...res.payment.attributes,
          id: res.payment.id,
          name: `${res.payment.attributes.extra_fields.student_first_name} ${res.payment.attributes.extra_fields.student_last_name}`,
          curp: res.payment.attributes.extra_fields.curp,
        },
        send: {},
      };
      if (data.payment.metadata.flow === 'EUONLINE') {
        return this.utilsService.postSelfWebhook('/inscriptions/new', {
          cs_id: res.payment.attributes.cs_id
        })
      } else {
        return of(res)
      }
    })).subscribe(res => {
      response.send();
    })
    response.status(HttpStatus.OK).json(strapiReq);
  }

  sendFollowUpMail(data) {
    if (data.payment.metadata.flow !== 'EUPROVIDER') return data;
    return combineLatest({
      payment: of(data.payment),
      template: this.utilsService.postSelfWebhook('/email/compile', {
        template_id: data.payment.metadata.follow_up_template,
        params: {
          provider: data.payment.metadata.provider,
          first_name: data.payment.extra_fields.student_first_name,
          program_name: data.payment.extra_fields.program_name,
        },
      }),
    })
      .pipe(
        mergeMap((compileRes: any) => {
          return combineLatest({
            payment: of(compileRes.payment),
            template: of(compileRes.template.data),
            send: this.utilsService.postSelfWebhook('/email/salesforce/send', {
              template: compileRes.template.data.compiled,
              subject: compileRes.template.data.template.subject.replace(
                '{{provider}}',
                compileRes.payment.metadata.provider,
              ),
              toAddress: compileRes.payment.email,
              priority: compileRes.template.data.template.priority,
            }),
          });
        }),
      )
      .subscribe((res) => {
        const sendMessage = (data, scope, error) => {
          this.SendSlackMessage(data, scope, error);
        };
        xml2js.parseString(res.send.data, function (err, result) {
          if (
            result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0]
              .result[0].success[0] === 'false'
          ) {
            // treat error
            data.send = {
              fields:
                result['soapenv:Envelope']['soapenv:Body'][0]
                  .sendEmailResponse[0].result[0].errors[0].fields,
              message:
                result['soapenv:Envelope']['soapenv:Body'][0]
                  .sendEmailResponse[0].result[0].errors[0].message,
              statusCode:
                result['soapenv:Envelope']['soapenv:Body'][0]
                  .sendEmailResponse[0].result[0].errors[0].statusCode,
            };
            sendMessage(data, 'follow up email', data.send);
          }
        });
      });
  }
  SendSlackMessage(data: any, scope: string, error: string) {
    const labels = {
      email: 'Correo electrónico',
      name: 'Nombre',
      phone: 'Teléfono',
      cs_id: 'Checkout Session Id',
    };
    const fields = {
      cs_id: data.payment.cs_id,
      name: data.payment.name,
      phone: data.payment.phone,
      email: data.payment.email,
    };

    // send slack message with error
    const metadata = {
      scope,
      product_name: data.payment.product_name,
      error,
      paymentsID: data.payment.id,
    };
    const slackMessage = this.utilsService.generateSlackErrorMessage(
      labels,
      metadata,
      fields,
    );

    this.utilsService.postSlackMessage(slackMessage).subscribe();
  }
}
