import { Body, Controller, Post, Req } from '@nestjs/common';
import { SalesforceService } from './salesforce.service';
import { UtilsService } from 'src/utils/utils.service';
import { catchError, combineLatest, forkJoin, mergeMap, of, take } from 'rxjs';

@Controller('salesforce')
export class SalesforceController {
  constructor(private readonly salesforceService: SalesforceService, private utilsService: UtilsService) {}

  @Post('/inscription')
  inscription(@Body() body: any) {
    // console.log('cs_id: ', cs_id);
    try {
      const routes = ['track-invoices', 'track-payments', 'track-inscriptions' ]

      forkJoin(routes.map(route => this.utilsService.fetchStrapi(route, [`filters[cs_id][$eq]=${body.cs_id}`]))).pipe(
        take(1),
        mergeMap(responses => {
          const data: any = responses.reduce((acc, res, i) => {
            acc = { ...acc, [routes[i].replace('-', '_')]: res.data.data[0] }
            return acc
          }, {})
          const enrrollments = [ data.track_inscriptions?.attributes?.enrollment === null,  data.track_payments?.attributes?.enrollment === null, data.track_inscriptions?.attributes.need_invoice ? data.track_invoices?.attributes?.enrollment === null : true ]
          // if (!enrrollments.includes(false)) {
          //   this.utilsService.authSF().pipe(
          //     take(1), 
          //     catchError((err) => {
          //       // console.log(err)
          //       return of(err.response)
          //     })
          //   )
          // }
          return !enrrollments.includes(false) ?  combineLatest({ data, auth: this.utilsService.authSF()}) : of({ error: 'Missing data'})
        }),
        mergeMap( res => {
          // .subscribe(authResponse => {
            // console.log('authResponse.data: ', authResponse.data);

            const authResponse = res['auth']
            const data = res['data']
            const err = res['error']
            const finalData = this.salesforceService.formatEnrollRequest(data)
          
            // console.log('finalData: ', finalData);
            return err ? of(err) : combineLatest({ data, inscription: this.utilsService.postSFInscription(finalData, authResponse.data.access_token, authResponse.data.token_type)})
            .pipe(
              catchError((err) => {
                console.log(err.response.data.message)
                return of(err)
              })
            )
        // })
        })
      ).subscribe(res => {
        const data = res.data
        // console.log(`data: `, data);
        // console.log(`data[${routes[0]}]: `, data[routes[0]]);
        // console.log(`data[${routes[1]}]: `, data[routes[1]]);
        // console.log(`data[${routes[2]}]: `, data[routes[2]]);

        // console.log('enrrollments: ', enrrollments);
        if (res.inscription.data.Exitoso === 'False') {
          this.SendSlackMessage(data, 'Salesforce', res.data.Error)
        } else if (data.track_payments.attributes.metadata.SFcampus !== "UTC A TU RITMO") {
          // call enrollment webhook if not atr
          const data = res.data.email ? { cs_id: body.cs_id, email: res.data.email } : { cs_id: body.cs_id }
          console.log(data);
          
          this.utilsService.callSelfWebhook('/enrollment/new', data).subscribe()

        }
       
      })
    } catch (error) {
      console.error(error)
      return error
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
      error: error,
      inscriptionsID: data.track_inscriptions.id,
      paymentsID: data.track_payments.id,
      invoicesID: data.track_invoices?.id,
    }
    const slackMessage = this.utilsService.generateSlackErrorMessage(labels, metadata, fields)
    // console.log('slackMessage: ', slackMessage);
    
    this.utilsService.postSlackMessage(slackMessage).subscribe()
    

  }
}
