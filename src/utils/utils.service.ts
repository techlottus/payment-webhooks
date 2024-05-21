import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
require('dotenv').config();
import { env } from 'process';
import { catchError } from 'rxjs';

@Injectable()
export class UtilsService {
  constructor(private readonly http: HttpService) {}
  StrapiTrackingConfig = { headers: { Authorization: `Bearer ${ env.STRAPI_TRACKING_TOKEN }` } }
  StrapiTemplatesConfig = { headers: { Authorization: `Bearer ${ env.STRAPI_EMAIL_TEMPLATES_TOKEN }` } }
  

  postStrapi (endpoint: string, data: any) {
    return this.http.post(`${env.STRAPI_TRACKING_URL}/api/${endpoint}`, { data }, this.StrapiTrackingConfig)
  }
  putStrapi (endpoint: string, data: any, id:number) {
    return this.http.put(`${env.STRAPI_TRACKING_URL}/api/${endpoint}/${id}`, { data }, this.StrapiTrackingConfig)
  }
  fetchStrapi = (model: string, params: string[] ) => {
    return this.http.get(`${env.STRAPI_TRACKING_URL}/api/${model}${!!params.length && '?' + params.join('&')}`, this.StrapiTrackingConfig)
  }
  postEmailTemplate = (data: any) => {

    return this.http.post(`${env.STRAPI_EMAIL_TEMPLATES_URL}/api/templates/`,{ data }, this.StrapiTemplatesConfig)
  }
  putEmailTemplate = (data: any, id: number) => {

    return this.http.put(`${env.STRAPI_EMAIL_TEMPLATES_URL}/api/templates/${id}`,{ data }, this.StrapiTemplatesConfig)
  }
  fetchEmailTemplate = ({ id, name }:{ id?: number, name?: string}) => {
    const uri = !name ? `/api/templates/${id}` : `/api/templates?filters[name][$eq]=${name}`
    return this.http.get(`${env.STRAPI_EMAIL_TEMPLATES_URL}${uri}`, this.StrapiTemplatesConfig)
  }
  postSelfWebhook(endpoint: string, data: any, headers = {}) {
    return this.http.post(`${env.SELF_URL}${endpoint}`, data, headers)
  }
  getSFOffer(token:string, token_type:string, brand: string, campus: string ) {
    return this.http.get(`${env.SF_OFFER_ENDPOINT}?linea=${brand}&campus=${campus}`, { headers: { Authorization: `${token_type} ${token}` }})
  }
  authSF(){
    return this.http.post(`${env.SF_AUTH_ENDPOINT}?client_id=${env.SF_CLIENT_ID}&client_secret=${env.SF_CLIENT_SECRET}&username=${env.SF_USERNAME}&password=${env.SF_PASSWORD}&grant_type=${env.SF_GRANT_TYPE}`)
  }
  postSFInscription(data: any, token:string, token_type:string) {
    return this.http.post(`${env.SF_INSCRIPTION_ENDPOINT}`, data, { headers: { Authorization: `${token_type} ${token}` }})
  }
  sendSFemail(xml: any) {
    return this.http.post(`${env.SF_EMAIL_ENDPOINT}`,  xml, { headers: { "Content-Type": `text/xml;charset=UTF-8`, SOAPAction: 'HTTP' }})
  }
  generateSlackErrorMessage(labels: any, metadata: any, data: any) {
    
    const fields = [];
    
    let section = { type: "section", text: {} };
    Object.keys(data).forEach((key, index) => {
      section.text = { type: "mrkdwn", text: `*${labels[key]}:* ${data[key]}` };
      fields.push(section);
      section = { type: "section", text: {}  }; // resetting section
    });
    const headerBlock = {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Hola Tenemos una nueva incidencia :is_fine:",
        "emoji": true
      }
    }
    const testBlock = {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Hola, esto es una prueba, favor de ignorar. :everythingsfineparrot: ",
        "emoji": true
      }
    }

    const buttonBlocks = {
      invoicesID: {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Acceso a track invoices"
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Navegar a strapi",
            "emoji": true
          },
          "value": "click_me_123",
          "url": `${env.STRAPI_TRACKING_URL}/admin/content-manager/collectionType/api::track-invoice.track-invoice/${metadata.invoicesID}`,
          "action_id": "button-action"
        }
      },
      inscriptionsID: {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Acceso a track inscriptions"
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Navegar a strapi",
            "emoji": true
          },
          "value": "click_me_123",
          "url": `${env.STRAPI_TRACKING_URL}/admin/content-manager/collectionType/api::track-inscription.track-inscription/${metadata.inscriptionsID}`,
          "action_id": "button-action"
        }
      },
      paymentsID: {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Acceso a track payments"
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Navegar a strapi",
            "emoji": true
          },
          "value": "click_me_123",
          "url": `${env.STRAPI_TRACKING_URL}/admin/content-manager/collectionType/api::track-payment.track-payment/${metadata.paymentsID}`,
          "action_id": "button-action"
        }
      }
    }
    const buttons = [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Acceso a track payments"
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Navegar a strapi",
            "emoji": true
          },
          "value": "click_me_123",
          "url": `${env.STRAPI_TRACKING_URL}/admin/content-manager/collectionType/api::track-payment.track-payment/${metadata.paymentsID}`,
          "action_id": "button-action"
        }
      }
    ]
    const invoiceButton = {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Acceso a track invoices"
      },
      "accessory": {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Navegar a strapi",
          "emoji": true
        },
        "value": "click_me_123",
        "url": `${env.STRAPI_TRACKING_URL}/admin/content-manager/collectionType/api::track-invoice.track-invoice/${metadata.invoicesID}`,
        "action_id": "button-action"
      }
    }
    const inscriptionsButton = {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Acceso a track inscriptions"
      },
      "accessory": {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Navegar a strapi",
          "emoji": true
        },
        "value": "click_me_123",
        "url": `${env.STRAPI_TRACKING_URL}/admin/content-manager/collectionType/api::track-inscription.track-inscription/${metadata.inscriptionsID}`,
        "action_id": "button-action"
      }
    }
    if (metadata.invoicesID) buttons.push(invoiceButton)
    if (metadata.inscriptionsID) buttons.push(inscriptionsButton)
  
    // Block template for Slack notification
    const notificationBlock = {
      "blocks": [
        env.NODE_ENV !== 'staging' ? headerBlock : testBlock,
        {
          "type": "section",
          "fields": [
            {
              "type": "plain_text",
              "text": `Parte del proceso: ${metadata.scope}`,
              "emoji": true
            },
            {
              "type": "plain_text",
              "text": `Producto: ${metadata.product_name}`,
              "emoji": true
            },
          ]
        },
        {
          "type": "divider"
        },
        {
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": "Error",
            "emoji": true
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": JSON.stringify(metadata.error, null, 2)
          }
        },
        {
          "type": "divider"
        },
        ...fields,
        {
          "type": "divider"
        },
        ...buttons,
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "Hasta aquí mi reporte. Nos vemos pronto!"
          }
        }
      ]
    };
    return notificationBlock
  
  }
  postSlackMessage(message: any) {
    return this.http.post(env.WEBHOOK_SLACK, message).pipe(catchError((err, caught) => {
      console.log(err);
      
      return caught
    }))
  }
  capitalizeText(text: string) {
    if (!text) return text
    const capitalizedText = text.split(' ').map(str => {
      
      const strArr = str.split('')
      const [ first, ...rest ] = strArr
      return `${first.toUpperCase()}${rest.join('').toLowerCase()}`
    }).join(' ')
    return capitalizedText
  }
}
