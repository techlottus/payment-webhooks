import { Injectable } from '@nestjs/common';
@Injectable()
export class InscriptionsService {
  populateStrapi(request: any, response: any) {
    const formResponse = request.body.form_response
    const cs_id = formResponse.hidden.checkout_session_id || null

    if (!cs_id) {
      response.status(400).send(`Webhook Error: Not checkout session id has been provided`);
    } else {
      const answers = formResponse.definition.fields.reduce((acc: any, field: any, index: number) => {
        const { title, type, id, ref } = field
        const rawAnswer = formResponse.answers[index]
        const answer = rawAnswer[rawAnswer.type]
        if(ref === 'need_invoice') {
          acc.needInvoiceIndex = index;
          acc.needInvoice = answer
        }
        if (acc.needInvoiceIndex === null || index < acc.needInvoiceIndex) {
          const strapiField = { [ref]: type === "multiple_choice" ? answer.label : answer }
          acc.inscription = { ...acc.inscription, ...strapiField }
        } else if (index > acc.needInvoiceIndex) {
          const [ _first, ...rest ] = ref.split('_')
          const key = rest.join('_')
          const strapiField = { [key]: type === "multiple_choice" ? answer.label : answer }
          acc.invoice = { ...acc.invoice, ...strapiField }
        }
        console.log('acc.inscription: ', acc.inscription);
        console.log('acc.invoice: ', acc.invoice);
        return acc
      }, {inscription: {}, invoice: {}, needInvoiceIndex: null, needInvoice: false })
      console.log('answers: ', answers);
    }

    response.send();
    
  }
}
