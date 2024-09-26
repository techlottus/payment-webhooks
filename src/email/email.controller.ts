import { Body, Controller, Post, Res } from '@nestjs/common';
import { UtilsService } from 'src/utils/utils.service';
import { EmailService } from './email.service';
import { catchError, mergeMap, of, take } from 'rxjs';
import Handlebars from "handlebars";
import { parseString } from "xml2js";

type SendEmailBody = {
  template: string;
  subject: string;
  toAddress: string;
  priority?: string;
  ccToAddress: string;
  template_id?: string;
  params?: any;
  scope?: string;
  template_name?: string;
}

@Controller('email')
export class EmailController {
  constructor(public utils: UtilsService, public email: EmailService) {}

  @Post('/salesforce/send')
  sendEmail(@Body() body: SendEmailBody, @Res() response: any ) {
    // console.log(body);
    const {
      template, 
      subject, 
      toAddress,
      template_id,
      params,
      scope,
      template_name
    } = body
    
    const priority = body.priority || 'Normal'
    const ccToAddress = body.ccToAddress || null
    this.utils.authSF().pipe(
      mergeMap(authRes => {
        const token = authRes.data.access_token
        const xml = this.email.generateXML(token, template, subject, toAddress, priority, ccToAddress )

        return  this.utils.sendSFemail(xml)
      }),
      catchError((err, caught)=> { console.log(err); return caught }),
      mergeMap(sendRes => {
        console.log('sendRes: ', sendRes.data);
        let Res;
        parseString(sendRes.data, (err, data) => {
          if (err) {
            console.log('err: ', err);
            Res = err
          }
          if (data) {
            const headersDigestedData = data['soapenv:Envelope']['soapenv:Header']
            const bodyDigestedData = data['soapenv:Envelope']['soapenv:Body'][0].sendEmailResponse[0].result[0]
            const { errors, success } = bodyDigestedData
            
            console.log('headersDigestedData: ', headersDigestedData);
            console.log('errors: ', errors);
            console.log('success: ', success);
            Res = { headers: headersDigestedData, ...bodyDigestedData}

          }
        })

        const { current, limit } = Res.headers[0].LimitInfoHeader[0].limitInfo[0]

        const errors = Res.errors?.map(error => {
          const { fields, message, statusCode } = error
          const newfields = fields.map( field => { return {field} });
          console.log(newfields);
          return {
            fields: newfields,
            message: message[0],
            statusCode: statusCode[0],
          }
        })
        // console.log(errors);
        return this.utils.postStrapi('track-send-emails', {
          template: template_name,
          template_id: `${template_id}`,
          params,
          scope,
          compiled_template: template,
          email: toAddress,
          subject,
          delivered: Res.success[0] === 'true',
          daily_current_count: current[0],
          sending_limit: limit,
          errors
        })
      }),
      catchError(err => {
        console.log(err);
        
        return of(err)
      })
    ).subscribe(res => {
      // console.log(res);
      
        response.send()
      
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
      
      response.send(JSON.stringify({ compiled, params, template: template_data, template_id: res.data.data.id}))
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
