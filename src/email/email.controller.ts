import { Body, Controller, Post, Res } from '@nestjs/common';
import { UtilsService } from 'src/utils/utils.service';
import { EmailService } from './email.service';
import { catchError, mergeMap, of, take } from 'rxjs';
import Handlebars from "handlebars";

@Controller('email')
export class EmailController {
  constructor(public utils: UtilsService, public email: EmailService) {}

  @Post('/salesforce/send')
  sendEmail(@Body() body: {template: string, subject: string, toAddress: string, priority?: string, ccToAddress: string }, @Res() response: any ) {
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
