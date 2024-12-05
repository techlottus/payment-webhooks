import { Injectable } from '@nestjs/common';
import { UtilsService } from 'src/utils/utils.service';

export type Fields = {
  cs_id?: string;
  name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  to?: string;
  
}

export type Metadata = {
  scope: string;
  error:string;
  product_name?: string;
  invoicesID?: number;
  inscriptionsID?: number;
  paymentsID?: number;
  emailID?: number;
  email_template?: string;
}

const labels: Fields = {
  email: 'Correo electrónico',
  name: 'Nombres',
  phone: 'Teléfono',
  last_name: 'Apellidos',
  cs_id: 'Checkout Session Id',
  to: 'Recipientes de correo'
}

@Injectable()
export class ErrorManagerService {
  constructor(private utilsService: UtilsService) {}
  
  ManageError(fields: Fields, metadata: Metadata) {
    
    const slackMessage = this.utilsService.generateSlackErrorMessage(
      labels,
      metadata,
      fields,
    );
    // console.log('slackMessage: ', slackMessage);

    this.utilsService.postSlackMessage(slackMessage).subscribe();

    // add logic to report error data
  }
  
}







    




