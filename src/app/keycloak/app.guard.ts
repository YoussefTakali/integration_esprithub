import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakAuthGuard, KeycloakService } from 'keycloak-angular';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard extends KeycloakAuthGuard {
  constructor(
    protected override readonly router: Router,
    protected readonly keycloak: KeycloakService
  ) {
    super(router, keycloak);
  }

  public async isAccessAllowed(): Promise<boolean> {
    // Si l'utilisateur n'est pas authentifié, le rediriger vers la page de connexion.
    if (!this.authenticated) {
      await this.keycloak.login();
      return false;  // Bloquer l'accès à la route jusqu'à ce que l'utilisateur soit authentifié
    }
    return true;  // Autoriser l'accès si l'utilisateur est authentifié
  }
}
