import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Submission {
  id: number;
  taskId: number;
  studentId: number | null;
  description: string | null;
  groupId: number;
  content: string;
  submittedAt: string;  // ISO date string
  status: string | null;
  grade?: number | null; // Include if grading is part of the model
}

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private baseUrl = 'http://localhost:8080/api/submissions';

  constructor(private http: HttpClient) {}

  getSubmissionsByTeacher(teacherId: string): Observable<Submission[]> {
    console.log(`Fetching submissions for teacher ID: ${teacherId}`);
    return this.http.get<Submission[]>(`${this.baseUrl}/teacher/${teacherId}`);
  }
  getGroupsStats(): Observable<any[]> {
  console.log('Fetching groups stats');
    return this.http.get<any[]>(`${this.baseUrl}/groups-stats`);
  }
  // 🔹 New method to fetch submission by ID
  getSubmissionById(id: number): Observable<Submission> {
    return this.http.get<Submission>(`${this.baseUrl}/${id}`);
  }

  // 🔹 Optional: Add updateGrade method
  updateGrade(id: number, grade: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, { grade });
  }
}
