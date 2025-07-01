import { Component, type OnInit, Input, HostListener } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ApiService } from "../../services/api.service.service";
import { Router } from "@angular/router";
import { GithubTokenService } from "../../services/github-token.service";

interface Repository {
  id: number;
  repoName: string;
  ownerName: string;
  description?: string;
  creationDate: string;
  language?: string;
  private?: boolean;
  fork?: boolean;
  avatarUrl?: string;
}

@Component({
  selector: "app-repo-list",
  templateUrl: "./repo-list.component.html",
  styleUrls: ["./repo-list.component.css"],
})
export class RepoListComponent implements OnInit {
  @Input() classId!: number;
  @Input() className?: string;

  repos: Repository[] = [];
  displayedRepos: Repository[] = [];
  searchTerm = "";
  ownerName = "";
  userAvatar = "assets/image.png";

  totalRepos = 0;
  filteredCount = 0;
  totalLanguages = 0;

  selectedType = "all";
  selectedSort = "created";
  selectedLanguage = "all";

  languages: string[] = [];

  showTypeDropdown = false;
  showSortDropdown = false;
  showLanguageDropdown = false;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private githubTokenService: GithubTokenService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.classId) {
      this.fetchReposByClass();
    }
  }

  private getAuthHeaders() {
    return {
      'GitHub-Token': this.githubTokenService.getToken()
    };
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".filter-dropdown")) {
      this.showTypeDropdown = false;
      this.showSortDropdown = false;
      this.showLanguageDropdown = false;
    }
  }

  fetchReposByClass() {
    this.http.get<Repository[]>(`/api/github/repos/class/${this.classId}`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (repos) => {
        this.repos = repos;
        this.totalRepos = repos.length;
        this.extractLanguages();
        this.applyFilters();
        this.updateStats();

        if (repos.length > 0 && repos[0].ownerName) {
          this.ownerName = repos[0].ownerName;
          if (repos[0].avatarUrl) {
            this.userAvatar = repos[0].avatarUrl;
          }
        }
      },
      error: (error) => {
        console.error("Error fetching repositories:", error);
        this.repos = [];
        this.displayedRepos = [];
        this.totalRepos = 0;
        this.filteredCount = 0;
        this.totalLanguages = 0;
      },
    });
  }

  deleteRepo(repo: Repository) {
    if (confirm(`Are you sure you want to delete "${repo.repoName}"?`)) {
      this.apiService.deleteRepository(repo.id).subscribe({
        next: () => {
          this.repos = this.repos.filter((r) => r.id !== repo.id);
          this.applyFilters();
          console.log("Repository deleted successfully");
        },
        error: (error) => {
          console.error("Error deleting repository:", error);
          alert("Failed to delete repository. Please try again.");
        },
      });
    }
  }

  extractLanguages() {
    const langSet = new Set<string>();
    this.repos.forEach((repo) => {
      if (repo.language) {
        langSet.add(repo.language);
      }
    });
    this.languages = Array.from(langSet).sort();
    this.totalLanguages = this.languages.length;
  }

  updateStats() {
    this.filteredCount = this.displayedRepos.length;
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.repos];

    if (this.searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (repo) =>
          repo.repoName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (repo.description && repo.description.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }

    if (this.selectedType !== "all") {
      switch (this.selectedType) {
        case "public":
          filtered = filtered.filter((repo) => repo.private === false);
          break;
        case "private":
          filtered = filtered.filter((repo) => repo.private === true);
          break;
        case "forks":
          filtered = filtered.filter((repo) => repo.fork === true);
          break;
      }
    }

    if (this.selectedLanguage !== "all") {
      filtered = filtered.filter((repo) => repo.language === this.selectedLanguage);
    }

    switch (this.selectedSort) {
      case "name":
        filtered.sort((a, b) => a.repoName.localeCompare(b.repoName));
        break;
      case "created":
      default:
        filtered.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
        break;
    }

    this.displayedRepos = filtered;
    this.updateStats();
  }

  getSortLabel(): string {
    switch (this.selectedSort) {
      case "name":
        return "Name";
      case "created":
        return "Recently created";
      case "updated":
        return "Recently updated";
      case "stars":
        return "Stars";
      default:
        return "Recently created";
    }
  }

  toggleTypeDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.showTypeDropdown = !this.showTypeDropdown;
    this.showSortDropdown = false;
    this.showLanguageDropdown = false;
  }

  toggleLanguageDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.showLanguageDropdown = !this.showLanguageDropdown;
    this.showTypeDropdown = false;
    this.showSortDropdown = false;
  }

  toggleSortDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.showSortDropdown = !this.showSortDropdown;
    this.showTypeDropdown = false;
    this.showLanguageDropdown = false;
  }

  selectType(type: string, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedType = type;
    this.showTypeDropdown = false;
    this.applyFilters();
  }

  selectLanguage(language: string, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedLanguage = language;
    this.showLanguageDropdown = false;
    this.applyFilters();
  }

  selectSort(sort: string, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedSort = sort;
    this.showSortDropdown = false;
    this.applyFilters();
  }

  navigateToAddRepo() {
    this.router.navigate(["/repo-form"], {
      queryParams: { classId: this.classId },
    });
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  }

  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      JavaScript: "#f1e05a",
      TypeScript: "#3178c6",
      Python: "#3572A5",
      Java: "#b07219",
      "C#": "#178600",
      PHP: "#4F5D95",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Ruby: "#701516",
      Go: "#00ADD8",
      Swift: "#F05138",
      Kotlin: "#A97BFF",
      Rust: "#dea584",
      Dart: "#00B4AB",
    };

    return colors[language] || "#8b949e";
  }

}
