import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { GroupService } from 'src/app/services/group.service';
import { SubmissionService } from 'src/app/services/submission.service';
import { TaskService } from 'src/app/services/task.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';  
export interface Class {
  id: number;
  name: string;
  projects?: Project[];
  expanded?: boolean;   // add for UI expand toggle
}

export interface TaskAssignment {
  id: number;
  scope: 'GROUP' | 'CLASS' | 'STUDENT' | 'PROJECT';
  projectId?: number;
  groupId?: number;
  classId?: number;
  studentId?: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  dueDate: string;
  createdBy: string;
  status: string;
  createdDate: string;
  assignments: TaskAssignment[];
  assignedTo: string[]; // Now an array
  isVisible: boolean;      // default to true
  isGraded: boolean;        // default to false
}

export interface Project {
  id: number;
  name: string;
  groups?: Group[];
  expanded?: boolean;   // add for UI expand toggle
}

export interface Group {
  id: number;
  name: string;
  memberIds: string[];
  expanded?: boolean;  // add for UI expand toggle
}

export interface GroupWithDetails {
  id: number;
  name: string;
  projectId: number;   // add this
  classId: number;     // add this
  projectName: string;
  className: string;
  memberIds: string[];
}

export interface Student {
  id: number;
  name: string;
}

@Component({
  selector: 'app-classes',
  templateUrl: './classes.component.html',
  styleUrls: ['./classes.component.css']
})
export class ClassesComponent implements OnInit {
  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private router: Router,
    private groupService: GroupService,
    private taskService: TaskService,
    private submissionService: SubmissionService,
      private snackBar: MatSnackBar // Add this

  ) {}
private showSnackbar(message: string, action: string = 'Close', duration: number = 3000) {
  this.snackBar.open(message, action, {
    duration: duration,
    verticalPosition: 'top',
    horizontalPosition: 'right'
  });
}
  classTree: Class[] = [];
  allTasks: Task[] = [];
  filteredTasks: Task[] = [];
  selectedProject?: Project;
  searchTerm: string = '';
  showGroupModal: boolean = false;
  memberInput: string = '';
  newGroup = {
    name: '',
    memberIds: [] as number[]
  };
  selectedProjectForGroup: any = null; // store project + class info
  selectedGroupForMemberUpdate: Group | null = null;
  newMemberId: string = '';
  showAddMemberModal: boolean = false;
  showRemoveConfirmModal = false;
  groupForRemove: Group | null = null;
  memberToRemove: string = '';
  tasks: Task[] = [];

  // New properties for dynamic assignment
  allGroups: GroupWithDetails[] = [];
  availableStudents: Student[] = [
    { id: 101, name: 'John Doe' },
    { id: 102, name: 'Jane Smith' },
    { id: 103, name: 'Mike Johnson' },
    { id: 700, name: 'Sarah Wilson' },
    // Add more students as needed
  ];

  // Task modal properties
  showAddTaskModal = false;
// Update the newTask object in your component
newTask = {
  title: '',
  description: '',
  type: 'group',
  assignedTo: [] as string[], // Now an array
  dueDate: '',
  status: 'pending',
  isVisible: true,      // default to true
  isGraded: false        // default to false
};

  // Dynamic options getter
get availableOptions(): { id: string; name: string }[] {
  let options: { id: number | string; name: string }[] = [];

  switch (this.newTask.type) {
    case 'project':
      options = this.getProjectOptions();
      break;
    case 'class':
      options = this.getClassOptions();
      break;
    case 'group':
      options = this.getGroupOptions();
      break;
    case 'individual':
      options = this.getStudentOptions();
      break;
    default:
      options = [];
  }

  // Convert all ids to string here:
  return options.map(opt => ({
    id: String(opt.id),
    name: opt.name
  }));
}

