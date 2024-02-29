import {
  Injectable
} from '@nestjs/common';
@Injectable()
export class EmailService {


  generateXML(token: string, template: string, subject: string, toAddress = '', priority = 'Normal') {
    const generateAddress = (address: string) => {
      return `<urn:toAddresses>${address}</urn:toAddresses>`
    }
    const generateAddresses = (addresses: string[]) => {
      return addresses.map(address => generateAddress(address))
    }

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:enterprise.soap.sforce.com">
      <soapenv:Header>
        <urn:SessionHeader>
          <urn:sessionId>${token}</urn:sessionId>
        </urn:SessionHeader>
      </soapenv:Header>
      <soapenv:Body>
        <urn:sendEmail>
          <urn:messages xsi:type="urn:SingleEmailMessage" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <urn:bccSender>false</urn:bccSender>
            <urn:emailPriority>${priority}</urn:emailPriority>
            <urn:replyTo xsi:nil="true"/>
            <urn:senderDisplayName xsi:nil="true"/>
            <urn:subject>${subject}</urn:subject>
            <urn:orgWideEmailAddressId>0D26g000000g0XZCAY</urn:orgWideEmailAddressId>
            <urn:toAddresses>${toAddress}</urn:toAddresses>
            <urn:htmlBody><![CDATA[${template}]]></urn:htmlBody>
          </urn:messages>
        </urn:sendEmail>
      </soapenv:Body>
    </soapenv:Envelope>
    `

    return xml;
  }
}