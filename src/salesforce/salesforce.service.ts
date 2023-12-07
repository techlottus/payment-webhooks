import { Injectable } from '@nestjs/common';
import { forkJoin } from 'rxjs';
import { UtilsService } from 'src/utils/utils.service';

let inputData;
@Injectable()
export class SalesforceService {
  constructor(private utilsService: UtilsService) {}

  formatPhone () {
    // this is wrapped in an `async` function
    // you can use await throughout the function
    let formattedPhone = inputData?.phone;

    if (inputData?.phone?.length === 13) {
      formattedPhone = inputData?.phone?.slice(3);
    } else if (inputData?.phone?.length === 12) {
      formattedPhone = inputData?.phone?.slice(2);
    }

    // output = {formattedPhone};
  }
  getOffer() {
    // https://lottus.my.salesforce.com/services/apexrest/ofertas_manhattan
    // {
    //   linea : 'UTC'
    //   campus: 'UTC A TU RITMO'
    // }
  }
  getEnrollOffer() {
    // this is wrapped in an `async` function
    // you can use await throughout the function

    // Convert response to object
    const parsedOfferData = JSON.parse(inputData?.offerData);

    // Validate offer period
    const validateOfferPeriod = (periodStartDate, periodExpireDate) => {
      const formatedStartDate = new Date(periodStartDate);
      const formatedExpireDate = new Date(periodExpireDate);
      const formatedPaymentDate = new Date(inputData?.paymentDate);

      formatedStartDate?.setHours(0,0,0);
      formatedExpireDate?.setHours(23,59,59);

      return formatedPaymentDate?.getTime() >= formatedStartDate?.getTime() && formatedPaymentDate?.getTime() <= formatedExpireDate?.getTime();
    };

    // Get the associated offer (match by bnrProgramCode & fechaInicio & fecha Vencimiento)
    const offerMatch = parsedOfferData?.find((offer) => {
      return String(offer?.bnrProgramCode) === String(inputData?.program) && validateOfferPeriod(offer?.fechaInicio, offer?.fechaVencimiento);
    })

    // Return corresponding offer
    // output = offerMatch
  }
  formatEnrollRequest() {
    // this is wrapped in an `async` function
    // you can use await throughout the function

    // Format generoEstudiante
    const generos = {
      "Masculino": "Hombre",
      "Femenino": "Mujer",
      "Otro": "Otro"
    };

    const generoEstudiante = generos?.[inputData?.generoEstudiante];

    // Format telefonoEstudiante
    let telefonoEstudiante = inputData?.telefonoEstudiante;

    if (inputData?.telefonoEstudiante?.length === 13) {
      telefonoEstudiante = inputData?.telefonoEstudiante?.slice(3);
    } else if (inputData?.telefonoEstudiante?.length === 12) {
      telefonoEstudiante = inputData?.telefonoEstudiante?.slice(2);
    }

    // Format tipoPersona
    const tiposPersona = {
      "Persona física": "Fisica",
      "Persona moral": "Moral"
    };

    const tipoPersona = tiposPersona?.[inputData?.tipoPersona];

    // Format CFDI
    let cfdi = "";

    if (tipoPersona === "Fisica") {
      cfdi = inputData?.cfdiPersonaFisica?.split(" ")?.[0];
    } else {
      cfdi = inputData?.cfdiPersonaMoral?.split(" ")?.[0];
    }

    // Format regimenFiscal
    let regimenFiscal = "";
    if (tipoPersona === "Fisica") {
      if (cfdi === "D10") {
        regimenFiscal = inputData?.regimenFiscalD10PersonaFisica?.split(" ")?.[0];
      } else {
        regimenFiscal = inputData?.regimenFiscalG03PersonaFisica?.split(" ")?.[0];
      }
    } else {
      regimenFiscal = inputData?.regimenFiscalPersonaMoral?.split(" ")?.[0];
    }

    // Format RFC
    let rfc = "";

    if (tipoPersona === "Fisica") {
      rfc = inputData?.rfcPersonaFisica;
    } else {
      rfc = inputData?.rfcPersonaMoral;
    }

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
    if (!!inputData?.nacionalidadEstudiante && inputData?.nacionalidadEstudiante !== "Nacional") {
      estadoFacturacion = "33";
    } else if(inputData?.estadoFacturacion?.toUpperCase()?.includes("SUR")) {
      estadoFacturacion = "03";
    } else {
      estadoFacturacion = estadosFacturacion?.[inputData?.estadoFacturacion?.toUpperCase()];
    }

    if (!estadoFacturacion && inputData?.deseaFactura === "true") {
      estadoFacturacion = "00";
    }

    // Format fechaPago
    const fechaPago = new Date(inputData?.fechaPago)?.toLocaleDateString('en-GB');

    // Format fechaNacimiento
    const fechaNacimiento = new Date(inputData?.fechaNacimientoEstudiante);
    // Format tipoDePago
    let tipoPago = "Otro";

    if (inputData?.tipoPago === "card") {
      if (inputData?.tipoTarjeta === "credit") {
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

    // Format monto de pago

    let montoPago;
    if (inputData?.montoPago) {
    montoPago = inputData?.montoPago;
    } else if (inputData?.totalAmountShopify) {
    montoPago = inputData?.totalAmountShopify;
    }

    // Format request body

    const requestData = JSON.stringify({
      "nombre": inputData?.nombreEstudiante,
      "apellidos": inputData?.apellidoEstudiante,
      "nacionalidad": inputData?.nacionalidadEstudiante,
      "fechaNacimiento": fechaNacimiento?.toLocaleDateString('en-GB'),
      "genero": generoEstudiante,
      "estadoCivil": inputData?.estadoCivilEstudiante,
      "curp": inputData?.curpEstudiante?.toUpperCase(),
      "telefono": telefonoEstudiante,
      "celular": telefonoEstudiante,
      "email": inputData?.emailEstudiante,
      "modalidad": inputData?.modalidad,
      "nivel": inputData?.nivel,
      "campus": inputData?.campus,
      "programa": inputData?.programa,
      "periodo": inputData?.periodo,
      "lineaNegocio": inputData?.lineaNegocio,
      "monto": montoPago,
      "fechaPago": fechaPago,
      "tipoPago": tipoPago,
      "claveCargoBanner": "1007",
      "codigoDetalle": codigoDetalle,
      "folioPago": inputData?.folioPago,
      "deseaFactura": inputData?.deseaFactura,
      "rfc": rfc,
      "tipoPersona": tipoPersona,
      "razonSocial": inputData?.razonSocial,
      "regimenFiscal": regimenFiscal,
      "cpFacturacion": inputData?.cpFacturacion,
      "correoFacturacion": inputData?.emailFacturacion,
      "cfdi": cfdi,
      "calleFacturacion": inputData?.calleFacturacion,
      "coloniaFacturacion": inputData?.coloniaFacturacion,
      "ciudadFacturacion": inputData?.ciudadFacturacion,
      "estadoFacturacion": estadoFacturacion
    });

    // output = {requestData};
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
    
    this.fetchData(cs_id)
  }
  fetchData(cs_id: string) {
    try {
      const routes = ['track-invoices', 'track-payments', 'track-inscriptions' ]

      forkJoin(routes.map(route => this.utilsService.fetchStrapi(route, [`filters[cs_id][$eq]=${cs_id}`]))).subscribe(responses => {
        console.log('responses: ', responses);
        responses.map(res => {
          console.log('res: ', res);
          
        })
      })
      
    } catch (error) {
      console.error(error)
    }
  }
}
