import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { WhoAreYouComponent } from './components/who-are-you/who-are-you';

const routes: Routes = [
  {
    path: '',
    component: LandingPage
  },
  {
    path: 'who-are-you',
    component: WhoAreYouComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingPageRoutingModule { }