import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KidRoutingModule } from './kid-routing-module';
import { Navbar } from './reusable/navbar/navbar';
import { KidsDashboard } from './components/kids-dashboard/kids-dashboard';
import { MainContent } from './components/main-content/main-content';
import { SubjectLessons } from './components/subject-lessons/subject-lessons';
import { LessonUnit } from './components/lesson-unit/lesson-unit';
import { UnitContent } from './components/unit-content/unit-content';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    KidRoutingModule,
    KidsDashboard,
    Navbar,
    MainContent,
    SubjectLessons,
    LessonUnit,
    UnitContent
  ]
})
export class KidModule { }
