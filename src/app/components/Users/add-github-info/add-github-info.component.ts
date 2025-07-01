import { Component } from '@angular/core';
import { UsersService } from '../users.service';
import { KeycloakService } from 'keycloak-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-github-info',
  templateUrl: './add-github-info.component.html',
  styleUrls: ['./add-github-info.component.css']
})
export class AddGithubInfoComponent {
gitusername = '';
  gitToken = '';
  keycloakId: string = '';

  constructor(
    private clientService: UsersService,
    private keycloakService: KeycloakService ,
    private  router: Router
  ) {}

  async ngOnInit() {
    try {
      const userProfile = await this.keycloakService.loadUserProfile();
      this.keycloakId = userProfile.id ?? '';
    } catch (error) {
      console.error('Erreur lors du chargement du profil utilisateur Keycloak:', error);
    }
  }

  onSubmit() {
    if (!this.gitusername || !this.gitToken) {
      alert('Veuillez remplir tous les champs GitHub.');
      return;
    }

    if (!this.keycloakId) {
      alert('User ID non disponible.');
      return;
    }

    const payload = {
      githubUsername: this.gitusername,
      githubToken: this.gitToken
    };

this.clientService.addGithubInfo(this.keycloakId, payload).subscribe({
  next: (response) => {
    alert("GitHub info added");  // Affiche directement la chaîne reçue
    this.router.navigate(['/dashboard']);
  },
  error: err => {
    alert("Erreur lors de l'envoi des informations GitHub.");
    console.error(err);
  }
});

  }
  
}