private getProjectOptions() {
  const projectsMap = new Map<number, { id: number, name: string }>();
  this.classTree.forEach(classe => {
    classe.projects?.forEach(project => {
      if (!projectsMap.has(project.id)) {
        projectsMap.set(project.id, { id: project.id, name: project.name });
      }
    });
  });
  return Array.from(projectsMap.values());
}
  private getClassOptions() {
    return this.classTree.map(classe => ({ id: classe.id, name: classe.name }));
  }

  private getGroupOptions() {
    return this.allGroups.map(group => ({
      id: group.id,
      name: `${group.name} (Project: ${group.projectName}, Class: ${group.className})`
    }));
  }

  private getStudentOptions() {
    return this.availableStudents.map(student => ({ id: student.id, name: student.name }));
  }

  ngOnInit(): void {
    const teacherId = '61eb987b-d7ea-487d-b42d-9f9e4951af05';
    this.fetchGroupStats();
    console.log('Fetching classes for tea'+this.groupStats);
    this.http.get<Class[]>(`http://localhost:8080/api/classes/by-teacher/${teacherId}`).subscribe({
      next: (data) => {
        this.classTree = data;
        // initialize expanded states as false
        this.classTree.forEach(c => c.expanded = false);
        this.classTree.forEach(c => c.projects?.forEach(p => p.expanded = false));
        this.classTree.forEach(c => c.projects?.forEach(p => p.groups?.forEach(g => g.expanded = false)));
      },
      error: (err) => console.error('Error loading class data', err)
    });

this.http.get<Task[]>(`http://localhost:8080/api/tasks/by-teacher/${teacherId}`).subscribe({
  next: (tasks) => {
    this.allTasks = tasks.map(task => ({
      ...task,
      assignedTo: [this.formatAssignments(task)] // Wrap the string in an array
    }));
    this.filteredTasks = [...this.allTasks]; // initially show all
    console.log('Loaded tasks:', this.allTasks);
  },
  error: (err) => console.error('Error loading task data', err)
});

    // Load all groups
    this.http.get<GroupWithDetails[]>('http://localhost:8080/api/groups').subscribe({
      next: (groups) => {
        this.allGroups = groups;
      },
      error: (err) => console.error('Error loading groups', err)
    });
  }

  addToProject(project: Project, classId: number): void {
    this.selectedProjectForGroup = {
      projectId: project.id,
      classId: classId
    };
    this.newGroup = { name: '', memberIds: [] };
    this.showGroupModal = true;
    this.ngOnInit(); // reload class data to ensure latest state
  }

  viewSubmissions(task: Task) {
    const assignment = task.assignments[0]; // You can refine this logic if needed
    this.router.navigate(['/submissions'], {
      queryParams: {
        classId: assignment.classId ?? null,
        projectId: task.projectId,
        groupId: assignment.groupId ?? null,
        taskId: task.id
      }
    });
  }

  toggleClass(classe: Class) {
    classe.expanded = !classe.expanded;
  }

  toggleProject(project: Project) {
    project.expanded = !project.expanded;
  }

  toggleGroup(group: Group) {
    group.expanded = !group.expanded;
  }

  selectProject(project: Project) {
    this.selectedProject = project;
    this.filterByProject(project);
  }

  filterByStudent(studentId: string) {
    this.selectedProject = undefined;
    this.filteredTasks = this.allTasks.filter(task =>
      task.assignments.some(a => a.studentId === studentId)
    );
  }

  filterByGroup(group: Group) {
    this.selectedProject = undefined;
    const studentIds = group.memberIds;
    this.filteredTasks = this.allTasks.filter(task =>
      task.assignments.some(a => a.scope === 'STUDENT' && a.studentId && studentIds.includes(a.studentId))
      || task.assignments.some(a => a.scope === 'GROUP' && a.groupId === group.id)
    );
  }

  filterByProject(project: Project) {
    const groupIds = project.groups?.map(g => g.id) || [];
    const studentIds = project.groups?.flatMap(g => g.memberIds) || [];
    this.filteredTasks = this.allTasks.filter(task =>
      task.assignments.some(a => a.scope === 'PROJECT' && a.projectId === project.id)
      || task.assignments.some(a => a.scope === 'GROUP' && a.groupId && groupIds.includes(a.groupId))
      || task.assignments.some(a => a.scope === 'STUDENT' && a.studentId && studentIds.includes(a.studentId))
    );
  }

  filterByClass(classe: Class) {
    this.selectedProject = undefined;
    const projectIds = classe.projects?.map(p => p.id) || [];
    const groupIds = classe.projects?.flatMap(p => p.groups?.map(g => g.id) || []) || [];
    const studentIds = classe.projects?.flatMap(p => p.groups?.flatMap(g => g.memberIds) || []) || [];
    this.filteredTasks = this.allTasks.filter(task =>
      task.assignments.some(a => a.scope === 'PROJECT' && a.projectId && projectIds.includes(a.projectId))
      || task.assignments.some(a => a.scope === 'GROUP' && a.groupId && groupIds.includes(a.groupId))
      || task.assignments.some(a => a.scope === 'STUDENT' && a.studentId && studentIds.includes(a.studentId))
      || task.assignments.some(a => a.scope === 'CLASS' && a.classId === classe.id)
    );
  }

  editTask(task: Task) { 
    // Implement edit functionality
  }

  addTask() {
    this.showAddTaskModal = true;
  }

  closeModal() {
    this.showAddTaskModal = false;
    this.resetForm();
  }

