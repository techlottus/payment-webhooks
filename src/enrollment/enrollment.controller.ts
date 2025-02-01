
import { Controller, Post, Req, Res } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { catchError, combineLatest, mergeMap, of, switchMap } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';
import * as xml2js from "xml2js"
import { ErrorManagerService } from 'src/utils/error-manager.service';


@Controller('enrollment')
export class EnrollmentController {
  constructor(
    private readonly enrollmentsService: EnrollmentService,
    private readonly utilsService: UtilsService,
    public errorManager: ErrorManagerService
  ) {}

  @Post('/new')
  webhook(@Req() request: any, @Res() response: any ) {
    // console.log(request.body.cs_id );
    const ParamsHasError =  !request.body.cs_id
    const ParamsError = `Missing parameters: ${ request.body.cs_id ? '' : 'cs_id, please check call.' }`
    if(ParamsHasError) return response.status(400).send(ParamsError)
    
    const baseObservables = {
      inscription: this.utilsService.fetchStrapi("track-inscriptions", [`filters[cs_id][$eq]=${request.body.cs_id}`]),
      payment: this.utilsService.fetchStrapi("track-payments", [`filters[cs_id][$eq]=${request.body.cs_id}`]),
    }

    combineLatest(baseObservables).pipe(
      // catchError((err, caught) => { console.error(err); return caught }),
      mergeMap(responses => {
        // console.log('responses: ', responses);
        const DataHasError =  !responses.inscription.data.data[0]?.id || !responses.payment.data.data[0]?.id
        const DataError = `No data found in strapi for cs_id: ${request.body.cs_id}.`
        if (DataHasError) return combineLatest({
          error: of(DataError),
          scope: of('Missing Strapi data'),
        })
        
        const inscription = { id: responses.inscription.data.data[0].id, ...responses.inscription.data.data[0].attributes }
        const payment = { id: responses.payment.data.data[0].id, ...responses.payment.data.data[0].attributes }
        // console.log('inscription: ', inscription);
        // console.log('payment: ', payment);

        // error correo, nombre, apellidos o LMSprogram
        const EnrollmentHasError =  [!!(request.body.email || inscription.email),  !!inscription.name, !!inscription.last_name].includes(false)
        const EnrollmentError = `Missing parameters: ${ request.body.email || inscription.email ? '' : 'Email ' }${ inscription.name ? '' : 'Name ' }${ inscription.last_name ? '' : 'Last Name ' } Check stripe data`
        
        
        const ProgramHasError =  !payment.metadata.LMSprogram
        const ProgramError = `Missing parameters: LMSprogram in stripe metadata, add it manually or contact admin for bulk edit.`
        
        const error = EnrollmentHasError ? EnrollmentError : ProgramHasError ? ProgramError : DataHasError ? DataError : null
        const scope = EnrollmentHasError ? 'Missing inscription data' : ProgramHasError ? 'Missing LMSProgram' : DataHasError ? 'Missing Strapi data' : null

        const chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const passwordLength = 10;
        let password = "";

        for (var i = 0; i <= passwordLength; i++) {
          var randomNumber = Math.floor(Math.random() * chars.length);
          password += chars.substring(randomNumber, randomNumber +1);
         }
        // console.log(password);
        // console.log('request.body.email || inscription.email: ', request.body.email || inscription.email);
        
        const createUserObs = this.enrollmentsService.UserCreate(request.body.email || inscription.email, inscription.name, inscription.last_name, password, payment.metadata.provider)
        const programObs = this.enrollmentsService.getProgram(payment.metadata.LMSprogram, payment.metadata.provider)
        const userObs = this.enrollmentsService.checkUser(request.body.email || inscription.email, payment.metadata.provider).pipe(switchMap(res=> {
          // console.log('res.data: ', res.data);
          
          return !!res.data[0] ? of({...res, exist: true }) : createUserObs
        }))

        let responseObs: any = {
          inscription: of(inscription),
          payment: of(payment),
          error: of(error),
          scope: of(scope),
          password: of(password),
        }
        responseObs = !error
          ? {
              ...responseObs,
              user: userObs,
              program: programObs,
            }
          : responseObs
        return combineLatest(responseObs)
      }),
      mergeMap((responses: any) => {
        // console.log('responses: ', responses);
        
        const inscription = responses.inscription
        const payment = responses.payment
        if (!!responses?.user?.data?.exception) {
          // console.log('responses.user.data: ', responses.user.data);
          
          return combineLatest([of({inscription, payment ,error: responses.user.data.message, scope: "User get or create"})])
          
        } else if (responses.error) {
          return combineLatest([of({inscription, payment ,error: responses.error, scope: responses.scope})])
        }
        // // log
        // console.log('responses.program.data: ', responses.program?.data);
        // console.log('responses.program.courses: ', responses.program?.data.courses);
        // console.log('responses.program.courses[0]: ', responses.program?.data.courses[0]);
        // console.log(responses.user.exist);
        
        const password = responses.password
        const user = {...responses.user.data[0], exist: responses.user.exist}
        const program = responses.program.data.courses[0]
        // console.log(user);
        // check if program exists error  
        const ProgramHasError =  !program?.id
        const ProgramError = `Program ${ payment.metadata.LMSprogram }: not found, please check shortname.`
        const error = ProgramHasError ? ProgramError : null
        const scope = ProgramHasError ?  'Aula Program' : null
        
        return ProgramHasError
          ? combineLatest([of({inscription, payment, user, error, scope, password})])
          : combineLatest([
              of({inscription, payment, user, error, scope, password}),
              this.enrollmentsService.enrollStudent(user?.id, program?.id, payment.metadata.provider)
            ])
      }),
      mergeMap((responses: any) => {

        if (responses[0].error) return of(responses[0])
        let data: any = {
          inscription: responses[0].inscription,
          payment: responses[0].payment,
          password: responses[0].password,
          user: responses[0].user,
          scope: responses[0].scope,
          email: request.body.email || responses[0].inscription.email,
          enrollment: responses[1].data
        }
        // console.dir(data.user);
        

        
        const EnrollmentHasError =  !!data.enrollment
        const EnrollmentError = JSON.stringify(data.enrollment)

        const error = EnrollmentHasError ? EnrollmentError : null
        const scope = EnrollmentHasError ?  'Enrollment response' : null

        let responseObs: any = {
            payment: of(data.payment),
            inscription: of(data.inscription),
            email: of(data.email),
            error: of(data.error || error),
            scope: of(data.scope || scope),
            enrollment: of(data.enrollment),
        }
        responseObs = !error
          ? {
              ...responseObs,
              send: this.utilsService.postSelfWebhook('/email/send', {
                from: "admisiones",
                template_id: data.payment.metadata.enrollment_template,
                params: {
                  "email": data.email,
                  "campus": data.payment.metadata.SFcampus,
                  "password": !data.user.exist ? data.password : '',
                  "first_name": data.inscription.name,
                  "start_date": data.payment.date.split('T')[0]
                },
                to: [data.email],
                cc: data.payment.metadata.backup_email ? [data.payment.metadata.backup_email] : [],
                scope: "enrollment"
              }).pipe(catchError((err, caught) => {
                console.log('err: ', err);
                
                return of({error: true, ...err})
              }))
            }
          : responseObs
        return combineLatest(responseObs)
      })
    )
    .subscribe(responses => {
      if (responses.error) {

        const fields = {
          cs_id: responses.payment?.cs_id,
          name: responses.inscription?.name,
          last_name: responses.inscription?.last_name,
          phone: responses.inscription?.phone,
          email: responses.email,
        }
        // console.log(data);
        
        // send slack message with error
        const metadata = {
          scope: responses.scope,
          error: responses.error,
          product_name: responses.payment?.product_name,
          inscriptionsID: responses.inscription?.id,
          paymentsID: responses.payment?.id,
        }

        this.errorManager.ManageError(fields, metadata)

        // response.status(400)
        // response.send(responses.error)
      } else {
        response.send(responses.enrollment)
      }
    })
  }
}
