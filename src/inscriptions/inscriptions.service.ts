import { Injectable } from '@nestjs/common';
import { error } from 'console';
import { catchError, combineLatest, forkJoin, mergeMap, of } from 'rxjs';
import { StripeService } from 'src/stripe/stripe.service';
import { ErrorManagerService } from 'src/utils/error-manager.service';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class InscriptionsService {
  constructor(
    private utilsService: UtilsService,
    private stripeService: StripeService,
    public errorManager: ErrorManagerService
  ) {}
  async populateStrapi(body: any, response: any) {
    // console.log('body: ', body);
    const formResponse = body.form_response || null;
    const cs_id = formResponse?.hidden?.checkout_session_id || body.cs_id;
    const repeatedFields = ['RFC', 'CFDI_use', 'tax_regime'];
    // console.log('formResponse: ', formResponse);

    if (!cs_id) {
      response
        .status(400)
        .send(`Webhook Error: No checkout session id has been provided`);
      response.send();
    } else {
      const submitted_at = new Date();

      combineLatest({
        payment: this.utilsService.fetchStrapi('track-payments', [
          `filters[cs_id][$eq]=${cs_id}`,
        ]),
        inscription: this.utilsService.fetchStrapi('track-inscriptions', [
          `filters[cs_id][$eq]=${cs_id}`,
        ]),
      })
        .pipe(
          mergeMap((res) => {
            // if (formResponse) {
            const track_inscriptions = !res.inscription.data.data[0]
              ? {
                  attributes: {
                    cs_id,
                    submitted_at,
                  },
                  exists: false,
                  filled: false,
                }
              : {
                  ...res.inscription.data.data[0],
                  exists: true,
                  filled:
                    res.inscription.data.data[0].attributes.name &&
                    res.inscription.data.data[0].attributes.last_name &&
                    res.inscription.data.data[0].attributes.birthdate,
                };
            // console.log('res.payment: ', res.payment);
            const track_payments = res.payment.data.data[0];
            // console.log('formResponse: ', formResponse);
            // console.log('track payments: ', track_payments);

            const answers = !formResponse
              ? null
              : formResponse?.definition?.fields?.reduce(
                  (acc: any, field: any, index: number) => {
                    const { type, ref } = field;
                    const rawAnswer = formResponse.answers[index];
                    const answer = rawAnswer[rawAnswer.type];
                    if (ref === 'need_invoice') {
                      acc.needInvoiceIndex = index;
                      acc.needInvoice = answer;
                      acc.inscription = { ...acc.inscription, [ref]: answer };
                    }
                    if (
                      acc.needInvoiceIndex === null ||
                      index < acc.needInvoiceIndex
                    ) {
                      const strapiField = {
                        [ref]:
                          type === 'multiple_choice' ? answer.label : answer,
                      };
                      acc.inscription = { ...acc.inscription, ...strapiField };
                    } else if (index > acc.needInvoiceIndex) {
                      let [_first, ...rest] = ref.split('_');
                      const hasRepeatedField = repeatedFields.map((rf) =>
                        (ref as string).includes(rf),
                      );

                      if (hasRepeatedField.includes(true)) rest.pop();

                      const key = rest.join('_');
                      const strapiField = {
                        [key]:
                          type === 'multiple_choice' ? answer.label : answer,
                      };
                      acc.invoice = { ...acc.invoice, ...strapiField };
                    }
                    return acc;
                  },
                  {
                    inscription: { cs_id, submitted_at },
                    invoice: { cs_id, submitted_at },
                    needInvoiceIndex: null,
                    needInvoice: false,
                  },
                );
            // console.log('answers: ', answers);

            // }
            // console.log('track_payments: ', track_payments);
            // const curp = track_payments?.attributes?.extra_fields;

            let curp: string;
            let residence;
            let username;
            if (track_payments?.attributes?.payment_gateway === 'Flywire') {
              curp = track_payments.attributes.extra_fields.curp;
              residence = track_payments.attributes.extra_fields.residence;
              username = `${track_payments.attributes.extra_fields.student_first_name} ${track_payments.attributes.extra_fields.student_last_name}`;
            } else {
              curp = this.stripeService.getField(
                track_payments?.attributes?.extra_fields,
                'curp',
              )?.value;
              residence = this.utilsService.capitalizeText(
                this.stripeService.getField(
                  track_payments?.attributes?.extra_fields,
                  'residencia',
                  'residence'
                )?.value,
              );
              username = this.utilsService.capitalizeText(
                this.stripeService.getField(
                  track_payments?.attributes?.extra_fields,
                  'nombredelalumno',
                  'name'
                )?.value,
              );
            }

            // console.log('curp: ', curp);
            // console.log('residence: ', residence);
            // console.log('username: ', username);

            const curpObservable =
              !!curp && residence === 'Nacional' && !track_inscriptions.filled
                ? this.utilsService
                    .postSelfWebhook('/curp/validate', { curp: curp.toUpperCase() })
                    .pipe(
                      catchError((err, caught) => of({ error: true, err })),
                    )
                : of(false);
            const observables = {
              track_payments: of({ ...track_payments, residence, username }),
              track_inscriptions: of(track_inscriptions),
              curp: curpObservable,
              answers: of(answers || null),
            };
            return combineLatest(observables);
          }),

          mergeMap((res: any) => {
            // console.log('res: ', res);

            if (res.curp?.error || res.curp?.data?.errorType) {
              // console.log('res.curp?.response?.data: ', res.curp?.response?.data);
              const fields = {
                cs_id: res.track_payments?.attributes?.cs_id,
                name: res.track_inscriptions?.attributes?.name,
                last_name: res.track_inscriptions?.attributes?.last_name,
                phone: res.track_inscriptions?.attributes?.phone,
                email: res.track_inscriptions?.attributes?.email,
              };
              const metadata = {
                scope: "Curp",
                product_name: res.track_payments?.attributes?.product_name,
                error: res.curp.response?.data || JSON.parse(res.curp.err?.errorMessage).error,
                paymentsID: res.track_payments.id,
              };

              this.errorManager.ManageError(fields, metadata)
              return of(res);
            }
            // console.log('res.curp.error: ', res.curp.error);
            // console.log('res: ', res);
            // console.log('res.track_inscriptions: ', res.track_inscriptions);
            // console.log('res.answers: ', res.answers);

            const inscription = !!res.curp?.data
              ? {
                  cs_id,
                  submitted_at,
                  residence: res.track_payments.residence,
                  email: res.track_payments?.attributes?.email,
                  phone: res.track_payments.attributes.extra_fields.student_phone || res.track_payments?.attributes?.phone.split(' ').join() || res.track_payments?.attributes?.phone,
                  name: this.utilsService.capitalizeText(res.curp.data.nombre),
                  CURP: res.curp.data.curp,
                  last_name: this.utilsService.capitalizeText(
                    res.curp.data.apellidoPaterno,
                  ),
                  second_last_name: this.utilsService.capitalizeText(
                    res.curp.data.apellidoMaterno,
                  ),
                  gender: res.curp.data.sexo,
                  birthdate: this.utilsService.capitalizeText(
                    res.curp.data.fechaNacimiento,
                  ),
                  birth_entity: this.utilsService.capitalizeText(
                    res.curp.data.estadoNacimiento,
                  ),
                }
              : !!res.answers && !!res.answers?.inscription
                ? {
                    cs_id,
                    submitted_at,
                    residence: res.track_payments.residence,
                    email: res.track_payments?.attributes?.email,
                    name: res.track_payments.username,
                    phone: res.track_payments?.attributes?.phone,
                    ...res.answers.inscription,
                    need_invoice: res.answers.need_invoice,
                  }
                : {
                    cs_id,
                    submitted_at,
                    residence: res.track_payments.attributes.extra_fields.residence,
                    email: res.track_payments?.attributes?.email,
                    name: res.track_payments?.attributes?.extra_fields.name,
                    phone: res.track_payments?.attributes?.phone,
                    last_name: res.track_payments?.attributes?.extra_fields.last_name,
                    second_last_name: res.track_payments?.attributes?.extra_fields.second_last_name,
                    gender: res.track_payments?.attributes?.extra_fields.gender,
                    birthdate: res.track_payments?.attributes?.extra_fields.birthdate
                  };
            // console.log(inscription);
            const inscriptionObs =
              res.track_inscriptions.exists && res.track_inscriptions.filled
                ? of(res.track_inscriptions)
                : res.track_inscriptions.exists &&
                    !res.track_inscriptions.filled
                  ? this.utilsService
                      .putStrapi(
                        'track-inscriptions',
                        inscription,
                        res.track_inscriptions.id,
                      )
                      .pipe(
                        catchError((err) => {
                          // console.log(err)
                          // response.status(err.response.status).send(err.response.data);

                          return of({ error: true, ...err });
                        }),
                      )
                  : this.utilsService
                      .postStrapi('track-inscriptions', inscription)
                      .pipe(
                        catchError((err) => {
                          console.log(err);
                          // response.status(err.response.status).send(err.response.data);

                          return of({ error: true, ...err });
                        }),
                      );

            return combineLatest({
              payment: of(res.track_payment),
              inscription: inscriptionObs,
              invoice: res.answers?.invoice
                ? this.utilsService
                    .postStrapi('track-invoices', res.answers?.invoice)
                    .pipe(
                      catchError((err) => {
                        console.log(err);
                        // response.status(err.response.status).send(err.response.data);

                        return of({ error: true, ...err });
                      }),
                    )
                : of(null),
            });
          }),
          mergeMap((res) => {
            // console.log('res: ', res);
            // console.log('res.inscription.data?.data[0]: ', res.inscription.data?.data[0]);

            if (
              res?.error ||
              res.curp?.error ||
              res.curp?.data?.errorType ||
              (!!res.inscription.exists && !!res.inscription.filled)
            ) {
              return of(res);
            }
            return this.utilsService.postSelfWebhook(
              '/salesforce/inscription',
              { cs_id },
            );
          }),
        )
        .subscribe(() => {
          response.send();
        });
    }
  }
}