private resetForm() {
  this.newTask = {
    title: '',
    description: '',
    type: 'group',
    assignedTo: [],
    dueDate: '',
    status: 'pending',
    isVisible: true,
    isGraded: false
  };
}



createTask() {
  if (this.newTask.assignedTo.length === 0) {
    alert('Please select at least one assignment target');
    return;
  }

  const payload: any = {
    title: this.newTask.title,
    description: this.newTask.description,
    dueDate: this.newTask.dueDate + 'T23:59:00',
    createdBy: '61eb987b-d7ea-487d-b42d-9f9e4951af05',
    status: this.newTask.status.toLocaleUpperCase(),
    isVisible: this.newTask.isVisible,
    isGraded: this.newTask.isGraded
  };

  switch (this.newTask.type) {
    case 'individual':
      payload.scope = 'STUDENT';
      payload.studentIds = this.newTask.assignedTo;
      // For individual assignments, we need to include projectId for each student
      const studentGroups = this.newTask.assignedTo.map(studentId => 
        this.allGroups.find(g => g.memberIds.includes(studentId)))
        .filter(g => g !== undefined);
      if (studentGroups.length > 0) {
        payload.projectId = studentGroups[0]!.projectId; // Assuming all students are from same project
      }
      break;

    case 'group':
      payload.scope = 'GROUP';
      payload.groupIds = this.newTask.assignedTo.map(id => parseInt(id));
      const groups = this.newTask.assignedTo.map(id => 
        this.allGroups.find(g => g.id === parseInt(id)));
      if (groups.length > 0 && groups[0]) {
        payload.projectId = groups[0].projectId; // Assuming all groups are from same project
      }
      break;

    case 'project':
      payload.scope = 'PROJECT';
      payload.projectIds = this.newTask.assignedTo.map(id => parseInt(id));
      break;

    case 'class':
      payload.scope = 'CLASS';
      payload.classIds = this.newTask.assignedTo.map(id => parseInt(id));
      // Include first project ID from first class if needed
      const firstClassId = parseInt(this.newTask.assignedTo[0]);
      const selectedClass = this.classTree.find(c => c.id === firstClassId);
      if (selectedClass?.projects?.length) {
        payload.projectId = selectedClass.projects[0].id;
      }
      break;
  }

  console.log('Creating task with payload:', payload);

  this.http.post('http://localhost:8080/api/tasks', payload).subscribe({
    next: (response) => {
      console.log('Task created successfully', response);
      this.closeModal();
      this.resetForm();
      this.ngOnInit();
      this.showSnackbar("Task added successfully!")
    },
    error: (err) => {
      console.error('Error creating task', err);
      alert(`Failed to create task: ${err.message}`);
    }
  });
}

  closeGroupModal(): void {
    this.showGroupModal = false;
  }

updateMemberIds(value: string) {
  this.memberInput = value;
  // Parse comma-separated IDs to number array
  this.newGroup.memberIds = value
    .split(',')
    .map(id => id.trim())
    .filter(id => id !== '')
    .map(id => Number(id))
    .filter(id => !isNaN(id));
}

