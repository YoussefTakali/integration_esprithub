import { Component, Input, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-assignmentcard',
  templateUrl: './assignmentcard.component.html',
  styleUrls: ['./assignmentcard.component.css']
})
export class AssignmentcardComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() dueDate: string = '';
  @Input() courseCode: string = '';
  @Input() submissionRate: number = 0;
  @Input() aiAssisted: boolean = false;
  @Input() sidebarVisible!: boolean;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sidebarVisible']) {
      console.log('Sidebar visibility in AssignmentcardComponent:', this.sidebarVisible);
    }
  }
}
