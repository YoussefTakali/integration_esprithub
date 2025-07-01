import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';   // ★ add HttpHeaders
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GithubTokenService } from './github-token.service';

/* ---------- models ---------- */
export interface ActivityStats       { date: string; commits: number; pushes: number; additions: number; deletions: number; }
export interface FileTypeStats       { extension: string; count: number; percentage: number; totalSize: number; }
export interface ContributorStats    { username: string; commits: number; additions: number; deletions: number; lastCommit: string; }
export interface RepoSizeStats       { totalSize: number; fileCount: number; directoryCount: number;
                                       largestFiles: Array<{ name: string; size: number; path: string; }>; }
export interface PushFrequencyStats  { date: string; pushCount: number; commitCount: number; uniqueContributors: number; }

@Injectable({ providedIn: 'root' })
export class StatsService {

  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private tokenService: GithubTokenService                         // ★ inject the token service
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Helper – build headers with the token                             */
  /* ------------------------------------------------------------------ */
  private buildHeaders(): HttpHeaders {                         // ★ centralised header builder
    const token = this.tokenService.getToken();
    return new HttpHeaders({
      'X-GitHub-Token': token ?? ''                             // or use 'Authorization': `Bearer ${token}`
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Stats endpoints                                                   */
  /* ------------------------------------------------------------------ */

  getActivityStats(owner: string, repo: string, days = 30): Observable<ActivityStats[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/activity-array?days=${days}`;
    return this.http.get<ActivityStats[]>(url, { headers: this.buildHeaders() });   // ★ headers
  }

  getFileTypeStats(owner: string, repo: string): Observable<FileTypeStats[]> {
    const urlArray    = `${this.apiUrl}/api/stats/${owner}/${repo}/file-types-array`;
    const urlOriginal = `${this.apiUrl}/api/stats/${owner}/${repo}/file-types`;

    return this.http.get<FileTypeStats[]>(urlArray, { headers: this.buildHeaders() }).pipe( // ★
      catchError(() => this.http.get<FileTypeStats[]>(urlOriginal, { headers: this.buildHeaders() })) // ★
    );
  }

  getContributorStats(owner: string, repo: string): Observable<ContributorStats[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/contributors-array`;
    return this.http.get<ContributorStats[]>(url, { headers: this.buildHeaders() }); // ★
  }

  getSidebarContributors(owner: string, repo: string): Observable<any[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/sidebar/contributors`;
    return this.http.get<any[]>(url, { headers: this.buildHeaders() });              // ★
  }

  getCollaborators(owner: string, repo: string): Observable<any[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/collaborators`;
    return this.http.get<any[]>(url, { headers: this.buildHeaders() });              // ★
  }

  getRepoSizeStats(owner: string, repo: string): Observable<RepoSizeStats> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/size`;
    return this.http.get<RepoSizeStats>(url, { headers: this.buildHeaders() });      // ★
  }

  getPushFrequencyStats(owner: string, repo: string, days = 30): Observable<PushFrequencyStats[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/push-frequency?days=${days}`;
    return this.http.get<PushFrequencyStats[]>(url, { headers: this.buildHeaders() });// ★
  }

  /* ------------------------------------------------------------------ */
  /*  Utility helpers (unchanged)                                       */
  /* ------------------------------------------------------------------ */

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatNumber(num: number | undefined): string {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString();
  }
}
