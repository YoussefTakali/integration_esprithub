import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnChanges, OnInit {
  @Input() isSidebarVisible: boolean = false;

  userRole: string | null = null;
  userId: string | null = null;
  showLevels: boolean = false;
  showClasses: boolean = false;

  constructor(public router: Router) {}

  ngOnInit(): void {
    localStorage.setItem('role', 'teacher'); // Example role, replace with actual logic
    // Fetch userRole and userId from localStorage on component initialization
    this.userRole = localStorage.getItem('role');
    this.userId = localStorage.getItem('id');

    console.log('User Role:', this.userRole);
    console.log('User ID:', this.userId);

    // Subscribe to router events to update sidebar visibility
    this.router.events.subscribe(() => {
      this.updateSidebarState();
    });
    
    // Initial state update
    this.updateSidebarState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isSidebarVisible']) {
      console.log('Sidebar visibility changed:', this.isSidebarVisible);
    }
  }

  updateSidebarState(): void {
    const url = this.router.url;
    
    // Show levels if we're in a specialty context
    this.showLevels = url.includes('/specialties/') || url.includes('/levels');
    
    // Show classes if we're in a level context
    this.showClasses = url.includes('/levels/') || url.includes('/classes') || url.includes('/students');
  }

  isRootPath(): boolean {
    return this.router.url === '/' || this.router.url === '/specialties';
  }

  navigateToSpecialties(): void {
    this.router.navigate(['/specialties']);
  }

  navigateToLevels(): void {
    // Extract specialty ID from current URL if available
    const url = this.router.url;
    const specialtyMatch = url.match(/\/specialties\/(\d+)/);
    if (specialtyMatch) {
      const specialtyId = specialtyMatch[1];
      this.router.navigate(['/levels', specialtyId]);
    } else {
      // If no specialty ID found, navigate to specialties first
      this.router.navigate(['/specialties']);
    }
  }

  navigateToClasses(): void {
    // Extract specialty and level IDs from current URL if available
    const url = this.router.url;
    const levelMatch = url.match(/\/levels\/(\d+)\/(\d+)/);
    if (levelMatch) {
      const specialtyId = levelMatch[1];
      const levelId = levelMatch[2];
      this.router.navigate(['/classes', specialtyId, levelId]);
    } else {
      // If no level ID found, navigate back to levels
      const specialtyMatch = url.match(/\/specialties\/(\d+)|\/levels\/(\d+)/);
      if (specialtyMatch) {
        const specialtyId = specialtyMatch[1] || specialtyMatch[2];
        this.router.navigate(['/levels', specialtyId]);
      } else {
        this.router.navigate(['/specialties']);
      }
    }
  }
}
