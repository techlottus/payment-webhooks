
import { Controller, Post, Req, Res } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { catchError, combineLatest, concatAll, mergeMap, of, pipe, switchMap, tap } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentsService: EnrollmentService, private readonly utilsService: UtilsService) {}

  @Post('/new')
  webhook(@Req() request: any, @Res() response: any ) {
    const ParamsHasError =  !!request.body.cs_id
    const ParamsError = `Missing parameters: ${ request.body.cs_id ? '' : 'cs_id, please check call.' }`
    
    const baseObservables = {
      inscription: this.utilsService.fetchStrapi("track-inscriptions", [`filters[cs_id][$eq]=${request.body.cs_id}`]),
      payment: this.utilsService.fetchStrapi("track-payments", [`filters[cs_id][$eq]=${request.body.cs_id}`]),
    }

    combineLatest(baseObservables).pipe(
      catchError((err, caught) => { console.error(err); return caught}),
      mergeMap(responses => {
        const inscription = { id: responses.inscription.data.data[0].id, ...responses.inscription.data.data[0].attributes }
        const payment = { id: responses.payment.data.data[0].id, ...responses.payment.data.data[0].attributes }
        // error correo, nombre, apellidos o LMSprogram
        const EnrollmentHasError =  [!!(request.body.email || inscription.email),  !!inscription.name, !!inscription.last_name].includes(false)
        const EnrollmentError = `Missing parameters: ${ request.body.email || inscription.email ? '' : 'Email ' }${ inscription.name ? '' : 'Name ' }${ inscription.last_name ? '' : 'Last Name ' } Check stripe data`
        
        
        const ProgramHasError =  !payment.metadata.LMSprogram
        const ProgramError = `Missing parameters: LMSprogram in stripe metadata, add it manually or contact admin for bulk edit.`
        
        const error = EnrollmentHasError ? EnrollmentError : ProgramHasError ? ProgramError : null
        const scope = EnrollmentHasError ? 'Enrollment data' : ProgramHasError ? 'Program data' : null

        const createUserObs = this.enrollmentsService.UserCreate(request.body.email || inscription.email, inscription.name, inscription.last_name)
        const programObs = this.enrollmentsService.getProgram(payment.metadata.LMSprogram)
        const userObs = this.enrollmentsService.checkUser(request.body.email || inscription.email).pipe(switchMap(res=> !!res.data[0] ? of(res) : createUserObs))

        
        return !!error ? combineLatest([of({ inscription, payment, error, scope })]) : combineLatest([of({inscription, payment, error, scope}), userObs, programObs])
      }),
      mergeMap(responses => {
        const inscription = responses[0].inscription 
        const payment = responses[0].payment
        if (responses[0].error) {
          return combineLatest([of({inscription, payment ,error: responses[0].error, scope: responses[0].scope})])
        }
        
        const user = responses[1].data[0]
        const program = responses[2].data.courses[0]
        // check if program exists error  
        const ProgramHasError =  !program
        const ProgramError = `Program ${ payment.metadata.LMSprogram }: not found, please check shortname.`
        const error = ProgramHasError ? ProgramError : null
        const scope = 'Program response'
        const enrollmentObs = this.enrollmentsService.enrollStudent(user.id, program.id)
        
        return ProgramHasError? combineLatest([of({inscription, payment, user, error, scope}), enrollmentObs ]) : combineLatest([of({inscription, payment, user, error, scope}), enrollmentObs ])
      })
    ).subscribe(responses => {
      
      let data: any = {
        inscription: responses[0].inscription,
        payment: responses[0].payment,
        email: request.body.email || responses[0].inscription.email,
      }
      if (responses[0].error) {
        this.SendSlackMessage(data,responses[0].scope, responses[0].error)
        response.status(400)
        response.send(responses[0].error)
      } else {

        data = { ...data, enrollment: responses[1].data }
  
        const EnrollmentHasError =  !!data.enrollment
        const EnrollmentError = JSON.stringify(data.enrollment)
  
        if (EnrollmentHasError) {
          this.SendSlackMessage(data,'Enrollment response', EnrollmentError)
          response.status(400)
          response.send(EnrollmentError)
        } else {
          response.status(201)
          response.send(data.enrollment)
        }
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
      cs_id: data.payment.cs_id,
      name: data.inscription.name,
      last_name: data.inscription.last_name,
      phone: data.inscription.phone,
      email: data.email
      
    }
    // console.log(data);
    
    // send slack message with error
    const metadata = {
      scope,
      product_name: data.payment.product_name,
      error,
      inscriptionsID: data.inscription.id,
      paymentsID: data.payment.id,
    }
    const slackMessage = this.utilsService.generateSlackErrorMessage(labels, metadata, fields)
    // console.log('slackMessage: ', slackMessage);
    
    this.utilsService.postSlackMessage(slackMessage).subscribe()

  }
}
