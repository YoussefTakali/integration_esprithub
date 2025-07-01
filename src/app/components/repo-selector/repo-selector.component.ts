import { Component,  OnInit } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import  { Router } from "@angular/router"
import  { RecentReposService } from "src/app/services/recent-repos.service"
import  { ChangeDetectorRef } from "@angular/core"
import  { RepoService } from "src/app/services/rep.service"

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string
  updated_at: string
  visibility: string
  language: string
  owner?: {
    login: string
    avatar_url: string
  }
}

@Component({
  selector: "app-repo-selector",
  templateUrl: "./repo-selector.component.html",
  styleUrls: ["./repo-selector.component.css"],
})
export class RepoSelectorComponent implements OnInit {
  userRepos: GitHubRepo[] = []
  filteredRepos: GitHubRepo[] = []
  isLoading = false
  errorMessage = ""
  searchQuery = ""
  selectedRepo?: GitHubRepo
  currentUser = "" // Dynamic user

  // Filter options
  sortBy: "name" | "updated" | "created" = "updated"
  filterLanguage = ""
  languages: string[] = []
  quickFilter: "all" | "recent" | "starred" | "private" = "all"
  starredRepos: Set<number> = new Set()

  constructor(
    private http: HttpClient,
    private router: Router,
    private recentReposService: RecentReposService,
    private cdr: ChangeDetectorRef,
    private repoService: RepoService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser()
    this.loadUserRepositories()
    this.loadStarredRepos()
  }

  loadCurrentUser(): void {
    // First try to get the current user from the GitHub API
    this.http.get<any>("http://localhost:8080/api/user").subscribe({
      next: (user) => {
        this.currentUser = user.login || "salmabm"
        console.log("✅ Current user loaded:", this.currentUser)
      },
      error: (error) => {
        console.warn("⚠️ Could not load current user, using default:", error)
        // Fallback: try to extract from first repository or use default
        this.currentUser = "salmabm"
      },
    })
  }

  loadStarredRepos(): void {
    const saved = localStorage.getItem("starredRepos")
    if (saved) {
      this.starredRepos = new Set(JSON.parse(saved))
    }
  }

  loadUserRepositories(): void {
    this.isLoading = true
    this.errorMessage = ""

    console.log("🔄 Loading repositories...")

    this.repoService.loadrepo().subscribe({
      next: (data) => {
        console.log("✅ Repositories loaded:", data)

        // Convert the data to GitHubRepo format if needed
        this.userRepos = data.map((repo: any) => {
          // Extract owner from full_name if available
          const fullName = repo.fullName || repo.full_name
          const ownerName = fullName ? fullName.split("/")[0] : this.currentUser

          return {
            id: repo.id || Math.random() * 1000000,
            name: repo.name,
            full_name: fullName,
            html_url: repo.html_url || `https://github.com/${fullName}`,
            description: repo.description || "",
            updated_at: repo.updated_at || new Date().toISOString(),
            visibility: repo.visibility || "public",
            language: repo.language || "Unknown",
            owner: {
              login: ownerName,
              avatar_url: repo.owner?.avatar_url || `https://github.com/${ownerName}.png`,
            },
          }
        })

        // Set current user from first repository if not already set
        if (!this.currentUser && this.userRepos.length > 0) {
          this.currentUser = this.userRepos[0].owner?.login || "salmabm"
        }

        console.log(`📦 Processed ${this.userRepos.length} repositories for user: ${this.currentUser}`)

        // Extract languages and apply initial filtering
        this.extractLanguages()
        this.filterRepositories()

        this.isLoading = false
        this.cdr.detectChanges()
      },
      error: (error) => {
        console.error("❌ Error loading repos:", error)
        this.errorMessage = `Failed to load repositories: ${error.message || "Unknown error"}`
        this.isLoading = false
        this.cdr.detectChanges()
      },
    })
  }

  extractLanguages(): void {
    // Extract unique languages from repositories
    const languageSet = new Set<string>()
    this.userRepos.forEach((repo) => {
      if (repo.language && repo.language !== "Unknown") {
        languageSet.add(repo.language)
      }
    })
    this.languages = Array.from(languageSet).sort()
    console.log("🔤 Extracted languages:", this.languages)
  }

  filterRepositories(): void {
    console.log("🔍 Applying filters...")

    // Apply filters and search
    this.filteredRepos = this.userRepos.filter((repo) => {
      // Apply search filter
      const matchesSearch = this.searchQuery
        ? repo.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (repo.description && repo.description.toLowerCase().includes(this.searchQuery.toLowerCase()))
        : true

      // Apply language filter
      const matchesLanguage = this.filterLanguage ? repo.language === this.filterLanguage : true

      // Apply quick filter
      const matchesQuickFilter = (() => {
        switch (this.quickFilter) {
          case "private":
            return repo.visibility === "private"
          case "recent":
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            return new Date(repo.updated_at) > oneWeekAgo
          case "starred":
            return this.starredRepos.has(repo.id)
          case "all":
          default:
            return true
        }
      })()

      return matchesSearch && matchesLanguage && matchesQuickFilter
    })

    // Apply sorting
    this.filteredRepos.sort((a, b) => {
      switch (this.sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "updated":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        default:
          return 0
      }
    })

    console.log(`📋 Filtered to ${this.filteredRepos.length} repositories`)
  }

