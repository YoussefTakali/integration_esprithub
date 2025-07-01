import { Component, OnInit } from '@angular/core';
import { RecentReposService, RecentRepo } from 'src/app/services/recent-repos.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recent-repos',
  templateUrl: './recent-repos.component.html',
  styleUrls: ['./recent-repos.component.css']
})
export class RecentReposComponent implements OnInit {
  recentRepos: RecentRepo[] = [];
  showAllRepos = false;
  
  constructor(
    private recentReposService: RecentReposService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.recentReposService.recentRepos$.subscribe(repos => {
      this.recentRepos = repos;
    });
  }

  /**
   * Navigate to the repository browser with the selected repo
   */
  navigateToRepo(repo: RecentRepo): void {
    // Update the last accessed time
    this.recentReposService.addRecentRepo(repo.name, repo.fullName);
    
    // Navigate to the repo browser
    this.router.navigate(['repo-browser'], { 
      queryParams: { 
        repo: repo.fullName
      }
    });
  }

  /**
   * Toggle showing all repositories
   */
  toggleShowAll(): void {
    this.showAllRepos = !this.showAllRepos;
  }

  /**
   * Format the repository name for display
   */
  formatRepoName(fullName: string): string {
    return fullName;
  }
}
