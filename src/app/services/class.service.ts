import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClassService {

  private baseUrl = 'http://localhost:8080/api/classes';

  constructor(private http: HttpClient) { }

  getClassesByTeacher(): Observable<any> {
    const teacherId = localStorage.getItem('id');
    if (!teacherId) {
      throw new Error('Teacher ID not found in localStorage');
    }
    const url = `${this.baseUrl}/by-teacher/${teacherId}`;
    return this.http.get(url);
  }
}
