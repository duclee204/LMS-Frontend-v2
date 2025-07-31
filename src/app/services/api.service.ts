import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  getAllCoursesWithStatus(userId: number): Observable<any[]> {
    return this.get<any[]>(`/courses/all-with-status?userId=${userId}`);
  }
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // GET request - interceptor sẽ tự động thêm token
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`);
  }

  // POST request - interceptor sẽ tự động thêm token
  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data);
  }

  // POST FormData - interceptor sẽ tự động thêm token  
  postFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, formData);
  }

  // PUT request - interceptor sẽ tự động thêm token
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data);
  }

  // DELETE request - interceptor sẽ tự động thêm token
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }

  // GET blob request - interceptor sẽ tự động thêm token (dành cho video streaming)
  getBlob(endpoint: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${endpoint}`, { 
      responseType: 'blob' 
    });
  }

  // Video-specific methods
  getVideosByCourse(courseId: number, publishedOnly: boolean = false): Observable<any[]> {
    const url = publishedOnly 
      ? `/videos/course/${courseId}?published=true`
      : `/videos/course/${courseId}`;
    return this.get<any[]>(url);
  }

  streamVideo(videoId: number): Observable<Blob> {
    // Interceptor sẽ tự động thêm Authorization header
    return this.http.get(`${this.baseUrl}/videos/stream/${videoId}`, {
      responseType: 'blob'
    });
  }

  uploadVideo(formData: FormData): Observable<any> {
    return this.postFormData('/videos/upload', formData);
  }

  // Essay file upload
  uploadEssayFile(formData: FormData): Observable<any> {
    return this.postFormData('/upload/essay', formData);
  }

  // Course-specific methods
  getCoursesByUser(categoryId?: number, status?: string): Observable<any[]> {
    let endpoint = '/courses/list';
    const params = [];
    if (categoryId) params.push(`categoryId=${categoryId}`);
    if (status) params.push(`status=${status}`);
    if (params.length) endpoint += `?${params.join('&')}`;
    
    return this.get<any[]>(endpoint);
  }

  // Admin method để lấy tất cả khóa học
  getAllCourses(): Observable<any[]> {
    return this.get<any[]>('/courses/list');
  }
}
