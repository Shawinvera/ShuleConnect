import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SignUpRoutingModule } from './sign-up-page-routing-module'; 
import { SignUp } from './components/sign-up/sign-up';
import { AdminSignIn } from './components/admin-sign-in/admin-sign-in';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule,
    SignUpRoutingModule,
    SignUp,
    AdminSignIn
  ]
})
export class SignUpModule { }
