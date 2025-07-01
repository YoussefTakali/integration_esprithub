import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class GithubTokenInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Vérifier si l'URL correspond à l'API GitHub
    if (req.url.includes('https://api.github.com')) {
      const githubToken = localStorage.getItem('githubToken'); // Récupérer le token GitHub du localStorage

      // Si un token GitHub est trouvé, on le met dans le header Authorization
      if (githubToken) {
        const clonedRequest = req.clone({
          setHeaders: {
            Authorization: `token ${githubToken}`, // Ajouter le token GitHub
          },
        });
        return next.handle(clonedRequest); // Passer la requête modifiée
      }
    }

    // Si ce n'est pas une requête GitHub, la laisser passer sans modification
    return next.handle(req);
  }
}
