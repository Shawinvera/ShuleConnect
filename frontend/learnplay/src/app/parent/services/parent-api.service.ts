import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LearnerTrackerSummaryDto } from '../../models/learner-tracker-summary.interface';

// Interface for Learner data from backend
export interface LearnerDto {
  id?: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  birthCertificateNumber?: string;
  gender: string;
  dob: string;
  gradeId: string;
  appUserId: string;
  points: number;
  avatar?: string;
  userTimezone?: string;
  createdAt?: string;
  gradeName?: string;
}

// Interface for API response when creating a learner
export interface ApiCreatedResponse {
  generatedId: string;
  message: string;
  timestamp: string;
}

// Interface for Subject data
export interface SubjectDto {
  id: string;
  name: string;
  icon?: string;
}

// Interface for Grade Subject data
export interface GradeSubjectDto {
  id: string;
  gradeId: string;
  subjectId: string;
  subject?: SubjectDto;
}

// Interface for Grade Subject Details
export interface GradeSubjectDetailsDto {
  id: string;
  subject: string;
  description?: string;
  topicCount: number;
}

// Interface for Grade data
export interface GradeDto {
  id: string;
  name: string;
  description?: string;
  courseId: string;
  active?: boolean;
}

// Interface for Course data
export interface CourseDto {
  id: string;
  title: string;
  description?: string;
  countryCode?: string;
  active?: boolean;
  premium?: boolean;
  createdAt?: string;
  shortCode?: string | null;
}

// Interface for Lesson Tracker data (recent activity)
export interface LessonTrackerDto {
  id: string;
  learnerId: string;
  lessonId: string;
  completedAt: string; // ISO date string
  lessonName: string;
  subjectName: string;
  userTimezone?: string;
  points?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ParentApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Fetch all learners (children) for a specific user (parent)
   * @param userId - The parent's user ID
   * @returns Observable of learner array
   */
  fetchLearnersByUserId(userId: string): Observable<LearnerDto[]> {
    return this.http.get<LearnerDto[]>(`${this.baseUrl}/learner/fetchByUserId/${userId}`);
  }

  /**
   * Register a new learner (child)
   * @param learnerData - The learner information
   * @returns Observable of API response with created learner ID
   */
  registerLearner(learnerData: LearnerDto): Observable<ApiCreatedResponse> {
    return this.http.post<ApiCreatedResponse>(`${this.baseUrl}/learner/registration`, learnerData);
  }

  /**
   * Update an existing learner's profile
   */
  updateLearnerProfile(learnerData: LearnerDto): Observable<LearnerDto> {
    return this.http.put<LearnerDto>(`${this.baseUrl}/learner/update/profile`, learnerData);
  }

  /**
   * Fetch learner's grade subject details
   * @param gradeSubjectId - The grade subject ID
   * @returns Observable of grade subject data
   */
  fetchGradeSubject(gradeSubjectId: string): Observable<GradeSubjectDto> {
    return this.http.get<GradeSubjectDto>(`${this.baseUrl}/grade-subject/${gradeSubjectId}`);
  }

  /**
   * Fetch all courses
   * @returns Observable of course array
   */
  fetchAllCourses(): Observable<CourseDto[]> {
    return this.http.get<CourseDto[]>(`${this.baseUrl}/courses/all`);
  }

  /**
   * Fetch courses by country code
   * @param countryCode - The country code (e.g., 'KE')
   * @returns Observable of course array
   */
  fetchCoursesByCountryCode(countryCode: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/courses/fetchByCountryCode?countryCode=${countryCode}`);
  }

  /**
   * Fetch all grades for a course
   * @param courseId - The course ID
   * @returns Observable of grade array
   */
  fetchGradesByCourse(courseId: string): Observable<GradeDto[]> {
    return this.http.get<GradeDto[]>(`${this.baseUrl}/grade/fetchByCourse/${courseId}`);
  }

  /**
   * Fetch subjects by grade
   * @param gradeId - The grade ID
   * @returns Observable of grade subject details array
   */
  fetchSubjectsByGrade(gradeId: string): Observable<GradeSubjectDetailsDto[]> {
    return this.http.get<GradeSubjectDetailsDto[]>(`${this.baseUrl}/grade-subject/subjects/byGrade/${gradeId}`);
  }

  /**
   * Fetch learner's progress summary
   * @param learnerId - The learner ID
   * @returns Observable of learner tracker summary
   */
  getLearnerSummary(learnerId: string): Observable<LearnerTrackerSummaryDto> {
    return this.http.get<LearnerTrackerSummaryDto>(`${this.baseUrl}/learner/fetchLessonSummary/${learnerId}`);
  }

  /**
   * Fetch learner's recent activity history
   * @param learnerId - The learner ID
   * @returns Observable of lesson tracker array (recent activities)
   */
  getLearnerHistory(learnerId: string): Observable<LessonTrackerDto[]> {
    return this.http.get<LessonTrackerDto[]>(`${this.baseUrl}/learner/history/${learnerId}`);
  }
}
