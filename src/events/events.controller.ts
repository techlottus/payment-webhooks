import { Controller, Post, Req } from '@nestjs/common';

@Controller('events')
export class EventsController {
  @Post('/created')
  async created(@Req() req) {
    console.log(req.body);
    
    return 'created';
  }
}
