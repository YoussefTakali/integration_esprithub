import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TaskdataService } from 'src/app/services/taskdata.service';
import { Task, Group, Project } from 'src/app/Models/Task';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  memberId = '700';  // the student id
  projects: Project[] = [];
  tasks: Task[] = [];
  filteredTasks: Task[] = []; // tasks filtered by selected project

  loadingProjects = false;
  loadingTasks = false;
  errorProjects: string | null = null;
  errorTasks: string | null = null;

  selectedProject: Project | null = null;

  // UI State
  submittingTaskIds = new Set<number>();
  taskFilter = '';

  // For toast messages
  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient,private router:Router,private taskDataService:TaskdataService) {}

  ngOnInit(): void {
    this.fetchProjects();
    this.fetchTasksForMember();
  }

  // Submit a task
submitTask(task: Task): void {
this.taskDataService.setTask(task);
this.router.navigate(['/submit', task.id]);
}

  isSubmittingTask(taskId: number): boolean {
    return this.submittingTaskIds.has(taskId);
  }

  getProjectStatus(project: Project): string {
    // Example: Return 'Active', 'Completed', or 'Overdue' based on project dueDate and tasks
    if (!project) return '';
    const tasks = this.tasks.filter(t => t.projectId === project.id);
    const now = new Date();
    const dueDates = tasks.map(t => new Date(t.dueDate));
    const projectDueDate = dueDates.length ? new Date(Math.max(...dueDates.map(d => d.getTime()))) : null;

    if (!tasks.length) return 'No Tasks';

    const allGraded = tasks.every(t => t.status === 'GRADED');
    if (allGraded) return 'Completed';

    if (projectDueDate && projectDueDate < now) return 'Overdue';

    return 'Active';
  }

  getProjectStatusClass(project: Project): string {
    const status = this.getProjectStatus(project);
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'Overdue': return 'status-overdue';
      case 'Active': return 'status-active';
      case 'No Tasks': return 'status-no-tasks';
      default: return '';
    }
  }

  getProjectTaskCount(project: Project): number {
    return this.tasks.filter(t => t.projectId === project.id).length;
  }

  getProjectProgress(project: Project): number {
    const tasks = this.tasks.filter(t => t.projectId === project.id);
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter(t => t.status === 'GRADED').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }

  trackByProjectId(index: number, project: Project): number {
    return project.id;
  }

  trackByTaskId(index: number, task: Task): number {
    return task.id;
  }

  getScopeBadgeClass(scope: string): string {
    switch (scope) {
      case 'INDIVIDUAL': return 'badge-individual';
      case 'GROUP': return 'badge-group';
      case 'CLASS': return 'badge-class';
      default: return '';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-pending';
      case 'SUBMITTED': return 'badge-submitted';
      case 'GRADED': return 'badge-graded';
      default: return '';
    }
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    const now = new Date();
    return due < now && task.status !== 'GRADED';
  }

  getTaskActionText(status: string): string {
    switch (status) {
      case 'SUBMITTED': return 'Submitted';
      case 'GRADED': return 'Graded';
      default: return '';
    }
  }

  refreshProjects(): void {
    this.fetchProjects();
  }

  refreshTasks(): void {
    if (this.selectedProject) {
      this.fetchTasksForMember();
    }
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
  }

  clearErrorMessage(): void {
    this.errorMessage = '';
  }

  createProject(): void {
    // Placeholder for actual creation logic, e.g. open a modal
    alert('Create project feature is not implemented yet.');
  }

  viewTaskDetails(task: Task): void {
    // Placeholder for task details viewing, e.g. navigate or open a modal
    alert(`Viewing details for task: ${task.title}`);
  }

  applyTaskFilter(): void {
    if (!this.selectedProject) {
      this.filteredTasks = [];
      return;
    }
    if (!this.taskFilter) {
      this.filteredTasks = this.tasks.filter(t => t.projectId === this.selectedProject!.id);
    } else {
      this.filteredTasks = this.tasks.filter(
        t => t.projectId === this.selectedProject!.id && t.status === this.taskFilter
      );
    }
  }

  fetchProjects(): void {
    this.loadingProjects = true;
    this.errorProjects = null;

    const apiUrl = `http://localhost:8080/api/projects/by-member/${this.memberId}`;
    this.http.get<Project[]>(apiUrl).subscribe({
      next: (data) => {
        this.projects = data;
        this.loadingProjects = false;
      },
      error: (err) => {
        this.errorProjects = 'Failed to load projects';
        this.loadingProjects = false;
        console.error(err);
      }
    });
  }

  fetchTasksForMember(): void {
    this.loadingTasks = true;
    this.errorTasks = null;

    const apiUrl = `http://localhost:8080/api/tasks/member/${this.memberId}/visible`;
    this.http.get<Task[]>(apiUrl).subscribe({
      next: (data) => {
        console.log(data);
        this.tasks = data;
        this.loadingTasks = false;
        this.applyTaskFilter(); 
        console.log("tasks after filtering",this.tasks); // apply filter after tasks loaded
      },
      error: (err) => {
        this.errorTasks = 'Failed to load tasks';
        this.loadingTasks = false;
        console.error(err);
      }
    });
  }
getTotalTasks(): number {
    return this.tasks.length;
  }
  selectProject(project: Project): void {
    this.selectedProject = project;
    this.applyTaskFilter();
    console.log('Selected project:', this.selectedProject);
  }
}
