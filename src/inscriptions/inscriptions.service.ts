import { Body, Injectable, Post, Req } from '@nestjs/common';

@Injectable()
export class InscriptionsService {
  populateStrapi(request: any, response: any) {
    const formResponse = request.body.form_response
    console.log('formResponse: ', formResponse);
    
  }
}
