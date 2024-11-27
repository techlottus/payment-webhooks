import { Body, Controller, Post, Res } from '@nestjs/common';
import { UtilsService } from 'src/utils/utils.service';
import { EmailService } from './email.service';
import { catchError, combineLatest, from, mergeMap, of, take } from 'rxjs';
import Handlebars from "handlebars";
// import formData from 'form-data';
import * as formData from "form-data";
import Mailgun from 'mailgun.js';
import { ErrorManagerService } from 'src/utils/error-manager.service';
@Controller('email')
export class EmailController {
  constructor(public utils: UtilsService, public email: EmailService, public errorManager: ErrorManagerService) {}

  @Post('/salesforce/send')
  sendSFEmail(
    @Body() 
      body: {
        template: string,
        subject: string,
        toAddress: string,
        priority?: string,
        ccToAddress: string
      }, 
    @Res() response: any ) {
    // console.log(body);
    const {
      template, 
      subject, 
      toAddress,
    } = body
    
    const priority = body.priority || 'Normal'
    const ccToAddress = body.ccToAddress || null
    this.utils.authSF().pipe(
      mergeMap(authRes => {
        const token = authRes.data.access_token
        const xml = this.email.generateXML(token, template, subject, toAddress, priority, ccToAddress )
        
       return  this.utils.sendSFemail(xml)
      }),
      catchError((err, caught)=> { console.log(err); return caught })
    ).subscribe(res => {
      response.send(res.data)
    })
  }
  @Post('/send')
  sendMailgunEmail(
    @Body() body: {
      scope: string,
      template_id: number,
      params: {
        [key:string]: any
      },
      to: [string],
      from: string,
      subject: string,
      priority?: string,
      cc?: [string],
      bcc?: [string]
    },
    @Res() response: any ) {
    // console.log(body);

    if (!body.template_id) {
      response.status(400).send("please send a template_id")
    }
    if (!body.to) {
      response.status(400).send("please send a to")
    }
    if (!body.from) {
      response.status(400).send("please send a from")
    }
    if (!body.subject) {
      response.status(400).send("please send a subject")
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY || 'key-yourkeyhere'});

    const domain = process.env.NODE_ENV === 'staging'
      ? 'sandbox36f0ec835fa345f9b2fe25ad8b9b55b3.mailgun.org'
      : process.env.MAILGUN_DOMAIN    
    
    this.utils.fetchEmailTemplate({ id: body.template_id })
      .pipe(
        catchError((err, caught) => {console.log(err); return caught}),
        mergeMap(res => {
           // console.log(res);
          const template_data = res.data.data.attributes
          const template = Handlebars.compile(template_data.html, { noEscape: true });
          const presubject = Handlebars.compile(body.subject, { noEscape: true })
          // use params only if staging or throw an error
          let params = (body.params || template_data.params) || {}
          // const message = (!body.params && template_data.params) && "No params where sent, will use default params from template." 

          const compiled = template(params)
          const subject = presubject(params)

          return combineLatest({
            send: from(mg.messages.create(domain, {
              ...body,
              subject,
              from: `${process.env.NODE_ENV === 'staging' && 'Envío de prueba: test.'}${body.from}@${domain}`,
              html: compiled,
            })).pipe(
              catchError((err, caught) => {console.log(err); return of({...err, error: true})}),
            ),
            compiled: of(compiled),
            template_data: of(template_data),
            subject: of(subject)
          })
        }),
        mergeMap(res => {
        const trackEmailsData = {
            template: res.template_data.name,
            template_id: `${body.template_id}`,
            params: body.params,
            scope: body.scope,
            compiled_template: res.compiled,
            email: body.to.join(', '),
            subject: res.subject,
            delivered: !res.send?.error,
            error: res.send.details || '',
            statusCode: `${res.send.status}`,
            send_id: res.send.id || '',
            cc: body.cc.join(', '),
            bcc: body.bcc.join(', '),
          }

          return combineLatest({
            send: of(res.send),
            compiled: of(res.compiled),
            template_data: of(res.template_data),
            track: this.utils.postStrapi('track-send-emails', trackEmailsData).pipe(
              catchError((err, caught) => {console.log(err); return of({...err, error: true})}),
            )
          }) 
        }),

      )
      .subscribe((res) => {
        const status = res.track.status || res.track.response.status
        
        const msg = JSON.stringify(res.track.data || res)
        if (res.send.error) {
          this.errorManager.ManageError({ to: body.to.join(", ") }, {
            scope: 'send email',
            error: `${res.send.message}: ${res.send.details}`,
            emailID: res.track.data.data.id,
            email_template: res.template_data.name
          })
        }
        response.status(status).send(msg)
      })

    
  }

  @Post('/compile')
  compileEmail(@Body() body: { template_id: number, params: { [key:string]: any } }, @Res() response: any) {
    body.template_id
    if (!body.template_id) {
      response.status(400).send("please send a template id")
    }
    
    this.utils.fetchEmailTemplate({ id: body.template_id }).pipe(catchError((err, caught) => {console.log(err); return caught})).subscribe((res) => {
      // console.log(res);
      const template_data = res.data.data.attributes
      const template = Handlebars.compile(template_data.html, { noEscape: true });
      // use params only if staging or throw an error
      let params = (body.params || template_data.params) || {}
      // const message = (!body.params && template_data.params) && "No params where sent, will use default params from template." 

      const compiled = template(params)
      // console.log(compiled);
      
      response.send(JSON.stringify({ compiled, params, template: template_data}))
    } )
    // body.data
  }

  @Post('/create/template')
  sendTemplateStrapi(@Body() body: { name: string, subject: string, preheader: string, html: string  }, @Res() response: any) {
    // console.log(body);
    
    const { html, name, subject } = body
    const params = html.split('{{')
    params.splice(0,1)
    const finalParams = params.reduce((acc, param) => {
      acc[param.split('}}')[0].trim()] = "data prueba, cambiar en strapi"
      return acc
    }, {})
    this.utils.fetchEmailTemplate({ name })
      .pipe(
        mergeMap((templateRes) => {
          let params = { name, html, subject, params: finalParams }

          // console.log(templateRes.data.data);
          const obs = templateRes.data.data[0]?.id ? this.utils.putEmailTemplate(params, templateRes.data.data[0].id).pipe(
            catchError((err,caught) => {
              // console.log(err);
              // console.log(err);
              response.status(err.response.status).send(err.response.data.error)
              return caught
            })) 
          : this.utils.postEmailTemplate(params).pipe(
            catchError((err,caught) => {
              // console.log(err);
              // console.log(err);
              response.status(err.response.status).send(err.response.data.error)
              return caught
            }))
          // return of(templateRes)
          return obs
        }),
        
      ).subscribe(res => {
        console.log(res)
        if (res.data) {
          response.send(res.data)
        }
      })
  }
}
