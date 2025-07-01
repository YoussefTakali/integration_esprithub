import { Component, Input, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-starcard',
  templateUrl: './starcard.component.html',
  styleUrls: ['./starcard.component.css']
})
export class StarcardComponent {
  @Input() title: string = '';
  @Input() value: string = '';
  @Input() description: string = '';
  @Input() logo: string='';
  @Input() sidebarVisible!: boolean;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sidebarVisible']) {
      console.log('Sidebar visibility in StarcardComponent:', this.sidebarVisible);
    }
  }
}
