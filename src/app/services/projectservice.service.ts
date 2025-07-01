import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectserviceService {

  constructor(private http: HttpClient) { }
createProject(projectData: any) {
  return this.http.post('http://localhost:8080/api/projects/add', projectData);
}
deleteProject(projectId: number): Observable<void> {
  return this.http.delete<void>(`http://localhost:8080/api/projects/${projectId}`)
    .pipe(
      tap(() => {
        console.log(`Project with ID ${projectId} deleted successfully`);
      })
    );
}
updateProject(projectId: number, updatedData: {
  name: string;
  description: string;
  dueDate: string;
  associatedClasses: { id: number; name: string }[];
  collaborators: string[];
}) {
  return this.http.put<any>(`http://localhost:8080/api/projects/${projectId}`, updatedData);
}

  getProjectsByTeacher(): Observable<any> {
    const userId = localStorage.getItem('id');
    return this.http.get<any>(`http://localhost:8080/api/projects/by-teacher/${userId}`)
      .pipe(
        tap(response => {
          console.log('Response inside service:', response);
        })
      );
  }
  getProjectById(projectId: number): Observable<any> {
  return this.http.get<any>(`http://localhost:8080/api/projects/${projectId}`)
    .pipe(
      tap(response => {
        console.log('Fetched project:', response);
      })
    );
}
  createTask(taskData: any): Observable<any> {
    return this.http.post<any>(`http://localhost:8080/api/tasks`, taskData);
  }

}
