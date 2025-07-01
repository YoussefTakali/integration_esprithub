import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ActivityStats {
  date: string;
  commits: number;
  pushes: number;
  additions: number;
  deletions: number;
}

export interface FileTypeStats {
  extension: string;
  count: number;
  percentage: number;
  totalSize: number;
}

export interface ContributorStats {
  username: string;
  commits: number;
  additions: number;
  deletions: number;
  lastCommit: string;
}

export interface RepoSizeStats {
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  largestFiles: Array<{
    name: string;
    size: number;
    path: string;
  }>;
}

export interface PushFrequencyStats {
  date: string;
  pushCount: number;
  commitCount: number;
  uniqueContributors: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  getActivityStats(owner: string, repo: string, days: number = 30): Observable<ActivityStats[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/activity-array?days=${days}`;
    return this.http.get<ActivityStats[]>(url);
  }

  getFileTypeStats(owner: string, repo: string): Observable<FileTypeStats[]> {
    const urlArray = `${this.apiUrl}/api/stats/${owner}/${repo}/file-types-array`;
    const urlOriginal = `${this.apiUrl}/api/stats/${owner}/${repo}/file-types`;

    console.log('Testing file types endpoints:');
    console.log('Array endpoint:', urlArray);
    console.log('Original endpoint:', urlOriginal);

    // Try the array endpoint first, fallback to original if it fails
    return this.http.get<FileTypeStats[]>(urlArray).pipe(
      catchError((error) => {
        console.warn('Array endpoint failed, trying original endpoint:', error.status);
        return this.http.get<FileTypeStats[]>(urlOriginal);
      })
    );
  }

  getContributorStats(owner: string, repo: string): Observable<ContributorStats[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/contributors-array`;
    return this.http.get<ContributorStats[]>(url);
  }

  // Get combined contributors + collaborators for sidebar display
  getSidebarContributors(owner: string, repo: string): Observable<any[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/sidebar/contributors`;
    return this.http.get<any[]>(url);
  }

  // Get collaborators (users with access permissions)
  getCollaborators(owner: string, repo: string): Observable<any[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/collaborators`;
    return this.http.get<any[]>(url);
  }

  getRepoSizeStats(owner: string, repo: string): Observable<RepoSizeStats> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/size`;
    return this.http.get<RepoSizeStats>(url);
  }

  getPushFrequencyStats(owner: string, repo: string, days: number = 30): Observable<PushFrequencyStats[]> {
    const url = `${this.apiUrl}/api/stats/${owner}/${repo}/push-frequency?days=${days}`;
    return this.http.get<PushFrequencyStats[]>(url);
  }

  // Helper method to format file sizes
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to format numbers with commas
  formatNumber(num: number | undefined): string {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    return num.toLocaleString();
  }


}
