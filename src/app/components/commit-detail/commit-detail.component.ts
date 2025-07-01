import { Component, OnInit } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router"
import { RepoService, GitHubCommit } from "src/app/services/rep.service"

// Add this interface at the top of the file
interface DiffLine {
  type: "added" | "deleted" | "context" | "hunk"
  lineNumber: string
  content: string
}

@Component({
  selector: "app-commit-detail",
  templateUrl: "./commit-detail.component.html",
  styleUrls: ["./commit-detail.component.css"],
})
export class CommitDetailComponent implements OnInit {
  owner = ""
  repo = ""
  commitSha = ""
  commit: GitHubCommit | null = null
  isLoading = false
  errorMessage = ""

  // For file diff display
  expandedFiles: Set<string> = new Set()

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private repoService: RepoService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.owner = params["owner"]
      this.repo = params["repo"]
      this.commitSha = params["sha"] || params["commitSha"] || params["commitHash"] || params["commit"]

      console.log(`Loading commit details for ${this.owner}/${this.repo}, SHA: ${this.commitSha}`)

      if (!this.owner || !this.repo || !this.commitSha) {
        this.errorMessage = "Missing required parameters (owner, repo, or commit SHA)"
        return
      }

      this.loadCommitDetails()
    })
  }

  loadCommitDetails(): void {
    this.isLoading = true
    this.errorMessage = ""

    console.log(`🔄 Fetching commit details for ${this.owner}/${this.repo}, SHA: ${this.commitSha}`)

    this.repoService.getCommitDetails(this.owner, this.repo, this.commitSha).subscribe({
      next: (commit) => {
        console.log("✅ Loaded commit details:", commit)
        this.commit = commit
        this.isLoading = false

        if (commit.files) {
          console.log(`📁 Commit has ${commit.files.length} changed files`)
        }
        if (commit.stats) {
          console.log(`📊 Commit stats:`, commit.stats)
        }
      },
      error: (error) => {
        console.error("❌ Error loading commit details:", error)

        if (error.status === 404) {
          this.errorMessage = `Commit ${this.commitSha} not found in repository ${this.owner}/${this.repo}`
        } else if (error.status === 403) {
          this.errorMessage = "Access denied. Please check your GitHub token permissions."
        } else if (error.status === 0) {
          this.errorMessage = "Unable to connect to the server. Please check if the backend is running."
        } else {
          this.errorMessage = `Failed to load commit details: ${error.message || "Unknown error"}`
        }

        this.isLoading = false
      },
    })
  }

  goBack(): void {
    this.router.navigate(["/commit-history", this.owner, this.repo])
  }

  toggleFileExpansion(filename: string): void {
    if (this.expandedFiles.has(filename)) {
      this.expandedFiles.delete(filename)
    } else {
      this.expandedFiles.add(filename)
    }
    console.log(`📂 Toggled file expansion for: ${filename}`)
  }

  isFileExpanded(filename: string): boolean {
    return this.expandedFiles.has(filename)
  }

  getTimeAgo(dateString: string): string {
    if (!dateString) return "Unknown time"

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

  getFileStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case "added":
        return "file-added"
      case "modified":
        return "file-modified"
      case "removed":
      case "deleted":
        return "file-removed"
      case "renamed":
        return "file-renamed"
      case "copied":
        return "file-copied"
      default:
        return "file-unknown"
    }
  }

  getFileStatusLabel(status: string): string {
    switch (status?.toLowerCase()) {
      case "added":
        return "Added"
      case "modified":
        return "Modified"
      case "removed":
      case "deleted":
        return "Deleted"
      case "renamed":
        return "Renamed"
      case "copied":
        return "Copied"
      default:
        return status || "Unknown"
    }
  }

  getFileIcon(filename: string): string {
    if (!filename) return "file-icon"

    const extension = filename.split(".").pop()?.toLowerCase() || ""

    switch (extension) {
      case "js":
        return "javascript-icon"
      case "ts":
        return "typescript-icon"
      case "html":
        return "html-icon"
      case "css":
        return "css-icon"
      case "scss":
      case "sass":
        return "scss-icon"
      case "json":
        return "json-icon"
      case "md":
      case "markdown":
        return "markdown-icon"
      case "java":
        return "java-icon"
      case "py":
        return "py-icon"
      case "csv":
        return "csv-icon"
      case "xml":
        return "xml-icon"
      case "yml":
      case "yaml":
        return "yaml-icon"
      case "txt":
        return "text-icon"
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
        return "image-icon"
      default:
        return "file-icon"
    }
  }

  getShortSha(sha: string): string {
    return sha ? sha.substring(0, 7) : ""
  }

  copyShaToClipboard(): void {
    if (this.commit?.sha) {
      navigator.clipboard
        .writeText(this.commit.sha)
        .then(() => {
          console.log("✅ SHA copied to clipboard")
        })
        .catch((err) => {
          console.error("❌ Failed to copy SHA:", err)
        })
    }
  }

  viewFileOnGitHub(filename: string): void {
    if (this.commit?.html_url && filename) {
      const baseUrl = this.commit.html_url.replace("/commit/", "/blob/")
      const fileUrl = `${baseUrl}/${filename}`
      window.open(fileUrl, "_blank")
    }
  }

  trackByFilename(index: number, file: any): string {
    return file.filename
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement
    if (imgElement) {
      imgElement.src = "https://github.com/identicons/default.png"
    }
  }

  // Replace the formatDiffContent method with this new method
  parseDiffContent(patch: string): DiffLine[] {
    if (!patch) return []

    const lines = patch.split("\n")
    const diffLines: DiffLine[] = []
    let oldLineNumber = 0
    let newLineNumber = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      let type: "added" | "deleted" | "context" | "hunk" = "context"
      let lineNumberText = ""

      if (line.startsWith("@@")) {
        // Hunk header
        type = "hunk"
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
        if (match) {
          oldLineNumber = Number.parseInt(match[1]) - 1
          newLineNumber = Number.parseInt(match[2]) - 1
        }
        lineNumberText = "..."
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        // Added line - GREEN BACKGROUND
        type = "added"
        newLineNumber++
        lineNumberText = newLineNumber.toString()
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        // Deleted line - RED BACKGROUND
        type = "deleted"
        oldLineNumber++
        lineNumberText = oldLineNumber.toString()
      } else if (!line.startsWith("+++") && !line.startsWith("---")) {
        // Context line
        type = "context"
        oldLineNumber++
        newLineNumber++
        lineNumberText = newLineNumber.toString()
      }

      diffLines.push({
        type,
        lineNumber: lineNumberText,
        content: line,
      })
    }

    return diffLines
  }
}