import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayout } from './components/dashboard-layout/dashboard-layout';
import { ParentPage } from './components/parent-page/parent-page';
import { AddChild } from './components/add-child/add-child';
import { ChildDetails } from './components/child-details/child-details';
import { SelectLearner } from './components/select-learner/select-learner';
import { EditLearnerProfile } from './components/edit-learner-profile/edit-learner-profile';
import { RecentActivities } from './components/recent-activities/recent-activities';
import { authGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
    data: { role: 'GUARDIAN' },
    children: [
      { path: '', component: ParentPage, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
      { path: 'add-child', component: AddChild, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
      { path: 'child/:id', component: ChildDetails, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
      { path: 'select-learner', component: SelectLearner, canActivate: [authGuard], data: { role: 'GUARDIAN' } }
    ]
  },
  { path: 'edit-learner-profile', component: EditLearnerProfile, canActivate: [authGuard], data: { role: 'GUARDIAN' } },
  { path: 'recent-activities', component: RecentActivities, canActivate: [authGuard], data: { role: 'GUARDIAN' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ParentRoutingModule { }
