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
    return this.http.post(`${env.SELF_URL}/salesforce`, { data: { cs_id } })
  }
  getSFOffer(token:string, token_type:string, brand: string, campus: string ) {
    return this.http.get(`${env.SF_OFFER_ENDPOINT}?linea=${brand}&campus=${campus}`, { headers: { Authorization: `${token_type} ${token}` }})
  }
  authSF(){
    // return this.http.post(`https://lottus.my.salesforce.com/services/oauth2/token?client_id=3MVG9lIH5nSM6mjR1sxnwiuAneeDhWnxWVLzYW81MeLtMPkzBZF8DhWnsEa9510OrZzhCtfv7g0ENsn9EswT1&client_secret=EF01E2534DFE69292B4F2EE195A6EECE681020DF19DA66AF967C9CECEBF375E5&username=utc_integracion@lottuseducation.com&password=CRMLottusUTC2022*goQ3EioytWAEJl1HL9Lo23xzK&grant_type=password`)
    return this.http.post(`${env.SF_AUTH_ENDPOINT}?client_id=${env.SF_CLIENT_ID}&client_secret=${env.SF_CLIENT_SECRET}&username=${env.SF_USERNAME}&password=${env.SF_PASSWORD}&grant_type=${env.SF_GRANT_TYPE}`)
  }
}
