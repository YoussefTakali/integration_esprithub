import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"
import  { Specialty, Level, Class, Repository, Summary } from "../Models/specialty"

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private readonly API_BASE_URL = "http://localhost:8080/api"

  constructor(private http: HttpClient) {}

  getSpecialties(): Observable<Specialty[]> {
    return this.http.get<any>(`${this.API_BASE_URL}/specialites`).pipe(map((response) => response.content || []))
  }

  // Get specialty by ID
  getSpecialiteById(id: number): Observable<Specialty> {
    return this.http.get<Specialty>(`${this.API_BASE_URL}/specialites/${id}`)
  }

  // Get level by ID
  getLevelById(id: number): Observable<Level> {
    return this.http.get<Level>(`${this.API_BASE_URL}/niveaux/${id}`)
  }

  // Get class by ID
  getClasseById(id: number): Observable<Class> {
    return this.http.get<Class>(`${this.API_BASE_URL}/classes/${id}`)
  }
  
 

  // 🟢 Niveaux
  fetchLevels(specialtyId?: number): Observable<Level[]> {
    const url = specialtyId ? `${this.API_BASE_URL}/niveaux/specialite/${specialtyId}` : `${this.API_BASE_URL}/niveaux`
    return this.http.get<any>(url).pipe(map((response) => response.content))
  }

  // 🟢 Classes
  fetchClasses(levelId?: number): Observable<Class[]> {
    const url = levelId ? `${this.API_BASE_URL}/classes/niveau/${levelId}/all` : `${this.API_BASE_URL}/classes`
    return this.http
      .get<any>(url)
      .pipe(map((response) => (Array.isArray(response) ? response : response.content || [])))
  }

  // 🟢 Étudiants
  fetchStudents(classeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE_URL}/eleves/classe/${classeId}`)
  }

  // 🟢 Dépôts
  fetchRepositories(classId?: number): Observable<Repository[]> {
    const url = classId ? `${this.API_BASE_URL}/repos/classe/${classId}` : `${this.API_BASE_URL}/repos`
    return this.http.get<Repository[]>(url)
  }

  // 🟢 Résumés
  fetchSummaries(classId?: number): Observable<Summary[]> {
    const url = classId ? `${this.API_BASE_URL}/resumes?classeId=${classId}` : `${this.API_BASE_URL}/resumes`
    return this.http.get<Summary[]>(url)
  }

  // 🟢 Export de la liste de présence
  exportAttendanceList(classId: number, className: string): Observable<Blob> {
    return this.http.get(`${this.API_BASE_URL}/eleves/presence/${classId}`, { responseType: "blob" })
  }

  // 🟢 Export des statistiques
  exportStatistics(classId: number, className: string): Observable<Blob> {
    return this.http.get(
      `${this.API_BASE_URL}/export/statistiques?classeId=${classId}&className=${encodeURIComponent(className)}`,
      { responseType: "blob" },
    )
  }

  exportAttendanceListWithParams(
    classId: number,
    className: string,
    matiere: string,
    professeur: string,
    date: Date,
    semestre: string,
    annee: string,
  ): Observable<Blob> {
    return this.http.post(
      `${this.API_BASE_URL}/eleves/presence/${classId}/export`,
      {
        matiere,
        professeur,
        date,
        semestre,
        annee,
        className,
      },
      { responseType: "blob" },
    )
  }

  createClass(cls: { number: string; capacity: number; niveau: { id: number } }): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/classes`, cls, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  createSpecialty(specialty: { nom: string; specialites: string; typeFormation: string }): Observable<any> {
    const payload = {
      nom: specialty.nom,
      specialites: specialty.specialites,
      typeFormation: specialty.typeFormation,
      niveaux: [],
    }
    return this.http.post(`${this.API_BASE_URL}/specialites`, payload, {
      headers: new HttpHeaders({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
    })
  }

  createLevel(level: { annee: string; specialite: { id: number } }): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/niveaux`, level, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  updateSpecialty(id: number, specialty: { nom: string; specialites: string; typeFormation: string }): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/specialites/${id}`, specialty, {
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  updateLevel(id: number, level: { id?: number; annee: string; specialite: { id: number } }): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/niveaux/${id}`, level, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  createStudent(student: { nom: string; prenom: string; classe: { id: number } }): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/eleves`, student, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  updateStudent(id: number, student: { nom: string; prenom: string; classe: { id: number } }): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/eleves/${id}`, student, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  deleteStudent(id: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/eleves/${id}`)
  }

  saveSpecialty(s: any) {
    if (s.id) {
      this.updateSpecialty(s.id, s).subscribe(() => this.getSpecialties())
    } else {
      this.createSpecialty(s).subscribe(() => this.getSpecialties())
    }
  }

  deleteSpecialty(id: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/specialites/${id}`)
  }

  updateClass(id: number, cls: { number: string; capacity: number; niveau: { id: number } }): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/classes/${id}`, cls, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  deleteClass(id: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/classes/${id}`)
  }

  deleteLevel(id: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/niveaux/${id}`)
  }

  deleteRepository(id: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/repos/${id}`)
  }

  deleteSummary(id: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/resumes/${id}`)
  }

  updateRepository(repo: Repository): Observable<Repository> {
    return this.http.put<Repository>(`${this.API_BASE_URL}/repos/${repo.id}`, repo)
  }

  createRepository(repo: Repository): Observable<Repository> {
    return this.http.post<Repository>(`${this.API_BASE_URL}/repos`, repo)
  }
}
