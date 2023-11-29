import { Body, Controller, Post, Req } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}
  @Post('/new')
  create(@Req() request: any ) {
    // console.log("request: ", request);
    this.stripeService.populateStrapi(request)
    
  }
}
