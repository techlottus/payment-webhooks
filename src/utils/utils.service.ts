import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
require('dotenv').config();
import { env } from 'process';

@Injectable()
export class UtilsService {
  constructor(private readonly http: HttpService) {}
  Strapiconfig = { headers: { Authorization: `Bearer ${ env.STRAPI_TRACKING_TOKEN }` } }

  postStrapi (endpoint: string, data: any) {
    return this.http.post(`${env.STRAPI_TRACKING_API}/${endpoint}`, { data }, this.Strapiconfig)
  }
  fetchStrapi = (model: string, params: string[] ) => {
    return this.http.get(`${env.STRAPI_TRACKING_API}/${model}${!!params.length && '?' + params.join('&')}`, this.Strapiconfig)
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
}
