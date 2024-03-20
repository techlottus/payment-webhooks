import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { InscriptionsService } from './inscriptions.service';

@Controller('inscriptions')
export class InscriptionsController {
  constructor(private readonly inscriptionsService: InscriptionsService) {}

  @Post('/new')
  webhook(@Body() body: any, @Res() response: any ) {
    // console.log("request: ", request);
    this.inscriptionsService.populateStrapi(body, response)
  }
}
