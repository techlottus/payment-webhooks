import { Body, Controller, Post } from '@nestjs/common';
import { SalesforceService } from './salesforce.service';
import { UtilsService } from 'src/utils/utils.service';
import { catchError, combineLatest, forkJoin, mergeMap, of, take } from 'rxjs';
import { ErrorManagerService } from 'src/utils/error-manager.service';

@Controller('salesforce')
export class SalesforceController {
  constructor(
    private readonly salesforceService: SalesforceService,
    private utilsService: UtilsService,
    public errorManager: ErrorManagerService
  ) {}

  @Post('/inscription')
  inscription(@Body() body: any) {
    // console.log('cs_id: ', cs_id);

      const routes = ['track-invoices', 'track-payments', 'track-inscriptions' ]

      forkJoin(routes.map(route => this.utilsService.fetchStrapi(route, [`filters[cs_id][$eq]=${body.cs_id}`]))).pipe(
        take(1),
        mergeMap(responses => {
          const data: any = responses.reduce((acc, res, i) => {
            acc = { ...acc, [routes[i].replace('-', '_')]: res.data.data[0] }
            return acc
          }, {})
          const enrrollments = [ data.track_inscriptions?.attributes?.enrollment === null,  data.track_payments?.attributes?.enrollment === null, data.track_inscriptions?.attributes.need_invoice ? data.track_invoices?.attributes?.enrollment === null : true ]
          return !enrrollments.includes(false) ?  combineLatest({ data: of(data), auth: this.utilsService.authSF()}) : of({ error: 'Missing data'})
        }),
        mergeMap( res => {
            // console.log('res: ', res);

          const authResponse = res['auth']
          const data = res['data']
          const err = res['error']
        
          // console.log('err: ', err);
          return err
            ? of({ data: data, error: true, errorData: err, inscription: false})
            : combineLatest({
              data: of(data),
              inscription: this.utilsService.postSFInscription(this.salesforceService.formatEnrollRequest(data), authResponse.data.access_token, authResponse.data.token_type)
                .pipe(
                  catchError((err) => {
                    console.log('SF inscription error: ', err.response)
                    return of({ error: true, ...err.response.data[0]})
                  })
                )
            })
        })
      ).subscribe(res => {
        // console.log(`res: `, res);
        const data = res.data
        // console.log(`res.error: `, res.error);
        // console.log(`res.data: `, res.data);
        // console.log(`res.inscription: `, res.inscription);
        // console.log(`data[${routes[0]}]: `, data[routes[0]]);
        // console.log(`data[${routes[1]}]: `, data[routes[1]]);
        // console.log(`data[${routes[2]}]: `, data[routes[2]]);

        // console.log('enrrollments: ', enrrollments);
        if (res.inscription?.data?.Exitoso === 'False' || res.inscription?.error) {

          const fields = {
            cs_id: data.track_payments?.attributes?.cs_id,
            name: data.track_inscriptions?.attributes?.name,
            last_name: data.track_inscriptions?.attributes?.last_name,
            phone: data.track_inscriptions?.attributes?.phone,
            email: data.track_inscriptions?.attributes?.email,
          }
          const metadata = {
            scope: 'Salesforce',
            product_name: data.track_payments?.attributes?.product_name,
            error:  res.inscription?.data?.Error || res.inscription?.message,
            inscriptionsID: data.track_inscriptions.id,
            paymentsID: data.track_payments.id,
            invoicesID: data.track_invoices?.id,
          }
    
          this.errorManager.ManageError(fields, metadata)
        } else {
          if (data.track_payments?.attributes?.metadata?.flow !== "ATR" ) {
            // call enrollment webhook if not atr
            const data = res.data.email ? { cs_id: body.cs_id, email: res.data.email } : { cs_id: body.cs_id }
            // console.log('Enrollment data',data);
            this.utilsService.postSelfWebhook('/enrollment/new', data).subscribe()
          }
        }
      })
  }
}
