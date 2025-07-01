import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivityComponent } from 'src/app/components/activity/activity.component';
import { DashboardsubmissionsComponent } from 'src/app/components/dashboardsubmissions/dashboardsubmissions.component';
import { GradingComponent } from 'src/app/components/grading/grading.component';
import { ProgressComponent } from 'src/app/components/progress/progress.component';
import { SidebarService } from 'src/app/services/sidebar.service';

interface Task {
  id: string;
  title: string;
  deadline: string; // ISO format
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @ViewChild(ActivityComponent) activityComp!: ActivityComponent;
  @ViewChild(DashboardsubmissionsComponent) submissionsComp!: DashboardsubmissionsComponent;
  @ViewChild(ProgressComponent) progressComp!: ProgressComponent;
  @ViewChild(GradingComponent) gradingComp!: GradingComponent;

  searchQuery: string = '';
  selectedTab: string = 'activity';
  currentTime: string = '';
  currentDate: string = '';
  aiAssited: boolean = false;
  sidebarVisible: boolean = false;

  stats = [
    { title: 'Active Assignments', value: '1', description: '0 due this week', logo: 'assets/open-book.png' },
    { title: 'Student Submissions', value: '1', description: '12 need grading', logo: 'assets/git-commit-svgrepo-com.png' },
    { title: 'Class Average', value: '0%', description: 'Last 5 assignments', logo: 'assets/graduation-cap-svgrepo-com.png' },
    { title: 'Upcoming Deadlines', value: '0', description: 'Next 7 days', logo: 'assets/calendar-days-svgrepo-com.png' }
  ];

  constructor(private sidebarService: SidebarService, private http: HttpClient) {}

  ngOnInit(): void {
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);

    this.sidebarService.sidebarVisible$.subscribe((visible) => {
      this.sidebarVisible = visible;
    });

    this.loadUpcomingTasks(); // ✅ Just call it without assigning
  }

  updateDateTime(): void {
    const now = new Date();
    this.currentDate = now.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    this.currentTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  changeTab(tab: string): void {
    this.selectedTab = tab;
  }

  onSearch() {
    if (this.selectedTab === 'grading') {
      this.gradingComp?.filter(this.searchQuery);
    }
  }

  private loadUpcomingTasks(): void {
    const teacherId = '61eb987b-d7ea-487d-b42d-9f9e4951af05';
    this.http.get<Task[]>(`http://localhost:8080/api/tasks/by-teacher/${teacherId}`)
      .subscribe({
        next: (tasks: Task[]) => {
          const count = this.countTasksDueNext7Days(tasks);
          this.stats[3].value = count.toString();
          this.stats[3].description = `${count} due in next 7 days`;
        },
        error: (err) => {
          console.error('Error fetching tasks:', err);
        }
      });
  }

  private countTasksDueNext7Days(tasks: Task[]): number {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return tasks.filter(task => {
      const deadline = new Date(task.deadline);
      return deadline >= today && deadline <= nextWeek;
    }).length;
  }
}
