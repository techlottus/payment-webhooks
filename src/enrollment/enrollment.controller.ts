
import { Controller, Post, Req, Res } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { catchError, combineLatest, mergeMap, of, switchMap } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';
import * as xml2js from "xml2js"


@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentsService: EnrollmentService, private readonly utilsService: UtilsService) {}

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
        console.log('responses: ', responses);
        const DataHasError =  !responses.inscription.data.data[0]?.id || !responses.payment.data.data[0]?.id
        const DataError = `No data found in strapi for cs_id: ${request.body.cs_id}.`
        if (DataHasError) return combineLatest({
          error: of(DataError),
          scope: of('Data Strapi'),
        })
        
        const inscription = { id: responses.inscription.data.data[0].id, ...responses.inscription.data.data[0].attributes }
        const payment = { id: responses.payment.data.data[0].id, ...responses.payment.data.data[0].attributes }
        console.log('inscription: ', inscription);
        console.log('payment: ', payment);

        // error correo, nombre, apellidos o LMSprogram
        const EnrollmentHasError =  [!!(request.body.email || inscription.email),  !!inscription.name, !!inscription.last_name].includes(false)
        const EnrollmentError = `Missing parameters: ${ request.body.email || inscription.email ? '' : 'Email ' }${ inscription.name ? '' : 'Name ' }${ inscription.last_name ? '' : 'Last Name ' } Check stripe data`
        
        
        const ProgramHasError =  !payment.metadata.LMSprogram
        const ProgramError = `Missing parameters: LMSprogram in stripe metadata, add it manually or contact admin for bulk edit.`
        
        const error = EnrollmentHasError ? EnrollmentError : ProgramHasError ? ProgramError : DataHasError ? DataError : null
        const scope = EnrollmentHasError ? 'Enrollment data' : ProgramHasError ? 'Program data' : DataHasError ? 'Data Strapi' : null

        const chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const passwordLength = 10;
        let password = "";

        for (var i = 0; i <= passwordLength; i++) {
          var randomNumber = Math.floor(Math.random() * chars.length);
          password += chars.substring(randomNumber, randomNumber +1);
         }
        // console.log(password);
        console.log('request.body.email || inscription.email: ', request.body.email || inscription.email);
        
        const createUserObs = this.enrollmentsService.UserCreate(request.body.email || inscription.email, inscription.name, inscription.last_name, password)
        const programObs = this.enrollmentsService.getProgram(payment.metadata.LMSprogram)
        const userObs = this.enrollmentsService.checkUser(request.body.email || inscription.email).pipe(switchMap(res=> !!res.data[0] ? of({...res, exist: true }) : createUserObs))

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
        console.log('responses: ', responses);
        
        const inscription = responses.inscription
        const payment = responses.payment
        if (!!responses.user.data.exception) {
          return combineLatest([of({inscription, payment ,error: responses.user.data.message, scope: "User get or create"})])
          
        } else if (responses.error) {
          return combineLatest([of({inscription, payment ,error: responses.error, scope: responses.scope})])
        }
        // // log
        // console.log(responses.program.data);
        // console.log(responses.user.exist);
        
        const password = responses.password
        const user = {...responses.user.data[0], exist: responses.user.exist}
        const program = responses.program.data.courses[0]
        // console.log(user);
        // check if program exists error  
        const ProgramHasError =  !program?.id
        const ProgramError = `Program ${ payment.metadata.LMSprogram }: not found, please check shortname.`
        const error = ProgramHasError ? ProgramError : null
        const scope = ProgramHasError ?  'Program response' : null
        
        return ProgramHasError ? combineLatest([of({inscription, payment, user, error, scope, password})]) : combineLatest([of({inscription, payment, user, error, scope, password}), this.enrollmentsService.enrollStudent(user?.id, program?.id) ])
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
              template: this.utilsService.postSelfWebhook('/email/compile', { template_id: data.payment.metadata.enrollment_template,
                params: {
                  "email": data.email,
                  "campus": data.payment.metadata.SFcampus,
                  "password": !data.user.exist ? data.password : '',
                  "first_name": data.inscription.name,
                  "start_date": data.payment.date.split('T')[0]
                }
              }).pipe(catchError((err, caught) => {
                // console.log('err: ', err);
                
                return of({error: true, ...err})
              }))
            }
          : responseObs
        return combineLatest(responseObs)
      }),
      mergeMap(res => {
        
        if (res.error) return of(res)
        if (res.template.error) return of(res)

        const { compiled, template: { subject, priority } } = res.template?.data
        // console.log(JSON.parse(compiled));
        // console.dir(res.template.data.compiled);
        
        return combineLatest({
          payment: of(res.payment),
          template: of(res.template),
          email: of(res.email),
          inscription: of(res.inscription),
          enrollment: of(res.enrollment),
          send: this.utilsService.postSelfWebhook('/email/salesforce/send', {
            template: compiled,
            subject,
            toAddress: res.email,
            priority,
            ccToAddress: res.payment.metadata.backup_email || null
          })
        })
      })
    )
    .subscribe(responses => {
      if (responses.error) {
        this.SendSlackMessage(responses, responses.scope, responses.error)

        // response.status(400)
        // response.send(responses.error)
      } else {

        let data: any = {
          inscription: responses.inscription,
          payment: responses.payment,
          email: responses.email,
        }
        const sendMessage = (data, scope, error) => {
          this.SendSlackMessage(data, scope, error)
        }
        xml2js.parseString(responses.send.data,  function (err, result) {
          // console.dir(result);
          // console.dir(result['soapenv:Envelope']);
  
          const SendEmailHasError = result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].success[0] === 'false'
          if (SendEmailHasError) {
            const SendEmailError = {
              fields: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].fields,
              message: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].message,
              statusCode: result['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0].errors[0].statusCode,
            }
            const error = SendEmailHasError ? SendEmailError : null
            const scope = SendEmailHasError ?  'enrollment email' : null
  
            if (error) {
              sendMessage(data, scope, error)
              response.status(400)
              response.send(responses.error)
            } else {
              response.status(201)
              response.send(data.enrollment)
            }
          } 
          
        });
        response.send(data.enrollment)
      }
    })
  }
  SendSlackMessage(data: any, scope: string, error: string) {

    const labels = {
      email: 'Correo electrónico inscripción',
      name: 'Nombres',
      phone: 'Teléfono',
      last_name: 'Apellidos',
      cs_id: 'Checkout Session Id',
    }
    const fields = {
      cs_id: data.payment?.cs_id,
      name: data.inscription?.name,
      last_name: data.inscription?.last_name,
      phone: data.inscription?.phone,
      email: data.email,
    }
    // console.log(data);
    
    // send slack message with error
    const metadata = {
      scope,
      error,
      product_name: data.payment?.product_name,
      inscriptionsID: data.inscription?.id,
      paymentsID: data.payment?.id,
    }
    const slackMessage = this.utilsService.generateSlackErrorMessage(labels, metadata, fields)
    // console.log('slackMessage: ', slackMessage);
    
    this.utilsService.postSlackMessage(slackMessage).subscribe()

  }
}
