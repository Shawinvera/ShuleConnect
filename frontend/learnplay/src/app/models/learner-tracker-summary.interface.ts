export interface LearnerTrackerSummaryDto {
  learnerId: string;
  lessonCount: number;
  streak: number;
  lessonCompletedCount: number;
  percentageCompleted: number;
  points: number;
  subjects: SubjectSummary[];
}

export interface SubjectSummary {
  id: string;
  name: string;
  topicCount: number;
  subTopicCount: number;
  lessonCount: number;
  lessonCompletedCount: number;
  percentageCompleted: number;
  points: number;
}