import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GithubTokenService } from '../../services/github-token.service';

@Component({
  selector: 'app-repo-page',
  templateUrl: './repo-page.component.html',
  styleUrls: ['./repo-page.component.css']
})
export class RepoPageComponent implements OnInit {
  ownerName = '';
  repoName = '';
  path = '';
  contents: any[] = [];
  isFile = false;
  fileContent = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private githubTokenService: GithubTokenService
  ) {}

  ngOnInit() {
    this.fillRepoInfoFromUrl(this.router.url);
    console.log('*******MARAMMMMMM***********');
    console.log('Hello from RepoPageComponent!');
    console.log(this.ownerName);
    console.log(this.repoName);

    // Example of loading contents
    this.loadContents();
  }

  private getAuthHeaders() {
    return {
      'GitHub-Token': this.githubTokenService.getToken()
    };
  }

  fillRepoInfoFromUrl(url: string) {
    const match = url.match(/^\/repo\/([^\/]+)\/([^\/]+)/);
    if (match) {
      this.ownerName = match[1];
      this.repoName = match[2];
    } else {
      this.ownerName = '';
      this.repoName = '';
    }
  }

  loadContents(path: string = '') {
    this.http.get<any>(`/api/github/repo-contents`, {
      params: {
        owner: this.ownerName,
        repo: this.repoName,
        path: path || '',
        branch: 'main' // or this.selectedBranch if you add that later
      },
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.contents = data;
          this.isFile = false;
        } else if (data && data.content) {
          this.isFile = true;
          this.fileContent = atob(data.content);
        } else {
          console.warn('Unexpected data format:', data);
        }
      },
      error: (error) => {
        console.error('Error loading contents:', error);
      }
    });
  }
}
