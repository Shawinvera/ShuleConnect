import { inject, NgModule } from '@angular/core';
import { CanActivateFn, Router, RouterModule, Routes } from '@angular/router';
import { SignUp } from './components/sign-up/sign-up.js';
import { SignIn } from './components/sign-in/sign-in.js';
import { AdminSignIn } from './components/admin-sign-in/admin-sign-in.js';
import { OtpVerification } from './components/otp-verification/otp-verification';
import { environment } from '../../environments/environment';
import { UserRoleService } from './services/user-role.service';

const requireRoleSelection: CanActivateFn = () => {
  const router = inject(Router);
  const userRoleService = inject(UserRoleService);

  return userRoleService.getRole() ? true : router.createUrlTree(['/who-are-you']);
};

const routes: Routes = [
  {
    path: '',
    component: SignUp
  },
  {
    path: 'sign-in',
    component: SignIn,
    canActivate: [requireRoleSelection]
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