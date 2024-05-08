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
    // console.log('formResponse: ', formResponse);
    
    if (!cs_id) {
      response.status(400).send(`Webhook Error: Not checkout session id has been provided`);
      response.send();
    } else {
      const submitted_at = new Date()

        combineLatest({
          payment: this.utilsService.fetchStrapi('track-payments', [`filters[cs_id][$eq]=${cs_id}`]),
          inscription: this.utilsService.fetchStrapi('track-inscriptions', [`filters[cs_id][$eq]=${cs_id}`])
        }).pipe(
          mergeMap((res) => {
            // if (formResponse) {
              const track_inscriptions = !res.inscription.data.data[0] 
                ? {
                    attributes: {
                      cs_id,
                      submitted_at
                    },
                    exists: false,
                    filled: false
                  }
                : {
                    ...res.inscription.data.data[0],
                    exists: true,
                    filled: res.inscription.data.data[0].attributes.name && res.inscription.data.data[0].attributes.last_name && res.inscription.data.data[0].attributes.birthdate
                  }
              const track_payments = res.payment.data.data[0]
              console.log('formResponse: ', formResponse);
              
              const answers = !formResponse 
                ? null
                : formResponse?.definition?.fields?.reduce((acc: any, field: any, index: number) => {
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
              // console.log('answers: ', answers);
              
            // }
            // console.log('track_payments: ', track_payments);
            // const curp = track_payments?.attributes?.extra_fields;
            const curp = this.stripeService.getField(track_payments?.attributes?.extra_fields, 'curp')?.value
            const residence = this.utilsService.capitalizeText(this.stripeService.getField(track_payments?.attributes?.extra_fields, 'residencia')?.value)
            const username = this.utilsService.capitalizeText(this.stripeService.getField(track_payments?.attributes?.extra_fields, 'nombredelalumno')?.value)
            console.log('curp: ', curp);
            console.log('residence: ', residence);
            console.log('username: ', username);
            // console.log('track_inscriptions: ', track_inscriptions);
            
            const curpObservable = !!curp && !track_inscriptions.filled ? this.utilsService.postSelfWebhook('/curp/validate', {curp}) : of(false)
            const observables = {
              track_payments: of({...track_payments, residence, username}),
              track_inscriptions: of(track_inscriptions),
              curp: curpObservable,
              answers: of(answers)
            }
            return combineLatest(observables).pipe(
              catchError((err, caught) => {
                // console.log(track_payments);
                this.SendSlackMessage({ track_payments: track_payments, track_inscriptions }, 'CURP', err.response.data)
                // response.status(err.response.status).send(err.response.data);
                return of({ track_payments: {...track_payments, residence}, curp: { error: true, ...err} } )
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
            // console.log('res.track_inscriptions: ', res.track_inscriptions);
            // console.log('res.answers: ', res.answers);
            
            const inscription = !!res.curp.data 
              ? {
                  cs_id,
                  submitted_at,
                  residence: res.track_payments.residence,
                  email: res.track_payments?.attributes?.email,
                  phone: res.track_payments?.attributes?.phone,
                  name: this.utilsService.capitalizeText(res.curp.data.nombre),
                  CURP: res.curp.data.curp,
                  last_name: this.utilsService.capitalizeText(res.curp.data.apellidoPaterno),
                  second_last_name: this.utilsService.capitalizeText(res.curp.data.apellidoMaterno),
                  gender: res.curp.data.sexo,
                  birthdate: this.utilsService.capitalizeText(res.curp.data.fechaNacimiento),
                  birth_entity: this.utilsService.capitalizeText(res.curp.data.estadoNacimiento),
                  need_invoice: res.answers.need_invoice
                }
              : !!res.answers && !!res.answers.inscription 
                ? {
                    cs_id,
                    submitted_at,
                    residence: res.track_payments.residence,
                    email: res.track_payments?.attributes?.email,
                    name: res.track_payments.username,
                    phone: res.track_payments?.attributes?.phone,
                    ...res.answers.inscription,
                    need_invoice: res.answers.need_invoice
                  }
                : {
                    cs_id,
                    submitted_at,
                    residence: res.track_payments.residence,
                    email: res.track_payments?.attributes?.email,
                    name: res.track_payments.username,
                    phone: res.track_payments?.attributes?.phone,
                  }
            // console.log(inscription);
            const inscriptionObs = res.track_inscriptions.exists && res.track_inscriptions.filled
              ? of(res.track_inscriptions)
              : res.track_inscriptions.exists && !res.track_inscriptions.filled
                ? this.utilsService.putStrapi('track-inscriptions', inscription, res.track_inscriptions.id).pipe(catchError((err) => {
                    // console.log(err)
                    // response.status(err.response.status).send(err.response.data);
      
                    return of({ error: true, ...err})
                  }))
                : this.utilsService.postStrapi('track-inscriptions', inscription).pipe(catchError((err) => {
                    console.log(err)
                    // response.status(err.response.status).send(err.response.data);
      
                    return of({ error: true, ...err})
                  }))

            return combineLatest({
              payment: of(res.track_payment),
              inscription: inscriptionObs,
              invoice: this.utilsService.postStrapi('track-invoices', res.answers.invoice).pipe(catchError((err) => {
                // console.log(err)
                // response.status(err.response.status).send(err.response.data);
  
                return of({ error: true, ...err})
              }))
            })
          }),
          mergeMap(res => {
            console.log('res: ', res);
            // console.log('res.inscription.data?.data[0]: ', res.inscription.data?.data[0]);
            
            if (res?.error || res.curp?.error || res.curp?.data?.errorType || (!!res.inscription.exists && !!res.inscription.filled)) {
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
      product_name: data.track_payments?.attributes?.product_name,
      error,
      paymentsID: data.track_payments.id,
    }
    const slackMessage = this.utilsService.generateSlackErrorMessage(labels, metadata, fields)
    // console.log('slackMessage: ', slackMessage);
    
    this.utilsService.postSlackMessage(slackMessage).subscribe()
    

  }
}