// When clicking a student name, add their id if not already present
addMemberById(id: number) {
  if (!this.newGroup.memberIds.includes(id)) {
    this.newGroup.memberIds.push(id);
    this.memberInput = this.newGroup.memberIds.join(', ');
  }
}
selectStudentForAdd(student: Student) {
  this.selectedStudent = student;
  this.newMemberId = student.id.toString();
}
selectedStudent: Student | null = null;
  createGroup(): void {
    const payload = {
      name: this.newGroup.name,
      memberIds: this.newGroup.memberIds,
      projectId: this.selectedProjectForGroup.projectId,
      classId: this.selectedProjectForGroup.classId
    };
    this.http.post('http://localhost:8080/api/groups', payload).subscribe({
      next: () => {
        console.log(payload);
        this.closeGroupModal();
        this.ngOnInit(); // Reload data
        this.showSnackbar("Group added successfully!")
      },
      error: err => {
        console.log(payload);
        console.error('Group creation failed', err);
      }
    });
  }

  openAddMemberModal(group: Group): void {
    this.selectedGroupForMemberUpdate = group;
    this.newMemberId = '';
    this.showAddMemberModal = true;
  }

  cancelAddMember(): void {
    this.showAddMemberModal = false;
    this.newMemberId = '';
  }

  submitNewMember(): void {
    if (!this.selectedGroupForMemberUpdate || !this.newMemberId) return;

    const updatedMemberIds = [...this.selectedGroupForMemberUpdate.memberIds, this.newMemberId];

    this.groupService.updateGroupMembers(this.selectedGroupForMemberUpdate.id, updatedMemberIds).subscribe({
      next: () => {
        console.log('Member added successfully to group', this.selectedGroupForMemberUpdate!.id);
        this.selectedGroupForMemberUpdate!.memberIds = updatedMemberIds; // update local UI
        this.cancelAddMember();
        this.showSnackbar("Group updated successfully!")
      },
      error: (err) => {
        console.error('Failed to add member', err);
      }
    });
  }

  removeMember(group: Group, memberId: string): void {
    const confirmed = confirm(`Are you sure you want to remove member ${memberId} from group ${group.name}?`);
    if (!confirmed) return;

    const updatedMemberIds = group.memberIds.filter(id => id !== memberId);

    this.groupService.updateGroupMembers(group.id, updatedMemberIds).subscribe({
      next: () => {
        console.log(`Member ${memberId} removed successfully from group ${group.name}`);
        group.memberIds = updatedMemberIds;  // update local UI
        this.showSnackbar("Member removed successfully from group!")
      },
      error: (err) => {
        console.error('Failed to remove member from group', err);
        alert('Failed to remove member. Please try again.');
      }
    });
  }

confirmRemoveMember(group: Group, memberId: string) {
  const studentName = this.getStudentName(Number(memberId));
  this.showConfirmation(
    'Remove Member',
    `Are you sure you want to remove ${studentName} from group ${group.name}?`,
    () => {
      const updatedMemberIds = group.memberIds.filter(id => id !== memberId);
      this.groupService.updateGroupMembers(group.id, updatedMemberIds).subscribe({
        next: () => {
          group.memberIds = updatedMemberIds;
          this.showSnackbar('Member removed successfully!');
        },
        error: (err) => {
          this.showSnackbar('Failed to remove member. Please try again.');
        }
      });
    }
  );
}

  cancelRemoveMember() {
    this.showRemoveConfirmModal = false;
    this.groupForRemove = null;
    this.memberToRemove = '';
  }

  confirmRemoveMemberAction() {
    if (!this.groupForRemove || !this.memberToRemove) return;

    const updatedMemberIds = this.groupForRemove.memberIds.filter(id => id !== this.memberToRemove);

    this.groupService.updateGroupMembers(this.groupForRemove.id, updatedMemberIds).subscribe({
      next: () => {
        this.groupForRemove!.memberIds = updatedMemberIds;
        this.showRemoveConfirmModal = false;
        this.groupForRemove = null;
        this.memberToRemove = '';
        this.showSnackbar("Member removed successfully from group!");
      },
      error: (err) => {
        console.error('Failed to remove member', err);
        this.showSnackbar("Failed to remove member. Please try again.");
        this.showRemoveConfirmModal = false;
        this.groupForRemove = null;
        this.memberToRemove = '';
      }
    });
  }

  confirmRemoveGroup(group: any): void {
this.showConfirmation(
    'Delete Group',
    `Are you sure you want to delete the group "${group.name}"?`,
    () => this.removeGroup(group)
  );
  }
showConfirmationModal: boolean = false;
confirmationTitle: string = '';
confirmationMessage: string = '';
confirmationAction: () => void = () => {};
// Show confirmation modal
showConfirmation(title: string, message: string, action: () => void) {
  this.confirmationTitle = title;
  this.confirmationMessage = message;
  this.confirmationAction = action;
  this.showConfirmationModal = true;
}

