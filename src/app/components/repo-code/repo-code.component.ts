import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GithubTokenService } from '../../services/github-token.service';

@Component({
  selector: 'app-repo-code',
  templateUrl: './repo-code.component.html',
  styleUrls: ['./repo-code.component.css']
})
export class RepoCodeComponent {
  ownerName: string = "";
  githubToken:string=""
  repoName: string = '';
  collaborators: string[] = [];
  branches: any[] = [];
  filteredCollaborators: any[] = [];
  collab: any;
  repo = {
    name: '',
    auto_init: true,
    gitignore_template: 'Node'
  };
  files: any[] = [];
  path: string = '';
  contents: any[] = [];
  isFile: boolean = false;
  isImage: boolean = false;
  fileContent: string = ' ';
  latestCommitBanner: any = null;
  count: number = 0;
  selectedBranch: string = 'main';
  readmeContent: string = '';
  showBranchList = false;
  fileLines: string[] = [];

  
  // New statistics properties
  repoStats = {
    totalCommits: 0,
    totalBranches: 0,
    totalContributors: 0,
    totalLanguages: 0
  };
  
  branchStats: { [branchName: string]: any } = {};
  languageStats: { [language: string]: number } = {};
  showStatsPanel = true;


  constructor(private router: Router, private route: ActivatedRoute, private http: HttpClient,private githubTokenService: GithubTokenService,) {}
  ngOnInit() {
    this.fillRepoInfoFromUrl(this.router.url);
    this.getCollaborators();
    this.getBranches();
    this.loadContents();
    this.loadRepositoryStatistics();
    if (this.fileContent) {
      this.fileLines = this.fileContent.split('\n');
    }
    this.getUniqueLanguagesCount();
  }

  fillRepoInfoFromUrl(url: string) {
    const match = url.match(/^\/repo\/([^\/]+)\/([^\/]+)/);
    if (match) {
      this.ownerName = match[1];
      this.repoName = match[2];
    }
  }

  goToAccessControl() {
    this.router.navigate(['../settings'], { relativeTo: this.route, fragment: 'access' });
  }

  getCollaborators() {
      const githubToken = this.githubTokenService.getToken();
    this.http.get<any[]>('/api/github/list-collaborators', {
      params: {
        owner: this.ownerName,
        repo: this.repoName
      },
      headers: {
        'GitHub-Token': githubToken
      }
    }).subscribe(data => {
      this.collaborators = data;
      this.repoStats.totalContributors = data.length;
    }, error => {
      console.error('Error fetching collaborators:', error);
    });
  }

  getBranches() {
    const githubToken = this.githubTokenService.getToken();
    this.http.get<any[]>('/api/github/list-branches', {
     
      params: {
        owner: this.ownerName,
        repo: this.repoName
      },
    headers: {
      'GitHub-Token': githubToken
    }
    }).subscribe(data => {
      this.branches = data;
      this.repoStats.totalBranches = data.length;
      if (this.branches.length > 0) {
        this.selectedBranch = this.branches[0].name;
      }
      // Load statistics for each branch
      this.loadBranchStatistics();
    }, error => {
      console.error('Error fetching branches:', error);
    });
  }

  loadBranchStatistics() {
    this.branches.forEach(branch => {
      // Get commit count for each branch
      this.getCommitCount(this.ownerName, this.repoName, '', branch.name).subscribe(commitCount => {
        if (!this.branchStats[branch.name]) {
          this.branchStats[branch.name] = {};
        }
        this.branchStats[branch.name].commits = commitCount;
      });

      // Get language statistics for each branch
      this.fetchBranchLanguages(branch.name);
    });
  }

  fetchBranchLanguages(branchName: string) {
    const githubToken = this.githubTokenService.getToken();
    this.http.get<any>(`/api/github/repo-languages`, {
      params: {
        owner: this.ownerName,
        repo: this.repoName,
        branch: branchName
      },
    headers: {
      'GitHub-Token': githubToken
    }
    }).subscribe(data => {
      if (!this.branchStats[branchName]) {
        this.branchStats[branchName] = {};
      }
      
      const languages = Object.keys(data || {});
      this.branchStats[branchName].languages = languages;
      this.branchStats[branchName].languageCount = languages.length;
      
      // Update global language stats
      languages.forEach(lang => {
        this.languageStats[lang] = (this.languageStats[lang] || 0) + (data[lang] || 0);
      });
      
      this.repoStats.totalLanguages = Object.keys(this.languageStats).length;
    }, error => {
      console.error(`Error fetching languages for branch ${branchName}:`, error);
      if (!this.branchStats[branchName]) {
        this.branchStats[branchName] = {};
      }
      this.branchStats[branchName].languages = [];
      this.branchStats[branchName].languageCount = 0;
    });
  }

