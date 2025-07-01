import { Component, OnInit } from '@angular/core';
import { UsersService } from '../users.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.css']
})
export class AddUserComponent {
 rolesForAdd: string[] = [];

  // ✅ Initialisation de l'utilisateur à ajouter
  user = {
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    password :'',
  };

  constructor(private clientService: UsersService ,private router : Router) { }
  ngOnInit(): void {

    this.clientService.getcustom().subscribe({
      next: (data) => {
        this.rolesForAdd = data;
      },
      error: (error) => {
        console.error('Error fetching roles:', error);
      }
    });
  }

  // ✅ Envoi du formulaire
  onSubmit(form: NgForm): void {
    if (form.valid) {
      this.clientService.addUser(this.user).subscribe({
        next: (data) => {
          console.log('Utilisateur ajouté :', data);
          alert('Utilisateur ajouté avec succès');
          form.resetForm(); // Réinitialise le formulaire
           // ✅ Recharger la page /users
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/users']);
          });
        },
        error: (err) => {
          console.error('Erreur lors de l’ajout :', err);
          alert('Erreur lors de l’ajout de l’utilisateur');
        }
      });
    } else {
      console.log('Formulaire invalide.');
      alert('Veuillez remplir tous les champs requis.');
    }
  }
}
