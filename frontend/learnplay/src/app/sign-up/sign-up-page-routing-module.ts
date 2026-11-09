import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignUp } from './components/sign-up/sign-up.js';
import { SignIn } from './components/sign-in/sign-in.js';
import { AdminSignIn } from './components/admin-sign-in/admin-sign-in.js';
import { OtpVerification } from './components/otp-verification/otp-verification';
import { environment } from '../../environments/environment';

const routes: Routes = [
  {
    path: '',
    component: SignUp
  },
  {
    path: 'sign-in',
    component: SignIn
  },
  {
    path: 'otp-verification',
    component: OtpVerification
  },
  {
    path: environment.adminLoginPath,
    component: AdminSignIn
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SignUpRoutingModule { }