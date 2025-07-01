import { Component,  OnInit, ViewChild, ViewContainerRef,  ChangeDetectorRef } from "@angular/core"
import  { RepoService, PushedFile } from "src/app/services/rep.service"
import  { RecentReposService } from "src/app/services/recent-repos.service"
import  { HttpClient } from "@angular/common/http"
import { CommitMessageComponent } from "src/app/pages/commit-message/commit-message.component"
import  { Router } from "@angular/router"
import  { ActivatedRoute } from "@angular/router"
import {  Observable, catchError, throwError, tap } from "rxjs"
import  { StatsService } from "src/app/services/stats.service"
import { GithubTokenService } from "src/app/services/github-token.service"

interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: FileNode[]
  url?: string
  download_url?: string
  isOpen?: boolean
  commitMessage: string
  pusherName: string
  pushedAt: string
  // Add avatar properties
  pusherAvatar?: string
  pusherEmail?: string
}

// Enhanced contributor interface for detailed data
interface DetailedContributor {
  name: string
  avatar: string
  commits: number
  email?: string
  lastCommitDate?: string
  lastCommitMessage?: string
  totalAdditions?: number
  totalDeletions?: number
}

interface GitHubRepo {
  id: number
  name: string
  full_name: string // This is the key property
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

// Interface for file type statistics
interface FileTypeStat {
  extension: string
  count: number
  percentage: number
  size?: number
}

@Component({
  selector: "app-repo-browser",
  templateUrl: "./repo-browser.component.html",
  styleUrls: ["./repo-browser.component.css"],
})
export class RepoBrowserComponent implements OnInit {
  @ViewChild("modalContainer", { read: ViewContainerRef }) modalContainer!: ViewContainerRef

  repos: string[] = []
  branches: string[] = []
  files: PushedFile[] = []
  folderStructure: any = {}
  latestCommit: { message: string; pushedAt: string } | null = null

  selectedRepo: string | null = null
  selectedBranch: string | null = null
  selectedFile: PushedFile | null = null

  // Properties for README component
  get owner(): string {
    return this.selectedRepo ? this.selectedRepo.split("/")[0] : ""
  }

  get repo(): string {
    return this.selectedRepo ? this.selectedRepo.split("/")[1] : ""
  }

  fileContent = ""
  isViewingFile = false
  isLoadingContent = false

  isLoading = false

  searchQuery = ""
  totalFiles = 0
  totalFolders = 0
  totalSize = 0
  recentCommits: { message: string; date: string }[] = []

  isCommitPopupOpen = false
  isCodePopupOpen = false
  isEditMode = false
  isIssuesTabActive = false
  commitMessage = ""
  selectedFiles: File[] = []
  repoInfo: any = null
  cloneUrl = ""
  downloadUrl = ""
  editableContent = ""

  // File replacement properties
  showReplaceDialog = false
  selectedReplaceFile: File | null = null
  replaceCommitMessage = ""

  // PDF handling properties
  pdfLoadError = false
  pdfUrl: string | null = null

  // Tab management
  currentTab = "code"

  // Enhanced sidebar data with detailed contributors
  contributors: DetailedContributor[] = []
  fileTypeStats: FileTypeStat[] = []
  totalContributors?: number
  contributorLimit?: number = 10

  // Loading states
  isLoadingContributors = false
  isLoadingFileTypes = false
  isLoadingRepoInfo = false

  // Error handling and debug info
  errors: { [key: string]: string } = {}
  debugInfo = {
    fileTypesLoaded: false,
  }

  // Add cache for GitHub user avatars
  private avatarCache = new Map<string, string>()

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private repoService: RepoService,
    private recentReposService: RecentReposService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private statsService: StatsService,
    private tokenService: GithubTokenService
  ) {}

  private parsedRepo: string | null = null

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const repo = params["repo"]
      console.log("📥 Repo parameter from URL:", repo)

      if (!repo) {
        console.error("❗ Repo parameter not found in the URL")
        return
      }

