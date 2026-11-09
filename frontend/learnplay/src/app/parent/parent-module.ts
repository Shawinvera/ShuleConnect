import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { ParentRoutingModule } from './parent-routing-module';
import { DashboardLayout } from './components/dashboard-layout/dashboard-layout';
import { ParentPage } from './components/parent-page/parent-page';
import { AddChild } from './components/add-child/add-child';
import { ParentNavbar } from './components/parent-navbar/parent-navbar';
import { ChildDetails } from './components/child-details/child-details';
import { SelectLearner } from './components/select-learner/select-learner';
import { EditLearnerProfile } from './components/edit-learner-profile/edit-learner-profile';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ParentRoutingModule,
    DashboardLayout,
    ParentPage,
    AddChild,
    ParentNavbar,
    ChildDetails,
    SelectLearner
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi())
  ]
})
export class ParentModule { }
