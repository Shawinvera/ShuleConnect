import { Routes } from '@angular/router';
import { EmailActivation } from './sign-up/components/email-activation/email-activation';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./landing-page/landing-page-module').then(m => m.LandingPageModule)
    },
    {
        path: 'sign-up',
        loadChildren: () => import('./sign-up/sign-up-module.js').then(m => m.SignUpModule)
    },
    {
        path: 'activation',
        component: EmailActivation
    },
    {
        path: 'kid',
        loadChildren: () => import('./kid/kid-module').then(m => m.KidModule)
    },
    {
        path: 'courses',
        loadChildren: () => import('./teacher/teacher-module').then(m => m.TeacherModule)
    },
    {
        path: 'parent',
        loadChildren: () => import('./parent/parent-module').then(m => m.ParentModule)
    },
    {
        path: '**',
        redirectTo: ''
    }
];
