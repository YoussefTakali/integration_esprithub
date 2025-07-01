import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RecentReposService, RecentRepo } from 'src/app/services/recent-repos.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-repo-dropdown',
  templateUrl: './repo-dropdown.component.html',
  styleUrls: ['./repo-dropdown.component.css']
})
export class RepoDropdownComponent implements OnInit {
  recentRepos: RecentRepo[] = [];
  isDropdownOpen = false;
  searchQuery = '';

  constructor(
    private recentReposService: RecentReposService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.recentReposService.recentRepos$.subscribe(repos => {
      this.recentRepos = repos;
    });
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;

    // Add a click event listener to the document to close the dropdown when clicking outside
    if (this.isDropdownOpen) {
      setTimeout(() => {
        document.addEventListener('click', this.handleDocumentClick);
      }, 0);
    }
  }

  /**
   * Handle document click to close dropdown when clicking outside
   */
  private handleDocumentClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.repo-dropdown-container');

    if (dropdown && !dropdown.contains(target)) {
      this.isDropdownOpen = false;
      document.removeEventListener('click', this.handleDocumentClick);
      this.cdr.detectChanges();
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown(): void {
    this.isDropdownOpen = false;
    document.removeEventListener('click', this.handleDocumentClick);
  }

  /**
   * Navigate to the repository browser with the selected repo
   */
  navigateToRepo(repo: RecentRepo, event: Event): void {
    event.stopPropagation();

    // Update the last accessed time
    this.recentReposService.addRecentRepo(repo.name, repo.fullName);

    // Navigate to the repo browser
    this.router.navigate(['repo-browser'], {
      queryParams: {
        repo: repo.fullName
      }
    });

    // Close the dropdown
    this.closeDropdown();
  }

  /**
   * Navigate to the repository selector
   */
  navigateToRepoSelector(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['']); // Navigate to the root route which is the repo selector
    this.closeDropdown();
  }

  /**
   * Filter repositories based on search query
   */
  get filteredRepos(): RecentRepo[] {
    if (!this.searchQuery) {
      return this.recentRepos;
    }

    const query = this.searchQuery.toLowerCase();
    return this.recentRepos.filter(repo =>
      repo.name.toLowerCase().includes(query) ||
      repo.fullName.toLowerCase().includes(query)
    );
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  /**
   * Format time ago
   */
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);

    if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
    if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'just now';
  }
}
