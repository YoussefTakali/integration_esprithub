// subject.model.ts
export interface Subject {
  id: string;
  name: string;
  tasks: Task[];
}

// task.model.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  files?: File[];
}

// file.model.ts
export interface File {
  id: string;
  name: string;
  type: string;
  content?: string;
}