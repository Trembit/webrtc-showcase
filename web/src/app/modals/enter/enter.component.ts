import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'modal-enter',
  templateUrl: './enter.component.html',
  styleUrls: ['./enter.component.css']
})
export class EnterComponent {
  @Output() close: EventEmitter<void>;
  @Output() submit: EventEmitter<string>;

  public constructor() {
    this.close = new EventEmitter<void>();
    this.submit = new EventEmitter<string>();
  }

  public sendName(name: string) {
    if (name) {
      this.submit.emit(name);
    }
  }
}
