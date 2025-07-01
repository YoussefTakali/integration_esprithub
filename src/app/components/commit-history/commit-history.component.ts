import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RepoService } from "src/app/services/rep.service"

interface CommitFile {
  filename: string;
  status: string; // 'added', 'modified', 'removed'
  additions: number;
  deletions: number;
  changes: number;
}

interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  author: {
    avatar_url: string;
    login: string;
  } | null;
  files?: CommitFile[]; // Add files property to store commit files
}

@Component({
  selector: 'app-commit-history',
  templateUrl: './commit-history.component.html',
  styleUrls: ['./commit-history.component.css']
})
export class CommitHistoryComponent implements OnInit {
  owner: string = '';
  repo: string = '';
  commits: Commit[] = [];
  isLoading: boolean = false;
  currentPage: number = 1;
  perPage: number = 20;
  hasMoreCommits: boolean = false;
  selectedBranch: string = 'main';
  branches: string[] = [];
  errorMessage: string = '';
  selectedCommit: Commit | null = null;
  isLoadingCommitDetails: boolean = false;

  // Add a map to store commit files to avoid repeated API calls
  private commitFilesCache = new Map<string, CommitFile[]>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private RepoService: RepoService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.owner = params['owner'];
      this.repo = params['repo'];
      
      console.log('Loading commit history for:', this.owner, '/', this.repo);
      
