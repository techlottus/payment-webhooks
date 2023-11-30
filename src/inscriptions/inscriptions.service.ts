import { Injectable } from '@nestjs/common';


@Injectable()
export class InscriptionsService {
  populateStrapi(request: any, response: any) {
    const formResponse = request.body.form_response
    console.log('formResponse: ', formResponse);
    const cs_id = formResponse.hidden?.checkout_session_id || null

    if (!!cs_id) {
      response.status(400).send(`Webhook Error: Not checkout session id has been provided`);
  
    } else {
      const answers = formResponse.definition.fields.map((field, index) => {
        const { title, type, id } = field
        const rawAnswer = formResponse.answers[index]
        const answer = rawAnswer[rawAnswer.type]
        const answerField =  { id, title, type, answer: type === "multiple_choice" ? answer.label : answer }
        
      console.log('answerField: ', answerField);
        return answerField
      })
    }
    // console.log('answers: ', answers);
    response.send();
    
  }
}