// Cancel confirmation
cancelConfirmation() {
  this.showConfirmationModal = false;
}

// Execute confirmed action
executeConfirmation() {
  this.showConfirmationModal = false;
  this.confirmationAction();
}
  removeGroup(groupToRemove: any): void {
    this.groupService.deleteGroup(groupToRemove.id).subscribe({
      next: () => {
        for (let classe of this.classTree) {
          if (classe.projects) {
            for (let project of classe.projects) {
              if (project.groups) {
                project.groups = project.groups.filter(group => group.id !== groupToRemove.id);
              }
            }
          }
        }
        this.showSnackbar("Group Removed successfully!")
      },
      error: (err) => {
        this.showSnackbar("Failed to Remove group")
        alert('An error occurred while deleting the group.');
      }
    });
  }

deleteTask(task: Task) {
  this.showConfirmation(
    'Delete Task',
    `Are you sure you want to delete the task "${task.title}"?`,
    () => {
      this.taskService.deleteTask(task.id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(t => t.id !== task.id);
          this.filteredTasks = this.filteredTasks.filter(t => t.id !== task.id);
          this.showSnackbar('Task deleted successfully!');
        },
        error: (err) => {
          this.showSnackbar('Failed to delete task. Please try again later.');
        }
      });
    }
  );
}

formatAssignments(task: Task): string {
  if (!task.assignments || task.assignments.length === 0) {
    return 'Not assigned';
  }

  const mainScope = task.assignments[0].scope;

  switch (mainScope) {
    case 'CLASS':
      const classNames = [...new Set(
        task.assignments.map(a => {
          const foundClass = this.classTree.find(c => c.id === a.classId);
          return foundClass?.name || `Class ${a.classId}`;
        })
      )];
      
      if (classNames.length === 1) {
        return `All groups in ${classNames[0]}`;
      }
      if (classNames.length <= 2) {
        return `Classes: ${classNames.join(', ')}`;
      }
      return `Classes: ${classNames.slice(0, 2).join(', ')} +${classNames.length - 2} more`;

    case 'PROJECT':
      const projectNames = [...new Set(
        task.assignments.map(a => {
          for (const classe of this.classTree) {
            const project = classe.projects?.find(p => p.id === a.projectId);
            if (project) return project.name;
          }
          return `Project ${a.projectId}`;
        })
      )];
      
      if (projectNames.length === 1) {
        return `All groups in ${projectNames[0]}`;
      }
      if (projectNames.length <= 2) {
        return `Projects: ${projectNames.join(', ')}`;
      }
      return `Projects: ${projectNames.slice(0, 2).join(', ')} +${projectNames.length - 2} more`;

    case 'GROUP':
      // Create a map of classId to all its groups
      const classGroupsMap = new Map<number, Group[]>();
      this.classTree.forEach(classe => {
        const allGroupsInClass = classe.projects?.flatMap(p => p.groups || []) || [];
        classGroupsMap.set(classe.id, allGroupsInClass);
      });

      // Find which classes are fully covered
      const fullyCoveredClasses: Class[] = [];
      const partialGroups: Group[] = [];

      classGroupsMap.forEach((groups, classId) => {
        if (groups.length === 0) return;

        const allGroupsAssigned = groups.every(group => 
          task.assignments.some(a => a.groupId === group.id)
        );

        if (allGroupsAssigned) {
          const foundClass = this.classTree.find(c => c.id === classId);
          if (foundClass) {
            fullyCoveredClasses.push(foundClass);
          }
        } else {
          // Add groups that are assigned but don't cover the whole class
          groups.forEach(group => {
            if (task.assignments.some(a => a.groupId === group.id)) {
              partialGroups.push(group);
            }
          });
        }
      });

      // Build the display string
      const displayParts: string[] = [];

      if (fullyCoveredClasses.length > 0) {
        const classNames = fullyCoveredClasses.map(c => c.name);
        if (classNames.length <= 2) {
          displayParts.push(`Classes: ${classNames.join(', ')}`);
        } else {
          displayParts.push(`Classes: ${classNames.slice(0, 2).join(', ')} +${classNames.length - 2} more`);
        }
      }

      if (partialGroups.length > 0) {
        const groupNames = partialGroups.map(g => g.name);
        if (groupNames.length <= 2) {
          displayParts.push(`Groups: ${groupNames.join(', ')}`);
        } else {
          displayParts.push(`Groups: ${groupNames.slice(0, 2).join(', ')} +${groupNames.length - 2} more`);
        }
      }

      return displayParts.join('; ') || 'Specific groups';

    case 'STUDENT':
      const studentNames = task.assignments.map(a => {
        const student = this.availableStudents.find(s => s.id === Number(a.studentId));
        return student?.name || `Student ${a.studentId}`;
      });
      
      if (studentNames.length <= 2) {
        return `Students: ${studentNames.join(', ')}`;
      }
      return `Students: ${studentNames.slice(0, 2).join(', ')} +${studentNames.length - 2} more`;

    default:
      return 'Unknown assignment';
  }
}
statusEditTaskId: number | null = null;

