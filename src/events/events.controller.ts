import { Controller, Post, Req, Res, Response } from '@nestjs/common';

@Controller('events')
export class EventsController {
  @Post('/created')
  async created(@Req() req, @Res() response: any) {
    if (req.body.model === 'event') {
      console.log(req.body);

      response.status(200).send('created');
      return 'created';
    } else {
      response.status(200).send();
    }
  }
}
