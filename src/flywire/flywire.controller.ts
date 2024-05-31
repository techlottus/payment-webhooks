import { Controller, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { catchError, of } from 'rxjs';
import { createHmac } from 'crypto';

import { UtilsService } from 'src/utils/utils.service';

@Controller('flywire')
export class FlywireController {
  constructor(private utilsService: UtilsService) {}

  @Post('/')
  webhook(@Res() response: Response, @Req() request: Request) {
    const flywireDigest = request.headers['x-flywire-digest'];
    const sharedSecret = '';
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
      )
      .subscribe((res) => {
        responsePayment = res;
      });
    response.status(HttpStatus.OK).json(strapiReq);
  }
}