startEditingStatus(taskId: number) {
  this.statusEditTaskId = taskId;
}

cancelEditingStatus() {
  this.statusEditTaskId = null;
}

updateTaskStatus(task: Task, event: Event, selectElement: HTMLSelectElement) {
  const newStatus = selectElement.value;

  const payload: any = {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ,
    createdBy: task.createdBy,
    status: newStatus.toUpperCase(),
    isVisible: task.isVisible,
    isGraded: task.isGraded,
    assignments: task.assignments
  };

  if (task.assignments.length > 0) {
    const scope = task.assignments[0].scope;

    switch (scope) {
      case 'STUDENT':
        payload.scope = 'STUDENT';
        payload.studentIds = task.assignments.map(a => a.studentId).filter(Boolean);
        if (task.projectId) payload.projectId = task.projectId;
        break;

      case 'GROUP':
        payload.scope = 'GROUP';
        payload.groupIds = task.assignments.map(a => a.groupId).filter(Boolean);
        if (task.projectId) payload.projectId = task.projectId;
        break;

      case 'PROJECT':
        payload.scope = 'PROJECT';
        payload.projectIds = [task.projectId];
        break;

      case 'CLASS':
        payload.scope = 'CLASS';
        payload.classIds = task.assignments.map(a => a.classId).filter(Boolean);
        if (task.projectId) payload.projectId = task.projectId;
        break;
    }
  }

  this.http.put(`http://localhost:8080/api/tasks/${task.id}`, payload).subscribe({
    next: (res) => {
      console.log('Task status updated', res);
      this.statusEditTaskId = null;  // <-- hide the dropdown, show span
      this.ngOnInit(); // reload updated tasks or refresh view
      this.showSnackbar("Task status updated successfully!")
    },
    error: (err) => {
      console.error('Error updating task status', err);
      alert('Failed to update task status');
    }
  });
}
toggleVisibility(task: Task) {
  const updatedVisibility = !task.isVisible;
  console.log(task.isGraded);
  const payload: any = {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    createdBy: task.createdBy,
    status: task.status,
    isVisible: updatedVisibility,
    isGraded: task.isGraded,
    assignments: task.assignments,
  };
  console.log('Toggling visibility for task:', payload);
  if (task.assignments.length > 0) {
    const scope = task.assignments[0].scope;

    switch (scope) {
      case 'STUDENT':
        payload.scope = 'STUDENT';
        payload.studentIds = task.assignments.map(a => a.studentId).filter(Boolean);
        if (task.projectId) payload.projectId = task.projectId;
        break;

      case 'GROUP':
        payload.scope = 'GROUP';
        payload.groupIds = task.assignments.map(a => a.groupId).filter(Boolean);
        if (task.projectId) payload.projectId = task.projectId;
        break;

      case 'PROJECT':
        payload.scope = 'PROJECT';
        payload.projectIds = [task.projectId];
        break;

      case 'CLASS':
        payload.scope = 'CLASS';
        payload.classIds = task.assignments.map(a => a.classId).filter(Boolean);
        if (task.projectId) payload.projectId = task.projectId;
        break;
    }
  }

  this.http.put(`http://localhost:8080/api/tasks/${task.id}`, payload).subscribe({
    next: () => {
      console.log(`Visibility toggled to ${updatedVisibility} for task ${task.id}`);
      this.ngOnInit();  // reload tasks list from backend
      this.showSnackbar("Task visibility updated successfully!");
    },
    error: (err) => {
      console.error('Failed to toggle task visibility', err);
            this.showSnackbar("Failed to update visibility");

    }
  });
}

editingTask: Task | null = null;

