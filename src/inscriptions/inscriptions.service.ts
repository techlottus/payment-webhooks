import {  Injectable } from '@nestjs/common';
import { catchError, forkJoin, of } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class InscriptionsService {
  
  constructor(private utilsService: UtilsService) {}
  async populateStrapi(request: any, response: any) {

    const formResponse = request.body.form_response
    console.log('formResponse: ', formResponse);
    console.log('formResponse.hidden: ', formResponse.hidden);
    
    const cs_id = formResponse.hidden?.checkout_session_id || null
    const repeatedFields = ['RFC', 'CFDI_use', 'tax_regime']

    if (!cs_id) {
      response.status(400).send(`Webhook Error: Not checkout session id has been provided`);
      response.send();
    } else {
      const submitted_at = formResponse.submitted_at
      const answers = formResponse.definition.fields.reduce((acc: any, field: any, index: number) => {
        const { type, ref } = field
        const rawAnswer = formResponse.answers[index]
        const answer = rawAnswer[rawAnswer.type]
        if(ref === 'need_invoice') {
          acc.needInvoiceIndex = index;
          acc.needInvoice = answer
          acc.inscription = { ...acc.inscription, [ref]: answer }
        }
        if (acc.needInvoiceIndex === null || index < acc.needInvoiceIndex) {
          const strapiField = { [ref]: type === "multiple_choice" ? answer.label : answer }
          acc.inscription = { ...acc.inscription, ...strapiField }
        } else if (index > acc.needInvoiceIndex) {

          let [ _first, ...rest ] = ref.split('_')
          const hasRepeatedField = repeatedFields.map((rf) => (ref as string).includes(rf))

          if (hasRepeatedField.includes(true)) rest.pop()
          
          const key = rest.join('_')
          const strapiField = { [key]: type === "multiple_choice" ? answer.label : answer }
          acc.invoice = { ...acc.invoice, ...strapiField }
        }
        return acc
      }, { inscription: { cs_id, submitted_at }, invoice: { cs_id, submitted_at }, needInvoiceIndex: null, needInvoice: false })

      try {
        const inscriptionObs = this.utilsService.postStrapi('track-inscriptions', answers.inscription)
        const invoiceObs = this.utilsService.postStrapi('track-invoices', answers.invoice)

        const sources = [ inscriptionObs ]
        if (answers.needInvoice) sources.push(invoiceObs)

        forkJoin(sources).pipe(catchError((err) => {
          console.log(err)
          return of(err)
        })).subscribe(data => {
          response.status(data[0].status)
          this.utilsService.callSFWebhook(cs_id).subscribe()
          // guardar need invoice data
        })
        
      } catch (error) {
        response.status(error.status).send(error.message);
      }
      response.send()
    }
  }
}
