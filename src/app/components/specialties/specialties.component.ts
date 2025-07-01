import { Component,  OnInit, Input } from "@angular/core"
import { ApiService } from "../services/api.service.service"
import  { Specialty } from "../models/specialty"

@Component({
  selector: "app-specialties",
  templateUrl: "./specialties.component.html",
  styleUrls: ["./specialties.component.css"],
})
export class SpecialtiesComponent implements OnInit {
  specialties: Specialty[] = []
  isEditing = false
  editingSpecialty: Specialty | null = null
  showAddModal = false
  newSpecialty: {
    nom: string
    specialites: string
    typeFormation: string
  } = {
    nom: "",
    specialites: "",
    typeFormation: "",
  }

  @Input() sidebarOpen = false
  @Input() sidebarCollapsed = false

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadSpecialties()
  }

  loadSpecialties(): void {
    this.apiService.getSpecialties().subscribe({
      next: (data) => {
        this.specialties = data
      },
      error: (error) => {
        console.error("Error loading specialties:", error)
      },
    })
  }

  openAddModal(): void {
    this.resetNewSpecialty()
    this.showAddModal = true
  }

  closeAddModal(): void {
    this.showAddModal = false
    this.resetNewSpecialty()
  }

  startEdit(specialty: Specialty): void {
    this.isEditing = true
    this.editingSpecialty = {
      id: specialty.id,
      nom: specialty.nom,
      specialites: specialty.specialites,
      typeFormation: specialty.typeFormation,
    }
  }

  cancelEdit(): void {
    this.isEditing = false
    this.editingSpecialty = null
  }

  saveEdit(): void {
    if (this.editingSpecialty && this.editingSpecialty.id !== undefined) {
      this.apiService
        .updateSpecialty(this.editingSpecialty.id, {
          nom: this.editingSpecialty.nom,
          specialites: this.editingSpecialty.specialites,
          typeFormation: this.editingSpecialty.typeFormation,
        })
        .subscribe({
          next: () => {
            this.loadSpecialties()
            this.cancelEdit()
          },
          error: (error) => {
            console.error("Error updating specialty:", error)
          },
        })
    }
  }

  deleteSpecialty(id: number): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette spécialité ?")) {
      this.apiService.deleteSpecialty(id).subscribe({
        next: () => {
          this.loadSpecialties()
        },
        error: (error) => {
          console.error("Error deleting specialty:", error)
        },
      })
    }
  }

  addSpecialty(): void {
    if (this.newSpecialty.nom &&  this.newSpecialty.typeFormation) {
      this.apiService
        .createSpecialty({
          nom: this.newSpecialty.nom,
          specialites: this.newSpecialty.specialites,
          typeFormation: this.newSpecialty.typeFormation,
        })
        .subscribe({
          next: () => {
            this.loadSpecialties()
            this.closeAddModal()
          },
          error: (error) => {
            console.error("Error creating specialty:", error)
          },
        })
    }
  }

  resetNewSpecialty(): void {
    this.newSpecialty = {
      nom: "",
      specialites: "",
      typeFormation: "",
    }
  }

  // Helper methods for template null safety
  get editingNom(): string {
    return this.editingSpecialty?.nom || ""
  }

  set editingNom(value: string) {
    if (this.editingSpecialty) {
      this.editingSpecialty.nom = value
    }
  }

  get editingSpecialites(): string {
    return this.editingSpecialty?.specialites || ""
  }

  set editingSpecialites(value: string) {
    if (this.editingSpecialty) {
      this.editingSpecialty.specialites = value
    }
  }

  get editingTypeFormation(): string {
    return this.editingSpecialty?.typeFormation || ""
  }

  set editingTypeFormation(value: string) {
    if (this.editingSpecialty) {
      this.editingSpecialty.typeFormation = value
    }
  }
  typeFormationMap: { [key: string]: string } = {
    ALTERNANT: 'Alternating',
    COURS_DU_JOUR: 'Day Courses',
    COURS_DU_SOIR: 'Evening Courses'
  };
  
}
