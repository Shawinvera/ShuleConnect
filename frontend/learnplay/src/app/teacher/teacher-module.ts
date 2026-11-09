import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { Dashboard } from './components/dashboard/dashboard';
import { StaticInfo } from './components/dashboard/static-info/static-info';
import { FeatureCards } from './components/dashboard/feature-cards/feature-cards';
import { Profile } from './profile/profile';
import { ProfileEdit } from './profile/profile-edit';

import { AnalyticsComponent } from './components/analytics/analytics';
import { TeacherRoutingModule } from './teacher-routing-module';





@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    AnalyticsComponent,
    TeacherRoutingModule,
    Dashboard,
    StaticInfo,
    FeatureCards,
    Profile,
    ProfileEdit
  ]
})
export class TeacherModule { }