import { Component, type OnInit, Input } from "@angular/core"
import  { ActivatedRoute, Router } from "@angular/router"
import  { Location } from "@angular/common"
import  { ApiService } from "../../services/api.service.service"


@Component({
  selector: "app-classes",
  templateUrl: "./classes.component.html",
  styleUrls: ["./classes.component.css"],
})
export class ClassesComponent implements OnInit {
  classes: any[] = []
  levelId!: number
  specialtyId!: number
  showAddModal = false
  classExistsError = false
  newClass: {
    number: string
    capacity: number
  } = {
    number: "",
    capacity: 30,
  }

  @Input() sidebarOpen = false
  @Input() sidebarCollapsed = false

  levelName = ""

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    // Method 1: Get from route parameters (if included in URL)
    this.levelId = Number(this.route.snapshot.paramMap.get("levelId"))
    this.specialtyId = Number(this.route.snapshot.paramMap.get("specialtyId"))

    // Method 2: Get from query parameters
    if (!this.specialtyId) {
      this.specialtyId = Number(this.route.snapshot.queryParamMap.get("specialtyId"))
    }

    // Method 3: Get from navigation state
    if (!this.specialtyId && this.router.getCurrentNavigation()?.extras?.state) {
      this.specialtyId = this.router.getCurrentNavigation()?.extras?.state?.["specialtyId"]
    }

    // Method 4: Get from level data via API
    if (!this.specialtyId && this.levelId) {
      this.getSpecialtyIdFromLevel()
    }

    this.loadClasses()
    this.loadLevelDetails()
  }

  // Method 4: Fetch specialty ID from level data
  getSpecialtyIdFromLevel(): void {
    // Assuming your API returns level with specialty information
    this.apiService.fetchLevels().subscribe({
      next: (levels) => {
        const currentLevel = levels.find((level) => level.id === this.levelId)
        if (currentLevel && currentLevel.specialite) {
          this.specialtyId = currentLevel.specialite.id
        }
      },
      error: (err) => console.error("Error fetching level data:", err),
    })
  }

  loadLevelDetails(): void {
    if (this.levelId) {
      this.apiService.getLevelById(this.levelId).subscribe({
        next: (level: any) => {
          this.levelName = this.getLevelDisplayName(level.annee)
        },
        error: (err) => console.error("Error loading level details:", err),
      })
    }
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

  loadClasses(): void {
    this.apiService.fetchClasses(this.levelId).subscribe({
      next: (data) => {
        this.classes = data
        // Load student count for each class
        this.classes.forEach((classe) => {
          this.apiService.fetchStudents(classe.id).subscribe({
            next: (students) => {
              classe.students = students
            },
            error: (err) => console.error("Error loading students for class:", err),
          })
        })
      },
      error: (err) => console.error("Error loading classes:", err),
    })
  }

  goBack(): void {
    if (this.specialtyId) {
      // Navigate back to levels page with the specialty ID
      this.router.navigate(["/levels", this.specialtyId])
    } else {
      // Fallback: use browser back
      this.location.back()
    }
  }

  deleteClass(id: number): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette classe ?")) {
      this.apiService.deleteClass(id).subscribe({
        next: () => {
          this.loadClasses()
        },
        error: (err) => console.error("Error deleting class:", err),
      })
    }
  }

  viewClassDetails(classe: any): void {
    // Navigate to students list with all necessary IDs and class name
    this.router.navigate(["/students", classe.id], {
      queryParams: {
        specialtyId: this.specialtyId,
        levelId: this.levelId,
      },
      state: {
        className: `Classe ${classe.number}`,
      },
    })
  }

  openAddModal(): void {
    this.resetNewClass()
    this.showAddModal = true
  }

  closeAddModal(): void {
    this.showAddModal = false
    this.resetNewClass()
  }

  checkClassExists(): void {
    if (this.newClass.number) {
      // Check if the class number already exists in the current classes array
      this.classExistsError = this.classes.some((classe) => classe.number === this.newClass.number)
    } else {
      this.classExistsError = false
    }
  }

  addClass(): void {
    // Double-check before submitting
    if (this.newClass.number && this.newClass.capacity > 0 && !this.classExistsError) {
      this.apiService
        .createClass({
          number: this.newClass.number,
          capacity: this.newClass.capacity,
          niveau: { id: this.levelId },
        })
        .subscribe({
          next: () => {
            this.loadClasses()
            this.closeAddModal()
          },
          error: (error) => {
            console.error("Error creating class:", error)
            // Handle server-side validation error if class already exists
            if (error.status === 409 || error.message?.includes("already exists")) {
              this.classExistsError = true
            }
          },
        })
    }
  }

  resetNewClass(): void {
    this.newClass = {
      number: "",
      capacity: 30,
    }
    this.classExistsError = false
  }
}
