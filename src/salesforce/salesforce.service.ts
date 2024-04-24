import { Injectable, Response } from '@nestjs/common';

@Injectable()
export class SalesforceService {

  formatPhone (phone: string) {
    let formattedPhone = phone;

    if (phone?.length === 13) {
      formattedPhone = phone?.slice(3);
    } else if (phone?.length === 12) {
      formattedPhone = phone?.slice(2);
    }
    return formattedPhone

  }
  formatEnrollRequest(req: any) {
    
    // Format generoEstudiante
    const generos = {
      "HOMBRE": "Hombre",
      "MUJER": "Mujer",
      "Masculino": "Hombre",
      "Femenino": "Mujer",
      "Otro": "Otro"
    };

    const generoEstudiante = generos?.[req.track_inscriptions?.attributes.?gender];

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
    if (!!req.track_inscriptions?.attributes.?residence && req.track_inscriptions?.attributes.?residence !== "Nacional") {
      estadoFacturacion = "33";
    } else if(req.track_invoices?.attributes?.state?.toUpperCase()?.includes("SUR")) {
      estadoFacturacion = "03";
    } else {
      estadoFacturacion = estadosFacturacion?.[req.track_invoices?.attributes?.state?.toUpperCase()];
    }

    if (!estadoFacturacion && req.track_inscriptions?.attributes.?need_invoice === "true") {
      estadoFacturacion = "00";
    }

    // Format fechaPago
    const fechaPago = new Date(req.track_payments?.attributes.?date)?.toLocaleDateString('en-GB');

    // Format tipoDePago
    let tipoPago = "Otro";

    if (req.track_payments?.attributes.?payment_method_type === "card") {
      if (req.track_payments?.attributes.?card_type === "credit") {
        tipoPago = "Credito";
      } else {
        tipoPago = "Debito";
      }
    }

    let codigoDetalle;

    if (tipoPago === "Credito") {
      codigoDetalle = req.track_payments?.attributes.?metadata.SFcreditCode;
    } else {
      codigoDetalle = req.track_payments?.attributes.?metadata.SFdebitCode;
    }
    // console.log(req.track_inscriptions?.attributes.?birthdate);
    // console.log(typeof req.track_inscriptions?.attributes.?birthdate);
    // console.log(req.track_inscriptions?.attributes.?birthdate.includes('/'));
    // console.log(new Date(req.track_inscriptions?.attributes.?birthdate));
    // console.log(new Date(req.track_inscriptions?.attributes.?birthdate).toLocaleDateString('es-mx'));

    const birthdate = req.track_inscriptions?.attributes.?birthdate
      ? req.track_inscriptions?.attributes.?birthdate.includes('/')
        ? req.track_inscriptions?.attributes.?birthdate
        : new Date(req.track_inscriptions?.attributes.?birthdate).toLocaleDateString('es-mx')
      : req.track_inscriptions?.attributes.?birthdate
    

    const requestData = {
      "nombre": req.track_inscriptions?.attributes.?name,
      "apellidoPaterno": req.track_inscriptions?.attributes.?last_name,
      "apellidoMaterno": req.track_inscriptions?.attributes.?second_last_name,
      "nacionalidad": req.track_inscriptions?.attributes.?residence,
      "fechaNacimiento": birthdate,
      "genero": generoEstudiante,
      "estadoCivil": req.track_inscriptions?.attributes.?civil_status || 'Soltero',
      "curp": req.track_inscriptions?.attributes.?CURP?.toUpperCase(),
      "telefono": this.formatPhone(req.track_inscriptions?.attributes.?phone),
      "celular": this.formatPhone(req.track_inscriptions?.attributes.?phone),
      "email": req.track_inscriptions?.attributes.?email,

      "modalidad": req.track_payments?.attributes.?metadata.SFmodality,
      "nivel": req.track_payments?.attributes.?metadata.SFlevel,
      "campus": req.track_payments?.attributes.?metadata.SFcampus,
      "programa": req.track_payments?.attributes.?metadata.SFprogram,
      "lineaNegocio": req.track_payments?.attributes.?metadata.SFline,

      "monto": req.track_payments?.attributes.?amount,
      "fechaPago": fechaPago,
      "tipoPago": tipoPago,
      "claveCargoBanner": req.track_payments?.attributes.?metadata.BNRcharge, //check send if exists
      "codigoDetalle": codigoDetalle,
      "folioPago": req.track_payments?.attributes.?payment_id,

      "deseaFactura": !!req.track_inscriptions?.attributes.?need_invoice,
      "rfc": req.track_invoices?.attributes?.RFC,
      "tipoPersona": tiposPersona?.[req.track_invoices?.attributes?.tax_person],
      "razonSocial": req.track_invoices?.attributes?.full_name,
      "regimenFiscal": req.track_invoices?.attributes?.tax_regime?.split(" ")?.[0],
      "cpFacturacion": req.track_invoices?.attributes?.zip_code,
      "correoFacturacion": req.track_invoices?.attributes?.email,
      "cfdi": req.track_invoices?.attributes?.CFDI_use?.split(" ")?.[0],
      "calleFacturacion": req.track_invoices?.attributes?.address,
      "coloniaFacturacion": req.track_invoices?.attributes?.suburb,
      "ciudadFacturacion": req.track_invoices?.attributes?.city,
      "estadoFacturacion": estadoFacturacion,
      "checkoutSessionID": req.track_payments?.attributes.?cs_id
    };

    return requestData;
  }

}
