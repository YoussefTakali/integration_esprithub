export interface User {
  id: number;
  keycloakId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  githubUsername: string;
  githubToken: string;
  role: string,
  groupId: any[]; // Tu peux préciser le type si tu sais ce que contient groupId
}
