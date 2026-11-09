import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LandingPageRoutingModule } from './landing-page-routing-module';
import { LandingPage } from './components/landing-page/landing-page';
import { WhoAreYouComponent } from './components/who-are-you/who-are-you';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule,
    LandingPageRoutingModule,
    LandingPage,
    WhoAreYouComponent
  ]
})
export class LandingPageModule { }
