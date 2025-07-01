import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface RecentRepo {
  name: string;
  fullName: string;
  lastAccessed: Date;
}

@Injectable({
  providedIn: 'root'
})
export class RecentReposService {
  private readonly STORAGE_KEY = 'recent_repositories';
  private readonly MAX_RECENT_REPOS = 10;

  private recentReposSubject = new BehaviorSubject<RecentRepo[]>([]);
  public recentRepos$ = this.recentReposSubject.asObservable();

  constructor() {
    this.loadRecentRepos();

    // Add some test repositories if none exist
    if (this.recentReposSubject.value.length === 0) {
      this.addTestRepositories();
    }
  }

  /**
   * Add test repositories for demonstration
   */
  private addTestRepositories(): void {
    const testRepos = [
      { name: 'event_mgt_client_in_Angular_17', fullName: 'salma12/event_mgt_client_in_Angular_17' },
      { name: 'GraphQL', fullName: 'salma12/GraphQL' },
      { name: 'SOA', fullName: 'salma12/SOA' },
      { name: 'repo1', fullName: 'salma12/repo1' },
      { name: 'SOA_Salma', fullName: 'salma12/SOA_Salma' }
    ];

    // Add test repositories with different timestamps
    const now = new Date();
    testRepos.forEach((repo, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - index); // Each repo is one day older

      this.recentReposSubject.value.push({
        name: repo.name,
        fullName: repo.fullName,
        lastAccessed: date
      });
    });

    // Save to localStorage
    this.saveRecentRepos(this.recentReposSubject.value);
  }

  /**
   * Load recent repositories from local storage
   */
  private loadRecentRepos(): void {
    const storedRepos = localStorage.getItem(this.STORAGE_KEY);
    if (storedRepos) {
      try {
        const repos = JSON.parse(storedRepos);
        // Convert string dates back to Date objects
        repos.forEach((repo: any) => {
          repo.lastAccessed = new Date(repo.lastAccessed);
        });
        this.recentReposSubject.next(repos);
      } catch (e) {
        console.error('Error parsing recent repositories from localStorage', e);
        this.recentReposSubject.next([]);
      }
    }
  }

  /**
   * Save recent repositories to local storage
   */
  private saveRecentRepos(repos: RecentRepo[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(repos));
    this.recentReposSubject.next(repos);
  }

  /**
   * Add or update a repository in the recent list
   */
  addRecentRepo(name: string, fullName: string): void {
    const currentRepos = this.recentReposSubject.value;

    // Check if repo already exists
    const existingIndex = currentRepos.findIndex(repo => repo.fullName === fullName);

    if (existingIndex !== -1) {
      // Update existing repo's timestamp
      const updatedRepos = [...currentRepos];
      updatedRepos[existingIndex] = {
        ...updatedRepos[existingIndex],
        lastAccessed: new Date()
      };
      this.saveRecentRepos(updatedRepos);
    } else {
      // Add new repo
      const newRepo: RecentRepo = {
        name,
        fullName,
        lastAccessed: new Date()
      };

      // Add to beginning, then limit to max size
      const updatedRepos = [newRepo, ...currentRepos]
        .slice(0, this.MAX_RECENT_REPOS);

      this.saveRecentRepos(updatedRepos);
    }
  }

  /**
   * Get the list of recent repositories
   */
  getRecentRepos(): RecentRepo[] {
    return this.recentReposSubject.value;
  }

  /**
   * Clear all recent repositories
   */
  clearRecentRepos(): void {
    this.saveRecentRepos([]);
  }
}
