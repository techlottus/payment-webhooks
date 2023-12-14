const env = require('dotenv').config().parsed

module.exports = {
  apps : [
    {
      name: env.NAME1,
      script: 'yarn',
      args: env.ARGS,
      env: {
        NODE_ENV: env.NAME1,
        HOST_PORT: env.HOST_PORT_TEST1,
        STRIPE_API_KEY: env.STRIPE_API_KEY1, 
        WEBHOOK_SECRET: env.WEBHOOK_SECRET1, 
        SELF_URL: env.SELF_URL1, 
        STRAPI_TRACKING_API: env.STRAPI_TRACKING_API1, 
        STRAPI_TRACKING_TOKEN: env.STRAPI_TRACKING_TOKEN1, 
        SF_OFFER_ENDPOINT: env.SF_OFFER_ENDPOINT1, 
        SF_INSCRIPTION_ENDPOINT: env.SF_INSCRIPTION_ENDPOINT1, 
        SF_AUTH_ENDPOINT: env.SF_AUTH_ENDPOINT1, 
        SF_CLIENT_ID: env.SF_CLIENT_ID1, 
        SF_CLIENT_SECRET: env.SF_CLIENT_SECRET1, 
        SF_USERNAME: env.SF_USERNAME1, 
        SF_PASSWORD: env.SF_PASSWORD1, 
        SF_GRANT_TYPE: env.SF_GRANT_TYPE1 
      }
    },
    {
      name: env.NAME2,
      script: 'yarn',
      args: env.ARGS,
      env: {
        NODE_ENV: env.NAME2,
        HOST_PORT: env.HOST_PORT_TEST2,
        STRIPE_API_KEY: env.STRIPE_API_KEY2, 
        WEBHOOK_SECRET: env.WEBHOOK_SECRET2, 
        SELF_URL: env.SELF_URL2, 
        STRAPI_TRACKING_API: env.STRAPI_TRACKING_API2, 
        STRAPI_TRACKING_TOKEN: env.STRAPI_TRACKING_TOKEN2, 
        SF_OFFER_ENDPOINT: env.SF_OFFER_ENDPOINT2, 
        SF_INSCRIPTION_ENDPOINT: env.SF_INSCRIPTION_ENDPOINT2, 
        SF_AUTH_ENDPOINT: env.SF_AUTH_ENDPOINT2, 
        SF_CLIENT_ID: env.SF_CLIENT_ID2, 
        SF_CLIENT_SECRET: env.SF_CLIENT_SECRET2, 
        SF_USERNAME: env.SF_USERNAME2, 
        SF_PASSWORD: env.SF_PASSWORD2, 
        SF_GRANT_TYPE: env.SF_GRANT_TYPE2 
      }
    },
    {
      name: env.NAME3,
      script: 'yarn',
      args: env.ARGS,
      env: {
        NODE_ENV: env.NAME3,
        HOST_PORT: env.HOST_PORT_TEST3,
        STRIPE_API_KEY: env.STRIPE_API_KEY3, 
        WEBHOOK_SECRET: env.WEBHOOK_SECRET3, 
        SELF_URL: env.SELF_URL3, 
        STRAPI_TRACKING_API: env.STRAPI_TRACKING_API3, 
        STRAPI_TRACKING_TOKEN: env.STRAPI_TRACKING_TOKEN3, 
        SF_OFFER_ENDPOINT: env.SF_OFFER_ENDPOINT3, 
        SF_INSCRIPTION_ENDPOINT: env.SF_INSCRIPTION_ENDPOINT3, 
        SF_AUTH_ENDPOINT: env.SF_AUTH_ENDPOINT3, 
        SF_CLIENT_ID: env.SF_CLIENT_ID3, 
        SF_CLIENT_SECRET: env.SF_CLIENT_SECRET3, 
        SF_USERNAME: env.SF_USERNAME3, 
        SF_PASSWORD: env.SF_PASSWORD3, 
        SF_GRANT_TYPE: env.SF_GRANT_TYPE3 
      }
    },
    {
      name: env.NAME4,
      script: 'yarn',
      args: env.ARGS,
      env: {
        NODE_ENV: env.NAME4,
        HOST_PORT: env.HOST_PORT_TEST4,
        STRIPE_API_KEY: env.STRIPE_API_KEY4, 
        WEBHOOK_SECRET: env.WEBHOOK_SECRET4,
        SELF_URL: env.SELF_URL4, 
        STRAPI_TRACKING_API: env.STRAPI_TRACKING_API4, 
        STRAPI_TRACKING_TOKEN: env.STRAPI_TRACKING_TOKEN4, 
        SF_OFFER_ENDPOINT: env.SF_OFFER_ENDPOINT4, 
        SF_INSCRIPTION_ENDPOINT: env.SF_INSCRIPTION_ENDPOINT4, 
        SF_AUTH_ENDPOINT: env.SF_AUTH_ENDPOINT4,
        SF_CLIENT_ID: env.SF_CLIENT_ID4,
        SF_CLIENT_SECRET: env.SF_CLIENT_SECRET4,
        SF_USERNAME: env.SF_USERNAME4,
        SF_PASSWORD: env.SF_PASSWORD4,
        SF_GRANT_TYPE: env.SF_GRANT_TYPE4
      }
    },
  ]
};
