import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
require('dotenv').config();
import { env } from 'process';
import { catchError } from 'rxjs';

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
  postSelfWebhook(endpoint: string, data: any) {
    return this.http.post(`${env.SELF_URL}${endpoint}`, data)
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
    if (metadata.invoicesID) buttons.push(invoiceButton)
  
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

  
}