  clearFilters(): void {
    this.searchQuery = ""
    this.filterLanguage = ""
    this.sortBy = "updated"
    this.quickFilter = "all"
    this.filterRepositories()
  }

  getSearchSuggestions(): string[] {
    if (!this.searchQuery || this.searchQuery.length < 2) {
      return []
    }

    const suggestions = new Set<string>()
    const query = this.searchQuery.toLowerCase()

    this.userRepos.forEach((repo) => {
      if (repo.name.toLowerCase().includes(query)) {
        suggestions.add(repo.name)
      }
      if (repo.description && repo.description.toLowerCase().includes(query)) {
        suggestions.add(repo.name)
      }
      if (repo.language && repo.language.toLowerCase().includes(query)) {
        suggestions.add(repo.language)
      }
    })

    return Array.from(suggestions).slice(0, 5)
  }

  setQuickFilter(filter: "all" | "recent" | "starred" | "private"): void {
    this.quickFilter = filter
    this.filterRepositories()
  }

  isRecentRepo(repo: GitHubRepo): boolean {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    return new Date(repo.updated_at) > threeDaysAgo
  }

  isStarred(repo: GitHubRepo): boolean {
    return this.starredRepos.has(repo.id)
  }

  toggleStar(repo: GitHubRepo): void {
    if (this.starredRepos.has(repo.id)) {
      this.starredRepos.delete(repo.id)
    } else {
      this.starredRepos.add(repo.id)
    }
    // Save to localStorage
    localStorage.setItem("starredRepos", JSON.stringify(Array.from(this.starredRepos)))
  }

  selectRepository(repo: GitHubRepo): void {
    // Extract the owner and repoName from the full_name or use the owner object
    const owner = repo.owner?.login || repo.full_name.split("/")[0]
    const repoName = repo.name

    console.log(`🎯 Selected Repository: Owner - ${owner}, Repo Name - ${repoName}`)

    // Validate full_name before proceeding
    if (!repo.full_name || !repo.full_name.includes("/")) {
      console.error("❗ Invalid repo format:", repo.full_name)
      alert("Invalid repository format. Please check the repository.")
      return
    }

    // Add to recent repositories
    this.recentReposService.addRecentRepo(repoName, repo.full_name)

    // Configure the repository in the backend
    const formData = new FormData()
    formData.append("owner", owner)
    formData.append("repo", repoName)
    formData.append("branch", "main") // Default to main, can be updated later

    console.log("🔧 Configuring repository in backend...")

    this.http
      .post("http://localhost:8080/files/configure-repository", formData, {
        responseType: "text",
      })
      .subscribe({
        next: () => {
          console.log("✅ Repository configured successfully")
          // Navigate to the repo browser with the selected repo
          console.log("🚀 Navigating with repo:", repo.full_name)

          this.router.navigate(["repo-browser"], {
            queryParams: {
              repo: repo.full_name,
              repoId: repo.id,
            },
          })
        },
        error: (err) => {
          console.error("❌ Error configuring repository:", err)
          alert("Failed to configure repository: " + err.message)
        },
      })
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    const minute = 60
    const hour = minute * 60
    const day = hour * 24
    const month = day * 30
    const year = day * 365

    if (diffInSeconds < minute) {
      return "just now"
    } else if (diffInSeconds < hour) {
      const minutes = Math.floor(diffInSeconds / minute)
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    } else if (diffInSeconds < day) {
      const hours = Math.floor(diffInSeconds / hour)
      return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else if (diffInSeconds < month) {
      const days = Math.floor(diffInSeconds / day)
      return `${days} day${days > 1 ? "s" : ""} ago`
    } else if (diffInSeconds < year) {
      const months = Math.floor(diffInSeconds / month)
      return `${months} month${months > 1 ? "s" : ""} ago`
    } else {
      const years = Math.floor(diffInSeconds / year)
      return `${years} year${years > 1 ? "s" : ""} ago`
    }
  }

  getLanguageColor(language: string): string {
    // Common GitHub language colors
    const languageColors: { [key: string]: string } = {
      JavaScript: "#f1e05a",
      TypeScript: "#2b7489",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Python: "#3572A5",
      Java: "#b07219",
      "C#": "#178600",
      PHP: "#4F5D95",
      "C++": "#f34b7d",
      Ruby: "#701516",
      Go: "#00ADD8",
      Swift: "#ffac45",
      Kotlin: "#F18E33",
      Rust: "#dea584",
      Dart: "#00B4AB",
      Vue: "#2c3e50",
      Shell: "#89e051",
      "Jupyter Notebook": "#DA5B0B",
      SCSS: "#c6538c",
      C: "#555555",
    }

    return languageColors[language] || "#8257e5" // Default purple color if not found
  }

  // Get the current user's username for display
  getCurrentUsername(): string {
    return this.currentUser || "User"
  }

  // Get the current user's avatar URL
  getCurrentUserAvatar(): string {
    return this.currentUser ? `https://github.com/${this.currentUser}.png` : "https://github.com/identicons/default.png"
  }
}
