import { Controller, Post, Req } from '@nestjs/common';
import { catchError, of } from 'rxjs';
import { Request } from 'express';

import { UtilsService } from 'src/utils/utils.service';

@Controller('flywire')
export class FlywireController {
  constructor(private utilsService: UtilsService) {}

  @Post('/')
  webhook(@Req() request: Request) {
    const data = request.body;
    // Strapi Request
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
          console.log(err);
          return of(err);
        }),
      )
      .subscribe((res) => {
        console.log(res);
        responsePayment = res;
      });
    return {
      response: responsePayment,
    };
  }
}
