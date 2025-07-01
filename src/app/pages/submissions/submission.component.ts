import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

export interface Submission {
  id: number;
  studentId: string | null;
  taskId: number;
  description?: string | null;
  groupId?: number | null;
  content?: string;
  submittedAt: string;
  status?: string | null;
}

@Component({
  selector: 'app-submissions',
  templateUrl: './submission.component.html',
  styleUrls: ['./submission.component.css']
})
export class SubmissionComponent implements OnInit {
  submissions: Submission[] = [];
  filteredSubmissions: Submission[] = [];
  taskId?: number;
  
  // Search and filter properties
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedGroupId: string = '';
  sortBy: string = 'submittedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Available filter options
  statusOptions: string[] = [];
  groupOptions: number[] = [];
  
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  trackBySubmissionId(index: number, submission: Submission): number {
    return submission.id;
  }

ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
    this.taskId = params['taskId'];
    if (this.taskId) {
      this.fetchSubmissionsByTask(this.taskId);
    } else {
      this.fetchAllSubmissions();
    }
  });
}
fetchSubmissionsByTask(taskId: number) {
  this.isLoading = true;
  this.http.get<Submission[]>(`http://localhost:8080/api/submissions/task/${taskId}`).subscribe({
    next: (data) => {
      this.submissions = data;
      this.filteredSubmissions = [...data];
      this.extractFilterOptions();
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error fetching submissions', err);
      this.isLoading = false;
    }
  });
}

 
  fetchAllSubmissions() {
  this.isLoading = true;
  this.http.get<Submission[]>(`http://localhost:8080/api/submissions`).subscribe({
    next: (data) => {
      this.submissions = data;
      this.filteredSubmissions = [...data];
      this.extractFilterOptions();
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error fetching all submissions', err);
      this.isLoading = false;
    }
  });
}

  extractFilterOptions() {
    // Extract unique status values
    this.statusOptions = [...new Set(this.submissions
      .map(s => s.status)
      .filter(status => status !== null && status !== undefined))] as string[];
    
    // Extract unique group IDs
    this.groupOptions = [...new Set(this.submissions
      .map(s => s.groupId)
      .filter(groupId => groupId !== null && groupId !== undefined))] as number[];
  }

  onSearchChange() {
    this.applyFilters();
  }

  onStatusFilterChange() {
    this.applyFilters();
  }

  onGroupFilterChange() {
    this.applyFilters();
  }

  onSortChange() {
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.submissions];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(submission => 
        (submission.studentId && submission.studentId.toLowerCase().includes(searchLower)) ||
        (submission.content && submission.content.toLowerCase().includes(searchLower)) ||
        (submission.description && submission.description.toLowerCase().includes(searchLower)) ||
        submission.id.toString().includes(searchLower)
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(submission => submission.status === this.selectedStatus);
    }

    // Apply group filter
    if (this.selectedGroupId) {
      filtered = filtered.filter(submission => 
        submission.groupId?.toString() === this.selectedGroupId
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'submittedAt':
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
        case 'studentId':
          aValue = a.studentId || '';
          bValue = b.studentId || '';
          break;
        case 'groupId':
          aValue = a.groupId || 0;
          bValue = b.groupId || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredSubmissions = filtered;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedGroupId = '';
    this.sortBy = 'submittedAt';
    this.sortOrder = 'desc';
    this.filteredSubmissions = [...this.submissions];
  }

  getStatusBadgeClass(status: string | null | undefined): string {
    if (!status) return 'status-badge status-unknown';
    
    switch (status.toLowerCase()) {
      case 'submitted': return 'status-badge status-submitted';
      case 'graded': return 'status-badge status-graded';
      case 'pending': return 'status-badge status-pending';
      case 'late': return 'status-badge status-late';
      default: return 'status-badge status-default';
    }
  }
}