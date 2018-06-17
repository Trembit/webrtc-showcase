import {Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'modal-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent {
  @Input() header: string = 'Error';
  @Input() message: string = 'Unknown error has been occured';
  @Output() close: EventEmitter<void>;

  public constructor() { 
    this.close = new EventEmitter<void>();
  }
}
