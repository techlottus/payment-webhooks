import { Body, Controller, Post } from '@nestjs/common';

@Controller('inscriptions')
export class InscriptionsController {
  @Post('/new')
  create(@Body() body ) {
    console.log("body: ", body);
    
  }
}
