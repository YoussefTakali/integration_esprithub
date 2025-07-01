import { Component,  OnInit } from "@angular/core"
import  { Router } from "@angular/router"
import  { HttpClient } from "@angular/common/http"

@Component({
  selector: "app-task-dashboard",
  templateUrl: "./task-dashboard.component.html",
  styleUrls: ["./task-dashboard.component.css"],
})
export class TaskDashboardComponent implements OnInit {
  // Static task data
  studentStats = {
    assignments: {
      total: 8,
      completed: 5,
      pending: 3,
      urgent: 2,
    },
    github: {
      repositories: 12,
      commits: 47,
      pullRequests: 8,
      issues: 15,
    },
    projects: {
      active: 4,
      completed: 6,
      collaborations: 3,
      stars: 23,
    },
    performance: {
      averageGrade: 85,
      completionRate: 75,
      onTimeSubmissions: 12,
      lateSubmissions: 3,
    },
  }

  // Current date and time
  currentTime = new Date()

  // GitHub user data - Fixed TypeScript types
  userName: string | null = null
  userAvatar: string | null = null
  githubUsername: string | null = null

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    // Get GitHub user data when component initializes
    this.fetchGitHubUserData()
  }

  // Fetch GitHub user data
  fetchGitHubUserData() {
    // You can replace this with your actual GitHub username or get it from a service/localStorage
    this.githubUsername = "salmabm" // Replace with actual username or get from auth service

    if (this.githubUsername) {
      this.http.get(`https://api.github.com/users/${this.githubUsername}`).subscribe(
        (response: any) => {
          this.userName = response.name || response.login
          this.userAvatar = response.avatar_url
        },
        (error) => {
          console.error("Error fetching GitHub user data:", error)
          // Fallback to default values if GitHub API fails
          this.userName = "Guest User"
          this.userAvatar = null
        },
      )
    }
  }

  // Navigate to tasks page
  navigateTo(route: string): void {
    this.router.navigate([route])
  }

  // Format current time
// Get current time in HH:MM AM/PM format
getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHour = hours % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
}

// Get current date in format "Wed, Jun 4, 2025"
getCurrentDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  return now.toLocaleDateString('en-US', options);
}


  // Get user initials for avatar fallback
  getUserInitials(): string {
    if (this.userName) {
      return this.userName
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    return "GU" // Default Guest User
  }

  // Get completion percentage
  getCompletionPercentage(): number {
    return Math.round((this.studentStats.assignments.completed / this.studentStats.assignments.total) * 100)
  }

  // Get on-time submission rate
  getOnTimeRate(): number {
    return Math.round(
      (this.studentStats.performance.onTimeSubmissions /
        (this.studentStats.performance.onTimeSubmissions + this.studentStats.performance.lateSubmissions)) *
        100,
    )
  }
}
