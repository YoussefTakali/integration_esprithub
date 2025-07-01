import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SubmissionService } from 'src/app/services/submission.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-submission-details',
  templateUrl: './submission-details.component.html',
  styleUrls: ['./submission-details.component.css']
})
export class SubmissionDetailsComponent {
  submission: any;
  isLoading = true;
  gradeForm!: FormGroup;
  successMessage = '';
aiSuggestedGrade = '17';  // or dynamically calculated
aiSuggestionExplanation = 'Based on content clarity and completeness.';

  constructor(
    private route: ActivatedRoute,
    private submissionService: SubmissionService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    const submissionId = Number(this.route.snapshot.paramMap.get('id'));
    this.submissionService.getSubmissionById(submissionId!).subscribe(data => {
      this.submission = data;
      this.isLoading = false;
      this.gradeForm = this.fb.group({
        grade: [this.submission.grade || '']
      });
    });
  }

  onSubmitGrade() {
    const grade = this.gradeForm.value.grade;
    this.submissionService.updateGrade(this.submission.id, grade).subscribe(() => {
      this.successMessage = 'Grade submitted successfully!';
      this.submission.grade = grade;
    });
  }
}
