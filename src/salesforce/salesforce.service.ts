import { Injectable, Response } from '@nestjs/common';
import { subscribe } from 'diagnostics_channel';
import { catchError, forkJoin, of, take, throwError } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';

let inputData;
@Injectable()
export class SalesforceService {
  constructor(private utilsService: UtilsService) {}

  formatPhone (phone: string) {
    let formattedPhone = phone;

    if (phone?.length === 13) {
      formattedPhone = phone?.slice(3);
    } else if (phone?.length === 12) {
      formattedPhone = phone?.slice(2);
    }
    return formattedPhone

  }

  validateOfferPeriod = (periodStartDate, periodExpireDate) => {
    const formatedStartDate = new Date(periodStartDate);
    const formatedExpireDate = new Date(periodExpireDate);
    const formatedPaymentDate = new Date(inputData?.paymentDate);

    formatedStartDate?.setHours(0,0,0);
    formatedExpireDate?.setHours(23,59,59);

    return formatedPaymentDate?.getTime() >= formatedStartDate?.getTime() && formatedPaymentDate?.getTime() <= formatedExpireDate?.getTime();
  };
  
  formatEnrollRequest(data: any) {
    // this is wrapped in an `async` function
    // you can use await throughout the function

    // Format generoEstudiante
    const generos = {
      "Masculino": "Hombre",
      "Femenino": "Mujer",
      "Otro": "Otro"
    };

    const generoEstudiante = generos?.[data?.generoEstudiante];

    // Format tipoPersona
    const tiposPersona = {
      "Persona física": "Fisica",
      "Persona moral": "Moral"
    };


    // Format estadoFacturacion
    const estadosFacturacion = {
    "DESCONOCIDO": "00",
    "AGUASCALIENTES": "01",
    "BAJA CALIFORNIA": "02",
    "BAJA CALIFORNIA SUR": "03",
    "CAMPECHE": "04",
    "COAHUILA DE ZRAGOZA": "05",
    "COLIMA": "06",
    "CHIAPAS": "07",
    "CHIHUAHUA": "08",
    "CIUDAD DE MÉXICO": "09",
    "DURANGO": "10",
    "GUANAJUATO": "11",
    "GUERRERO": "12",
    "HIDALGO": "13",
    "JALISCO": "14",
    "ESTADO DE MÉXICO": "15",
    "MICHOACÁN DE OCAMPO": "16",
    "MORELOS": "17",
    "NAYARIT": "18",
    "NUEVO LEÓN": "19",
    "OAXACA": "20",
    "PUEBLA": "21",
    "QUERÉTARO": "22",
    "QUINTANA ROO": "23",
    "SAN LUIS POTOSÍ": "24",
    "SINALOA": "25",
    "SONORA": "26",
    "TABASCO": "27",
    "TAMAULIPAS": "28",
    "TLAXCALA": "29",
    "VERACRUZ": "30",
    "YUCATÁN": "31",
    "ZACATECAS": "32",
    "EXTRANJERO": "33",
    };

    let estadoFacturacion = "00";
    if (!!data?.nacionalidadEstudiante && data?.nacionalidadEstudiante !== "Nacional") {
      estadoFacturacion = "33";
    } else if(data?.estadoFacturacion?.toUpperCase()?.includes("SUR")) {
      estadoFacturacion = "03";
    } else {
      estadoFacturacion = estadosFacturacion?.[data?.estadoFacturacion?.toUpperCase()];
    }

    if (!estadoFacturacion && data?.deseaFactura === "true") {
      estadoFacturacion = "00";
    }

    // Format fechaPago
    const fechaPago = new Date(data?.fechaPago)?.toLocaleDateString('en-GB');

    // Format fechaNacimiento
    const fechaNacimiento = new Date(data?.fechaNacimientoEstudiante);
    // Format tipoDePago
    let tipoPago = "Otro";

    if (data?.tipoPago === "card") {
      if (data?.tipoTarjeta === "credit") {
        tipoPago = "Credito";
      } else {
        tipoPago = "Debito";
      }
    }

    let codigoDetalle;

    if (tipoPago === "Credito") {
      codigoDetalle = "4157";
    } else {
      codigoDetalle = "4158";
    }

    // Format request body

    const requestData = {
      "nombre": data?.nombreEstudiante,
      "apellidos": data?.apellidoEstudiante,
      "nacionalidad": data?.nacionalidadEstudiante,
      "fechaNacimiento": fechaNacimiento?.toLocaleDateString('en-GB'),
      "genero": generoEstudiante,
      "estadoCivil": data?.estadoCivilEstudiante,
      "curp": data?.curpEstudiante?.toUpperCase(),
      "telefono": data.telefonoEstudiante,
      "celular": data.telefonoEstudiante,
      "email": data?.emailEstudiante,
      "modalidad": data?.modalidad,
      "nivel": data?.nivel,
      "campus": data?.campus,
      "programa": data?.programa,
      "periodo": data?.periodo,
      "lineaNegocio": data?.lineaNegocio,
      "monto": data?.montoPago,
      "fechaPago": fechaPago,
      "tipoPago": tipoPago,
      "claveCargoBanner": "1007",
      "codigoDetalle": codigoDetalle,
      "folioPago": data?.folioPago,
      "deseaFactura": data?.deseaFactura,
      "rfc": data.rfc,
      "tipoPersona": tiposPersona?.[data?.tipoPersona],
      "razonSocial": data?.razonSocial,
      "regimenFiscal": data.regimenFiscal?.split(" ")?.[0],
      "cpFacturacion": data?.cpFacturacion,
      "correoFacturacion": data?.emailFacturacion,
      "cfdi": data.cfdi?.split(" ")?.[0],
      "calleFacturacion": data?.calleFacturacion,
      "coloniaFacturacion": data?.coloniaFacturacion,
      "ciudadFacturacion": data?.ciudadFacturacion,
      "estadoFacturacion": estadoFacturacion
    };

    return requestData;
  }
  parseEnrollmentStatus(data) {
    // https://lottus.my.salesforce.com/services/apexrest/manhattan_inscripcion
    // request data
    // response
    // this is wrapped in an `async` function
    // you can use await throughout the function

    const enrollmentData = JSON.parse(inputData?.enrollmentResponse)
    let enrollmentStatus = "ERROR";

    // Error enrollment
    if (!!enrollmentData?.Error) {
      enrollmentStatus = enrollmentStatus += ": " + enrollmentData?.Error;
    }

    // Successful enrollment
    if (!!enrollmentData?.Exitoso && enrollmentData?.Exitoso === "TRUE") {
      enrollmentStatus = "INSCRITO"
    }

    // output = {enrollmentStatus};
  }
  patchInscriptionStatus() {
    // maybe patch enrollment 
    // post to strapi to patch inscription status or enrollment, check use cases for errors and how to communicate them
  }
  createInscription(cs_id: string) {
    console.log('cs_id: ', cs_id);
    try {
      const routes = ['track-invoices', 'track-payments', 'track-inscriptions' ]

      forkJoin(routes.map(route => this.utilsService.fetchStrapi(route, [`filters[cs_id][$eq]=${cs_id}`]))).pipe(take(1)).subscribe(responses => {
        const data: any = responses.reduce((acc, res, i) => {
          acc = { ...acc, [routes[i].replace('-', '_')]: res.data.data[0] }
          return acc
        }, {})
        // console.log(`data: `, data);
        // console.log(`data[${routes[0]}]: `, data[routes[0]]);
        // console.log(`data[${routes[1]}]: `, data[routes[1]]);
        // console.log(`data[${routes[2]}]: `, data[routes[2]]);

        const enrrollments = [ data.track_inscriptions?.attributes?.enrollment === null,  data.track_payments?.attributes?.enrollment === null, data.track_inscriptions.attributes.need_invoice ? data.track_invoices?.attributes?.enrollment === null : true ]
        // console.log('enrrollments: ', enrrollments);
        
        if (!enrrollments.includes(false)) {
          this.utilsService.authSF().pipe(
            take(1), 
            catchError((err) => {
              // console.log(err)
              return of(err.response)
            })
          ).subscribe(authResponse => {
              // console.log('authResponse.data: ', authResponse.data);
              this.utilsService.getSFOffer(authResponse.data.access_token, authResponse.data.token_type, data.track_payments.attributes.metadata.SFline, data.track_payments.attributes.metadata.SFcampus)
              .pipe(
                catchError((err) => {
                  console.log(err.response.data)
                  return of(err)
                }))
              .subscribe(res => {
                const offerData = res.data
                // console.log('offerData: ', offerData);
                // console.log('data.track_payments.attributes: ', data.track_payments.attributes);
                // console.log('data.track_payments.attributes.metadata.SFprogram: ', data.track_payments.attributes.metadata.SFprogram);
                
                const offerMatch = offerData?.find((offer) => {
                  return offer?.bnrProgramCode === data.track_payments.attributes.metadata.SFprogram // && this.validateOfferPeriod(offer?.fechaInicio, offer?.fechaVencimiento);
                })
                // console.log('offerMatch: ', offerMatch);
                // birth_entity: 'Aguascalientes', no se envia birth_entity
                
                const prefilledData = {
                  nombreEstudiante: data.track_inscriptions.attributes.name,
                  apellidoEstudiante: data.track_inscriptions.attributes.last_name,
                  fechaNacimientoEstudiante: data.track_inscriptions.attributes.birthdate,
                  generoEstudiante: data.track_inscriptions.attributes.gender,
                  telefonoEstudiante: this.formatPhone(data.track_inscriptions.attributes.phone),
                  nacionalidadEstudiante: data.track_inscriptions.attributes.residence,
                  estadoCivilEstudiante: data.track_inscriptions.attributes.civil_status,
                  curpEstudiante: data.track_inscriptions.attributes.CURP,
                  emailEstudiante: data.track_inscriptions.attributes.email,
                  deseaFactura: data.track_inscriptions.attributes.need_invoice,
    
                  claveCargoBanner: 1007, // revisar clave cargo banner
                  tipoTarjeta: data.track_payments.attributes.card_type,
                  montoPago: data.track_payments.attributes.amount,
                  tipoPago: data.track_payments.attributes.payment_method_type,
                  fechaPago: data.track_payments.attributes.date,

                  modalidad: offerMatch?.modalidad,
                  nivel: offerMatch?.nivel,
                  campus: offerMatch?.idCampus,
                  programa: offerMatch?.idOfertaPrograma,
                  periodo: offerMatch?.idPeriodo,
                  lineaNegocio: offerMatch?.lineaNegocio,
    
                  estadoFacturacion: data.track_invoices?.attributes?.state,
                  rfc: data.track_invoices?.attributes?.RFC,
                  regimenFiscal: data.track_invoices?.attributes?.tax_regime,
                  cfdi: data.track_invoices?.attributes?.CFDI_use,
                  folioPago: data.track_payments.attributes.payment_id,
                  razonSocial: data.track_invoices?.attributes?.full_name,
                  cpFacturacion: data.track_invoices?.attributes?.zip_code,
                  tipoPersona: data.track_invoices?.attributes?.tax_person,
                  emailFacturacion: data.track_invoices?.attributes?.email,
                  calleFacturacion: data.track_invoices?.attributes?.address,
                  coloniaFacturacion: data.track_invoices?.attributes?.suburb,
                  ciudadFacturacion: data.track_invoices?.attributes?.city,
                }
                // console.log('prefilledData: ', prefilledData);
                const finalData = this.formatEnrollRequest(prefilledData)
                // console.log('finalData: ', finalData);
                this.utilsService.postSFInscription(finalData, authResponse.data.access_token, authResponse.data.token_type)
                .pipe(
                  catchError((err) => {
                    // console.log(err.response.data)
                    return of(err)
                  }))
                  .subscribe(res => {
                    if (res.data.Exitoso === 'False') {
                      const labels = {
                        email: 'Correo electrónico',
                        name: 'Nombres',
                        phone: 'Teléfono',
                        last_name: 'Apellidos',
                        cs_id: 'Checkout Session Id'
                      }
                      const fields = {
                        cs_id: data.track_payments.attributes.cs_id,
                        name: data.track_inscriptions.attributes.name,
                        last_name: data.track_inscriptions.attributes.last_name,
                        phone: data.track_inscriptions.attributes.phone,
                        email: data.track_inscriptions.attributes.email,
                      }
                      const metadata = {
                        error: res.data.Error,
                        inscriptionsID: data.track_inscriptions.id,
                        paymentsID: data.track_payments.id,
                        invoicesID: data.track_invoices.id,
                      }
                      const slackMessage = this.utilsService.generateSlackErrorMessage(labels, metadata, fields)
                      console.log('slackMessage: ', slackMessage);
                      
                      this.utilsService.postSlackMessage(slackMessage).subscribe()
                      
                    }
                    //  else {
                    //   console.log('res.data: ', res.data);
                    // }
                })
    
              })
            }
          )
         
        }else {
          throw new Error('student already enrrolled')
        }
        

      })

    } catch (error) {
      console.error(error)
      return error
    }

  }

}
