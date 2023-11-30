import { Body, Injectable, Post, Req } from '@nestjs/common';

@Injectable()
export class InscriptionsService {
  populateStrapi(request: any, response: any) {
    const formResponse = request.body.form_response
    console.log('formResponse: ', formResponse);
    const answers = formResponse.definition.fields.map((field, index) => {
      const { title, type, id } = field
      const answer = formResponse.answers[index][formResponse.answers[index].type]
      const answerField =  { id, title, type, answer: type === "multiple_choice" ? answer.label : answer }
      console.log('answerField: ', answerField);
      
      return answerField
    })
    // console.log('answers: ', answers);
    
  }
}
