import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  
  constructor(private http: HttpClient) {}

  // Original methods used by sign-up and parent components
  trackSuccess(event: string, data?: any) {
    console.log('Analytics Success:', event, data);
    // Add your success tracking logic here
  }

  trackError(event: string, error: string, data?: any) {
    console.log('Analytics Error:', event, error, data);
    // Add your error tracking logic here
  }

  trackButtonClick(event: string, data?: any) {
    console.log('Analytics Button Click:', event, data);
    // Add your button click tracking logic here
  }

  trackApiCall(event: string, method: string, success?: boolean, responseTime?: number, data?: any) {
    console.log('Analytics API Call:', event, method, success, responseTime, data);
    // Add your API call tracking logic here
  }

  trackChildSelection(childId: string, childName: string) {
    console.log('Analytics Child Selection:', childId, childName);
    // Add your child selection tracking logic here
  }

  trackFormSubmission(event: string, success: boolean, data?: any) {
    console.log('Analytics Form Submission:', event, success, data);
    // Add your form submission tracking logic here
  }

  trackLessonStart(lessonId: string, subjectName?: string, data?: any) {
    console.log('Analytics Lesson Start:', lessonId, subjectName, data);
    // Add your lesson start tracking logic here
  }

  trackLessonComplete(lessonId: string, data?: any, subjectName?: string, completionTime?: number) {
    console.log('Analytics Lesson Complete:', lessonId, data, subjectName, completionTime);
    // Add your lesson complete tracking logic here
  }

  trackFeatureUsage(feature: string, data?: any) {
    console.log('Analytics Feature Usage:', feature, data);
    // Add your feature usage tracking logic here
  }

  trackUserExperience(event: string, data?: any) {
    console.log('Analytics User Experience:', event, data);
    // Add your user experience tracking logic here
  }

  // Add any other methods that might be used by existing components
}