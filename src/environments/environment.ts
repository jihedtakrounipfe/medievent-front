// src/environments/environment.ts

export const environment = {
  production:        false,
  apiUrl:            'http://localhost:8080/mediconnect',
  keycloakUrl:       'http://localhost:9090/realms/mediconnect-main/protocol/openid-connect',
  keycloakClientId:  'angular-spa',
  oauthRedirectUri:  'http://localhost:4200/auth/callback',
  recaptcha: {
    // Get your site key from https://www.google.com/recaptcha/admin
    // Create a reCAPTCHA v2 "I'm not a robot" site, add domain: localhost
    siteKey: '6LdUiLMsAAAAADeYVPRcmguq6Me3ghHvNSA1hU9K'
    },
};