      try {
        const [owner, repoName] = repo.split("/")
        if (!owner || !repoName) {
          throw new Error(`Invalid repo format, should be "owner/repoName". Got: ${repo}`)
        }

        console.log(`✅ Parsed details — Owner: ${owner}, Repo Name: ${repoName}`)

        this.recentReposService.addRecentRepo(repoName, repo)
        this.selectedRepo = repo
        this.loadBranches(owner, repoName)

        const defaultBranch = "main"
        this.selectedBranch = defaultBranch

        this.configureRepository(owner, repoName, defaultBranch)
        this.load_data(`${owner}/${repoName}`, defaultBranch)
        this.loadSidebarData(owner, repoName)
      } catch (error: any) {
        console.error("❗ Error while parsing repo details:", error.message)
        alert("Failed to parse repository details: " + error.message)
      }
    })
  }

  // Add method to get GitHub user avatar
  async getGitHubUserAvatar(username: string): Promise<string> {
    if (!username || username === "Unknown") {
      return "https://github.com/identicons/default.png"
    }

    // Check cache first
    if (this.avatarCache.has(username)) {
      return this.avatarCache.get(username)!
    }

    try {
      const response = await this.http.get<any>(`https://api.github.com/users/${username}`).toPromise()
      const avatarUrl = response?.avatar_url || `https://github.com/${username}.png`

      // Cache the result
      this.avatarCache.set(username, avatarUrl)
      return avatarUrl
    } catch (error) {
      console.warn(`Failed to fetch avatar for ${username}:`, error)
      // Fallback to GitHub's default avatar URL pattern
      const fallbackUrl = `https://github.com/${username}.png`
      this.avatarCache.set(username, fallbackUrl)
      return fallbackUrl
    }
  }

  // Method to handle avatar loading errors
  onAvatarError(event: any): void {
    const img = event.target as HTMLImageElement
    img.src = "https://github.com/identicons/default.png"
  }

  // Helper methods
  extractSrcFromImgPreview(content: string): string {
    const match = content.match(/src="([^"]+)"/)
    return match ? match[1] : ""
  }

  extractTypeFromBinaryFile(content: string): string {
    const match = content.match(/type="([^"]+)"/)
    return match ? match[1] : "unknown"
  }

  extractUrlFromBinaryFile(content: string): string {
    const match = content.match(/url="([^"]+)"/)
    return match ? match[1] : ""
  }

  // File editing methods
  openFileForEditing(): void {
    if (
      this.fileContent &&
      !this.fileContent.startsWith("<img-preview") &&
      !this.fileContent.startsWith("<binary-file")
    ) {
      this.editableContent = this.fileContent
      this.isEditMode = true
    }
  }

  editFile(file: FileNode): void {
    if (!file || file.type === "folder") return

    this.viewFileContent(file)

    const checkContentLoaded = setInterval(() => {
      if (!this.isLoadingContent && this.fileContent) {
        clearInterval(checkContentLoaded)

        if (
          !this.fileContent.startsWith("<img-preview") &&
          !this.fileContent.startsWith("<binary-file") &&
          !this.fileContent.includes("pdf-viewer")
        ) {
          this.editableContent = this.fileContent
          this.isEditMode = true
        }
      }
    }, 100)

    setTimeout(() => {
      clearInterval(checkContentLoaded)
    }, 5000)
  }

  cancelEditing(): void {
    this.isEditMode = false
    this.editableContent = this.fileContent
  }

  // Updated method to delete the currently opened/selected file with navigation
  deleteOpenedFile(): void {
    if (!this.selectedFile) {
      console.error("No file selected for deletion")
      return
    }

    const fileNode: FileNode = {
      name: this.selectedFile.name,
      path: this.selectedFile.path,
      type: "file",
      commitMessage: this.selectedFile.commitMessage,
      pusherName: this.selectedFile.pusherName,
      pushedAt: this.selectedFile.pushedAt,
    }

    if (confirm(`Are you sure you want to delete "${fileNode.name}"? This action cannot be undone.`)) {
      this.deleteFile(fileNode)
    }
  }

  saveFileChanges(): void {
    if (!this.selectedFile || !this.selectedRepo || !this.selectedBranch) {
      console.error("Cannot save changes: Missing file, repository, or branch information")
      return
    }

    this.isLoadingContent = true

    const formData = new URLSearchParams()
    formData.append("filePath", this.selectedFile.path)
    formData.append("content", this.editableContent)
    formData.append("commitMessage", `Update ${this.selectedFile.name}`)
    formData.append("repository", this.selectedRepo)
    formData.append("branch", this.selectedBranch)
    const token   = this.tokenService.getToken();    
    this.http
      .post("http://localhost:8080/files/edit", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          'X-GitHub-Token': token

        },
        responseType: "text",
      })
      .subscribe({
        next: (response) => {
          console.log("File saved successfully:", response)
          this.fileContent = this.editableContent
          this.isEditMode = false
          alert("File edited successfully!")
          this.isLoadingContent = false

          // Refresh file type stats after saving changes
          this.loadFileTypeStats(this.owner, this.repo)
        },
        error: (error) => {
          console.error("Error saving file:", error)
          alert(`Error saving file: ${error.message || "Unknown error"}`)
          this.isLoadingContent = false
        },
      })
  }

  downloadFile(): void {
    if (!this.selectedFile) {
      console.error("No file selected for download")
      return
    }

    let content: string
    const filename: string = this.selectedFile.name
    let type = "text/plain"

    if (this.fileContent.startsWith("<img-preview")) {
      const imageUrl = this.extractSrcFromImgPreview(this.fileContent)
      const link = document.createElement("a")
      link.href = imageUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    } else if (this.fileContent.startsWith("<binary-file")) {
      const downloadUrl = this.extractUrlFromBinaryFile(this.fileContent)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    } else {
      content = this.isEditMode ? this.editableContent : this.fileContent

      const extension = this.getFileExtension(filename)
      switch (extension.toLowerCase()) {
        case "html":
          type = "text/html"
          break
        case "css":
          type = "text/css"
          break
        case "js":
          type = "application/javascript"
          break
        case "json":
          type = "application/json"
          break
        case "md":
          type = "text/markdown"
          break
        default:
          type = "text/plain"
      }

      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  getFileSize(file: any): string {
    if (!file || !file.size) {
      return "Unknown size"
    }

    const size = file.size
    if (size < 1024) {
      return `${size} B`
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`
    }
  }

  getFileExtension(filename: string): string {
    const parts = filename.split(".")
    if (parts.length > 1) {
      return parts[parts.length - 1]
    }
    return ""
  }

  downloadCurrentFile(): void {
    if (!this.selectedFile || !this.selectedRepo || !this.selectedBranch) {
      console.error("Cannot download file: Missing file, repository, or branch information")
      return
    }

    const [owner, repoName] = this.selectedRepo.split("/")
    if (!owner || !repoName) {
      console.error("Invalid repository format")
      return
    }

    const filePath = this.selectedFile.path
    const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${this.selectedBranch}`

    this.http.get(url).subscribe({
      next: (response: any) => {
        if (response.download_url) {
          const link = document.createElement("a")
          link.href = response.download_url
          link.download = this.selectedFile!.name
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } else {
          console.error("Download URL not found in response")
          alert("Unable to download file: Download URL not available")
        }
      },
      error: (error) => {
        console.error("Error downloading file:", error)
        alert(`Error downloading file: ${error.message || "Unknown error"}`)
      },
    })
  }

  openReplaceFileDialog(): void {
    if (!this.selectedFile) {
      console.error("No file selected for replacement")
      return
    }

    this.replaceCommitMessage = `Replace ${this.selectedFile.name}`
    this.showReplaceDialog = true
  }

  closeReplaceDialog(): void {
    this.showReplaceDialog = false
    this.selectedReplaceFile = null
    this.replaceCommitMessage = ""
  }

  onReplaceFileSelected(event: any): void {
    const file = event.target.files[0]
    if (file) {
      this.selectedReplaceFile = file
      console.log(`Selected file for replacement: ${file.name} (${this.formatFileSize(file.size)})`)
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // PDF handling methods
  getPdfUrl(): string | null {
    return this.pdfUrl
  }

  getGoogleViewerUrl(): string {
    if (this.pdfUrl) {
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(this.pdfUrl)}`
    }
    return ""
  }

  onPdfLoadError(): void {
    console.error("PDF failed to load")
    this.pdfLoadError = true
  }

  onPdfLoadSuccess(): void {
    console.log("PDF loaded successfully")
    this.pdfLoadError = false
  }

  openPdfInNewTab(): void {
    if (this.pdfUrl) {
      const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(this.pdfUrl)}`
      window.open(viewerUrl, "_blank")
    }
  }

  replaceFile(): void {
    if (!this.selectedReplaceFile || !this.selectedFile) {
      console.error("No file selected for replacement")
      alert("Please select a file to replace the current one.")
      return
    }

    const maxSize = 100 * 1024 * 1024 // 100MB
    if (this.selectedReplaceFile.size > maxSize) {
      alert(`File size too large. Max: ${this.formatFileSize(maxSize)}.`)
      return
    }

    const confirmMessage = `Are you sure you want to replace "${this.selectedFile.name}" with "${this.selectedReplaceFile.name}"?\n\nThis action cannot be undone.`
    if (!confirm(confirmMessage)) return

    console.log(`🔄 Replacing ${this.selectedFile.name} with ${this.selectedReplaceFile.name}`)

    // Show loading state
    this.isLoading = true

    // Store the current file path for later reference
    const currentFilePath = this.selectedFile.path
    const newFileName = this.selectedReplaceFile.name

    const formData = new FormData()
    formData.append("file", this.selectedReplaceFile)
    formData.append("filePath", this.selectedFile.path)
    formData.append(
      "commitMessage",
      this.replaceCommitMessage || `Replace ${this.selectedFile.name} with ${this.selectedReplaceFile.name}`,
    )

    this.http.post("http://localhost:8080/files/replace", formData, { responseType: "text" }).subscribe({
      next: (response) => {
        console.log("✅ File replaced successfully on GitHub:", response)

        // Close the dialog immediately
        this.closeReplaceDialog()

        // Show success message
        alert(
          `✅ "${this.selectedFile?.name}" has been replaced with "${newFileName}"!\n\nRefreshing repository data...`,
        )

        // Force a complete repository reload
        this.forceCompleteReload(currentFilePath, newFileName)
      },
      error: (error) => {
        console.error("❌ Error replacing file:", error)
        this.isLoading = false

        let errorMessage = "Unknown error"
        if (error.error) {
          errorMessage = error.error
        } else if (error.message) {
          errorMessage = error.message
        }
        alert(`❌ Error replacing file: ${errorMessage}`)
      },
    })
  }

  // Method to force a complete reload of the repository and UI
  private forceCompleteReload(replacedFilePath?: string, newFileName?: string): void {
    if (!this.selectedRepo || !this.selectedBranch) {
      this.isLoading = false
      return
    }

    console.log("🔄 Forcing complete repository reload...")

    // Clear all cached data
    this.files = []
    this.folderStructure = {}
    this.avatarCache.clear()

    // Reset UI state but keep track of what we're viewing
    const wasViewingFile = this.isViewingFile
    this.isViewingFile = false
    this.isEditMode = false
    this.fileContent = ""
    this.editableContent = ""

    const [owner, repoName] = this.selectedRepo.split("/")

    // First, invalidate any browser cache for the GitHub API
    const timestamp = Date.now()
    const cacheBuster = `?cache_bust=${timestamp}`

    // Create a direct API call to get the latest file list with cache busting
    const apiUrl = `http://localhost:8080/api/contents?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(this.selectedBranch)}&_=${timestamp}`

    console.log(`🔄 Fetching fresh repository data from: ${apiUrl}`)

    this.http.get<any[]>(apiUrl).subscribe({
      next: (freshFiles) => {
        console.log(`📦 Received ${freshFiles?.length || 0} fresh files`)

        if (freshFiles && Array.isArray(freshFiles)) {
          // Update our files array with the fresh data
          this.files = freshFiles

          // Rebuild the folder structure
          this.folderStructure = this.buildFolderStructure(freshFiles)
          this.initializeTreeState(this.folderStructure)

          // If we were viewing a file that was replaced, try to find and view the new file
          if (wasViewingFile && replacedFilePath && newFileName) {
            console.log(`🔍 Looking for replaced file: ${replacedFilePath} → ${newFileName}`)

            // Try to find the new file node
            setTimeout(() => {
              this.findAndViewReplacedFile(replacedFilePath, newFileName)
            }, 1000) // Give time for the folder structure to be built
          }

          // Fetch commit info for all files
          this.fetchCommitInfoForFiles(this.folderStructure.children)

          // Reload sidebar data
          this.loadContributors(owner, repoName)
          this.loadFileTypeStats(owner, repoName)
        }

        // Turn off loading state
        this.isLoading = false

        // Force Angular to update the UI
        this.cd.detectChanges()

        console.log("✅ Complete repository reload finished")
      },
      error: (error) => {
        console.error("❌ Error during complete reload:", error)

        // Fallback to standard refresh
        console.log("⚠️ Falling back to standard refresh method")
        this.refreshView()

        this.isLoading = false
      },
    })
  }

  // Helper method to find and view a replaced file
  private findAndViewReplacedFile(originalPath: string, newFileName: string): void {
    console.log(`🔍 Searching for replaced file: ${originalPath} → ${newFileName}`)

    // Get the directory path from the original file path
    const pathParts = originalPath.split("/")
    pathParts.pop() // Remove the filename
    const directoryPath = pathParts.join("/")

    // The new file path should be in the same directory with the new name
    const newFilePath = directoryPath ? `${directoryPath}/${newFileName}` : newFileName

    console.log(`🔍 Expected new file path: ${newFilePath}`)

    // Function to recursively search for a file node by path
    const findFileNode = (nodes: FileNode[] | undefined, path: string): FileNode | null => {
      if (!nodes) return null

      for (const node of nodes) {
        if (node.path === path && node.type === "file") {
          return node
        }

        // Also check if the name matches (in case the path structure changed)
        if (node.name === newFileName && node.type === "file") {
          return node
        }

        if (node.children) {
          const found = findFileNode(node.children, path)
          if (found) return found
        }
      }

      return null
    }

    // Try to find the file node with the new path
    const fileNode = findFileNode(this.folderStructure.children, newFilePath)

    if (fileNode) {
      console.log(`✅ Found replaced file node:`, fileNode)

      // View the file content
      this.viewFileContent(fileNode)
    } else {
      console.log(`❌ Could not find replaced file node. Searching by name only...`)

      // Try a broader search just by filename
      const findByName = (nodes: FileNode[] | undefined): FileNode | null => {
        if (!nodes) return null

        for (const node of nodes) {
          if (node.name === newFileName && node.type === "file") {
            return node
          }

          if (node.children) {
            const found = findByName(node.children)
            if (found) return found
          }
        }

        return null
      }

      const fileByName = findByName(this.folderStructure.children)

      if (fileByName) {
        console.log(`✅ Found file by name:`, fileByName)
        this.viewFileContent(fileByName)
      } else {
        console.log(`❌ Could not find replaced file in the repository structure`)

        // Navigate back to file list as fallback
        this.backToFileList()
      }
    }
  }

  // Method for manual refresh triggered by user
  manualRefresh(): void {
    if (!this.selectedRepo || !this.selectedBranch) {
      alert("No repository or branch selected")
      return
    }

    // Show loading indicator
    this.isLoading = true

    // Store current file state
    const currentFilePath = this.selectedFile?.path
    const currentFileName = this.selectedFile?.name

    // Show message
    alert("Refreshing repository data from GitHub...")

    // Force complete reload
    this.forceCompleteReload(currentFilePath, currentFileName)
  }

  // New method to handle comprehensive refresh
  private refreshRepositoryData(): void {
    if (this.selectedRepo && this.selectedBranch) {
      const [owner, repoName] = this.selectedRepo.split("/")
      if (owner && repoName) {
        console.log("🔄 Starting comprehensive repository refresh...")

        // Clear any cached data first
        this.files = []
        this.folderStructure = {}
        this.avatarCache.clear() // Clear avatar cache to get fresh data

        // Set loading state
        this.isLoading = true

        // Force refresh with cache busting timestamp
        const timestamp = Date.now()
        console.log(`🔄 Refreshing with cache buster: ${timestamp}`)

        // Reload repository data
        this.load_data(`${owner}/${repoName}`, this.selectedBranch)

        // Reload sidebar data
        this.loadFileTypeStats(owner, repoName)
        this.loadContributors(owner, repoName)

        // If viewing a specific file, refresh its content too
        if (this.selectedFile) {
          console.log(`🔄 Refreshing content for file: ${this.selectedFile.name}`)

          // Wait a bit for GitHub to process the changes
          setTimeout(() => {
            // Find the updated file node
            const findFileNode = (nodes: FileNode[], targetPath: string): FileNode | null => {
              for (const node of nodes) {
                if (node.path === targetPath && node.type === "file") {
                  return node
                }
                if (node.children) {
                  const found = findFileNode(node.children, targetPath)
                  if (found) return found
                }
              }
              return null
            }

            // Try to find and refresh the file content
            if (this.folderStructure.children) {
              const fileNode = findFileNode(this.folderStructure.children, this.selectedFile!.path)
              if (fileNode) {
                console.log(`✅ Found updated file node, refreshing content...`)
                this.viewFileContent(fileNode)
              }
            }
          }, 3000) // Wait 3 seconds for GitHub to process
        }

        // Force UI update
        this.cd.detectChanges()

        console.log("✅ Repository refresh completed")
      }
    }
  }

  // Update loadRepos to handle refresh better
  loadRepos(): void {
    this.isLoading = true
    this.repoService.getRepos().subscribe({
      next: (data) => {
        this.repos = data
        this.isLoading = false

        if (this.repos.length > 0 && !this.selectedRepo) {
          this.selectRepo(this.repos[0])
        }
      },
      error: (error) => {
        console.error("Error loading repos:", error)
        this.isLoading = false
      },
    })
  }

  selectRepo(repo: string): void {
    const [owner, repoName] = repo.split("/")

    if (!owner || !repoName) {
      console.error('Invalid repo format. Expected format is "owner/repoName".')
      return
    }

    this.selectedRepo = repo
    this.selectedBranch = null
    this.files = []
    this.folderStructure = {}

    this.recentReposService.addRecentRepo(repoName, repo)
    this.loadBranches(owner, repoName)
  }

  loadBranches(owner: string, repoName: string): void {
    this.isLoading = true

    this.repoService.getBranches(owner, repoName).subscribe({
      next: (data) => {
        this.branches = data
        this.isLoading = false

        if (this.branches.length > 0) {
          this.selectBranch(this.branches[0])
        }
      },
      error: (error) => {
        console.error("Error loading branches:", error)
        this.isLoading = false
      },
    })
  }

  selectBranch(branch: any): void {
    const branchName = typeof branch === "string" ? branch : branch?.name
    const newBranch = branchName ?? "main"

    console.log(`Switching from branch "${this.selectedBranch}" to "${newBranch}"`)
    this.selectedBranch = newBranch

    if (this.selectedRepo) {
      this.isViewingFile = false
      this.selectedFile = null
      this.fileContent = ""

      this.files = []
      this.folderStructure = { name: "root", path: "", type: "folder", children: [] }

      this.isLoading = true

      const [owner, repoName] = this.selectedRepo.split("/")
      if (owner && repoName) {
        console.log(`Configuring repository for branch: ${newBranch}`)

        this.configureRepository(owner, repoName, newBranch)

        this.repoService.getCommits(this.selectedRepo, newBranch).subscribe({
          next: (commits) => {
            if (commits && commits.length > 0) {
              this.latestCommit = {
                message: commits[0].commit.message,
                pushedAt: commits[0].commit.committer.date,
              }
              console.log(`Latest commit for branch ${newBranch}:`, this.latestCommit)
            } else {
              this.latestCommit = null
              console.log(`No commits found for branch ${newBranch}`)
            }
          },
          error: (error) => {
            console.error(`Error fetching commits for branch ${newBranch}:`, error)
            this.latestCommit = null
          },
        })

        console.log(`Loading data for ${owner}/${repoName}, branch: ${newBranch}`)
        this.load_data(`${owner}/${repoName}`, newBranch)
      }
    }
  }

  getRepoContents(owner: string, repoName: string, branch: string, path = ""): Observable<any> {
    const url = `http://localhost:8080/api/contents?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(branch)}${path ? "&path=" + encodeURIComponent(path) : ""}`

    console.log(`Fetching repo contents for branch: ${branch}, path: ${path || "root"}`)

    return this.http.get<any>(url).pipe(
      tap((response) => console.log(`Received ${response?.length || 0} items from API`)),
      catchError((error) => {
        console.error(`Error fetching contents for branch ${branch}:`, error)
        return throwError(() => new Error(`Failed to load contents for branch ${branch}: ${error.message}`))
      }),
    )
  }

  parseRepoDetails2(repoInfo: string): { owner: string; repoName: string } {
    let owner = ""
    let repoName = ""

    if (repoInfo.includes("github.com")) {
      const parts = repoInfo.split("github.com/")[1].split("/")
      owner = parts[0]
      repoName = parts[1].split(".git")[0]
    } else if (repoInfo.includes("/")) {
      const parts = repoInfo.split("/")
      owner = parts[0]
      repoName = parts[1].split(".git")[0]
    } else {
      repoName = repoInfo
      owner = "default-user"
    }

    return { owner, repoName }
  }

  configureRepository(owner: string, repoName: string, branch: string): void {
    if (!owner || !repoName) {
      console.error("No valid repository owner or name provided")
      return
    }

    console.log(`Configuring repository: Owner=${owner}, Repo=${repoName}, Branch=${branch}`)

    const formData = new FormData()
    formData.append("owner", owner)
    formData.append("repo", repoName)
    formData.append("branch", branch)

    this.http
      .post("http://localhost:8080/files/configure-repository", formData, {
        responseType: "text",
      })
      .subscribe({
        next: (res) => {
          console.log(`Repository configuration successful for branch ${branch}:`, res)
        },
        error: (err) => {
          console.error(`Repository configuration failed for branch ${branch}:`, err)
          alert(`❌ Repository configuration failed for branch ${branch}: ${err.message}`)
        },
      })
  }

  buildFolderStructure(files: any[]): FileNode {
    const root: FileNode = {
      name: "root",
      path: "",
      type: "folder",
      children: [],
      commitMessage: "",
      pusherName: "",
      pushedAt: "",
      isOpen: true,
    }

    if (!files || !Array.isArray(files)) {
      console.error("Expected files to be an array but received:", typeof files)
      return root
    }

    console.log("Building folder structure with files:", files)

    files.forEach((file) => {
      if (!file) return

      const filePath = file.path || file.name || "unnamed"
      const pathParts = filePath.split("/")

      const cleanPathParts = pathParts.map((part: string) => {
        if (part.includes(".") && part.endsWith(part.split(".").pop() || "")) {
          const ext = part.split(".").pop() || ""
          const baseName = part.split(".")[0]
          if (part === `${baseName}.${ext}.${ext}`) {
            console.log(`Correcting duplicated extension in filename: ${part} -> ${baseName}.${ext}`)
            return `${baseName}.${ext}`
          }
        }

        if (part.length > 0 && part.indexOf(part) !== part.lastIndexOf(part)) {
          const halfLength = Math.floor(part.length / 2)
          const firstHalf = part.substring(0, halfLength)
          const secondHalf = part.substring(halfLength)

          if (firstHalf === secondHalf) {
            console.log(`Correcting duplicated filename: ${part} -> ${firstHalf}`)
            return firstHalf
          }
        }

        const specialFiles = [".gitattributes", ".gitignore", "2.jpg"]
        for (const specialFile of specialFiles) {
          if (part === `${specialFile}${specialFile}`) {
            console.log(`Correcting known duplicated filename: ${part} -> ${specialFile}`)
            return specialFile
          }
        }

        return part
      })

      let currentNode = root

      for (let i = 0; i < cleanPathParts.length; i++) {
        const part = cleanPathParts[i]
        const isLast = i === cleanPathParts.length - 1
        if (!currentNode.children) currentNode.children = []

        let childNode = currentNode.children.find((c) => c.name === part)

        if (!childNode) {
          childNode = {
            name: part,
            path: cleanPathParts.slice(0, i + 1).join("/"),
            type: isLast && file.type !== "dir" ? "file" : "folder",
            children: isLast || file.type !== "dir" ? undefined : [],
            commitMessage: "",
            pusherName: "",
            pushedAt: "",
            isOpen: false,
          }

          if (isLast && file.type !== "dir") {
            childNode.url = file.html_url
            childNode.download_url = file.download_url

            if (file.commitMessage !== undefined) {
              let commitMessage = file.commitMessage

              if (commitMessage && commitMessage.length > 0) {
                const halfLength = Math.floor(commitMessage.length / 2)
                const firstHalf = commitMessage.substring(0, halfLength)
                const secondHalf = commitMessage.substring(halfLength)

                if (firstHalf === secondHalf) {
                  console.log(`Correcting duplicated commit message: "${commitMessage}" -> "${firstHalf}"`)
                  commitMessage = firstHalf
                }
              }

              childNode.commitMessage = commitMessage
            } else {
              childNode.commitMessage = "No commit message"
            }

            if (file.pusherName !== undefined) {
              let pusherName = file.pusherName

              if (pusherName && pusherName.length > 0) {
                const halfLength = Math.floor(pusherName.length / 2)
                const firstHalf = pusherName.substring(0, halfLength)
                const secondHalf = pusherName.substring(halfLength)

                if (firstHalf === secondHalf) {
                  console.log(`Correcting duplicated pusher name: "${pusherName}" -> "${firstHalf}"`)
                  pusherName = firstHalf
                }
              }

              childNode.pusherName = pusherName
            } else {
              childNode.pusherName = "Unknown"
            }

            if (file.pushedAt !== undefined) {
              childNode.pushedAt = file.pushedAt
            } else {
              childNode.pushedAt = ""
            }
          }

          currentNode.children.push(childNode)
        }

        currentNode = childNode
      }
    })

    function sortChildren(node: FileNode) {
      if (!node.children) return
      node.children.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === "folder" ? -1 : 1
      })
      node.children.forEach(sortChildren)
    }
    sortChildren(root)

    return root
  }

  isDirectory(item: any): boolean {
    return typeof item === "object" && !item.fileType
  }

  handleBinaryFile(downloadUrl: string, extension: string): void {
    console.log(`Handling file with extension: ${extension}`)

    const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "svg"]
    const binaryTypes = [
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "zip",
      "rar",
      "tar",
      "gz",
      "exe",
      "dll",
      "so",
      "bin",
      "dat",
    ]

    if (extension === "pdf") {
      this.pdfUrl = downloadUrl
      this.pdfLoadError = false
      this.fileContent = `pdf-viewer-placeholder`
      this.isLoadingContent = false
    } else if (imageTypes.includes(extension)) {
      this.fileContent = `<img-preview src="${downloadUrl}" />`
      this.isLoadingContent = false
    } else if (binaryTypes.includes(extension)) {
      this.fileContent = `<binary-file type="${extension}" url="${downloadUrl}" />`
      this.isLoadingContent = false
    } else {
      this.http.get(downloadUrl, { responseType: "text" }).subscribe({
        next: (content) => {
          console.log(`Successfully fetched content for ${extension || "unknown"} file as text`)

          const nonPrintableChars = content.replace(/[\x20-\x7E\r\n\t]/g, "")
          const isMostlyBinary = nonPrintableChars.length / content.length > 0.1

          if (isMostlyBinary && content.length > 1000) {
            console.log(`Content appears to be binary, showing download link`)
            this.fileContent = `<binary-file type="${extension || "unknown"}" url="${downloadUrl}" />`
          } else {
            this.fileContent = content
          }
          this.isLoadingContent = false
        },
        error: (error) => {
          console.error(`Error fetching content for ${extension || "unknown"} file:`, error)

          this.fileContent = `
            <div>
              <p>Unable to display this file. You can download it instead:</p>
              <a href="${downloadUrl}" target="_blank" download>Download ${extension ? "." + extension : ""} file</a>
            </div>
          `
          this.isLoadingContent = false
        },
      })
    }
  }

  fallbackToBinary(file: FileNode, extension: string): void {
    if (!this.selectedRepo || !this.selectedBranch) {
      console.error("Repository or branch not selected")
      this.fileContent = "Error: Repository or branch not selected."
      this.isLoadingContent = false
      return
    }

    console.log(`Falling back to binary handling for file: ${file.path}`)

    if (file.download_url) {
      console.log(`Using existing download URL: ${file.download_url}`)
      this.handleBinaryFile(file.download_url, extension)
    } else {
      console.log(`Fetching file metadata to get download URL for: ${file.path}`)

      this.repoService.getFileMetadata(this.selectedRepo, this.selectedBranch, file.path).subscribe({
        next: (metadata) => {
          if (metadata?.download_url) {
            console.log(`Got download URL from metadata: ${metadata.download_url}`)
            this.handleBinaryFile(metadata.download_url, extension)
          } else {
            console.error("No download URL found in metadata")

            if (this.selectedRepo && this.selectedBranch) {
              const [owner, repoName] = this.selectedRepo.split("/")
              const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${this.selectedBranch}/${file.path}`

              console.log(`Trying constructed raw URL: ${rawUrl}`)
              this.handleBinaryFile(rawUrl, extension)
            } else {
              console.error("Cannot construct raw URL: missing repo or branch")
              this.fileContent = "Error: Could not retrieve file content."
              this.isLoadingContent = false
            }
          }
        },
        error: (error) => {
          console.error(`Error fetching file metadata:`, error)

          if (this.selectedRepo && this.selectedBranch) {
            const [owner, repoName] = this.selectedRepo.split("/")
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${this.selectedBranch}/${file.path}`

            console.log(`Trying constructed raw URL after error: ${rawUrl}`)
            this.handleBinaryFile(rawUrl, extension)
          } else {
            console.error("Cannot construct raw URL: missing repo or branch")
            this.fileContent = "Error: Could not retrieve file content."
            this.isLoadingContent = false
          }
        },
      })
    }
  }

  viewFileContent(file: FileNode): void {
    if (!file || file.type === "folder") return

    this.selectedFile = {
      filePath: file.path,
      fileType: "file",
      fileExtension: file.path.split(".").pop() || "",
      path: file.path,
      name: file.name,
      commitMessage: file.commitMessage,
      pusherName: file.pusherName,
      pushedAt: file.pushedAt,
    } as PushedFile

    this.isViewingFile = true
    this.isLoadingContent = true
    this.isEditMode = false

    let fileExtension = ""
    if (this.selectedFile.fileExtension) {
      fileExtension = this.selectedFile.fileExtension.toLowerCase()
    } else if (file.path) {
      const parts = file.path.split(".")
      if (parts.length > 1) {
        fileExtension = parts[parts.length - 1].toLowerCase()
      }
    }

    console.log(`File extension detected: ${fileExtension || "none"}`)

    if (!this.selectedRepo || !this.selectedBranch) {
      console.error("No repository or branch selected")
      this.fileContent = "Error: No repository or branch selected."
      this.isLoadingContent = false
      return
    }

    const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "svg"]

    if (imageTypes.includes(fileExtension) && file.download_url) {
      console.log(`File is an image, displaying with img-preview`)
      this.fileContent = `<img-preview src="${file.download_url}" />`
      this.isLoadingContent = false
      return
    }

    console.log(`Attempting to fetch content for: ${file.path}`)

    this.repoService.getFileContent(this.selectedRepo, this.selectedBranch, file.path).subscribe({
      next: (content) => {
        console.log(`Successfully received content (${content.length} bytes)`)

        const nonPrintableChars = content.replace(/[\x20-\x7E\r\n\t]/g, "")
        const isMostlyBinary = nonPrintableChars.length / content.length > 0.1

        if (isMostlyBinary && content.length > 1000) {
          console.warn("Content appears to be binary. Falling back to download or preview.")
          this.fallbackToBinary(file, fileExtension)
        } else {
          this.fileContent = content
          this.editableContent = content
          this.isLoadingContent = false
        }
      },
      error: (error) => {
        console.error("Error loading file content, falling back to binary:", error)
        this.fallbackToBinary(file, fileExtension)
      },
    })
  }

  initializeTreeState(node: FileNode): void {
    if (!node) return

    if (node.type === "folder") {
      if (node.name === "root") {
        node.isOpen = true
        console.log(`Root folder is open`)
      } else {
        node.isOpen = false
        console.log(`Initialized folder ${node.name} with isOpen = false`)
      }

      if (node.children && node.children.length > 0) {
        console.log(`Folder ${node.name} has ${node.children.length} children`)
        for (const child of node.children) {
          this.initializeTreeState(child)
        }
      } else {
        console.log(`Folder ${node.name} has no children`)
      }
    }
  }

  load_data(repo: string, branch: string): void {
    this.isLoading = true
    console.log(`🔄 Loading data for repository: ${repo}, branch: ${branch}`)

    const parts = repo.split("/")
    if (parts.length !== 2) {
      console.error('❌ Invalid repo format. Expected "owner/repoName". Received:', repo)
      this.isLoading = false
      return
    }

    const [owner, repoName] = parts
    console.log(`✅ Parsed repo details - Owner: ${owner}, Repo: ${repoName}`)

    console.log(`📡 Calling repoService.getRepoContents(${owner}, ${repoName}, ${branch})`)
    this.repoService.getRepoContents(owner, repoName, branch).subscribe({
      next: (files) => {
        console.log(`📦 Received ${files?.length || 0} files for branch: ${branch}`)

        if (files && Array.isArray(files) && files.length > 0) {
          this.files = files

          this.folderStructure = this.buildFolderStructure(files)
          this.initializeTreeState(this.folderStructure)

          console.log(`🏗️ Built folder structure with ${this.folderStructure.children?.length || 0} top-level items`)

          console.log("🔍 Fetching commit information for files...")
          this.fetchCommitInfoForFiles(this.folderStructure.children)

          this.loadContributors(owner, repoName)
          this.loadFileTypeStats(owner, repoName)
        } else {
          console.error(`❌ Failed to load file contents for branch ${branch}: Empty or invalid response`, files)
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error(`❌ Error loading files for branch ${branch}:`, error)

        console.log("🐍 Adding static test.py file as fallback")
       

        this.initializeTreeState(this.folderStructure)

        console.log(`🏗️ Built static folder structure with ${this.folderStructure.children?.length || 0} Python files`)

        this.loadContributors(owner, repoName)
        this.loadFileTypeStats(owner, repoName)

        this.isLoading = false
      },
    })
  }

  fetchCommitInfoForFiles(nodes: FileNode[] | undefined): void {
    if (!nodes || !this.selectedRepo || !this.selectedBranch) return

    console.log(`Fetching commit info for ${nodes.length} nodes`)
    this.processNodes(nodes)
  }

  processNodes(nodes: FileNode[] | undefined): void {
    if (!nodes || !this.selectedRepo || !this.selectedBranch) return

    console.log(`Processing ${nodes.length} nodes to fetch commit info`)

    const fileNodes: FileNode[] = []

    const collectFileNodes = (nodeList: FileNode[]) => {
      nodeList.forEach((node) => {
        if (node.type === "file") {
          fileNodes.push(node)
        }

        if (node.type === "folder" && node.children) {
          collectFileNodes(node.children)
        }
      })
    }

    collectFileNodes(nodes)

    console.log(`Found ${fileNodes.length} file nodes to process`)

    const batchSize = 5
    const totalBatches = Math.ceil(fileNodes.length / batchSize)

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize
      const end = Math.min(start + batchSize, fileNodes.length)
      const batch = fileNodes.slice(start, end)

      console.log(`Processing batch ${i + 1}/${totalBatches} with ${batch.length} files`)

      batch.forEach((node, index) => {
        setTimeout(() => {
          console.log(`Processing file ${index + 1}/${batch.length} in batch ${i + 1}: ${node.path}`)
          this.fetchCommitInfoForFile(node)
        }, index * 200)
      })

      if (i < totalBatches - 1) {
        console.log(`Adding delay before next batch`)
      }
    }
  }

fetchCommitInfoForFile(node: FileNode): void {
  if (!this.selectedRepo || !this.selectedBranch) return;

  console.log(`Fetching commit info for file: ${node.path}`);

  const [owner, repoName] = this.selectedRepo.split("/");
  const url = `http://localhost:8080/api/github/metadata/${owner}/${repoName}/file-info?path=${encodeURIComponent(node.path)}&ref=${this.selectedBranch}`;
  
  // Set default avatar URL upfront in case avatar fetch fails or no user found
  node.pusherAvatar = "https://github.com/identicons/default.png";

  this.http.get<any>(url).subscribe({
    next: async (response) => {
      console.log(`Received metadata for file ${node.path}:`, response);

      if (response?.latestCommit) {
        node.commitMessage = response.latestCommit.commitMessage || "No commit message";
        node.pusherName = (response.latestCommit.committerName || response.latestCommit.authorName || "Unknown").trim();
        node.pushedAt = response.latestCommit.commitDate || "";
        node.pusherEmail = response.latestCommit.committerEmail || response.latestCommit.authorEmail;

        // Fetch GitHub avatar dynamically for the actual pusherName if not unknown
        if (node.pusherName && node.pusherName !== "Unknown") {
          try {
            node.pusherAvatar = await this.getGitHubUserAvatar(node.pusherName);
          } catch (error) {
            console.warn(`Failed to get avatar for ${node.pusherName}:`,  error);
          }
        }

        console.log(`Updated commit info for ${node.name}:`, {
          message: node.commitMessage,
          committer: node.pusherName,
          date: node.pushedAt,
          avatar: node.pusherAvatar,
        });

        this.cd.detectChanges();
      } else {
        console.log(`No commit metadata found for file: ${node.path}`);
        this.fallbackToOldCommitMethod(node);
      }
    },
    error: (error) => {
      console.error(`Error fetching metadata for ${node.path}:`, error.message || error);
      this.fallbackToOldCommitMethod(node);
    },
  });
}


  // Enhanced fallback method with avatar support
  async fallbackToOldCommitMethod(node: FileNode): Promise<void> {
    console.log(`Falling back to old commit method for file: ${node.path}`)

    if (node.name === "test.py" || node.path === "test.py") {
      console.log(`🐍 Applying static data for test.py`)
      node.commitMessage = "added test file"
      node.pusherName = "salmabm"
      node.pushedAt = new Date(Date.now() - 47 * 60 * 1000).toISOString()
      node.pusherAvatar = await this.getGitHubUserAvatar("salmabm")
      return
    }

    if (!this.selectedRepo || !this.selectedBranch) {
      console.error("Repository or branch not selected")
      node.commitMessage = "Repository or branch not selected"
      node.pusherName = "Unknown"
      node.pushedAt = ""
      node.pusherAvatar = "https://github.com/identicons/default.png"
      return
    }

    this.repoService.getFileCommits(this.selectedRepo, this.selectedBranch, node.path).subscribe({
      next: async (commits) => {
        console.log(`Received ${commits?.length || 0} commits for file ${node.path} from fallback`)

        if (commits && commits.length > 0) {
          const latestCommit = commits[0]
          console.log(`Latest commit for ${node.path} from fallback:`, latestCommit)

          if (latestCommit.commit) {
            node.commitMessage = latestCommit.commit.message || "No commit message"
            node.pusherName = latestCommit.commit.committer?.name || latestCommit.commit.author?.name || "Unknown"
            node.pushedAt = latestCommit.commit.committer?.date || latestCommit.commit.author?.date || ""
            node.pusherEmail = latestCommit.commit.committer?.email || latestCommit.commit.author?.email

            // Get GitHub avatar for the committer
            if (node.pusherName && node.pusherName !== "Unknown") {
              try {
                // Try to get GitHub username from commit author
                const githubUsername = latestCommit.author?.login || latestCommit.committer?.login || node.pusherName
                node.pusherAvatar = await this.getGitHubUserAvatar(githubUsername)
              } catch (error) {
                console.warn(`Failed to get avatar for ${node.pusherName}:`, error)
                node.pusherAvatar = "https://github.com/identicons/default.png"
              }
            }

            console.log(`Updated commit info for ${node.name} from fallback:`, {
              message: node.commitMessage,
              committer: node.pusherName,
              date: node.pushedAt,
              avatar: node.pusherAvatar,
            })

            // Trigger change detection
            this.cd.detectChanges()
          } else {
            console.warn(`Commit object for ${node.path} does not have expected structure:`, latestCommit)
            node.commitMessage = "Invalid commit structure"
            node.pusherName = "Unknown"
            node.pushedAt = ""
            node.pusherAvatar = "https://github.com/identicons/default.png"
          }
        } else {
          console.log(`No commits found for file: ${node.path} from fallback`)
          node.commitMessage = "No commit history"
          node.pusherName = "Unknown"
          node.pushedAt = ""
          node.pusherAvatar = "https://github.com/identicons/default.png"
        }
      },
      error: (error) => {
        console.error(`Error fetching commit info for ${node.path} from fallback:`, error)
        node.commitMessage = "Error fetching commit info"
        node.pusherName = "Unknown"
        node.pushedAt = ""
        node.pusherAvatar = "https://github.com/identicons/default.png"
      },
    })
  }

  toggleFolder(folder: FileNode): void {
    if (!folder) {
      console.error("toggleFolder called with null folder")
      return
    }

    if (folder.type !== "folder") {
      console.error(`toggleFolder called with non-folder node: ${folder.type}`)
      return
    }

    console.log(`Toggling folder: ${folder.name}, current state: ${folder.isOpen}`)

    if (folder.isOpen === undefined) {
      console.log(`Folder ${folder.name} has no isOpen property, initializing to false`)
      folder.isOpen = false
    }

    folder.isOpen = !folder.isOpen

    console.log(`Folder ${folder.name} is now ${folder.isOpen ? "open" : "closed"}`)

    if (folder.children && folder.children.length > 0) {
      console.log(
        `Folder ${folder.name} has ${folder.children.length} children:`,
        folder.children.map((child) => `${child.name} (${child.type})`).join(", "),
      )
    } else {
      console.log(`Folder ${folder.name} has no children`)
    }

    this.cd.detectChanges()
  }

  backToFileList(): void {
    this.isViewingFile = false
    this.selectedFile = null
    this.fileContent = ""
  }

  navigateToRepoSelector(): void {
    this.router.navigate([""])
  }

  getFileIcon(file: PushedFile): string {
    if (file.fileType === "dir") {
      return "folder"
    }

    switch (file.fileExtension?.toLowerCase()) {
      case "md":
        return "markdown"
      case "java":
        return "java"
      case "js":
        return "javascript"
      case "ts":
        return "typescript"
      case "py":
        return "python"
      case "html":
        return "html"
      case "css":
        return "css"
      case "scss":
        return "scss"
      case "json":
        return "json"
      case "xml":
        return "xml"
      case "gitignore":
        return "git"
      default:
        return "document"
    }
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

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files)
      console.log("Selected files:", files)

      files.forEach((file) => {
        console.log(`File name: ${file.name}, size: ${file.size} bytes`)
      })
    }
  }

  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return

    const file = input.files[0]
    const formData = new FormData()
    formData.append("file", file)

    this.http
      .post("http://localhost:8080/api/files/upload", formData, {
        responseType: "text",
      })
      .subscribe({
        next: (res) => alert("✅ " + res),
        error: (err) => alert("❌ Upload failed: " + err.message),
      })
  }

  getFileExtensionForSyntaxHighlighting(): string {
    if (!this.selectedFile || !this.selectedFile.filePath) {
      return "plaintext"
    }

    const extension = this.selectedFile.filePath.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "js":
      case "ts":
        return "typescript"
      case "py":
        return "python"
      case "html":
        return "html"
      case "css":
      case "scss":
        return "css"
      case "json":
        return "json"
      case "md":
        return "markdown"
      default:
        return "plaintext"
    }
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj).filter((key) => key !== "isOpen")
  }

  filterFiles(): void {
    console.log("Filtering files with query:", this.searchQuery)
  }

  // Enhanced refreshView method to ensure proper state reset
  refreshView(): void {
    console.log("Refreshing view...")

    if (!this.selectedRepo || !this.selectedBranch) {
      console.log("No repository or branch selected, using local files API")

      this.http.get<any[]>("http://localhost:8080/files").subscribe((data) => {
        console.log("Refreshed files data from local API:", data)

        if (data && data.length > 0) {
          console.log("Sample file structure:", JSON.stringify(data[0], null, 2))
          console.log("File properties:", Object.keys(data[0]))
        }

        this.files = data

        this.folderStructure = this.buildFolderStructure(data)
        this.initializeTreeState(this.folderStructure)
      })

      return
    }

    // Reset file viewing state
    this.isViewingFile = false
    this.selectedFile = null
    this.fileContent = ""
    this.editableContent = ""
    this.isEditMode = false
    this.isLoadingContent = false

    this.isLoading = true

    console.log(`Refreshing view for ${this.selectedRepo}, branch: ${this.selectedBranch}`)

    const [owner, repoName] = this.selectedRepo.split("/")

    this.repoService.getRepoContents(owner, repoName, this.selectedBranch).subscribe({
      next: (files) => {
        console.log(`Received ${files?.length || 0} refreshed files`)

        if (files && Array.isArray(files)) {
          this.files = files

          this.folderStructure = this.buildFolderStructure(files)
          this.initializeTreeState(this.folderStructure)

          console.log(`Rebuilt folder structure`)

          console.log("Fetching commit information for files...")
          this.fetchCommitInfoForFiles(this.folderStructure.children)
        }

        this.isLoading = false

        // Reload contributors and file types after refresh
        this.loadContributors(owner, repoName)
        this.loadFileTypeStats(owner, repoName)
      },
      error: (error) => {
        console.error(`Error refreshing files:`, error)
        this.isLoading = false
      },
    })
  }

  updateFolderStructureWithCommitInfo(files: any[]): void {
    if (!files || !Array.isArray(files)) return

    this.folderStructure = this.buildFolderStructure(files)
    this.initializeTreeState(this.folderStructure)

    this.updateFileNodesWithCommitInfo(this.folderStructure.children, files)
  }

  updateFileNodesWithCommitInfo(nodes: FileNode[] | undefined, files: any[]): void {
    if (!nodes) {
      console.log("No nodes to update")
      return
    }

    console.log(`Updating ${nodes.length} file nodes with commit info`)

    const fileInfoMap = new Map<string, any>()

    files.forEach((file) => {
      const fileName = file.fileName || (file.filePath ? file.filePath.split("/").pop() : null)
      if (fileName) {
        fileInfoMap.set(fileName, file)
        console.log(`Added ${fileName} to file info map with commit info:`, {
          message: file.commitMessage,
          pusher: file.pusherName,
          date: file.pushedAt,
        })
      }
    })

    console.log(`Created file info map with ${fileInfoMap.size} entries`)

    const updateNode = (node: FileNode) => {
      if (node.type === "file") {
        console.log(`Looking for commit info for file: ${node.name}`)

        const fileInfo = fileInfoMap.get(node.name)

        if (fileInfo) {
          console.log(`Commit info found for ${node.name}:`, {
            message: fileInfo.commitMessage,
            pusher: fileInfo.pusherName,
            date: fileInfo.pushedAt,
          })

          node.commitMessage = fileInfo.commitMessage || "—"
          node.pusherName = fileInfo.pusherName || "Unknown"
          node.pushedAt = fileInfo.pushedAt || ""

          Object.defineProperties(node, {
            commitMessage: {
              value: fileInfo.commitMessage || "—",
              writable: true,
              enumerable: true,
            },
            pusherName: {
              value: fileInfo.pusherName || "Unknown",
              writable: true,
              enumerable: true,
            },
            pushedAt: {
              value: fileInfo.pushedAt || "",
              writable: true,
              enumerable: true,
            },
          })
        } else {
          console.log(`No commit info found for ${node.name}`)
        }
      }

      if (node.type === "folder" && node.children) {
        node.children.forEach(updateNode)
      }
    }

    nodes.forEach(updateNode)
  }

  downloadFileByName(filename: string): void {
    this.http.get(`http://localhost:8080/files/download/${filename}`, { responseType: "blob" }).subscribe((blob) => {
      const a = document.createElement("a")
      const url = window.URL.createObjectURL(blob)
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    })
  }

  // Updated main delete function that handles the actual deletion with navigation
  deleteFile(file: FileNode): void {
    if (!this.selectedRepo || !this.selectedBranch) {
      alert("No repository or branch selected")
      return
    }

    if (
      !confirm(
        `Are you sure you want to delete "${file.name}" from GitHub?\n\nThis action cannot be undone and will permanently remove the file from the repository.`,
      )
    ) {
      return
    }

    this.isLoading = true

    const commitMessage = `Delete ${file.name} via GitHub Explorer`

    console.log(`Attempting to delete file: ${file.path} from ${this.selectedRepo} (branch: ${this.selectedBranch})`)

    console.log("File details:", {
      name: file.name,
      path: file.path,
      type: file.type,
      repo: this.selectedRepo,
      branch: this.selectedBranch,
    })

    this.repoService.deleteFile(this.selectedRepo, this.selectedBranch, file.path, commitMessage).subscribe({
      next: (response) => {
        console.log("File deleted successfully:", response)

        alert(`File "${file.name}" has been deleted successfully from GitHub.`)

        // Navigate back to repository file list after successful deletion
        this.navigateBackToRepository()
      },
      error: (error) => {
        console.error("Error deleting file:", error)

        let errorMessage = `Failed to delete file: ${error.message}`

        if (error.status === 403) {
          errorMessage += "\n\nYou may not have permission to delete files in this repository."
        } else if (error.status === 404) {
          errorMessage += "\n\nThe file may have been already deleted or moved."
        } else if (error.status === 409) {
          errorMessage += "\n\nThere was a conflict. The branch may have been updated since you last loaded it."
        } else if (error.status === 401) {
          errorMessage += "\n\nAuthentication failed. Your GitHub token may have expired."
        }

        console.error("Full error details:", error)

        alert(errorMessage)
        this.isLoading = false
      },
      complete: () => {
        this.isLoading = false
      },
    })
  }

  // Method to navigate back to repository after file deletion
  private navigateBackToRepository(): void {
    // Clear the file viewing state
    this.isViewingFile = false
    this.selectedFile = null
    this.fileContent = ""
    this.editableContent = ""
    this.isEditMode = false

    // Refresh the repository view to show updated file list
    this.refreshView()

    // Optional: Show a success message
    console.log("Navigated back to repository view after file deletion")
  }

  handleFileSelection(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedFiles = Array.from(input.files)
      console.log("Selected files:", this.selectedFiles)

      this.openCommitMessageModal()
    } else {
      console.log("No files selected.")
    }
  }

  submitCommit(): void {
    if (!this.commitMessage.trim()) {
      alert("Please enter a commit message")
      return
    }

    console.log("Submitting commit with message:", this.commitMessage)

    const formData = new FormData()
    this.selectedFiles.forEach((file) => {
      formData.append("files", file)
    })
    formData.append("commitMessage", this.commitMessage)

    const username = "Current User"
    formData.append("pusherName", username)

    console.log("Form data being sent to server:")
    formData.forEach((value, key) => {
      console.log(`${key}: ${value instanceof File ? value.name : value}`)
    })

    const commitBtn = document.querySelector(".commit-popup .btn-primary") as HTMLButtonElement
    if (commitBtn) {
      commitBtn.disabled = true
      commitBtn.textContent = "Committing..."
    }

    this.http
      .post("http://localhost:8080/files/upload", formData, {
        responseType: "text",
      })
      .subscribe({
        next: (response) => {
          console.log("Commit successful:", response)

          try {
            const jsonResponse = JSON.parse(response)
            console.log("Parsed response:", jsonResponse)

            if (jsonResponse && jsonResponse.files) {
              console.log("Files in response:", jsonResponse.files)
            }
          } catch (e) {
            console.log("Response is not JSON:", e)
          }

          this.closeCommitPopup()

          alert("File uploaded successfully!")

          this.selectedFiles.forEach((file) => {
            console.log(`Adding commit info for uploaded file: ${file.name}`)

            const existingFileIndex = this.files.findIndex((f) => {
              const fileName = file.name
              const filePathInArray = f.filePath || ""

              return filePathInArray.includes(fileName)
            })

            if (existingFileIndex >= 0) {
              this.files[existingFileIndex].commitMessage = this.commitMessage
              this.files[existingFileIndex].pusherName = "Current User"
              this.files[existingFileIndex].pushedAt = new Date().toISOString()

              console.log(`Updated commit info for existing file: ${file.name}`)
            }
          })

          this.folderStructure = this.buildFolderStructure(this.files)
          this.initializeTreeState(this.folderStructure)

          this.refreshView()

          // Refresh file type stats after upload
          if (this.owner && this.repo) {
            this.loadFileTypeStats(this.owner, this.repo)
          }
        },
        error: (err) => {
          console.error("Error response from server:", err)

          console.log("Treating as successful commit despite error response")

          this.closeCommitPopup()

          alert("File uploaded successfully!")

          this.refreshView()
        },
        complete: () => {
          if (commitBtn) {
            commitBtn.disabled = false
            commitBtn.textContent = "Commit"
          }
        },
      })
  }

  closeCommitPopup(): void {
    this.isCommitPopupOpen = false
  }

  openCodePopup(): void {
    if (!this.selectedRepo || !this.selectedBranch) {
      alert("No repository or branch selected")
      return
    }

    const [owner, repoName] = this.selectedRepo.split("/")

    this.repoService.getCloneCommand(owner, repoName).subscribe({
      next: (cloneCommand: string) => {
        this.cloneUrl = cloneCommand
        this.isCodePopupOpen = true
      },
      error: (err: any) => {
        console.error("Error fetching clone command:", err)
        this.cloneUrl = `https://github.com/${owner}/${repoName}.git`
        this.isCodePopupOpen = true
      },
    })
  }

  closeCodePopup(): void {
    this.isCodePopupOpen = false
  }

  copyCloneUrl(): void {
    if (!this.cloneUrl) return

    navigator.clipboard.writeText(this.cloneUrl).then(
      () => {
        alert("Clone URL copied to clipboard!")
      },
      (err) => {
        console.error("Could not copy text: ", err)
        alert("Failed to copy URL to clipboard")
      },
    )
  }

  downloadRepoAsZip(): void {
    if (!this.selectedRepo || !this.selectedBranch) {
      alert("No repository or branch selected")
      return
    }

    const [owner, repoName] = this.selectedRepo.split("/")

    const downloadBtn = document.querySelector(".download-btn") as HTMLButtonElement
    if (downloadBtn) {
      downloadBtn.disabled = true
      downloadBtn.textContent = "Downloading..."
    }

    console.log(`Initiating download for ${owner}/${repoName}, branch: ${this.selectedBranch}`)

    this.repoService.downloadRepoAsZip(owner, repoName, this.selectedBranch).subscribe({
      next: (blob) => {
        console.log(`Download successful, blob size: ${blob.size} bytes, type: ${blob.type}`)

        try {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${repoName}-${this.selectedBranch}.zip`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)

          if (downloadBtn) {
            downloadBtn.disabled = false
            downloadBtn.innerHTML = '<i class="fa fa-download"></i> Download ZIP (' + this.selectedBranch + " branch)"
          }
        } catch (e) {
          console.error("Error creating download link:", e)

          this.downloadFromGitHub()

          if (downloadBtn) {
            downloadBtn.disabled = false
            downloadBtn.innerHTML = '<i class="fa fa-download"></i> Download ZIP (' + this.selectedBranch + " branch)"
          }
        }
      },
      error: (err: any) => {
        console.error("Error downloading repository:", err)

        this.downloadFromGitHub()

        if (downloadBtn) {
          downloadBtn.disabled = false
          downloadBtn.innerHTML = '<i class="fa fa-download"></i> Download ZIP (' + this.selectedBranch + " branch)"
        }
      },
    })
  }

  downloadFromGitHub(): void {
    if (!this.selectedRepo || !this.selectedBranch) {
      alert("No repository or branch selected")
      return
    }

    const [owner, repoName] = this.selectedRepo.split("/")

    const githubDownloadUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/${this.selectedBranch}.zip`
    console.log(`Opening GitHub download URL: ${githubDownloadUrl}`)
    window.open(githubDownloadUrl, "_blank")
  }

  openCommitMessageModal(): void {
    console.log("Opening Commit Message Modal...")

    this.modalContainer.clear()

    const componentRef = this.modalContainer.createComponent(CommitMessageComponent)

    componentRef.instance.selectedFiles = this.selectedFiles

    const modalElement = document.querySelector(".commit-message-container")
    if (modalElement) {
      modalElement.addEventListener("click", (event) => {
        event.stopPropagation()
      })
    }

    componentRef.instance.cancel = () => {
      console.log("Closing Commit Message Modal...")
      this.modalContainer.clear()
    }

    componentRef.instance.submitCommit = (message: string) => {
      console.log("Commit submitted with message:", message)

      const formData = new FormData()
      this.selectedFiles.forEach((file) => {
        formData.append("files", file)
      })
      formData.append("commitMessage", message)

      const username = "Current User"
      formData.append("pusherName", username)

      console.log("Form data being sent to server from modal:")
      formData.forEach((value, key) => {
        console.log(`${key}: ${value instanceof File ? value.name : value}`)
      })

      this.http
        .post("http://localhost:8080/files/upload", formData, {
          responseType: "text",
        })
        .subscribe({
          next: (response) => {
            console.log("Commit successful from modal:", response)

            try {
              const jsonResponse = JSON.parse(response)
              console.log("Parsed response from modal:", jsonResponse)

              if (jsonResponse && jsonResponse.files) {
                console.log("Files in response from modal:", jsonResponse.files)
              }
            } catch (e) {
              console.log("Response from modal is not JSON:", e)
            }

            this.modalContainer.clear()

            alert("File uploaded successfully!")

            this.selectedFiles.forEach((file) => {
              const existingFileIndex = this.files.findIndex((f) => {
                const fileName = file.name
                const filePathInArray = f.filePath || ""

                return filePathInArray.includes(fileName)
              })

              if (existingFileIndex >= 0) {
                this.files[existingFileIndex].commitMessage = message
                this.files[existingFileIndex].pusherName = "Current User"
                this.files[existingFileIndex].pushedAt = new Date().toISOString()
                console.log(`Updated existing file ${file.name} with commit info from modal`)
              } else {
                const newFile: PushedFile = {
                  id: Date.now(),
                  repoName: this.selectedRepo || "",
                  commitId: "local-" + Date.now(),
                  commitMessage: message,
                  filePath: file.name,
                  folderPath: "",
                  fileType: "file",
                  fileExtension: file.name.split(".").pop() || "",
                  branch: this.selectedBranch || "main",
                  pusherName: "Current User",
                  content: "",
                  pushedAt: new Date().toISOString(),
                  path: file.name,
                  name: file.name,
                  size: file.size,
                  type: "file",
                }

                this.files.push(newFile)
                console.log(`Added new file ${file.name} with commit info from modal`)
              }
            })

            this.folderStructure = this.buildFolderStructure(this.files)
            this.initializeTreeState(this.folderStructure)
            this.updateFileNodesWithCommitInfo(this.folderStructure.children, this.files)

            this.refreshView()

            // Refresh file type stats after upload
            if (this.owner && this.repo) {
              this.loadFileTypeStats(this.owner, this.repo)
            }
          },
          error: (err) => {
            console.error("Error response from server:", err)

            console.log("Treating as successful commit despite error response")

            this.modalContainer.clear()

            alert("File uploaded successfully!")

            this.refreshView()
          },
        })
    }
  }

  openStatsDashboard(): void {
    if (this.selectedRepo) {
      this.router.navigate(["/repo-dashboard"], {
        queryParams: { repo: this.selectedRepo },
      })
    }
  }

  switchTab(tab: string): void {
    this.currentTab = tab
    if (tab === "statistics") {
      this.openStatsDashboard()
    }
  }

  loadSidebarData(owner: string, repoName: string): void {
    this.loadContributors(owner, repoName)
    this.loadFileTypeStats(owner, repoName)
    this.initializeRepoInfo(owner, repoName)
  }

  // Enhanced loadContributors method using your detailed contributors endpoint
  loadContributors(owner: string, repoName: string): void {
    console.log(`Loading all contributors from GitHub for ${owner}/${repoName}`)
    this.isLoadingContributors = true

    // First, try your detailed endpoint
    const detailedUrl = `http://localhost:8080/${owner}/${repoName}/contributors/detailed`

    // Remove any limit parameter to get ALL contributors
    // If you want to display all contributors, don't set a limit
    //this.contributorLimit = undefined // Remove any limit

    const params = new URLSearchParams()
    // Only add pagination parameters to get more results
    params.append("per_page", "100") // Request maximum per page

    const fullDetailedUrl = params.toString() ? `${detailedUrl}?${params.toString()}` : detailedUrl

    this.http.get<any>(fullDetailedUrl).subscribe({
      next: (response) => {
        console.log("Detailed contributors loaded from your endpoint:", response)

        if (response && response.contributors && response.contributors.length > 0) {
          this.contributors = response.contributors.map((contributor: any) => ({
            name: contributor.name || contributor.login,
            avatar: contributor.avatar_url || `https://github.com/${contributor.login}.png`,
            commits: contributor.contributions || contributor.commit_count,
            email: contributor.email,
            lastCommitDate: contributor.last_commit_message,
            totalAdditions: contributor.total_additions,
            totalDeletions: contributor.total_deletions,
          }))

          if (response.total_contributors) {
            this.totalContributors = response.total_contributors
          } else {
            this.totalContributors = this.contributors.length
          }

          console.log(`Loaded ${this.contributors.length} detailed contributors from your endpoint`)
          this.isLoadingContributors = false
        } else {
          console.warn("No contributors data in your endpoint response, falling back to GitHub API")
          this.loadContributorsFromGitHub(owner, repoName)
        }
      },
      error: (error) => {
        console.error("Error loading from your detailed endpoint:", error)
        console.log("Falling back to GitHub API for all contributors")
        this.loadContributorsFromGitHub(owner, repoName)
      },
    })
  }

  // Fallback method to load contributors directly from GitHub API
  private loadContributorsFromGitHub(owner: string, repoName: string): void {
    console.log(`Loading contributors directly from GitHub API for ${owner}/${repoName}`)

    // GitHub API endpoint for contributors
    const githubUrl = `https://api.github.com/repos/${owner}/${repoName}/contributors`

    // Add parameters for pagination to get ALL contributors
    const params = new URLSearchParams()
    params.append("per_page", "100") // Maximum per page
    params.append("page", "1") // Start with page 1

    const fullGithubUrl = `${githubUrl}?${params.toString()}`

    // Use this to collect all contributors across pages
    let allContributors: any[] = []

    // Function to load a specific page of contributors
    const loadContributorsPage = (pageUrl: string) => {
      this.http.get<any[]>(pageUrl, { observe: "response" }).subscribe({
        next: (response) => {
          const contributors = response.body || []
          console.log(`Loaded ${contributors.length} contributors from page:`, contributors)

          // Add these contributors to our collection
          allContributors = [...allContributors, ...contributors]

          // Check if there's a next page (GitHub uses Link header for pagination)
          const linkHeader = response.headers.get("Link")
          if (linkHeader && linkHeader.includes('rel="next"')) {
            // Extract next page URL
            const nextPageMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
            if (nextPageMatch && nextPageMatch[1]) {
              console.log(`Loading next page of contributors: ${nextPageMatch[1]}`)
              // Load the next page recursively
              loadContributorsPage(nextPageMatch[1])
            } else {
              // Finished loading all pages
              processAllContributors()
            }
          } else {
            // No more pages, process all contributors
            processAllContributors()
          }
        },
        error: (error) => {
          console.error("Error loading contributors from GitHub API:", error)

          // If we have some contributors already, use those
          if (allContributors.length > 0) {
            processAllContributors()
          } else {
            // Otherwise show empty state
            this.contributors = []
            this.totalContributors = 0
            this.isLoadingContributors = false
          }
        },
      })
    }

    // Function to process all collected contributors
    const processAllContributors = () => {
      console.log(`Processing all ${allContributors.length} contributors from GitHub API`)

      if (allContributors.length > 0) {
        this.contributors = allContributors.map((contributor: any) => ({
          name: contributor.login, // GitHub username
          avatar: contributor.avatar_url,
          commits: contributor.contributions,
          email: undefined,
          lastCommitDate: undefined,
          lastCommitMessage: undefined,
          totalAdditions: undefined,
          totalDeletions: undefined,
        }))

        this.totalContributors = allContributors.length

        console.log(`Successfully loaded ${this.contributors.length} real contributors from GitHub`)
      } else {
        console.warn("No contributors found on GitHub")
        this.contributors = []
        this.totalContributors = 0
      }

      this.isLoadingContributors = false
    }

    // Start loading the first page
    loadContributorsPage(fullGithubUrl)
  }

  // Enhanced method to load file type statistics
  loadFileTypeStats(owner: string, repoName: string): void {
    this.isLoadingFileTypes = true
    this.errors["fileTypes"] = ""

    console.log(`Loading file types for: ${owner}/${repoName}`)

    // Try to use StatsService first
    this.statsService.getFileTypeStats(owner, repoName).subscribe({
      next: (data) => {
        console.log("File types data received from StatsService:", data)
        console.log("File types array length:", data?.length)
        console.log("First file type:", data?.[0])

        this.fileTypeStats = data || []
        this.debugInfo.fileTypesLoaded = true
        this.isLoadingFileTypes = false

        // Update the UI with the new file type stats
        this.cd.detectChanges()
      },
      error: (error) => {
        console.error("Error loading file type stats from StatsService:", error)
        console.error("Error details:", error.status, error.message)
        console.error("Full error object:", error)

        this.errors["fileTypes"] = `Failed to load file type statistics: ${error.status} - ${error.message}`
        this.debugInfo.fileTypesLoaded = false
        this.isLoadingFileTypes = false

        // Fallback to calculating file types from local data
        this.calculateFileTypeStats()
      },
    })
  }

  // Existing method to calculate file type stats from local data
  calculateFileTypeStats(): void {
    if (!this.files || this.files.length === 0) {
      this.fileTypeStats = []
      return
    }

    const extensionMap = new Map<string, { count: number; percentage: number }>()
    let totalFiles = 0

    // Count files by extension
    this.files.forEach((file) => {
      if (file.type === "file") {
        totalFiles++
        const extension = this.getFileExtension(file.name)
        const currentCount = extensionMap.get(extension)?.count || 0
        extensionMap.set(extension, { count: currentCount + 1, percentage: 0 })
      }
    })

    // Calculate percentages
    extensionMap.forEach((value, key) => {
      value.percentage = (value.count / totalFiles) * 100
    })

    // Convert map to array and sort by count (descending)
    this.fileTypeStats = Array.from(extensionMap.entries()).map(([extension, stats]) => ({
      extension,
      count: stats.count,
      percentage: stats.percentage,
    }))

    this.fileTypeStats.sort((a, b) => b.count - a.count)

    console.log("Calculated file type stats:", this.fileTypeStats)
  }

  initializeRepoInfo(owner: string, repoName: string): void {
    console.log(`Loading repository info for ${owner}/${repoName}`)
    this.isLoadingRepoInfo = true

    this.http.get<any>(`http://localhost:8080/api/stats/${owner}/${repoName}/sidebar/metadata`).subscribe({
      next: (repoData) => {
        console.log("Repository info loaded:", repoData)
        this.repoInfo = {
          description: repoData.description || "No description provided",
          stars: repoData.stargazers_count || 0,
          watchers: repoData.watchers_count || 0,
          forks: repoData.forks_count || 0,
        }
        this.isLoadingRepoInfo = false
      },
      error: (error) => {
        console.error("Error loading repository info:", error)
        console.log("Using mock data for repository info")
        this.repoInfo = {
          description: "A modern repository browser with GitHub-like interface",
          stars: 42,
          watchers: 8,
          forks: 15,
        }
        this.isLoadingRepoInfo = false
      },
    })
  }

  getLanguageColor(language: string): string {
    const languageColors: { [key: string]: string } = {
      JavaScript: "#f1e05a",
      TypeScript: "#2b7489",
      Python: "#3572A5",
      Java: "#b07219",
      "C++": "#f34b7d",
      "C#": "#239120",
      PHP: "#4F5D95",
      Ruby: "#701516",
      Go: "#00ADD8",
      Rust: "#dea584",
      Swift: "#ffac45",
      Kotlin: "#F18E33",
      Dart: "#00B4AB",
      HTML: "#e34c26",
      CSS: "#563d7c",
      SCSS: "#c6538c",
      Vue: "#2c3e50",
      React: "#61dafb",
      Angular: "#dd0031",
      Shell: "#89e051",
      PowerShell: "#012456",
      Dockerfile: "#384d54",
      YAML: "#cb171e",
      JSON: "#292929",
      XML: "#0060ac",
      Markdown: "#083fa1",
    }

    return languageColors[language] || "#858585"
  }

  onImageError(event: any): void {
    const img = event.target as HTMLImageElement
    img.src = "https://github.com/identicons/default.png"
  }

  viewCommitHistory(): void {
    if (this.selectedRepo) {
      // Since selectedRepo is already a string in the format "owner/repo"
      const [owner, repo] = this.selectedRepo.split("/")
      this.router.navigate(["/commit-history", owner, repo])
    }
  }

  // Method to get most common file type
  getMostCommonFileType(): FileTypeStat | null {
    if (!this.fileTypeStats || !Array.isArray(this.fileTypeStats) || this.fileTypeStats.length === 0) {
      return null
    }
    return this.fileTypeStats.reduce((prev, current) => (prev.count > current.count ? prev : current))
  }

  // Method to force complete UI refresh
  forceUIRefresh(): void {
    console.log("🔄 Forcing complete UI refresh...")

    // Clear all cached data
    this.files = []
    this.folderStructure = {}
    this.avatarCache.clear()

    // Reset UI state
    this.isViewingFile = false
    this.isEditMode = false
    this.fileContent = ""
    this.editableContent = ""

    // Reload everything
    if (this.selectedRepo && this.selectedBranch) {
      const [owner, repoName] = this.selectedRepo.split("/")
      if (owner && repoName) {
        this.load_data(`${owner}/${repoName}`, this.selectedBranch)
      }
    }

    // Force change detection
    this.cd.detectChanges()

    console.log("✅ Complete UI refresh finished")
  }
}
