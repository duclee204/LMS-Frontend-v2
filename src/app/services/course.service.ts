import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

export interface Course {
  courseId: number; // ✅ Đổi từ 'id' thành 'courseId' để khớp với backend
  title: string;
  description: string;
  categoryId: number;
  instructorId: number;
  status: string;
  price: number;
  thumbnailUrl: string;
  instructorImage?: string; // Optional vì có thể không có
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private baseUrl = 'http://localhost:8080/api/courses';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  getCourses(categoryId?: number, status?: string): Observable<Course[]> {
    let params = new HttpParams();
    if (categoryId != null) params = params.set('categoryId', categoryId.toString());
    if (status) params = params.set('status', status);

    // Add token for authentication (SSR-safe)
    let headers = new HttpHeaders();
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return this.http.get<Course[]>(`${this.baseUrl}/list`, { params, headers });
  }

  createCourse(
    course: Omit<Course, 'courseId' | 'thumbnailUrl' | 'instructorImage'>,
    imageFile: File
  ): Observable<any> {
    const formData = this.buildFormData(course, imageFile);
    return this.http.post(`${this.baseUrl}/create`, formData);
  }

  updateCourse(
    id: number,
    courseData: Partial<Course>,
    imageFile?: File
  ): Observable<any> {
    const formData = this.buildFormData(courseData, imageFile);
    return this.http.put(`${this.baseUrl}/${id}`, formData);
  }

  deleteCourse(courseId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${courseId}`, {
      responseType: 'text'  // nếu backend trả về chuỗi thay vì JSON
    });
  }

  // ✅ Get course by ID - accessible to all authenticated users
  getCourseById(courseId: number): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${courseId}`);
  }

  // ✅ Helper để build FormData
  private buildFormData(courseData: any, imageFile?: File): FormData {
    const formData = new FormData();
    formData.append(
      'course',
      new Blob([JSON.stringify(courseData)], { type: 'application/json' })
    );
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return formData;
  }
}
