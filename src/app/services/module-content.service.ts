import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VideoItem {
  videoId: number;
  title: string;
  description?: string;
  fileUrl: string;
  duration?: number;
  orderNumber: number;
  moduleId?: number;
  uploadedAt?: string;
}

export interface QuizItem {
  quizId: number;
  title: string;
  description?: string;
  quizType: 'MULTIPLE_CHOICE' | 'ESSAY';
  timeLimit?: number;
  orderNumber: number;
  moduleId?: number;
  published: boolean;
  allowMultipleAttempts?: boolean;
  isCompleted?: boolean;
  score?: number;
}

export interface ModuleProgress {
  progressId: number;
  contentCompleted: boolean;
  videoCompleted: boolean;
  testCompleted: boolean;
  testUnlocked: boolean;
  moduleCompleted: boolean;
  completedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleContentService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // Video services
  getVideosByModule(moduleId: number): Observable<VideoItem[]> {
    return this.http.get<VideoItem[]>(`${this.apiUrl}/videos/module/${moduleId}`);
  }

  // Quiz services
  getQuizzesByModule(moduleId: number, publishedOnly: boolean = false): Observable<QuizItem[]> {
    let params = new HttpParams();
    if (publishedOnly) {
      params = params.set('publish', 'true');
    }
    return this.http.get<QuizItem[]>(`${this.apiUrl}/quizzes/module/${moduleId}`, { params });
  }

  // Progress services
  updateContentProgress(moduleId: number, completed: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/module-progress/content/${moduleId}`, { completed });
  }

  updateVideoProgress(moduleId: number, completed: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/module-progress/video/${moduleId}`, { completed });
  }

  updateTestProgress(moduleId: number, completed: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/module-progress/test/${moduleId}`, { completed });
  }

  checkTestUnlock(moduleId: number): Observable<{ unlocked: boolean }> {
    return this.http.get<{ unlocked: boolean }>(`${this.apiUrl}/module-progress/test-unlock/${moduleId}`);
  }

  getCourseProgress(courseId: number): Observable<ModuleProgress[]> {
    return this.http.get<ModuleProgress[]>(`${this.apiUrl}/module-progress/course/${courseId}`);
  }

  getModuleProgress(moduleId: number): Observable<ModuleProgress> {
    return this.http.get<ModuleProgress>(`${this.apiUrl}/module-progress/module/${moduleId}`);
  }
}
