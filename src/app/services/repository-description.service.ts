import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RepositoryDescription {
  id?: number;
  owner: string;
  repositoryName: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  exists?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RepositoryDescriptionService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  /**
   * Récupère la description d'un repository
   */
  getDescription(owner: string, repo: string): Observable<RepositoryDescription> {
    const url = `${this.apiUrl}/api/repo-descriptions/${owner}/${repo}`;
    return this.http.get<RepositoryDescription>(url);
  }

  /**
   * Sauvegarde ou met à jour la description d'un repository
   */
  saveDescription(owner: string, repo: string, description: string, username: string = 'user'): Observable<RepositoryDescription> {
    const url = `${this.apiUrl}/api/repo-descriptions/${owner}/${repo}`;
    const body = {
      description: description,
      username: username
    };
    return this.http.post<RepositoryDescription>(url, body);
  }

  /**
   * Supprime la description d'un repository
   */
  deleteDescription(owner: string, repo: string): Observable<any> {
    const url = `${this.apiUrl}/api/repo-descriptions/${owner}/${repo}`;
    return this.http.delete(url);
  }

  /**
   * Récupère toutes les descriptions d'un owner
   */
  getDescriptionsByOwner(owner: string): Observable<RepositoryDescription[]> {
    const url = `${this.apiUrl}/api/repo-descriptions/${owner}`;
    return this.http.get<RepositoryDescription[]>(url);
  }

  /**
   * Vérifie si une description existe
   */
  hasDescription(owner: string, repo: string): Observable<{exists: boolean}> {
    const url = `${this.apiUrl}/api/repo-descriptions/${owner}/${repo}/exists`;
    return this.http.get<{exists: boolean}>(url);
  }

  /**
   * Récupère toutes les descriptions créées par un utilisateur
   */
  getDescriptionsByCreator(username: string): Observable<RepositoryDescription[]> {
    const url = `${this.apiUrl}/api/repo-descriptions/created-by/${username}`;
    return this.http.get<RepositoryDescription[]>(url);
  }

  /**
   * Récupère toutes les descriptions mises à jour par un utilisateur
   */
  getDescriptionsByUpdater(username: string): Observable<RepositoryDescription[]> {
    const url = `${this.apiUrl}/api/repo-descriptions/updated-by/${username}`;
    return this.http.get<RepositoryDescription[]>(url);
  }
}