  loadRepositoryStatistics() {
    // Get total commit count for the repository
    this.getCommitCount(this.ownerName, this.repoName, '', this.selectedBranch).subscribe(totalCommits => {
      this.repoStats.totalCommits = totalCommits;
    });
  }

  toggleStatsPanel() {
    this.showStatsPanel = !this.showStatsPanel;
  }

  getTopLanguages(): { name: string, bytes: number, percentage: number }[] {
    const total = Object.values(this.languageStats).reduce((sum, bytes) => sum + bytes, 0);
    return Object.entries(this.languageStats)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: total > 0 ? Math.round((bytes / total) * 100) : 0
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5);
  }

  getBranchCommitCount(branchName: string): number {
    return this.branchStats[branchName]?.commits || 0;
  }

  getBranchLanguageCount(branchName: string): number {
    return this.branchStats[branchName]?.languageCount || 0;
  }

  getBranchLanguages(branchName: string): string[] {
    return this.branchStats[branchName]?.languages || [];
  }

  toggleBranchList() {
    this.showBranchList = !this.showBranchList;
  }

  selectBranch(branchName: string) {
    this.selectedBranch = branchName;
    this.showBranchList = false;
    this.loadContents(this.path);
  }

  getLatestRepoCommit(): void {
      const githubToken = this.githubTokenService.getToken();
    this.http.get<any>(`/api/github/latest-repo-commit`, {
      params: {
        owner: this.ownerName,
        repo: this.repoName,
        branch: this.selectedBranch
      },
      headers: {
        'GitHub-Token': githubToken
      }
    }).subscribe(data => {
      if (Array.isArray(data) && data.length > 0) {
        const commit = data[0];
        this.latestCommitBanner = {
          message: commit.commit.message,
          author: commit.commit.author.name,
          avatarUrl: commit.author?.avatar_url || 'default-avatar.png',
          time: new Date(commit.commit.author.date),
          sha: commit.sha.substring(0, 7),
          count: 1
        };
      }
    });
  }
