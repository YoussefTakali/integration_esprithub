import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'client';

  constructor(private keycloakService: KeycloakService, private http: HttpClient ,  private router: Router
) {}
async ngOnInit() {
  try {
    const token = await this.keycloakService.getToken();

    localStorage.setItem('token', token);

    const profile = await this.keycloakService.loadUserProfile();
 
    const attributes: any = (profile as any).attributes;
    const githubUsername = attributes?.githubUsername?.[0];
    const githubToken = attributes?.githubToken?.[0];
  
    if (githubUsername && githubToken) {
      localStorage.setItem('githubUsername', githubUsername);
      localStorage.setItem('githubToken', githubToken);
      this.verifyGithubToken(githubToken);
    } else {
      console.warn('Attributs githubUsername ou githubToken manquants.');
      this.router.navigate(['/add-github-info']); 
    }
  } catch (err) {
    console.error('Erreur lors de la récupération du profil ou du token :', err);
    this.router.navigate(['/add-github-info']); 
  }
}


verifyGithubToken(githubToken: string) {
  const expectedUsername = localStorage.getItem('githubUsername');
  const apiUrl = 'https://api.github.com/user';
  const headers = new HttpHeaders({
    'Authorization': `token ${githubToken}`
  });

  this.http.get<any>(apiUrl, { headers }).subscribe({
    next: userData => {
      const actualUsername = userData.login;
      console.log('GitHub username from token:', actualUsername);

      if (actualUsername.toLowerCase() === expectedUsername?.toLowerCase()) {
        console.log('GitHub token is valid and belongs to the expected user.');
      } else {
        console.warn('Le token GitHub n’appartient pas au nom d’utilisateur fourni.');
        alert('Le token GitHub n’est pas associé au nom d’utilisateur. Redirection...');
        this.router.navigate(['/add-github-info']);
      }
    },
    error: error => {
      console.error('Erreur lors de la vérification du token GitHub :', error);
      alert('Erreur lors de la vérification du token GitHub. Redirection...');
      this.router.navigate(['/add-github-info']);
    }
  });
}
}