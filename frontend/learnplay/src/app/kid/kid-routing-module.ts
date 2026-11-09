import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KidsDashboard } from './components/kids-dashboard/kids-dashboard';
import { MainContent } from './components/main-content/main-content';
import { SubjectLessons } from './components/subject-lessons/subject-lessons';
import { LessonUnit } from './components/lesson-unit/lesson-unit';
import { UnitContent } from './components/unit-content/unit-content';
import { authGuard } from '../guards/auth.guard';
import { LessonLists } from './components/lesson-lists/lesson-lists'; 

const routes: Routes = [
  {
    path: '',
    component: KidsDashboard,
    canActivate: [authGuard],
    data: { role: 'GUARDIAN' },
    children: [
      { path: '', component: MainContent },
      // 1. Subject Page (Displays Units)
      { path: 'subject/:subjectId/:gsId', component: SubjectLessons },
      
      // 2. Unit Page (Displays Lessons) - Notice we keep :subjectId in the path
      { path: 'subject/:subjectId/unit/:unitId', component: LessonUnit },
      
      // NEW: This page lists lessons inside a sub-topic
      { path: 'subject/:subjectId/unit/:unitId/subtopic/:subTopicId', component: LessonLists },
      
      // UPDATED: This page shows the actual video content
      { path: 'subject/:subjectId/unit/:unitId/subtopic/:subTopicId/lesson/:lessonId', component: UnitContent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KidRoutingModule {}
