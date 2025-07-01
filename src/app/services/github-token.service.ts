import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GithubTokenService {
  private readonly token = '';  // Replace with your actual token

  constructor() { }

  getToken(): string {
    return this.token;
  }
}
