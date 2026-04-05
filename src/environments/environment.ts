// src/environments/environment.ts

export const environment = {
  production:        false,
  apiUrl:            'http://localhost:8080/mediconnect',
  keycloakUrl:       'http://localhost:9090/realms/mediconnect-main/protocol/openid-connect',
  keycloakClientId:  'angular-spa',
  oauthRedirectUri:  'http://localhost:4200/auth/callback',
};
