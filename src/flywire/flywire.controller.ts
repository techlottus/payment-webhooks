import { Controller, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { catchError, of, mergeMap, combineLatest } from 'rxjs';
import { Request, Response } from 'express';
import * as schedule from 'node-schedule';
import { createHmac } from 'crypto';
import * as xml2js from 'xml2js';
import { env } from 'process';
require('dotenv').config();

import { UtilsService } from 'src/utils/utils.service';

@Controller('flywire')
export class FlywireController {
  constructor(private utilsService: UtilsService) {}

  @Post('/')
  webhook(@Res() response: Response, @Req() request: Request) {
    const flywireDigest = request.headers['x-flywire-digest'];
    const sharedSecret = env.FW_SECRET;
    const has = createHmac('sha256', sharedSecret)
      .update(JSON.stringify(request.body))
      .digest('base64');
    if (has !== flywireDigest) {
      response.status(HttpStatus.UNAUTHORIZED).json([]);
      return [];
    }

    const extractExtraFields = (obj) => {
      const { metadata_lottus, ...rest } = obj.extra_fields;
      return rest;
    };

    const data = request.body;
    if (data.event_type !== 'delivered') {
      response.status(HttpStatus.OK).json([]);
      return [];
    }
    const strapiReq = {
      cs_id: data.data.fields.cs_id,
      payment_id: data.data.payment_id,
      product_name: data.data.fields.nombre_del_programa,
      phone: data.data.payer.phone,
      customer_id: null,
      order_id: null,
      date: data.event_date,
      subscription_id: null,
      status: data.data.status,
      amount: `${data.data.amount_to / 100}`,
      email: data.data.payer.email,
      metadata: data.data.fields.metadata_lottus,
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
        catchError((err) => {
          return of(err);
        }),
        mergeMap((paymentRes) => {
          if (paymentRes.error) return of(paymentRes);
          const payment = paymentRes.data.data;
          const attrs = payment.attributes;
          const metadata = attrs.metadata;
          const name = attrs.extra_fields.student_first_name;

          return combineLatest({
            payment: of(payment),
            template: !!metadata.payment_template
              ? this.utilsService
                  .postSelfWebhook('/email/compile', {
                    template_id: metadata.payment_template,
                    params: {
                      amount: attrs.amount,
                      program: attrs.product_name,
                      First_name: name,
                      file_number: attrs.payment_id,
                      payment_date: attrs.date,
                      provider: metadata.provider,
                    },
                  })
                  .pipe(
                    catchError((err, caught) => {
                      console.log('err: ', err);
                      return caught;
                    }),
                  )
              : of(false),
            template_invoice: !!metadata.invoice_template
              ? this.utilsService
                  .postSelfWebhook('/email/compile', {
                    template_id: metadata.invoice_template,
                    params: {
                      first_name: name,
                    },
                  })
                  .pipe(
                    catchError((err, caught) => {
                      console.log('err: ', err);
                      return caught;
                    }),
                  )
              : of(false),
          });
        }),
        catchError((err) => {
          console.log('compile error', err?.data?.error);
          return of({
            error: true,
            ...err?.data?.error,
          });
        }),
        mergeMap((res) => {
          if (res.error) return of(res);
          return combineLatest({
            payment: of(res.payment),
            template: of(res.template),
            send: !!res.template
              ? this.utilsService
                  .postSelfWebhook('/email/salesforce/send', {
                    template: res.template.data.compiled,
                    subject: res.template.data.template.subject,
                    toAddress: res.payment.attributes.email,
                    priority: res.template.data.template.priority,
                  })
                  .pipe(
                    catchError((err, caught) => {
                      console.log('err: ', err);
                      return caught;
                    }),
                  )
              : of(false),
            send_invoice: !!res.template_invoice
              ? this.utilsService
                  .postSelfWebhook('/email/salesforce/send', {
                    template: res.template_invoice.data.compiled,
                    subject: res.template_invoice.data.template.subject,
                    toAddress: res.payment.attributes.email,
                    priority: res.template_invoice.data.template.priority,
                  })
                  .pipe(
                    catchError((err, caught) => {
                      console.log('err: ', err);
                      return caught;
                    }),
                  )
              : of(false),
          });
        }),
      )
      .subscribe((res) => {
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
          this.utilsService
            .postSelfWebhook('/inscriptions/new', {
              cs_id: res.payment.attributes.cs_id,
            })
            .subscribe();
        }
        const sendMessage = (data, scope, error) => {
          this.SendSlackMessage(data, scope, error);
        };
        const sendFollowUpMail = (data) => {
          this.sendFollowUpMail(data);
        };
        xml2js.parseString(res.send.data, function (err, result) {
          // console.dir(result);
          // console.dir(result['soapenv:Envelope']);
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
            sendMessage(data, 'payment email', data.send);
            // console.dir(data);
          } else {
            data.send = {
              current:
                result['soapenv:Envelope']['soapenv:Header'][0]
                  .LimitInfoHeader[0].limitInfo[0].current[0],
              limit:
                result['soapenv:Envelope']['soapenv:Header'][0]
                  .LimitInfoHeader[0].limitInfo[0].limit[0],
              type: result['soapenv:Envelope']['soapenv:Header'][0]
                .LimitInfoHeader[0].limitInfo[0].type[0],
            };
          }
          if (data.payment.metadata.flow === 'EUPROVIDER') {
            const year = new Date().getFullYear();
            const month = new Date().getMonth();
            const day = new Date().getDate();
            const hours = new Date().getHours();
            const minutes = new Date().getMinutes();
            const seconds = new Date().getSeconds();

            const date =
              env.NODE_ENV === 'production'
                ? new Date(year, month, day, hours + 24, minutes, seconds)
                : new Date(year, month, day, hours, minutes, seconds + 30);

            const job = schedule.scheduleJob(date, function () {
              sendFollowUpMail(data);
            });
          }
        });
      });
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
          program_name: data.payment.extra_fields.nombre_del_programa,
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