private getAuthHeaders() {
  return {
    'GitHub-Token': this.githubTokenService.getToken()
  };
}

  getCommitCount(owner: string, repo: string, path: string, branch: string): Observable<number> {
      const githubToken = this.githubTokenService.getToken();
    const params: any = { owner, repo, branch };
    if (path) params.path = path;

    return this.http.get<{ count: number }>('/api/github/commit-count', { params,headers: this.getAuthHeaders() }).pipe(
      map(response => response.count),
      catchError(error => {
        console.error('Error fetching commit count:', error);
        return of(0);
      })
    );
  }

  loadContents(path: string = ''): void {
      const githubToken = this.githubTokenService.getToken();
    this.path = path;
    this.http.get<any>(`/api/github/repo-contents`, {
      params: {
        owner: this.ownerName,
        repo: this.repoName,
        path: path,
        branch: this.selectedBranch
      },
      headers: {
        'GitHub-Token': githubToken
      }
    }).subscribe(data => {
      if (Array.isArray(data)) {
        this.contents = data;
        this.isFile = false;

        this.contents.forEach(item => {
            const githubToken = this.githubTokenService.getToken();
          this.http.get<any>(`/api/github/latest-commit`, {
            params: {
              owner: this.ownerName,
              repo: this.repoName,
              path: item.path,
              branch: this.selectedBranch
            },
      headers: {
        'GitHub-Token': githubToken
      }
          }).subscribe(commitData => {
            if (Array.isArray(commitData) && commitData.length > 0) {
              item.latestCommit = commitData[0].commit.message;
              this.getCommitCount(this.ownerName, this.repoName, item.path, this.selectedBranch).subscribe(count => {
                item.commitCount = count;
              });
            } else {
              item.latestCommit = 'No recent commit';
            }
          }, error => {
            item.latestCommit = 'Unable to fetch commit';
          });
        });

        const readme = data.find(item => item.name.toLowerCase() === 'readme.md');
        if (readme) {
            const githubToken = this.githubTokenService.getToken();
          this.http.get<any>(`/api/github/repo-contents`, {
            params: {
              owner: this.ownerName,
              repo: this.repoName,
              path: readme.path,
              branch: this.selectedBranch
            },
      headers: {
        'GitHub-Token': githubToken
      }
          }).subscribe(readmeData => {
            if (readmeData && readmeData.content) {
              this.readmeContent = atob(readmeData.content);
            }
          });
        } else {
          this.readmeContent = '';
        }
      } else if (data && data.content) {
        this.isFile = true;
        if (this.isImageFile(data.path)) {
          const binaryData = atob(data.content);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: this.getContentType(data.path) });
          this.fileContent = URL.createObjectURL(blob);
          console.log('Image Blob URL:', this.fileContent);

          this.isImage = true;
        } else {
          this.fileContent = atob(data.content);
          this.isImage = false;
          if (path.toLowerCase().endsWith('readme.md')) {
            this.readmeContent = this.fileContent;
          }
        }
      } else {
        this.isFile = true;
        this.fileContent = 'null';
        this.isImage = false;
        this.contents = [];
        this.readmeContent = '';
        console.log('Empty file or unexpected response format');
      }
       
      this.getLatestRepoCommit();
      this.fetchCommitCount();
    });
  }

  private isImageFile(path: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
    const extension = path.substring(path.lastIndexOf('.')).toLowerCase();
    return imageExtensions.includes(extension);
  }

  private getContentType(path: string): string {
    const extension = path.substring(path.lastIndexOf('.')).toLowerCase();
    switch (extension) {
      case '.png': return 'image/png';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.gif': return 'image/gif';
      case '.svg': return 'image/svg+xml';
      case '.bmp': return 'image/bmp';
      default: return 'application/octet-stream';
    }
  }

  goBack() {
    if (!this.path) return;
  
    const lastSlash = this.path.lastIndexOf('/');
    this.loadContents(lastSlash === -1 ? '' : this.path.substring(0, lastSlash));
  }

  showCloneBox = false;
  cloneUrl = '';

  toggleCloneDropdown() {
    this.showCloneBox = !this.showCloneBox;
    this.cloneUrl = `https://github.com/${this.ownerName}/${this.repoName}.git`;
  }

  copyCloneUrl() {
    navigator.clipboard.writeText(this.cloneUrl).then(() => {
      const copyButton = document.querySelector('.clone-box button');
      if (copyButton) {
        copyButton.textContent = 'Copied';
        
        setTimeout(() => {
          if (copyButton) {
            copyButton.textContent = 'Copy';
          }
          this.showCloneBox = false;
        }, 1500);
      }
    });
  }

  commitCount: number = 0;

  fetchCommitCount() {
      const githubToken = this.githubTokenService.getToken();
    this.http.get<any>(`/api/github//commit-count`, {
      params: {
        owner: this.ownerName,
        repo: this.repoName,
        branch: this.selectedBranch
      },
      headers: {
        'GitHub-Token': githubToken
      }
    }).subscribe({
      next: (data) => {
        this.commitCount = data.count;
      },
      error: (error) => {
        console.error('Error fetching commit count:', error);
        this.commitCount = 0;
      }
    });
  }

  getUniqueLanguagesCount(): number {
    const languageSet = new Set<string>();
    this.contents.forEach(f => {
      if (f.language) languageSet.add(f.language);
    });
    return languageSet.size;
  }
  // Add these properties to your component
copyButtonState: 'copy' | 'copied' = 'copy';
overlayButtonState: 'copy' | 'copied' = 'copy';

// Helper methods
getFileName(): string {
  if (!this.path) return '';
  return this.path.split('/').pop() || '';
}

getFileSize(): string {
  if (!this.fileContent) return '0 B';
  const bytes = new Blob([this.fileContent]).size;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

getLineCount(): string {
  if (!this.fileContent) return '0';
  return this.fileLines.length.toString();
}

getDownloadUrl(): string {
  const blob = new Blob([this.fileContent], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}

// Copy functionality
copyFileContent(): void {
  navigator.clipboard.writeText(this.fileContent).then(() => {
    this.copyButtonState = 'copied';
    setTimeout(() => {
      this.copyButtonState = 'copy';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

copyFileContentOverlay(): void {
  navigator.clipboard.writeText(this.fileContent).then(() => {
    this.overlayButtonState = 'copied';
    setTimeout(() => {
      this.overlayButtonState = 'copy';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}
}