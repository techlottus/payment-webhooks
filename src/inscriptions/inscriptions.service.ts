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
      const answers = formResponse.definition.fields.reduce((acc, field, index) => {
        const { title, type, id, ref } = field
        const rawAnswer = formResponse.answers[index]
        const answer = rawAnswer[rawAnswer.type]
        // const answerField =  { id, title, ref, answer: type === "multiple_choice" ? answer.label : answer }
        acc = { ...acc, [ref]: type === "multiple_choice" ? answer.label : answer }
        console.log('acc: ', acc);
        return acc
      }, {})
      console.log('answers: ', answers);
    }
    response.send();
    
  }
}
