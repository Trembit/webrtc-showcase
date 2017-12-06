import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { EnterComponent } from './modals/enter/enter.component';
import { ErrorComponent } from './modals/error/error.component';


@NgModule({
  declarations: [
    AppComponent,
    EnterComponent,
    ErrorComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
