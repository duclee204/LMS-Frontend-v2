import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ExamItem {
  quizId?: number;
  courseId: number;
  title: string;
  description?: string;
  quizType?: 'graded' | 'practice' | 'survey';
  timeLimit?: number;
  shuffleAnswers?: boolean;
  allowMultipleAttempts?: boolean;
  showQuizResponses?: boolean;
  showOneQuestionAtATime?: boolean;
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
  publish?: boolean;
  expanded?: boolean;
  questions?: QuestionItem[];
  // Student completion tracking
  isCompleted?: boolean;
  completionDate?: string;
  score?: number;
  attempts?: number;
}

export interface ExamDto {
  quizId?: number;
  courseId: number;
  title: string;
  description?: string;
  quizType?: 'graded' | 'practice' | 'survey';
  timeLimit?: number;
  shuffleAnswers?: boolean;
  allowMultipleAttempts?: boolean;
  showQuizResponses?: boolean;
  showOneQuestionAtATime?: boolean;
  dueDate?: string;
  availableFrom?: string;
  availableUntil?: string;
  publish?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface QuestionItem {
  questionId?: number;
  quizId?: number;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'essay' | 'MULTIPLE_CHOICE' | 'ESSAY';
  orderNumber?: number;
  points?: number;
  correctAnswer?: string;
  options?: OptionItem[];
}

export interface OptionItem {
  optionId?: number;
  questionId?: number;
  optionText: string;
  isCorrect: boolean;
  orderNumber?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) { }

  // Get all quizzes for a course
  getQuizzesByCourse(courseId: number): Observable<ExamItem[]> {
    return this.apiService.get(`/quizzes?courseId=${courseId}`);
  }

  // Get published quizzes for a course (for students)
  getPublishedQuizzesByCourse(courseId: number): Observable<ExamItem[]> {
    return this.apiService.get(`/quizzes?courseId=${courseId}&publish=true`);
  }

  // Get quiz by ID
  getQuizById(quizId: number): Observable<ExamItem> {
    return this.apiService.get(`/quizzes/${quizId}`);
  }

  // Get quiz with questions for taking exam
  getQuizWithQuestions(quizId: number): Observable<any> {
    return this.apiService.get(`/quizzes/${quizId}/with-questions`);
  }

  // Create a new quiz
  createQuiz(exam: ExamDto): Observable<any> {
    return this.apiService.post('/quizzes', exam);
  }

  // Update an existing quiz
  updateQuiz(exam: ExamDto): Observable<any> {
    return this.apiService.put('/quizzes', exam);
  }

  // Update quiz publish status only
  updateQuizStatus(quizId: number, publish: boolean): Observable<any> {
    return this.apiService.put(`/quizzes/${quizId}/status?publish=${publish}`, {});
  }

  // Delete a quiz
  deleteQuiz(quizId: number): Observable<any> {
    return this.apiService.delete(`/quizzes/${quizId}`);
  }

  // ========== Question Management Methods ==========

  // Create a new question
  createQuestion(questionDto: any): Observable<any> {
    console.log('🌐 === ExamService.createQuestion called ===');
    console.log('QuestionDTO received:', JSON.stringify(questionDto, null, 2));
    console.log('Base URL:', this.apiService['baseUrl']);
    console.log('Full endpoint URL: http://localhost:8080/api/questions');
    console.log('Making POST request to: /questions');
    console.log('ApiService will handle adding auth headers');
    console.log('==========================================');
    
    const result = this.apiService.post('/questions', questionDto);
    
    // Log the observable creation
    console.log('Observable created, returning to component');
    
    return result;
  }

  // Get question types for quiz (for students to detect exam type)
  getQuestionsByQuiz(quizId: number): Observable<any> {
    return this.apiService.get(`/questions/quiz/${quizId}/types`);
  }

  // Get all questions for quiz editing (returns full question data)
  getQuestionsForEditing(quizId: number): Observable<any> {
    return this.apiService.get(`/questions/quiz/${quizId}`);
  }

  // Get a single question by ID
  getQuestionById(questionId: number): Observable<any> {
    return this.apiService.get(`/questions/${questionId}`);
  }

  // Update an existing question
  updateQuestion(questionId: number, questionDto: any): Observable<any> {
    return this.apiService.put(`/questions/${questionId}`, questionDto);
  }

  // Delete a question
  deleteQuestion(questionId: number): Observable<any> {
    return this.apiService.delete(`/questions/${questionId}`);
  }

  // ========== Exam Submission Methods ==========

  // Submit exam answers
  submitExam(submissionData: any): Observable<any> {
    return this.apiService.post('/exam/submit', submissionData);
  }

  // Check if user has submitted a quiz
  checkExamSubmission(quizId: number): Observable<any> {
    return this.apiService.get(`/exam/check-submission/${quizId}`);
  }

  // Get exam result for review
  getExamResult(quizId: number): Observable<any> {
    return this.apiService.get(`/exam/result/${quizId}`);
  }

  // Upload question file
  uploadQuestionFile(formData: FormData): Observable<any> {
    return this.apiService.postFormData('/questions/upload-file', formData);
  }
}
