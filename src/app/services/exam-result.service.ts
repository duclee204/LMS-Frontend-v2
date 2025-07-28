import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface QuizResult {
  attemptId: number;
  quizId: number;
  userId: number;
  totalPoints: number;
  earnedPoints: number;
  score: number; // Percentage
  questionResults: QuestionResult[];
}

export interface QuestionResult {
  questionId: number;
  questionText: string;
  questionType: string;
  points: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
}

export interface UserAnswerSubmission {
  attemptId: number;
  questionId: number;
  answerId?: number; // For multiple choice
  answerText?: string; // For essay or text input
}

@Injectable({
  providedIn: 'root'
})
export class ExamResultService {

  constructor(private apiService: ApiService) { }

  /**
   * Submit answers for a quiz attempt
   */
  submitQuizAnswers(answers: UserAnswerSubmission[]): Observable<any> {
    return this.apiService.post('/api/exam/submit-answers', answers);
  }

  /**
   * Get quiz result for an attempt
   */
  getQuizResult(attemptId: number): Observable<QuizResult> {
    return this.apiService.get<QuizResult>(`/api/quiz-management/attempt/${attemptId}/result`);
  }

  /**
   * Grade a quiz attempt (instructor only)
   */
  gradeQuizAttempt(attemptId: number): Observable<QuizResult> {
    return this.apiService.post<QuizResult>(`/api/quiz-management/attempt/${attemptId}/grade`, {});
  }

  /**
   * Get all results for a quiz (instructor only)
   */
  getQuizResults(quizId: number): Observable<QuizResult[]> {
    return this.apiService.get<QuizResult[]>(`/api/quiz-management/quiz/${quizId}/results`);
  }

  /**
   * Update manual grade for essay question
   */
  updateEssayGrade(userAnswerId: number, points: number, feedback?: string): Observable<any> {
    return this.apiService.put(`/api/quiz-management/user-answer/${userAnswerId}/grade`, {
      points,
      feedback,
      isCorrect: points > 0
    });
  }

  /**
   * Calculate grade percentage
   */
  calculateGradePercentage(earnedPoints: number, totalPoints: number): number {
    if (totalPoints === 0) return 0;
    return Math.round((earnedPoints / totalPoints) * 100);
  }

  /**
   * Get grade letter based on percentage
   */
  getGradeLetter(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  /**
   * Format time duration in minutes
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? 
      `${hours} giờ ${remainingMinutes} phút` : 
      `${hours} giờ`;
  }

  /**
   * Check if quiz result is passing
   */
  isPassing(score: number, passingScore: number = 60): boolean {
    return score >= passingScore;
  }
}
