import { Body, Injectable, Post, Req } from '@nestjs/common';

@Injectable()
export class InscriptionsService {
  populateStrapi(request: any, response: any) {
    const formResponse = request.data
    console.log('formResponse: ', formResponse);
    
  }
}
