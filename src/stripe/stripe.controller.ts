import { Body, Controller, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}
  @Post('/new')
  webhook(@Req() request: RawBodyRequest<Request>, @Res() response: any ) {
    // console.log("request: ", request);
    try {
      
      this.stripeService.populateStrapi(request, response)
    } catch (error) {
      console.error(error.message)
    }
    
  }
}
