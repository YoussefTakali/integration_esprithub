import { Component, OnInit } from '@angular/core';
import { TaskdataService } from 'src/app/services/taskdata.service';
import { Task } from 'src/app/Models/Task';

@Component({
  selector: 'app-submit',
  templateUrl: './submit.component.html',
  styleUrls: ['./submit.component.css']
})
export class SubmitComponent implements OnInit {
  task!: Task;
  loading = true;

 constructor(private taskDataService: TaskdataService,) {}

ngOnInit(): void {
  const task = this.taskDataService.getTask();
console.log('Task data in SubmitComponent:', task);
  if (task) {
    this.task = task;
  } else {
console.error('No task data found');}
}

}
