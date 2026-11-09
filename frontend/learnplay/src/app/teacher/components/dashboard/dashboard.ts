import { Component } from '@angular/core';
import { FeatureCards } from './feature-cards/feature-cards';
import { StaticInfo } from './static-info/static-info';
import { RouterOutlet } from '@angular/router';
import { TeacherBreadcrumbComponent } from '../breadcrumb/teacher-breadcrumb';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FeatureCards, StaticInfo, RouterOutlet, TeacherBreadcrumbComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard {

}
