import { Body, Controller, Post } from '@nestjs/common';

@Controller('stripe')
export class StripeController {
  @Post('/new')
  create(@Body() body ) {
    console.log("body: ", body);
    
  }
}
