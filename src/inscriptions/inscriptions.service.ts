import {  Injectable } from '@nestjs/common';
import { catchError, combineLatest, forkJoin, mergeMap, of } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class InscriptionsService {
  
  constructor(private utilsService: UtilsService) {}
  async populateStrapi(request: any, response: any) {

    const formResponse = request.body.form_response    
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
      const curp = answers.inscription.residence ===  'Nacional'
        ? answers.inscription.CURP?.toUpperCase()
        : null
      
      try {
        this.utilsService.fetchStrapi('track-payments', [`filters[cs_id][$eq]=${cs_id}`]).pipe(
          mergeMap((res) => {
            const curpObservable = answers.inscription.residence ===  'Nacional' ? this.utilsService.postSelfWebhook('/curp/validate', {curp}) : of(false)
            const observables = { track_payments: of(res.data.data[0]), curp: curpObservable }
            return combineLatest(observables).pipe(
              catchError((err, caught) => {
                console.log(res.data.data[0]);
                this.SendSlackMessage({track_payments: res.data.data[0], track_inscriptions:{ attributes: answers.inscription}}, 'CURP', err.response.data)
                // response.status(err.response.status).send(err.response.data);
                return of({ error: true, ...err})
              }),
            )
          }),
          
          mergeMap((res) => {
            // console.log(res);
            
            if (res.error) {
              return of(res)
            }

            const inscription = res.curp 
            ? {
              ...answers.inscription,
                name: res.curp.data.nombre,
                CURP: res.curp.data.curp,
                last_name: res.curp.data.apellidoPaterno,
                second_last_name: res.curp.data.apellidoMaterno,
                gender: res.curp.data.sexo,
                birthdate: res.curp.data.fechaNacimiento,
                birth_entity: res.curp.data.estadoNacimiento
              }
            : answers.inscription
            // console.log(inscription);
            
            const inscriptionObs = this.utilsService.postStrapi('track-inscriptions', inscription)
            const invoiceObs = this.utilsService.postStrapi('track-invoices', answers.invoice)
    
            const sources = [ inscriptionObs ]
            if (answers.needInvoice) sources.push(invoiceObs)

            return forkJoin(sources).pipe(catchError((err) => {
              // console.log(err)
              // response.status(err.response.status).send(err.response.data);

              return of({ error: true, ...err})
            }))
          }),
          mergeMap(res => {
            if (res.error) {
              return of(res)
            }
            return this.utilsService.postSelfWebhook('/salesforce/inscription', { cs_id })
          })
        )
       .subscribe(() => {

         response.send()
       })
        
      } catch (error) {
        // response.status(error.status).send(error.message || error.data);
      }
    }
  }
  SendSlackMessage(data: any, scope: string, error: string) {

    const labels = {
      email: 'Correo electrónico',
      name: 'Nombres',
      phone: 'Teléfono',
      last_name: 'Apellidos',
      cs_id: 'Checkout Session Id',
    }
    const fields = {
      cs_id: data.track_payments.attributes.cs_id,
      name: data.track_inscriptions.attributes.name,
      last_name: data.track_inscriptions.attributes.last_name,
      phone: data.track_inscriptions.attributes.phone,
      email: data.track_inscriptions.attributes.email,
    }
    const metadata = {
      scope: scope,
      product_name: data.track_payments.attributes.product_name,
      error,
      paymentsID: data.track_payments.id,
    }
    const slackMessage = this.utilsService.generateSlackErrorMessage(labels, metadata, fields)
    // console.log('slackMessage: ', slackMessage);
    
    this.utilsService.postSlackMessage(slackMessage).subscribe()
    

  }
}
