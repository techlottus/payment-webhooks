import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
require('dotenv').config();
import { env } from 'process';

@Injectable()
export class UtilsService {
  constructor(public readonly http: HttpService) {}

  async postStrapi (endpoint: string, data: any) {
    return this.http.post(`${env.STRAPI_TRACKING_API}/${endpoint}`, { data }, { headers: { Authorization: `Bearer ${env.STRAPI_TRACKING_TOKEN}` }})
  }

}
