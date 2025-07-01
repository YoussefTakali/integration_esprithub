export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string; // ISO string
  status: string;
  createdDate: string;
  createdBy: string;
  projectId: number;
  graded: boolean;
  visible: boolean;
  scope: 'INDIVIDUAL' | 'GROUP' | 'CLASS';
  assignedTo: string[]; // array of member IDs
}

export interface Group {
  id: number;
  name: string;
  memberIds: string[];
}

export interface Project {
  id: number;
  name: string;
  description: string;
  groups?: Group[];
  dueDate: string; // ISO string
}
