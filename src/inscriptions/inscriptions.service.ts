import {  Injectable } from '@nestjs/common';
import { catchError, combineLatest, forkJoin, mergeMap, of } from 'rxjs';
import { StripeService } from 'src/stripe/stripe.service';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class InscriptionsService {
  
  constructor(private utilsService: UtilsService, private stripeService: StripeService) {}
  async populateStrapi(body: any, response: any) {

    const formResponse = body.form_response || null
    const cs_id = formResponse?.hidden?.checkout_session_id || body.cs_id
    const repeatedFields = ['RFC', 'CFDI_use', 'tax_regime']
    console.log('formResponse: ', formResponse);
    
    if (!cs_id) {
      response.status(400).send(`Webhook Error: Not checkout session id has been provided`);
      response.send();
    } else {
      const submitted_at = new Date()

   
        this.utilsService.fetchStrapi('track-payments', [`filters[cs_id][$eq]=${cs_id}`]).pipe(
          mergeMap((res) => {
            // if (formResponse) {
        
              const answers = !formResponse 
                ? null
                : formResponse.definition.fields.reduce((acc: any, field: any, index: number) => {
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
              
            // }
            // console.log('res.data.data[0]: ', res.data.data[0]);
            // const curp = res.data.data[0].attributes.extra_fields;
            const curp = this.stripeService.getField(res.data.data[0].attributes.extra_fields, 'curp').value
            const residence = this.utilsService.capitalizeText(this.stripeService.getField(res.data.data[0].attributes.extra_fields, 'residencia').value)
            // console.log('curp: ', curp);
            // console.log('residence: ', residence);
            
            const curpObservable = !!curp ? this.utilsService.postSelfWebhook('/curp/validate', {curp}) : of(false)
            const observables = { track_payments: of({...res.data.data[0], residence}), curp: curpObservable, answers: of(answers) }
            return combineLatest(observables).pipe(
              catchError((err, caught) => {
                // console.log(res.data.data[0]);
                this.SendSlackMessage({ track_payments: res.data.data[0], track_inscriptions:{ attributes: { cs_id, submitted_at } } }, 'CURP', err.response.data)
                // response.status(err.response.status).send(err.response.data);
                return of({ track_payments: {...res.data.data[0], residence}, curp: { error: true, ...err} } )
              }),
            )
            
          }),
          
          mergeMap((res: any) => {
            
            if (res.curp.error || res.curp.data?.errorType) {
              // console.log('res.curp?.response?.data: ', res.curp?.response?.data);
              this.SendSlackMessage({track_payments: res.track_payments, track_inscriptions:{ cs_id, submitted_at }}, 'CURP', res.curp.response?.data || JSON.parse(res.curp.data.errorMessage).error)
              return of(res)
            }
            // console.log('res.curp.error: ', res.curp.error);
            // console.log('res: ', res);
            
            const inscription = !!res.curp.data 
            ? {
                cs_id,
                submitted_at,
                residence: res.track_payments.residence,
                email: res.track_payments.attributes.email,
                phone: res.track_payments.attributes.phone,
                name: this.utilsService.capitalizeText(res.curp.data.nombre),
                CURP: res.curp.data.curp,
                last_name: this.utilsService.capitalizeText(res.curp.data.apellidoPaterno),
                second_last_name: this.utilsService.capitalizeText(res.curp.data.apellidoMaterno),
                gender: res.curp.data.sexo,
                birthdate: this.utilsService.capitalizeText(res.curp.data.fechaNacimiento),
                birth_entity: this.utilsService.capitalizeText(res.curp.data.estadoNacimiento)
              }
            : {
              cs_id,
              submitted_at,
              ...res.answers
              }
            // console.log(inscription);
            
         

            return combineLatest({
              payment: of(res.track_payment),
              inscription:  this.utilsService.postStrapi('track-inscriptions', inscription).pipe(catchError((err) => {
                // console.log(err)
                // response.status(err.response.status).send(err.response.data);
  
                return of({ error: true, ...err})
              }))
            })
          }),
          mergeMap(res => {
            console.log('res: ', res);
            
            if (res?.error || res.curp?.error || res.curp?.data?.errorType) {
              return of(res)
            }
            return  this.utilsService.postSelfWebhook('/salesforce/inscription', { cs_id }) 
          })
        )
       .subscribe(() => {

         response.send()
       })
        
    
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
      cs_id: data.track_payments?.attributes?.cs_id,
      name: data.track_inscriptions?.attributes?.name,
      last_name: data.track_inscriptions?.attributes?.last_name,
      phone: data.track_inscriptions?.attributes?.phone,
      email: data.track_inscriptions?.attributes?.email,
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