      this.loadBranches();
      this.loadCommits();
    });
  }

  loadBranches(): void {
    this.http.get<string[]>(`http://localhost:8080/api/repos/${this.owner}/${this.repo}/branches`)
      .subscribe({
        next: (branches) => {
          this.branches = branches;
          console.log('Loaded branches:', branches);
          
          if (branches.length > 0 && !branches.includes(this.selectedBranch)) {
            this.selectedBranch = branches.includes('main') ? 'main' : 
                                 branches.includes('master') ? 'master' : 
                                 branches[0];
          }
        },
        error: (error) => {
          console.error('Error loading branches:', error);
          this.errorMessage = 'Failed to load branches: ' + (error.message || 'Unknown error');
        }
      });
  }

  loadCommits(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Loading commits for branch:', this.selectedBranch, 'page:', this.currentPage);
    
    const url = `http://localhost:8080/api/repos/${this.owner}/${this.repo}/commits?page=${this.currentPage}&perPage=${this.perPage}&branch=${this.selectedBranch}`;
    
    this.http.get<Commit[]>(url)
      .subscribe({
        next: (commits) => {
          console.log('Commit history response:', commits);
          
          if (Array.isArray(commits)) {
            this.commits = commits;
            this.hasMoreCommits = commits.length === this.perPage;
            
            // Load files for each commit
            this.loadCommitFiles(commits);
            
            if (commits.length === 0 && this.currentPage === 1) {
              this.errorMessage = 'This repository appears to be empty or has no commits on the selected branch.';
            }
          } else {
            console.error('Unexpected response format:', commits);
            this.errorMessage = 'Unexpected response format from server';
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading commits:', error);
          this.handleCommitLoadError(error);
          this.isLoading = false;
        }
      });
  }

  // New method to load files for commits
  private loadCommitFiles(commits: Commit[]): void {
    commits.forEach(commit => {
      // Check if we already have files for this commit
      if (!this.commitFilesCache.has(commit.sha)) {
        this.loadSingleCommitFiles(commit);
      } else {
        // Use cached files
        commit.files = this.commitFilesCache.get(commit.sha);
      }
    });
  }

  // Load files for a single commit
  private loadSingleCommitFiles(commit: Commit): void {
    const url = `http://localhost:8080/api/repos/${this.owner}/${this.repo}/commits/${commit.sha}`;
    
    this.http.get<any>(url)
      .subscribe({
        next: (commitDetail) => {
          if (commitDetail && commitDetail.files) {
            const files: CommitFile[] = commitDetail.files.map((file: any) => ({
              filename: file.filename,
              status: file.status,
              additions: file.additions || 0,
              deletions: file.deletions || 0,
              changes: file.changes || 0
            }));
            
            // Cache the files
            this.commitFilesCache.set(commit.sha, files);
            commit.files = files;
          }
        },
        error: (error) => {
          console.error(`Error loading files for commit ${commit.sha}:`, error);
          // Set empty array if we can't load files
          commit.files = [];
          this.commitFilesCache.set(commit.sha, []);
        }
      });
  }

  // Updated method to get dynamic file names from commit
  getFileName(commit: Commit): string {
    if (!commit.files || commit.files.length === 0) {
      return 'Loading files...';
    }
    
    // Return the first file name, or a summary if multiple files
    if (commit.files.length === 1) {
      return commit.files[0].filename;
    } else {
      return `${commit.files[0].filename} (+${commit.files.length - 1} more)`;
    }
  }

  // New method to get all files for a commit
  getCommitFiles(commit: Commit): CommitFile[] {
    return commit.files || [];
  }

  // New method to get file count for a commit
  getFileCount(commit: Commit): number {
    return commit.files ? commit.files.length : 0;
  }

  // New method to get file status icon
  getFileStatusIcon(status: string): string {
    switch (status) {
      case 'added': return '➕';
      case 'modified': return '📝';
      case 'removed': return '🗑️';
      case 'renamed': return '📋';
      default: return '📄';
    }
  }

  // New method to get file status color
  getFileStatusColor(status: string): string {
    switch (status) {
      case 'added': return '#28a745';
      case 'modified': return '#ffc107';
      case 'removed': return '#dc3545';
      case 'renamed': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  loadMoreCommits(): void {
    this.currentPage++;
    this.isLoading = true;
    
    const url = `http://localhost:8080/api/repos/${this.owner}/${this.repo}/commits?page=${this.currentPage}&perPage=${this.perPage}&branch=${this.selectedBranch}`;
    
    this.http.get<Commit[]>(url)
      .subscribe({
        next: (newCommits) => {
          if (Array.isArray(newCommits)) {
            this.commits = [...this.commits, ...newCommits];
            this.hasMoreCommits = newCommits.length === this.perPage;
            
            // Load files for new commits
            this.loadCommitFiles(newCommits);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading more commits:', error);
          this.handleCommitLoadError(error);
          this.isLoading = false;
          this.currentPage--;
        }
      });
  }

  private handleCommitLoadError(error: any): void {
    if (error.status === 409) {
      this.errorMessage = 'Repository conflict: This repository might be empty or the branch doesn\'t exist.';
    } else if (error.status === 404) {
      this.errorMessage = 'Repository or branch not found.';
    } else if (error.status === 403) {
      this.errorMessage = 'Access denied: You might not have permission to access this repository.';
    } else {
      this.errorMessage = 'Failed to load commits: ' + (error.error?.message || error.message || 'Unknown error');
    }
  }

  isRepositoryEmpty(): boolean {
    return this.commits.length === 0 && !this.isLoading && this.currentPage === 1;
  }
 
  changeBranch(event: any): void {
    const newBranch = event.target.value;
    console.log('Changing branch to:', newBranch);
    
    this.selectedBranch = newBranch;
    this.currentPage = 1;
    this.commits = [];
    this.commitFilesCache.clear(); // Clear cache when changing branches
    this.loadCommits();
  }

  viewCommitDetail(commit: Commit): void {
    console.log('Viewing commit detail:', commit.sha);
    this.router.navigate(['/commit-detail', this.owner, this.repo, commit.sha]);
  }

  compareCommits(baseCommit: Commit, headCommit: Commit): void {
    console.log('Comparing commits:', baseCommit.sha, 'to', headCommit.sha);
    this.router.navigate(['/commit-compare', this.owner, this.repo, baseCommit.sha, headCommit.sha]);
  }

  viewRepositoryAtCommit(commit: Commit): void {
    console.log('Viewing repository at commit:', commit.sha);
    this.router.navigate(['/repo-browser'], { 
      queryParams: { 
        repo: `${this.owner}/${this.repo}`,
        commit: commit.sha 
      } 
    });
  }

  goBack(): void {
    this.router.navigate(['/repo-browser'], { 
      queryParams: { repo: `${this.owner}/${this.repo}` } 
    });
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 30;
    const year = day * 365;
    
    if (diffInSeconds < minute) {
      return 'just now';
    } else if (diffInSeconds < hour) {
      const minutes = Math.floor(diffInSeconds / minute);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < day) {
      const hours = Math.floor(diffInSeconds / hour);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < month) {
      const days = Math.floor(diffInSeconds / day);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < year) {
      const months = Math.floor(diffInSeconds / month);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / year);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }

  getShortSha(sha: string): string {
    return sha.substring(0, 7);
  }

  getCommitTitle(message: string): string {
    return message.split('\n')[0];
  }

  getCommitBody(message: string): string {
    const lines = message.split('\n');
    return lines.length > 1 ? lines.slice(1).join('\n').trim() : '';
  }

  getUniqueContributors(): any[] {
    if (!this.commits || this.commits.length === 0) {
      return [];
    }

    const contributorMap = new Map()

    this.commits.forEach((commit) => {
      const authorName = commit.commit.author.name
      const authorAvatar = commit.author?.avatar_url

      if (contributorMap.has(authorName)) {
        contributorMap.get(authorName).commitCount++
      } else {
        contributorMap.set(authorName, {
          name: authorName,
          avatar_url: authorAvatar,
          commitCount: 1,
        })
      }
    })

    // Convert map to array and sort by commit count (descending)
    return Array.from(contributorMap.values())
      .sort((a, b) => b.commitCount - a.commitCount);
  }

  // Add this property to control whether to show the NAME column
  showNameColumn: boolean = true

  // Add these methods to your existing component class

  currentTab: string = "statistics" // Set default to statistics since we're on the commit history page

  switchTab(tab: string): void {
    this.currentTab = tab
    if (tab === "code") {
      // Navigate to code view or emit event
      this.router.navigate(["/repo-browser"], {
        queryParams: { repo: `${this.owner}/${this.repo}` },
      })
    }
    // Statistics tab is already the current page
  }

  viewCommitHistory(): void {
    // This is already the commit history page, so maybe refresh or do nothing
    console.log("Already viewing commit history")
    // You could refresh the commit history here if needed
  }

  addFile(): void {
    // Implement add file functionality
    console.log("Add file clicked")
    // You could open a modal or navigate to an add file page
  }

  viewCode(): void {
    // Navigate to code view
    this.router.navigate(["/repo-browser"], {
      queryParams: { repo: `${this.owner}/${this.repo}` },
    })
  }
}
