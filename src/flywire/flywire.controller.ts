import { Controller, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { catchError, of, mergeMap, combineLatest } from 'rxjs';
import { Request, Response } from 'express';
import { createHmac } from 'crypto';
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

    const data = request.body;
    const strapiReq = {
      cs_id: null,
      payment_id: data.data.payment_id,
      product_name: null,
      phone: data.data.payer.phone,
      customer_id: null,
      order_id: null,
      date: data.event_date,
      subscription_id: null,
      status: data.data.status,
      amount: `${data.data.amount_to / 100}`,
      email: data.data.payer.email,
      metadata: null,
      payment_method_type: data.data.payment_method.type,
      card_type: data.data.payment_method.card_classification,
      extra_fields: data.data.fields,
      payment_gateway: 'Flywire',
    };
    const paymentObs = this.utilsService.postStrapi(
      'track-payments',
      strapiReq,
    );
    let responsePayment;
    paymentObs
      .pipe(
        catchError((err) => {
          return of(err);
        }),
        mergeMap((paymentRes) => {
          if (paymentRes.error) return of(paymentRes);
          const payment = paymentRes.data.data;
          const attrs = payment.attributes;
          const metadata = attrs.extra_fields.metadata_lottus;
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
        responsePayment = res;
      });
    response.status(HttpStatus.OK).json(strapiReq);
  }
}
