import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
require('dotenv').config();
import { env } from 'process';

@Injectable()
export class UtilsService {
  constructor(private readonly http: HttpService) {}
  config = { headers: { Authorization: `Bearer ${ env.STRAPI_TRACKING_TOKEN }` } }

  postStrapi (endpoint: string, data: any) {
    return this.http.post(`${env.STRAPI_TRACKING_API}/${endpoint}`, { data }, this.config)
  }
  fetchStrapi = async (model: string, params: string[] ) => {
    return this.http.get(`${env.STRAPI_TRACKING_API}/${model}${!!params.length && '?' + params.join('&')}`, this.config)
  }

}