editWholeTask(task: Task) {
  // Clone task to avoid editing original until save
  this.editingTask = { ...task };
}

saveEditedTask() {
  if (!this.editingTask) return;

  // Prepare payload similar to your update function
  const taskToSave = this.editingTask;

  const payload: any = {
    id: taskToSave.id,
    title: taskToSave.title,
    description: taskToSave.description,
    dueDate: taskToSave.dueDate,
    createdBy: taskToSave.createdBy,
    status: taskToSave.status,
    isVisible: taskToSave.isVisible,
    isGraded: taskToSave.isGraded,
    assignments: taskToSave.assignments,
  };

  // Add scope & project ID like you did before
  if (taskToSave.assignments.length > 0) {
    const scope = taskToSave.assignments[0].scope;
    switch (scope) {
      case 'STUDENT':
        payload.scope = 'STUDENT';
        payload.studentIds = taskToSave.assignments.map(a => a.studentId).filter(Boolean);
        if (taskToSave.projectId) payload.projectId = taskToSave.projectId;
        break;
      case 'GROUP':
        payload.scope = 'GROUP';
        payload.groupIds = taskToSave.assignments.map(a => a.groupId).filter(Boolean);
        if (taskToSave.projectId) payload.projectId = taskToSave.projectId;
        break;
      case 'PROJECT':
        payload.scope = 'PROJECT';
        payload.projectIds = [taskToSave.projectId];
        break;
      case 'CLASS':
        payload.scope = 'CLASS';
        payload.classIds = taskToSave.assignments.map(a => a.classId).filter(Boolean);
        if (taskToSave.projectId) payload.projectId = taskToSave.projectId;
        break;
    }
  }

  this.http.put(`http://localhost:8080/api/tasks/${taskToSave.id}`, payload).subscribe({
    next: () => {
      this.editingTask = null;
      this.ngOnInit(); // reload tasks list
      this.showSnackbar("Task  updated successfully!");

    },
    error: (err) => {
      console.error('Error updating task', err);
      this.showSnackbar("Failed to update task");

    }
  });
}

cancelEdit() {
  this.editingTask = null;
}

closeEditModal(event: MouseEvent) {
  // Close modal if clicked outside modal content
  this.cancelEdit();
}
groupStats: any[] = [];
fetchGroupStats(): void {
  this.submissionService.getGroupsStats().subscribe({
    next: (stats) => {
      console.log('Fetched group stats:', stats);
      this.groupStats = stats;
      // You can add more logic here to use the stats as needed
    },
    error: (err) => {
      console.error('Error fetching group stats', err);
    }
  });
}
hoveredGroup: Group | null = null;
tooltipX = 0;
tooltipY = 0;

// Add these to your component class
onGroupMouseEnter(group: Group, event: MouseEvent) {
  this.hoveredGroup = group;
  this.tooltipX = event.clientX + 10;
  this.tooltipY = event.clientY + 10;
}

onGroupMouseLeave() {
  this.hoveredGroup = null;
}

getGroupStats(groupId: number): any {
  return this.groupStats.find(stat => stat.groupId === groupId);
}
// Add these properties
studentSearchTerm: string = '';
filteredStudents: Student[] = [];
selectedStudents: Student[] = [];

// Initialize in ngOnInit

// Add these methods
filterStudents(): void {
  if (!this.studentSearchTerm) {
    this.filteredStudents = [...this.availableStudents];
    return;
  }
  
  const term = this.studentSearchTerm.toLowerCase();
  this.filteredStudents = this.availableStudents.filter(student => 
    student.name.toLowerCase().includes(term) 
  );
}

toggleStudentSelection(studentId: number): void {
  if (this.newGroup.memberIds.includes(Number(studentId))) {
    this.newGroup.memberIds = this.newGroup.memberIds.filter(id => id !== Number(studentId));
  } else {
    this.newGroup.memberIds = [...this.newGroup.memberIds, Number(studentId)];
  }
}

removeSelectedMember(studentId: number): void {
  this.newGroup.memberIds = this.newGroup.memberIds.filter(id => id !== Number(studentId));
}
StringToNumber(s :string){
  const num = Number(s);
  return isNaN(num) ? 0 : num;
}
getStudentName(studentId: number): string {
  const student = this.availableStudents.find(s => s.id === Number(studentId));
  return student ? student.name : `Student ${studentId}`;
}
}