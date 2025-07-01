import { Component, type OnInit, Input } from "@angular/core"
import  { ActivatedRoute, Router } from "@angular/router"
import  { Location } from "@angular/common"
import  { ApiService } from "../services/api.service.service"
import  { HttpClient } from "@angular/common/http"

@Component({
  selector: "app-students",
  templateUrl: "./students.component.html",
  styleUrls: ["./students.component.css"],
})
export class StudentsComponent implements OnInit {
  students: any[] = []
  repositories: any[] = []
  classId!: number
  levelId!: number
  specialtyId!: number
  className = ""
  showAddModal = false
  showAddRepositoryModal = false
  studentExistsError = false
  activeTab = "students" // Default active tab

  newStudent: {
    prenom: string
    nom: string
    email?: string
    numeroEtudiant?: string
    telephone?: string
  } = {
    prenom: "",
    nom: "",
    email: "",
    numeroEtudiant: "",
    telephone: "",
  }

  newRepository: {
    name: string
    description: string
    ownerName: string
    privateRepo: boolean
    auto_init: boolean
    gitignore_template: string
    classId?: number
  } = {
    name: "",
    description: "",
    ownerName: "",
    privateRepo: false,
    auto_init: true,
    gitignore_template: "Node",
  }

  @Input() sidebarOpen = false
  @Input() sidebarCollapsed = false

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private apiService: ApiService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    // Get IDs from route parameters
    this.classId = Number(this.route.snapshot.paramMap.get("classId"))
    this.levelId = Number(this.route.snapshot.queryParamMap.get("levelId"))
    this.specialtyId = Number(this.route.snapshot.queryParamMap.get("specialtyId"))

    // Debug log to verify classId
    console.log("StudentsComponent classId:", this.classId)

    // Get class name from route state or set default
    const navigation = this.router.getCurrentNavigation()
    if (navigation?.extras?.state?.["className"]) {
      this.className = navigation.extras.state["className"]
    } else {
      this.className = `Class ${this.classId}`
    }

    this.loadStudents()
    this.loadRepositories()
  }

  loadStudents(): void {
    this.apiService.fetchStudents(this.classId).subscribe({
      next: (data) => {
        this.students = data.map((student) => ({
          ...student,
          status: student.status || "present", // Default to present if no status
        }))
      },
      error: (err) => console.error("Error loading students:", err),
    })
  }

  loadRepositories(): void {
    this.apiService.fetchRepositories(this.classId).subscribe({
      next: (data) => {
        this.repositories = data
      },
      error: (err) => console.error("Error loading repositories:", err),
    })
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab
    
  }

  // Attendance management methods
  toggleAttendance(student: any): void {
    const newStatus = student.status === "present" ? "absent" : "present"
    student.status = newStatus

    // Here you would typically call an API to update the attendance status
    // For now, we'll just update locally
    console.log(`Student ${student.prenom} ${student.nom} marked as ${newStatus}`)

    // Optional: Call API to save attendance
    // this.apiService.updateStudentAttendance(student.id, newStatus).subscribe(...)
  }

  markAllPresent(): void {
    if (confirm("Mark all students as present?")) {
      this.students.forEach((student) => {
        student.status = "present"
      })

      // Optional: Call API to update all attendance
      console.log("All students marked as present")
    }
  }

  getPresentCount(): number {
    return this.students.filter((student) => student.status === "present").length
  }

  getAbsentCount(): number {
    return this.students.filter((student) => student.status === "absent").length
  }

  goBack(): void {
    if (this.specialtyId && this.levelId) {
      // Navigate back to classes page
      this.router.navigate(["/classes", this.specialtyId, this.levelId])
    } else {
      // Fallback: use browser back
      this.location.back()
    }
  }

  openAddModal(): void {
    this.resetNewStudent()
    this.showAddModal = true
  }

  closeAddModal(): void {
    this.showAddModal = false
    this.resetNewStudent()
  }

  openAddRepositoryModal(): void {
    this.resetNewRepository()
    this.showAddRepositoryModal = true
  }

  closeAddRepositoryModal(): void {
    this.showAddRepositoryModal = false
    this.resetNewRepository()
  }

  // NEW METHOD: Navigate to repo form with classId
  navigateToRepoForm(): void {
    this.router.navigate(["/repo-form"], {
      queryParams: { classId: this.classId },
    })
  }

  checkStudentExists(): void {
    if (this.newStudent.nom && this.newStudent.prenom) {
      // Check if the student already exists
      this.studentExistsError = this.students.some(
        (student) =>
          student.nom.toLowerCase() === this.newStudent.nom.toLowerCase() &&
          student.prenom.toLowerCase() === this.newStudent.prenom.toLowerCase(),
      )
    } else {
      this.studentExistsError = false
    }
  }

  saveStudent(): void {
    if (this.newStudent.nom && this.newStudent.prenom && !this.studentExistsError) {
      const studentData = {
        nom: this.newStudent.nom,
        prenom: this.newStudent.prenom,
        email: this.newStudent.email,
        numeroEtudiant: this.newStudent.numeroEtudiant,
        telephone: this.newStudent.telephone,
        classe: { id: this.classId },
      }

      // Create new student
      this.apiService.createStudent(studentData).subscribe({
        next: () => {
          this.loadStudents()
          this.closeAddModal()
        },
        error: (error) => {
          console.error("Error creating student:", error)
          if (error.status === 409 || error.message?.includes("already exists")) {
            this.studentExistsError = true
          }
        },
      })
    }
  }

  saveRepository(): void {
    if (this.newRepository.name && this.newRepository.ownerName) {
      const repositoryData = {
        name: this.newRepository.name,
        description: this.newRepository.description,
        private: this.newRepository.privateRepo,
        auto_init: this.newRepository.auto_init,
        gitignore_template: this.newRepository.gitignore_template,
        ownerName: this.newRepository.ownerName,
        classId: this.classId, // Make sure classId is included
      }

      console.log("Creating repository with data:", repositoryData) // Debug log

      // Create new repository
      this.http.post("/api/github/create-repo", repositoryData).subscribe({
        next: () => {
          this.loadRepositories()
          this.closeAddRepositoryModal()
          console.log("Repository created successfully")
        },
        error: (error) => {
          console.error("Error creating repository:", error)
          alert("Failed to create repository. Please try again.")
        },
      })
    }
  }

  exportAttendanceList(): void {
    // Export attendance list to Excel
    this.apiService.exportAttendanceList(this.classId, this.className).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `attendance-list-${this.className}-${new Date().toISOString().split("T")[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      },
      error: (err) => console.error("Error exporting attendance list:", err),
    })
  }

  resetNewStudent(): void {
    this.newStudent = {
      prenom: "",
      nom: "",
      email: "",
      numeroEtudiant: "",
      telephone: "",
    }
    this.studentExistsError = false
  }

  resetNewRepository(): void {
    this.newRepository = {
      name: "",
      description: "",
      ownerName: "maramoueslati", // Set default owner
      privateRepo: false,
      auto_init: true,
      gitignore_template: "Node",
    }
  }
}
