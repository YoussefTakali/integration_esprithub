import { Component, OnInit } from '@angular/core';
import { ProjectserviceService } from 'src/app/services/projectservice.service';
import { ClassService } from 'src/app/services/class.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {

  projects: any[] = [];
  filteredProjects: any[] = [];
  errorMessage: string = '';

  searchTerm: string = '';
  statusFilter: string = '';

  showAddModal = false;

  newProject = {
    name: '',
    description: '',
    dueDate: '',
    dueTime: '',
    status: 'ACTIVE',
    associatedClasses: [] as any[] // Changed to array for multiple classes
  };

  classOptions: any[] = [];
  selectedClasses: any[] = []; // For form selection

  constructor(
    private projectService: ProjectserviceService,
    private classService: ClassService,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchProjects();
    this.loadClasses();
  }

  getProgressClass(progress: number): string {
    if (progress < 50) return 'progress-low';
    if (progress < 80) return 'progress-medium';
    return 'progress-high';
  }

  fetchProjects() {
    this.projectService.getProjectsByTeacher().subscribe({
      next: (backendProjects) => {
        this.projects = backendProjects.map((proj: any) => ({
          id: proj.id,
          title: proj.name,
          subtitle: this.formatClassNames(proj.associatedClasses), // Updated to handle multiple classes
          date: new Date(proj.createdDate).toLocaleDateString(),
          progress: 50,
          remainingDays: this.getRemainingDays(proj.dueDate),
          users: [
            'https://i.pravatar.cc/30?img=1',
            'https://i.pravatar.cc/30?img=2'
          ],
          associatedClasses: proj.associatedClasses // Keep the classes data
        }));
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error fetching projects', err);
        this.errorMessage = 'Failed to load projects.';
      }
    });
  }

  // Helper to format multiple class names
  formatClassNames(classes: any[]): string {
    if (!classes || classes.length === 0) return 'No classes';
    return classes.map(c => c.name).join(', ');
  }

  loadClasses() {
    const teacherId = localStorage.getItem('id') || '';
    if (!teacherId) return;
    this.classService.getClassesByTeacher().subscribe({
      next: (classes) => {
        this.classOptions = classes;
      },
      error: (err) => {
        console.error('Error fetching classes', err);
      }
    });
  }

  applyFilters() {
    this.filteredProjects = this.projects.filter(project => {
      const matchesTitle = project.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesClass = project.subtitle.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter ? project.status === this.statusFilter : true;
      return (matchesTitle || matchesClass) && matchesStatus;
    });
  }

  openAddProjectModal() {
    this.showAddModal = true;
    this.selectedClasses = []; // Reset selected classes when opening modal
  }

  closeAddProjectModal() {
    this.showAddModal = false;
    this.resetNewProject();
  }

  resetNewProject() {
    this.newProject = {
      name: '',
      description: '',
      dueDate: '',
      dueTime: '',
      status: 'ACTIVE',
      associatedClasses: []
    };
    this.selectedClasses = [];
  }

  getRemainingDays(targetDate: string): number {
    const now = new Date();
    const target = new Date(targetDate);
    const diffInMs = target.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffInDays);
  }

  combineDateAndTime(date: string, time: string): string {
    return `${date}T${time}:00`;
  }

  // Handle class selection changes
  onClassSelectionChange(event: any, classItem: any) {
    if (event.target.checked) {
      this.selectedClasses.push(classItem.id);
    } else {
      this.selectedClasses = this.selectedClasses.filter(id => id !== classItem.id);
    }
  }

submitNewProject() {
  const createdById = localStorage.getItem('id') || '';
  const combinedDateTime = this.combineDateAndTime(this.newProject.dueDate, this.newProject.dueTime);

  const projectPayload = {
    name: this.newProject.name,
    description: this.newProject.description,
    createdDate: new Date().toISOString(),
    dueDate: combinedDateTime,
    status: this.newProject.status,
    createdBy: createdById,
    associatedClasses: this.selectedClasses.map(id => ({ id }))
  };

  this.projectService.createProject(projectPayload).subscribe({
    next: (response) => {
      console.log('Project created:', response);
      this.closeAddProjectModal();  // closes modal & resets form
      this.fetchProjects();          // reload projects list with new project
    },
    error: (error) => {
      console.error('Create project error:', error);
    }
  });
}

  goToProjectDetails(projectId: string) {
    this.router.navigate(['/project-details', projectId]);
  }
}