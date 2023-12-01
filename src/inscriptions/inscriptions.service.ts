import { HttpService } from '@nestjs/axios';
import {  Injectable } from '@nestjs/common';
require('dotenv').config();
import { env } from 'process';
import { forkJoin } from 'rxjs';

@Injectable()
export class InscriptionsService {
  
  constructor(private readonly http: HttpService) {}
  populateStrapi(request: any, response: any) {

    const formResponse = request.body.form_response
    const cs_id = formResponse.hidden.checkout_session_id || null
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
      console.log('answers: ', answers);
      try {
        const inscriptionObs = this.http.post(`${env.STRAPI_TRACKING_API}/track-inscriptions`, { data: answers.inscription }, { headers:{Authorization: `Bearer ${env.STRAPI_TRACKING_TOKEN}`}})
        const invoiceObs = this.http.post(`${env.STRAPI_TRACKING_API}/track-invoices`, { data: answers.invoice }, { headers:{Authorization: `Bearer ${env.STRAPI_TRACKING_TOKEN}`}})
        // call strapi to invoice and inscription post answers to endpoints
        forkJoin([inscriptionObs, invoiceObs])
          .subscribe((responses) => {
            responses.forEach((res) => {
              console.log('res: ', res);
              console.log('res.status: ', res.status);
              console.log('res: ', res);
              // response.status(res.status).send(res.message);
              response.send();

            })
          })
          
      } catch (error) {
        response.status(error.status).send(error.message);
        response.send();
      }
    }


    
  }
}
