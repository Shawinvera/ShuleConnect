import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { CoursesComponent } from './components/courses/courses';
import { Profile } from './profile/profile';
import { ManageExamsQuizzes } from './components/manage-exams-quizzes/manage-exams-quizzes';
import { ManageLessonsNotes } from './components/manage-lessons-notes/manage-lessons-notes';
import { authGuard } from '../guards/auth.guard';
import { ManageSubject } from './components/manage-subject/manage-subject';
import { ManageGradesComponent } from './components/manage-grades/manage-grades';
import { GradeStructure } from './components/grade-structure/grade-structure';
import { GradeDetailComponent } from './components/grade-structure/grade-detail/grade-detail';
import { TopicsComponent } from './components/grade-structure/grade-detail/topics/topics';
import { TopicDetailComponent } from './components/grade-structure/grade-detail/topics/subtopics/topic-detail/topic-detail';
import { AnalyticsComponent } from './components/analytics/analytics';
import { TeacherLayout } from './components/layout/teacher-layout';
import { SubscriptionPlanComponent } from './components/subscription-plan/subscription-plan';

const routes: Routes = [
  {
    path: '',
    component: TeacherLayout,
    canActivate: [authGuard],
    data: { role: 'ADMIN' },
    children: [
      { path: '', component: CoursesComponent },
      { path: 'dashboard/:courseId', component: Dashboard },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'analytics/:courseId', component: AnalyticsComponent },
      { path: 'profile', component: Profile },
      { path: 'exams', component: ManageExamsQuizzes },
      { path: 'subscription_plan/:courseId', component: SubscriptionPlanComponent },
      { path: 'subjects/:courseId', component: ManageSubject },
      { path: 'grades', component: ManageGradesComponent },
      { path: 'grades/:courseId', component: ManageGradesComponent },
      { path: 'content/:gradeId', component: GradeStructure },
      { path: 'grade/:gradeId', component: GradeDetailComponent },
      { path: 'grade1/:gradeId', component: GradeDetailComponent },
      { path: 'grade2/:gradeId', component: GradeDetailComponent },
      { path: 'topics/:gradeSubjectId', component: TopicsComponent },
      { path: 'subtopics/:gradeSubjectId/:topicId', component: TopicDetailComponent },
      { path: 'lessons/:subTopicId', component: ManageLessonsNotes },
      { path: 'subtopics/:subTopicId/lessons', component: ManageLessonsNotes },
      { path: ':courseId/:gradeId/:subjectId/:gradeSubjectId/:topicId/:subTopicId/lessons', component: ManageLessonsNotes }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeacherRoutingModule {}