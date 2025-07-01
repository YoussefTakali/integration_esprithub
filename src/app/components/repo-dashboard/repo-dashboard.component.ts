import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  StatsService,
  ActivityStats,
  FileTypeStats,
  ContributorStats,
  RepoSizeStats,
  PushFrequencyStats
} from 'src/app/services/stats.service';

@Component({
  selector: 'app-repo-dashboard',
  templateUrl: './repo-dashboard.component.html',
  styleUrls: ['./repo-dashboard.component.css']
})
export class RepoDashboardComponent implements OnInit {
  owner: string = '';
  repo: string = '';
  repoFullName: string = '';

  // Loading states
  isLoadingActivity = false;
  isLoadingFileTypes = false;
  isLoadingContributors = false;
  isLoadingSize = false;
  isLoadingPushFreq = false;

  // Data
  activityStats: ActivityStats[] = [];
  fileTypeStats: FileTypeStats[] = [];
  contributorStats: ContributorStats[] = [];
  repoSizeStats: RepoSizeStats | null = null;
  pushFrequencyStats: PushFrequencyStats[] = [];

  // Debug info
  debugInfo = {
    activityLoaded: false,
    fileTypesLoaded: false,
    contributorsLoaded: false,
    sizeLoaded: false,
    pushFreqLoaded: false
  };

  // Settings
  activityDays = 30;
  pushFreqDays = 30;

  // Demo mode indicator
  isDemoMode = false;

  // Error handling
  errors: { [key: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const repoParam = params['repo'];
      if (repoParam) {
        const [owner, repo] = repoParam.split('/');
        if (owner && repo) {
          this.owner = owner;
          this.repo = repo;
          this.repoFullName = `${owner}/${repo}`;
          this.loadAllStats();
        } else {
          console.error('Invalid repo parameter format');
          this.router.navigate(['/repo-selector']);
        }
      } else {
        console.error('No repo parameter provided, redirecting to repo selector');
        this.router.navigate(['/repo-selector']);
      }
    });
  }

  loadAllStats(): void {
    this.loadActivityStats();
    this.loadFileTypeStats();
    this.loadContributorStats();
    this.loadRepoSizeStats();
    this.loadPushFrequencyStats();
  }

  loadActivityStats(): void {
    this.isLoadingActivity = true;
    this.errors['activity'] = '';

    this.statsService.getActivityStats(this.owner, this.repo, this.activityDays).subscribe({
      next: (data) => {
        console.log('Activity stats loaded:', data);
        this.activityStats = data;
        this.debugInfo.activityLoaded = true;
        this.isLoadingActivity = false;
        this.checkDemoMode();
      },
      error: (error) => {
        console.error('Error loading activity stats:', error);
        this.errors['activity'] = `Failed to load activity statistics: ${error.status === 404 ? 'Endpoint not found' : error.message || 'Unknown error'}`;
        this.isLoadingActivity = false;
        this.isDemoMode = true;
      }
    });
  }

  loadFileTypeStats(): void {
    this.isLoadingFileTypes = true;
    this.errors['fileTypes'] = '';

    console.log(`Loading file types for: ${this.owner}/${this.repo}`);

    this.statsService.getFileTypeStats(this.owner, this.repo).subscribe({
      next: (data) => {
        console.log('File types data received:', data);
        console.log('File types array length:', data?.length);
        console.log('First file type:', data?.[0]);
        this.fileTypeStats = data || [];
        this.debugInfo.fileTypesLoaded = true;
        this.isLoadingFileTypes = false;
      },
      error: (error) => {
        console.error('Error loading file type stats:', error);
        console.error('Error details:', error.status, error.message);
        console.error('Full error object:', error);
        this.errors['fileTypes'] = `Failed to load file type statistics: ${error.status} - ${error.message}`;
        this.debugInfo.fileTypesLoaded = false;
        this.isLoadingFileTypes = false;
      }
    });
  }

  loadContributorStats(): void {
    this.isLoadingContributors = true;
    this.errors['contributors'] = '';

    console.log(`Loading contributors for: ${this.owner}/${this.repo}`);

    this.statsService.getContributorStats(this.owner, this.repo).subscribe({
      next: (data) => {
        console.log('Contributors data received:', data);
        console.log('Contributors array length:', data?.length);
        this.contributorStats = data || [];
        this.debugInfo.contributorsLoaded = true;
        this.isLoadingContributors = false;
      },
      error: (error) => {
        console.error('Error loading contributor stats:', error);
        console.error('Error details:', error.status, error.message);
        this.errors['contributors'] = `Failed to load contributor statistics: ${error.status} - ${error.message}`;
        this.debugInfo.contributorsLoaded = false;
        this.isLoadingContributors = false;
      }
    });
  }

  loadRepoSizeStats(): void {
    this.isLoadingSize = true;
    this.errors['size'] = '';

    this.statsService.getRepoSizeStats(this.owner, this.repo).subscribe({
      next: (data) => {
        this.repoSizeStats = data;
        this.isLoadingSize = false;
      },
      error: (error) => {
        console.error('Error loading repo size stats:', error);
        this.errors['size'] = 'Failed to load repository size statistics';
        this.isLoadingSize = false;
      }
    });
  }

  loadPushFrequencyStats(): void {
    this.isLoadingPushFreq = true;
    this.errors['pushFreq'] = '';

    this.statsService.getPushFrequencyStats(this.owner, this.repo, this.pushFreqDays).subscribe({
      next: (data) => {
        this.pushFrequencyStats = data;
        this.isLoadingPushFreq = false;
      },
      error: (error) => {
        console.error('Error loading push frequency stats:', error);
        this.errors['pushFreq'] = 'Failed to load push frequency statistics';
        this.isLoadingPushFreq = false;
      }
    });
  }

  // Helper methods
  formatFileSize(bytes: number): string {
    return this.statsService.formatFileSize(bytes);
  }

  formatNumber(num: number): string {
    return this.statsService.formatNumber(num);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  // Navigation
  goBackToRepo(): void {
    this.router.navigate(['/repo-browser'], {
      queryParams: { repo: this.repoFullName }
    });
  }

  refreshStats(): void {
    this.loadAllStats();
  }

  // Update time ranges
  updateActivityDays(days: number): void {
    this.activityDays = days;
    this.loadActivityStats();
  }

  updatePushFreqDays(days: number): void {
    this.pushFreqDays = days;
    this.loadPushFrequencyStats();
  }

  // Get total commits from activity stats
  getTotalCommits(): number {
    if (!this.activityStats || !Array.isArray(this.activityStats)) {
      return 0;
    }
    return this.activityStats.reduce((total, stat) => total + (stat.commits || 0), 0);
  }

  // Get total additions/deletions
  getTotalAdditions(): number {
    if (!this.activityStats || !Array.isArray(this.activityStats)) {
      return 0;
    }
    return this.activityStats.reduce((total, stat) => total + (stat.additions || 0), 0);
  }

  getTotalDeletions(): number {
    if (!this.activityStats || !Array.isArray(this.activityStats)) {
      return 0;
    }
    return this.activityStats.reduce((total, stat) => total + (stat.deletions || 0), 0);
  }

  // Get most active contributor
  getMostActiveContributor(): ContributorStats | null {
    if (!this.contributorStats || !Array.isArray(this.contributorStats) || this.contributorStats.length === 0) {
      return null;
    }
    return this.contributorStats.reduce((prev, current) =>
      (prev.commits > current.commits) ? prev : current
    );
  }

  // Get most common file type
  getMostCommonFileType(): FileTypeStats | null {
    if (!this.fileTypeStats || !Array.isArray(this.fileTypeStats) || this.fileTypeStats.length === 0) {
      return null;
    }
    return this.fileTypeStats.reduce((prev, current) =>
      (prev.count > current.count) ? prev : current
    );
  }

  // Get max commits for chart scaling
  getMaxCommits(): number {
    if (!this.activityStats || !Array.isArray(this.activityStats) || this.activityStats.length === 0) {
      return 1;
    }
    return Math.max(...this.activityStats.map(stat => stat.commits || 0));
  }

  // Check if we're in demo mode by looking for console warnings
  private checkDemoMode(): void {
    // Simple way to detect demo mode - check console for demo warnings
    setTimeout(() => {
      // If we have data but the backend endpoints aren't available, we're in demo mode
      this.isDemoMode = true; // For now, always show demo notice until backend is deployed
    }, 500);
  }
}
