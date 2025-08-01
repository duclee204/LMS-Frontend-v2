import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ContentItem } from './content.service';

export interface ModuleItem {
  moduleId?: number;
  title: string;
  orderNumber: number;
  description?: string;
  status: 'Published' | 'NotPublished';
  showDropdown?: boolean;
  expanded?: boolean;
  contents?: ContentItem[];
  videos?: any[];
  quizzes?: any[];
  progress?: any;
  // ✅ Add progress fields from backend API
  completionPercentage?: number;
  contentCompleted?: boolean;
  videoCompleted?: boolean;
  testCompleted?: boolean;
  moduleCompleted?: boolean;
}

export interface ModuleDto {
  courseId: number;
  title: string;
  description: string;
  orderNumber: number;
  published: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  
  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  getModules(): Observable<ModuleItem[]> {
    return this.apiService.get<ModuleItem[]>('/modules');
  }

  getModulesByCourse(courseId: number): Observable<ModuleItem[]> {
    return this.apiService.get<ModuleItem[]>(`/modules/course/${courseId}`);
  }

  // Get only published modules for students
  getPublishedModulesByCourse(courseId: number): Observable<ModuleItem[]> {
    return this.apiService.get<ModuleItem[]>(`/modules/course/${courseId}/published`);
  }

  createModule(module: Partial<ModuleItem>): Observable<ModuleItem> {
    return this.apiService.post<ModuleItem>('/modules', module);
  }

  createModuleForCourse(courseId: number, module: ModuleDto): Observable<ModuleItem> {
    return this.apiService.post<ModuleItem>(`/modules/${courseId}`, module);
  }

  updateModule(module: ModuleItem): Observable<ModuleItem> {
    const moduleDto: ModuleDto = {
      courseId: 0, // Will be determined by backend based on existing module
      title: module.title,
      description: module.description || '',
      orderNumber: module.orderNumber,
      published: module.status === 'Published'
    };

    return this.apiService.put<ModuleItem>(`/modules/${module.moduleId}`, moduleDto);
  }

  updateModuleStatus(moduleId: number, published: boolean): Observable<any> {
    return this.apiService.put<any>(`/modules/${moduleId}/status?published=${published}`, {});
  }

  deleteModule(moduleId: number): Observable<void> {
    return this.apiService.delete<void>(`/modules/${moduleId}`);
  }
}
