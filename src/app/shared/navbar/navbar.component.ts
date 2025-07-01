import { Component, EventEmitter, Output } from '@angular/core';

import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(private keycloakService: KeycloakService) {}


  isSidebarVisible = false;

  @Output() sidebarToggled = new EventEmitter<boolean>();

  onHamburgerClick(event: Event) {
    // Stop event propagation to prevent multiple triggers
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle the state
    this.isSidebarVisible = !this.isSidebarVisible;
    
    console.log('NavbarComponent: Emitting toggle request', this.isSidebarVisible);
    this.sidebarToggled.emit(this.isSidebarVisible);
  }
  logout(): void {
    this.keycloakService.logout(window.location.origin);
  }
  editProfile(): void {
    const keycloakAccountUrl = this.keycloakService.getKeycloakInstance().createAccountUrl();
    window.location.href = keycloakAccountUrl;
  }

}
  
