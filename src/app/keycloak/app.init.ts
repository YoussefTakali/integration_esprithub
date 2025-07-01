import { KeycloakService } from 'keycloak-angular';

export function initializeKeycloak(keycloak: KeycloakService): () => Promise<boolean> {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8081/', // ou autre URL de ton serveur Keycloak
        realm: 'Esprit',
        clientId: 'my-angular-app',
      },
      initOptions: {
        onLoad: 'login-required', // ✅ obligatoire pour forcer le login
        checkLoginIframe: false,
      },
      loadUserProfileAtStartUp: true,
    });
}
