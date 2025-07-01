import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Task {
  id: number;
  title: string;
  description?: string;
  // add other properties as needed
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private apiUrl = 'http://localhost:8080/api/tasks';

  constructor(private http: HttpClient) {}

deleteTask(id: number): Observable<string> {
  return this.http.delete(`${this.apiUrl}/${id}`, {
    responseType: 'text'
  });
}
}
