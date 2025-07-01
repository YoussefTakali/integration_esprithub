import { Component, type OnInit } from "@angular/core"
import { trigger, style, transition, animate } from "@angular/animations"
import { ProjectserviceService } from "src/app/services/projectservice.service"
import { ActivatedRoute, Router } from "@angular/router"
import { MatSnackBar } from "@angular/material/snack-bar"

@Component({
  selector: "app-project-details",
  templateUrl: "./project-details.component.html",
  styleUrls: ["./project-details.component.css"],
  animations: [
    trigger("expandCollapse", [
      transition(":enter", [
        style({ height: "0", opacity: 0 }),
        animate("200ms ease-out", style({ height: "*", opacity: 1 })),
      ]),
      transition(":leave", [
        style({ height: "*", opacity: 1 }),
        animate("200ms ease-in", style({ height: "0", opacity: 0 })),
      ]),
    ]),
  ],
})
export class ProjectDetailsComponent implements OnInit {
  projectId!: number
  projectData: any
showEditProjectModal = false;
onCollaboratorsChange(event: Event) {
  const input = event.target as HTMLInputElement;
  this.editProjectData.collaborators = input.value ? input.value.split(',') : [];
}
allCollaborators = [
  { id: 'c1', name: 'Alice Johnson' },
  { id: 'c2', name: 'Bob Smith' },
  { id: 'c3', name: 'Carol Williams' },
  { id: 'c4', name: 'David Brown' },
  { id: 'c5', name: 'Eva Green' },
];
onCollaboratorCheckboxChange(event: Event, collaboratorId: string) {
  const checked = (event.target as HTMLInputElement).checked;

  if (checked) {
    if (!this.editProjectData.collaborators.includes(collaboratorId)) {
      this.editProjectData.collaborators.push(collaboratorId);
    }
  } else {
    this.editProjectData.collaborators = this.editProjectData.collaborators.filter(id => id !== collaboratorId);
  }
}

editProjectData: {
  name: string;
  description: string;
  dueDate: string;
  associatedClasses: any[];
  collaborators: string[];
} = {
  name: '',
  description: '',
  dueDate: '',
  associatedClasses: [],
  collaborators: [],
};
  expandedClasses: Set<number> = new Set()
  expandedGroups: Set<number> = new Set()
editProject() {
  if (!this.projectData) return;

  this.editProjectData = {
    name: this.projectData.name || '',
    description: this.projectData.description || '',
    dueDate: this.projectData.dueDate?.split('T')[0] || '', // input[type="date"]
    associatedClasses: [...(this.projectData.classes || [])],
    collaborators: this.projectData.collaborators?.map((c: any) => c.id) || [],
  };

  this.showEditProjectModal = true;
}
submitProjectEdit() {
  const updatedProject = {
    name: this.editProjectData.name,
    description: this.editProjectData.description,
    dueDate: new Date(this.editProjectData.dueDate).toISOString(),
    associatedClasses: this.editProjectData.associatedClasses.map(cls => ({
      id: cls.id,
      name: cls.name
    })),
    collaborators: this.editProjectData.collaborators
  };

  this.projectService.updateProject(this.projectId, updatedProject).subscribe({
    next: (updated) => {
      console.log("Project updated:", updated);
      this.projectData = updated;
      this.showEditProjectModal = false;
      this.showMessage("Project updated successfully");
    },
    error: (err) => {
      console.error("Error updating project:", err);
    }
  });
}
     getDaysRemaining(): number {
      return 14;
     }
     getTotalMembers(): number {
      return 0;
     }
     getCompletionPercentage(): number {
      return 0; // Example percentage
     }
     getProgressClass(xx :number): string {
      const percentage = this.getCompletionPercentage();
      if (percentage >= 75) { return "progress-high"; }
      if (percentage >= 50) { return "progress-medium"; }
      return "progress-low";
    }
deleteProject() {
  if (!this.projectData?.id) {
    console.error('No project ID to delete');
    return;
  }

  this.projectService.deleteProject(this.projectData.id).subscribe({
    next: () => {
      console.log('Project deleted successfully');
      this.router.navigate(['/projects']);
      this.showMessage("Project deleted successfully");

    },
    error: (err) => {
      console.error('Error deleting project:', err);
    }
  });
}
    removeClass(classId: number) {
      console.log("Remove Class clicked for class", classId)
    }
    getStudentsForClass(classId: number): any[] {
      if (!this.projectData?.classes) return []
      return this.projectData.classes
        .find((c: any) => c.id === classId)
        ?.students || []
    }
    viewClassDetails(classId: number) {
      console.log("View Class Details clicked for class", classId)
    }
    addTeamMember(){}
    removeMember(memberId: string) {    }
    isOverdue(): boolean {
      // Placeholder logic for overdue status
      const dueDate = new Date(this.projectData?.dueDate);
      const today = new Date();
      return dueDate < today;
    }
editClass(classId: number) {
    console.log("Edit Class clicked for class", classId)
  }
  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectserviceService,
    private snackBar: MatSnackBar, // Assuming you want to show messagess
    private router: Router // Assuming you want to navigate after deletion
  ) {}
  showMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,  // popup duration in ms
      horizontalPosition: 'center',  // optional
      verticalPosition: 'bottom',      // optional
    });
  }
  ngOnInit(): void {
    this.showMessage("Loading project details...")
    this.projectId = Number(this.route.snapshot.paramMap.get("id"))
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (data) => {
        this.projectData = data
      },
      error: (error) => {
        console.error("Error fetching project details:", error)
      },
    })
  }

  toggleClass(classId: number) {
    if (this.expandedClasses.has(classId)) {
      this.expandedClasses.delete(classId)
    } else {
      this.expandedClasses.add(classId)
    }
  }

  toggleGroup(groupId: number) {
    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId)
    } else {
      this.expandedGroups.add(groupId)
    }
  }

  // Placeholder: Add class button click handler
  addClass() {
    // You can implement logic later
    console.log("Add Class clicked")
  }

  // Placeholder: Add/edit group button handlers
  addGroup(classId: number) {
    console.log("Add Group clicked for class", classId)
  }

  editGroup(groupId: number) {
    console.log("Edit Group clicked for group", groupId)
  }

  // Placeholder: Assign tasks
  assignTaskToGroup(groupId: number) {
    console.log("Assign task to group", groupId)
  }

  assignTaskToStudent(studentId: number) {
    console.log("Assign task to student", studentId)
  }

  getGroupsForClass(classId: number): any[] {
    if (!this.projectData?.groups) return []
    return this.projectData.groups.filter((group: any) => group.classId === classId)
  }

  getStatusClass(): string {
    if (!this.projectData?.status) return "status-unknown"

    switch (this.projectData.status.toLowerCase()) {
      case "completed":
        return "status-completed"
      case "in progress":
        return "status-in-progress"
      case "pending":
        return "status-pending"
      case "overdue":
        return "status-overdue"
      default:
        return "status-unknown"
    }
  }
   showAddTaskModal = false;
  newTask = {
    title: '',
    description: '',
    dueDate: '',
    groupIdsInput: '',
  };

  // existing constructor and ngOnInit...

  openAddTaskModal() {
    this.showAddTaskModal = true;
    this.newTask = { title: '', description: '', dueDate: '', groupIdsInput: '' };
  }

  closeAddTaskModal() {
    this.showAddTaskModal = false;
  }

  submitAddTask() {
    if (!this.newTask.title || !this.newTask.dueDate) {
      return; // basic validation
    }

    // Parse group IDs input
    let groupIds: number[] = [];
    if (this.newTask.groupIdsInput.trim()) {
      groupIds = this.newTask.groupIdsInput
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    }

    // Prepare payload
    const payload = {
      title: this.newTask.title,
      description: this.newTask.description,
      dueDate: new Date(this.newTask.dueDate).toISOString(),
      createdBy: '61eb987b-d7ea-487d-b42d-9f9e4951af05', // replace with your logged user id or get dynamically
      projectId: this.projectId,
      scope: 'GROUP',  // because you want to assign to groups
      groupIds: groupIds,
    };

    console.log('Create task payload:', payload);

    // Call your service to create the task here
    // Assuming projectService has a method createTask:
    this.projectService.createTask(payload).subscribe({
      next: (task) => {
        console.log('Task created:', task);
        this.closeAddTaskModal();
        // optionally refresh project data or tasks list here
      },
      error: (error) => {
        console.error('Error creating task:', error);
      }
    });
  }
  showDeleteConfirmModal = false;
  openDeleteConfirmModal() {
  this.showDeleteConfirmModal = true;
}

closeDeleteConfirmModal() {
  this.showDeleteConfirmModal = false;
}

confirmDeleteProject() {
  this.deleteProject();
  this.closeDeleteConfirmModal();
}
}
