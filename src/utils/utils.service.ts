import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
require('dotenv').config();
import { env } from 'process';

@Injectable()
export class UtilsService {
  constructor(private readonly http: HttpService) {}
  Strapiconfig = { headers: { Authorization: `Bearer ${ env.STRAPI_TRACKING_TOKEN }` } }

  postStrapi (endpoint: string, data: any) {
    return this.http.post(`${env.STRAPI_TRACKING_URL}/api/${endpoint}`, { data }, this.Strapiconfig)
  }
  fetchStrapi = (model: string, params: string[] ) => {
    return this.http.get(`${env.STRAPI_TRACKING_URL}/api/${model}${!!params.length && '?' + params.join('&')}`, this.Strapiconfig)
  }
  callSFWebhook(cs_id: string) {
    return this.http.post(`${env.SELF_URL}/salesforce/inscription`, { cs_id })
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
  generateSlackErrorMessage(labels: any, metadata: any, data: any) {
    
    const fields = [];
    
    let section = { type: "section", fields: [] };
    Object.keys(data).forEach((key, index) => {
      section.fields.push({ type: "mrkdwn", text: `*${labels[key]}:* ${data[key]}` });
      fields.push(section);
      section = { type: "section", fields: [] }; // resetting section
    });
    const headerBlock = {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Hola :wave:",
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
  
    // Block template for Slack notification
    const notificationBlock = {
      "blocks": [
        env.NODE_ENV !== 'staging' ? headerBlock : testBlock,
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `Tenemos una nueva incidencia :is_fine:`
          },
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": metadata.error
          }
        },
        {
          "type": "divider"
        },
        ...fields,
        {
          "type": "divider"
        },
        {
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
        },
        metadata.invoicesID ? {
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
        } : {},
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
    return this.http.post(env.WEBHOOK_SLACK, message)
  }

  
}
