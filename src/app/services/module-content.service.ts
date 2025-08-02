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
  published?: boolean;
  showDropdown?: boolean; // For UI dropdown control
  isCompleted?: boolean; // Progress tracking
  watchedPercentage?: number; // Progress tracking
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
  showDropdown?: boolean; // For UI dropdown control
}

export interface ContentItem {
  contentId: number;
  title: string;
  description?: string;
  content?: string;
  contentType: 'TEXT' | 'PDF' | 'DOCUMENT';
  fileUrl?: string;
  orderNumber: number;
  moduleId?: number;
  published?: boolean;
  isCompleted?: boolean; // Progress tracking
  viewedAt?: string; // Progress tracking
}

export interface ModuleProgress {
  progressId: number;
  moduleId: number;
  contentCompleted: boolean;
  videoCompleted: boolean;
  testCompleted: boolean;
  testUnlocked: boolean;
  moduleCompleted: boolean;
  completedAt?: string;
  totalContents?: number;
  completedContents?: number;
  totalVideos?: number;
  completedVideos?: number;
  totalTests?: number;
  completedTests?: number;
}

export interface VideoProgress {
  progressId: number;
  videoId: number;
  watchedDuration: number;
  totalDuration: number;
  watchedPercentage: number;
  completed: boolean;
  lastWatchedAt?: string;
}

export interface ContentProgress {
  progressId: number;
  contentId: number;
  viewed: boolean;
  viewedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleContentService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // Video services
  getVideosByModule(moduleId: number, publishedOnly: boolean = false): Observable<VideoItem[]> {
    let params = new HttpParams();
    if (publishedOnly) {
      params = params.set('published', 'true');
    }
    return this.http.get<VideoItem[]>(`${this.apiUrl}/videos/module/${moduleId}`, { params });
  }

  // Content services
  getContentsByModule(moduleId: number, publishedOnly: boolean = false): Observable<ContentItem[]> {
    let params = new HttpParams();
    if (publishedOnly) {
      params = params.set('published', 'true');
    }
    return this.http.get<ContentItem[]>(`${this.apiUrl}/contents/module/${moduleId}`, { params });
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

  updateVideoProgress(videoId: number, completed: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/video-progress/${videoId}`, { completed });
  }

  updateTestProgress(moduleId: number, completed: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/module-progress/test/${moduleId}`, { completed });
  }

  // Individual content progress tracking
  markContentAsViewed(contentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/module-progress/content-progress/${contentId}/viewed`, {});
  }

  // Video progress tracking
  updateVideoWatchProgress(videoId: number, watchedDuration: number, totalDuration: number): Observable<any> {
    const watchedPercentage = totalDuration > 0 ? (watchedDuration / totalDuration) * 100 : 0;
    return this.http.post(`${this.apiUrl}/module-progress/video-progress/${videoId}/watch`, {
      watchedDuration,
      totalDuration,
      watchedPercentage,
      completed: watchedPercentage >= 90 // Consider completed if watched 90% or more
    });
  }

  // Get individual progress
  getVideoProgress(videoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/module-progress/video-progress/${videoId}`);
  }

  getContentProgress(contentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/module-progress/content-progress/${contentId}`);
  }

  checkTestUnlock(moduleId: number): Observable<{ unlocked: boolean }> {
    return this.http.get<{ unlocked: boolean }>(`${this.apiUrl}/module-progress/test-unlock/${moduleId}`);
  }

  // Test completion tracking
  completeTest(moduleId: number, testData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/module-progress/test/${moduleId}`, { completed: true, ...testData });
  }

  // Module progress aggregation - check if all items in module are completed
  getModuleProgressDetails(moduleId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/progress-details`);
  }

  getCourseProgress(courseId: number): Observable<ModuleProgress[]> {
    return this.http.get<ModuleProgress[]>(`${this.apiUrl}/module-progress/course/${courseId}`);
  }

  getModuleProgress(moduleId: number): Observable<ModuleProgress> {
    return this.http.get<ModuleProgress>(`${this.apiUrl}/module-progress/module/${moduleId}`);
  }

  // Video management methods
  updateVideoStatus(videoId: number, published: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/videos/${videoId}/status`, { published });
  }

  updateVideo(videoId: number, videoData: Partial<VideoItem>): Observable<VideoItem> {
    return this.http.put<VideoItem>(`${this.apiUrl}/videos/${videoId}`, videoData);
  }

  deleteVideo(videoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/videos/${videoId}`);
  }

  // Quiz management methods
  updateQuizStatus(quizId: number, published: boolean): Observable<any> {
    const params = new HttpParams().set('publish', published.toString());
    return this.http.put(`${this.apiUrl}/quizzes/${quizId}/status`, null, { params });
  }

  updateQuiz(quizId: number, quizData: Partial<QuizItem>): Observable<QuizItem> {
    return this.http.put<QuizItem>(`${this.apiUrl}/quizzes/${quizId}`, quizData);
  }

  deleteQuiz(quizId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/quizzes/${quizId}`);
  }

  // Quiz progress methods
  getQuizProgress(quizId: number): Observable<any> {
    return this.http.get(`http://localhost:8080/api/exam/check-submission/${quizId}`);
  }
}
