import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
 private baseUrl = 'http://localhost:8084/esprit/api/users';

  constructor(private http: HttpClient) { }

  getUsersByRole(role: string): Observable<any[]> {
    const url = `${this.baseUrl}/by-role`;
    return this.http.get<any[]>(url, { params: { role } });
  }

  getcustom(): Observable<any> {
    const url = `${this.baseUrl}/custom`;
    return this.http.get(url);
  }

  addGithubInfo(userId: string, userDTO: any): Observable<any> {
    const url = `${this.baseUrl}/add-info`;
    const params = new HttpParams().set('userId', userId);
    return this.http.post(url, userDTO, { params });
  }

  deleteUser(userId: string): Observable<any> {
    const url = `${this.baseUrl}/${userId}`;
    return this.http.delete(url);
  }

  assignRoleToUser(userId: string, roleName: string): Observable<any> {
    const url = `${this.baseUrl}/assign-role`;
    const params = new HttpParams()
      .set('userId', userId)
      .set('roleName', roleName);

    return this.http.post(url, null, { params });
  }

  getUsersWithoutRole(): Observable<any[]> {
    const url = `${this.baseUrl}/Without-role`;
    return this.http.get<any[]>(url);
  }

  addUser(userDTO: any): Observable<any> {
    const url = `${this.baseUrl}`;
    return this.http.post(url, userDTO);
  }


  exportEtudiantsExcel(): Observable<Blob> {
  const url = `${this.baseUrl}/export/excel`;
  return this.http.get(url, { responseType: 'blob' });
}
  importUsersFromExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(`${this.baseUrl}/import/excel`, formData);
  }
}
