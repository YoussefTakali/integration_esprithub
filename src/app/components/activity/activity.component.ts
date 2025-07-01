import { Component, Input, SimpleChanges } from '@angular/core';
import { SidebarService } from 'src/app/services/sidebar.service';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.css']
})
export class ActivityComponent {
  sidebarVisible: boolean = false;

  @Input() groupTitle: string = '';
  @Input() assignments: any[] = [
    {
      title: 'Machine Learning Basics',
      description: 'Implement a simple neural network for digit recognition',
      submissionRate: 0,
      courseCode: 'Mathematics 201',
      dueDate: 'June 28, 2025',
      aiAssisted: false
    },
    {
      title: 'Linear Regression',
      description: 'Predict housing prices based on feature inputs',
      submissionRate: 0,
      courseCode: 'Computer Science 101',
      dueDate: 'June 10, 2025',
      aiAssisted: false
    },
    {
      title: 'Data Visualization',
      description: 'Build interactive plots using D3.js',
      submissionRate: 0,
      courseCode: 'Computer Science 101',
      dueDate: 'June 19, 2025',
      aiAssisted: false
    }
  ]; 
    constructor(private sidebarService: SidebarService) {}
    ngOnInit(): void {
      this.sidebarService.sidebarVisible$.subscribe((visible) => {
        this.sidebarVisible = visible;
        console.log('activity: Sidebar visibility updated to', visible);
      });
    }
}
