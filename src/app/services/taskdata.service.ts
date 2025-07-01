import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../Models/Task';

@Injectable({ providedIn: 'root' })
export class TaskdataService {
  private taskSubject = new BehaviorSubject<Task | null>(null);
  task$ = this.taskSubject.asObservable();

  setTask(task: Task) {
    this.taskSubject.next(task);
  }

  getTask(): Task | null {
    return this.taskSubject.getValue();
  }
}
