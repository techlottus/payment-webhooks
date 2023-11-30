import { Body, Injectable, Post, Req } from '@nestjs/common';

@Injectable()
export class InscriptionsService {
  populateStrapi(request: any, response: any) {
    const formResponse = request.body.form_response
    console.log('formResponse: ', formResponse);
    const answers = formResponse.definition.fields.map((field, index) => {
      const answerField =  { ...field, answer: formResponse.answers[index]}
      console.log('answerField: ', answerField);
      
      return answerField
    })
    // console.log('answers: ', answers);
    
  }
}
