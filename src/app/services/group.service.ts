import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Define an interface for the GroupResponseDTO you expect to get
export interface GroupResponse {
  id: number;
  name: string;
  memberIds: string[];
  className: string;    // class name instead of id
  projectName: string;  // project name instead of id
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  private baseUrl = 'http://localhost:8080/api/groups';

  constructor(private http: HttpClient) { }

  getAllGroups(): Observable<GroupResponse[]> {
    return this.http.get<GroupResponse[]>(this.baseUrl);
  }

  deleteGroup(groupId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${groupId}`);
  }

  updateGroupMembers(groupId: number, memberIds: string[]): Observable<any> {
    const payload = { memberIds };
    return this.http.put(`${this.baseUrl}/${groupId}`, payload);
  }
}
