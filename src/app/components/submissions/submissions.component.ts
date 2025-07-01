import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SidebarService } from 'src/app/services/sidebar.service';
import { SubmissionService, Submission } from 'src/app/services/submission.service';

@Component({
  selector: 'app-submissions',
  templateUrl: './submissions.component.html',
  styleUrls: ['./submissions.component.css']
})
export class SubmissionsComponent implements OnInit, OnDestroy {
  sidebarVisible: boolean = false;
  private sidebarSub!: Subscription;
  private submissionSub!: Subscription;

  submissions: Submission[] = [];

  // example teacherId (you might get this from route params or auth service)
  teacherId = '61eb987b-d7ea-487d-b42d-9f9e4951af05';

  constructor(
    private sidebarService: SidebarService,
    private submissionService: SubmissionService
  ) {}

ngOnInit(): void {
  this.sidebarSub = this.sidebarService.sidebarVisible$.subscribe((visible: boolean) => {
    this.sidebarVisible = visible;
    console.log('Sidebar visibility in SubmissionsComponent:', this.sidebarVisible);
  });

  this.submissionSub = this.submissionService.getSubmissionsByTeacher(this.teacherId).subscribe({
    next: (data) => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      this.submissions = data.filter(submission => {
        const submittedAt = new Date(submission.submittedAt);
        return submittedAt >= oneWeekAgo;
      });

      console.log('Submissions from last week:', this.submissions);
    },
    error: (error) => {
      console.error('Failed to load submissions', error);
    }
  });
}

  ngOnDestroy(): void {
    if (this.sidebarSub) this.sidebarSub.unsubscribe();
    if (this.submissionSub) this.submissionSub.unsubscribe();
  }
}
