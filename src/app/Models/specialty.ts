export interface Specialty {
    id: number;
    nom: string;
    specialites: string;
    typeFormation: string;
    niveaux?: Level[];
  }
  
  export interface Level {
    id: number;
    annee: string;
    specialite: Specialty;
  
  }
  
  export interface Class {
    id: number;
    number: string;
    capacity: number;
    niveau: Level;
    students?: Student[];
  }
  
  export interface Student {
    id: number;
    nom: string;
    prenom: string;
    classe: Class;
  }
  
  export interface Repository {
    id: number;
    name: string;
    description?: string;
    classe: Class;
  }
  
  export interface Summary {
    id: number;
    title: string;
    content: string;
    classe: Class;
    createdAt?: Date;
  }