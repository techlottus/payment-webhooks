import { Controller, Get, Post, Req } from '@nestjs/common';

@Controller('flywire')
export class FlywireController {
  @Get('/hello-flywire')
  getHello(): string {
    return 'Hello World!!!!';
  }
}
