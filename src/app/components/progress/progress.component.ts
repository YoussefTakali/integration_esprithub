import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SidebarService } from 'src/app/services/sidebar.service';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.css']
})
export class ProgressComponent implements OnInit,OnDestroy {
  sidebarVisible: boolean = false;
  private sidebarSub!: Subscription;

  constructor(private sidebarService: SidebarService) {}

  ngOnInit(): void {
    this.sidebarSub = this.sidebarService.sidebarVisible$.subscribe((visible:boolean) => {
      this.sidebarVisible = visible;
      console.log('Sidebar visibility in ProgressComponent:', this.sidebarVisible);
    });
  }

  ngOnDestroy(): void {
    if (this.sidebarSub) {
      this.sidebarSub.unsubscribe();
    }
  }
  classrepo = [
    {
      name: 'cs201-machine-learning',
      description: 'Course materials and assignments for Machine Learning',
      code: 'CS201',
      students: 24,
      forks: 18,
      ai_assited: true
    },
    {
      name: 'cs201-Linear-Regression',
      description: 'Linear Regression assignments and examples',
      code: 'CS201',
      students: 45,
      forks: 36,
      ai_assited: true
    },
    
  ];
}
