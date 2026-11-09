import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { WhoAreYouComponent } from './components/who-are-you/who-are-you';
import { authGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: LandingPage
  },
  {
    path: 'who-are-you',
    component: WhoAreYouComponent,
    canActivate: [authGuard],
    data: { role: 'GUARDIAN' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingPageRoutingModule { }