import { Component } from '@angular/core';
import { User } from 'src/app/Models/users';
import { UsersService } from '../users.service';

@Component({
  selector: 'app-list-user',
  templateUrl: './list-user.component.html',
  styleUrls: ['./list-user.component.css']
})
export class ListUserComponent {
 users: User [] = [];
  showRoleInputs: boolean = false; // New property to control visibility
  roles: string[] = [];
  rolesForAdd: string[] = [];
selectedUserId: string | null = null;

  selectedRole: string = 'Student';
  showAddUserPopup: boolean = false;
  showAddRole: boolean = false; // New property to control visibility
  RoleToAdd: string = 'Student';
  selectedFile: File | null = null;

  constructor(private clientService: UsersService) { }

  ngOnInit(): void {
    this.clientService.getUsersByRole(this.selectedRole).subscribe({
      next: (data: any[]) => {
        this.users = data;
      },
      error: (error) => {
        console.error('Error fetching users by role:', error);
      }
    });



    this.clientService.getcustom().subscribe({
      next: (data) => {
        this.rolesForAdd = data;
        this.roles.push(...this.rolesForAdd);
        this.roles.push("Without role");
      },
      error: (error) => {
        console.error('Error fetching roles:', error);
      }
    });
  }
  onSearch() {

  }
  toggleRoleInputs(): void {
    this.showRoleInputs = !this.showRoleInputs;
  }
  openAddUserPopup(): void {
    this.showAddUserPopup = true;
  }

  // Ferme le popup
  closeAddUserPopup(): void {
    this.showAddUserPopup = false;
  }


  onRoleChange() {
    console.log('Rôle sélectionné :', this.selectedRole);
    if (this.selectedRole === 'Without role') {
          this.users = [];
      this.clientService.getUsersWithoutRole().subscribe({
        next: (data) => this.users = data,
        error: (err) => console.error('Erreur chargement users sans rôle', err)
      });
    } else {
      this.clientService.getUsersByRole(this.selectedRole).subscribe({
        next: (data) => this.users = data,
        error: (err) => console.error('Erreur chargement users par rôle', err)
      });
    }
  }


  deleteUser(userId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.clientService.deleteUser(userId).subscribe({
        next: () => {
          // Met à jour la liste des utilisateurs après suppression
          this.users = this.users.filter(user => user.keycloakId !== userId);
          console.log('Utilisateur supprimé');
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert("Erreur lors de la suppression de l'utilisateur");
        }
      });
    }
  }
 
addRole(id: string) {
  this.selectedUserId = id;
  this.showAddRole = true;
}

closePopup() {
  this.showAddRole = false;
  this.RoleToAdd = '';
}

submitRole() {
  if (this.selectedUserId && this.RoleToAdd) {
    this.clientService.assignRoleToUser(this.selectedUserId, this.RoleToAdd).subscribe({
      next: (response) => {
        console.log('Statut HTTP:', response.status);
        
        if (response.status === 201) {
          alert('✅ Rôle assigné avec succès.');
        } else {
          alert('⚠️ Réponse inattendue du serveur.');
        }
      },
      error: (err) => {
        console.error('Erreur HTTP:', err);
        const errorMessage = err.error || '❌ Une erreur est survenue lors de l’attribution du rôle.';
        alert(errorMessage);
      }
    });

    this.closePopup();
  } else {
    alert('⚠️ Veuillez sélectionner un rôle avant de soumettre.');
  }
}

downloadExcel() {
    this.clientService.exportEtudiantsExcel().subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'etudiants.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
    onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadExcel() {
    if (!this.selectedFile) return alert('Veuillez sélectionner un fichier Excel');

    this.clientService.importUsersFromExcel(this.selectedFile).subscribe(
      () => alert('Import réussi'),
      err => alert('Erreur lors de l\'import: ' + err.message)
    );
  }

}
