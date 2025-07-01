import { Component, type OnInit, Input } from "@angular/core"
import  { ActivatedRoute, Router } from "@angular/router"
import  { Location } from "@angular/common"
import  { ApiService } from "../../services/api.service.service"


@Component({
  selector: "app-levels",
  templateUrl: "./levels.component.html",
  styleUrls: ["./levels.component.css"],
})
export class LevelsComponent implements OnInit {
  levels: any[] = []
  specialtyId!: number
  specialtyName = ""
  showAddModal = false
  levelExistsError = false
  newLevel: {
    annee: string
  } = {
    annee: "",
  }

  @Input() sidebarOpen = false
  @Input() sidebarCollapsed = false

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.specialtyId = Number(this.route.snapshot.paramMap.get("specialtyId"))
    this.loadLevels()
    this.loadSpecialtyDetails()
  }

  loadSpecialtyDetails(): void {
    if (this.specialtyId) {
      this.apiService.getSpecialiteById(this.specialtyId).subscribe({
        next: (specialty: any) => {
          this.specialtyName = specialty.nom
        },
        error: (err) => console.error("Error loading specialty details:", err),
      })
    }
  }

  loadLevels(): void {
    this.apiService.fetchLevels(this.specialtyId).subscribe({
      next: (data) => (this.levels = data),
      error: (err) => console.error("Error loading levels:", err),
    })
  }

  trackByLevelId(index: number, level: any): number {
    return level.id
  }

  getLevelDisplayName(annee: string): string {
    const displayNames: { [key: string]: string } = {
      PREMIERE_ANNEE: "First Year",
      DEUXIEME_ANNEE: "Second Year",
      TROISIEME_ANNEE: "Third Year",
      QUATRIEME_ANNEE: "Fourth Year",
      CINQUIEME_ANNEE: "Fifth Year",
    }
    return displayNames[annee] || annee
  }

  deleteLevel(id: number): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce niveau ?")) {
      this.apiService.deleteLevel(id).subscribe({
        next: () => {
          this.loadLevels() // Reload levels
        },
        error: (err) => console.error("Error deleting level:", err),
      })
    }
  }

  viewLevelDetails(level: any): void {
    // Navigate to classes page with the level ID
    this.router.navigate(["/classes", this.specialtyId, level.id])
  }

  goBack(): void {
    // Navigate back to specialties page
    this.router.navigate(["/specialties"])
  }

  openAddModal(): void {
    this.resetNewLevel()
    this.showAddModal = true
  }

  closeAddModal(): void {
    this.showAddModal = false
    this.resetNewLevel()
  }

  checkLevelExists(): void {
    if (this.newLevel.annee) {
      // Check if the selected level already exists in the current levels array
      this.levelExistsError = this.levels.some((level) => level.annee === this.newLevel.annee)
    } else {
      this.levelExistsError = false
    }
  }

  addLevel(): void {
    // Double-check before submitting
    if (this.newLevel.annee && !this.levelExistsError) {
      this.apiService
        .createLevel({
          annee: this.newLevel.annee,
          specialite: { id: this.specialtyId },
        })
        .subscribe({
          next: () => {
            this.loadLevels()
            this.closeAddModal()
          },
          error: (error) => {
            console.error("Error creating level:", error)
            // Handle server-side validation error if level already exists
            if (error.status === 409 || error.message?.includes("already exists")) {
              this.levelExistsError = true
            }
          },
        })
    }
  }

  resetNewLevel(): void {
    this.newLevel = {
      annee: "",
    }
    this.levelExistsError = false
  }
}
