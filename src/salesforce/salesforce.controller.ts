import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { SalesforceService } from './salesforce.service';

@Controller('salesforce')
export class SalesforceController {
  constructor(private readonly salesforceService: SalesforceService) {}

  @Post('/inscription')
  inscription(@Body() body: any, @Res() res: Response) {
    this.salesforceService.createInscription(body.cs_id, res)
  }
}
