import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface ContentItem {
  contentId?: number;
  moduleId: number;
  title: string;
  contentType: 'document' | 'link';
  contentUrl?: string;
  fileName?: string;
  description?: string;
  orderNumber: number;
  isPublished: boolean;
  showDropdown?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Backend response DTO interface
interface BackendContentResponse {
  contentId: number;
  moduleId: number;
  title: string;
  type: string;
  contentUrl?: string;
  fileName?: string;
  orderNumber: number;
  published: boolean; // Backend uses 'published', not 'isPublished'
}

export interface ContentDto {
  moduleId: number;
  title: string;
  contentType: 'document' | 'link';
  contentUrl?: string; // For link content
  description?: string;
  orderNumber: number;
  isPublished: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private baseUrl = 'http://localhost:8080/api/contents';

  constructor(private http: HttpClient) {}

  // Get all contents for a module
  getContentsByModule(moduleId: number): Observable<ContentItem[]> {
    return this.http.get<BackendContentResponse[]>(`${this.baseUrl}/module/${moduleId}`).pipe(
      map(backendContents => backendContents.map(content => ({
        contentId: content.contentId,
        moduleId: content.moduleId,
        title: content.title,
        contentType: content.type as 'document' | 'link',
        contentUrl: content.contentUrl,
        fileName: content.fileName,
        orderNumber: content.orderNumber,
        isPublished: content.published // Map 'published' to 'isPublished'
      } as ContentItem)))
    );
  }

  // Get only published contents for a module (for students)
  getPublishedContentsByModule(moduleId: number): Observable<ContentItem[]> {
    return this.http.get<BackendContentResponse[]>(`${this.baseUrl}/module/${moduleId}/published`).pipe(
      map(backendContents => backendContents.map(content => ({
        contentId: content.contentId,
        moduleId: content.moduleId,
        title: content.title,
        contentType: content.type as 'document' | 'link',
        contentUrl: content.contentUrl,
        fileName: content.fileName,
        orderNumber: content.orderNumber,
        isPublished: content.published // Map 'published' to 'isPublished'
      } as ContentItem)))
    );
  }

  // Create new content
  createContent(content: ContentDto, file?: File): Observable<ContentItem> {
    const formData = new FormData();
    formData.append('moduleId', content.moduleId.toString());
    formData.append('title', content.title);
    formData.append('contentType', content.contentType);
    formData.append('orderNumber', content.orderNumber.toString());
    formData.append('isPublished', content.isPublished.toString());
    
    if (content.description) {
      formData.append('description', content.description);
    }
    
    if (content.contentUrl) {
      formData.append('contentUrl', content.contentUrl);
    }
    
    if (file) {
      formData.append('file', file);
    }

    return this.http.post<BackendContentResponse>(this.baseUrl, formData).pipe(
      map(backendContent => ({
        contentId: backendContent.contentId,
        moduleId: backendContent.moduleId,
        title: backendContent.title,
        contentType: backendContent.type as 'document' | 'link',
        contentUrl: backendContent.contentUrl,
        fileName: backendContent.fileName,
        orderNumber: backendContent.orderNumber,
        isPublished: backendContent.published
      } as ContentItem))
    );
  }

  // Update content (with URL changes)
  updateContent(contentId: number, content: Partial<ContentDto>): Observable<ContentItem> {
    const requestBody = {
      title: content.title,
      contentType: content.contentType,
      description: content.description || '',
      orderNumber: content.orderNumber,
      published: content.isPublished, // Backend expects 'published'
      contentUrl: (content as any).contentUrl // Include contentUrl if provided
    };

    return this.http.put<BackendContentResponse>(`${this.baseUrl}/${contentId}`, requestBody).pipe(
      map(backendContent => ({
        contentId: backendContent.contentId,
        moduleId: backendContent.moduleId,
        title: backendContent.title,
        contentType: backendContent.type as 'document' | 'link',
        contentUrl: backendContent.contentUrl,
        fileName: backendContent.fileName,
        orderNumber: backendContent.orderNumber,
        isPublished: backendContent.published
      } as ContentItem))
    );
  }

  // Update content info only (no file/URL changes)
  updateContentInfo(contentId: number, content: Partial<ContentDto>): Observable<ContentItem> {
    const requestBody = {
      title: content.title,
      contentType: content.contentType,
      description: content.description || '',
      orderNumber: content.orderNumber,
      published: content.isPublished // Backend expects 'published'
    };

    return this.http.put<BackendContentResponse>(`${this.baseUrl}/${contentId}/info`, requestBody).pipe(
      map(backendContent => ({
        contentId: backendContent.contentId,
        moduleId: backendContent.moduleId,
        title: backendContent.title,
        contentType: backendContent.type as 'document' | 'link',
        contentUrl: backendContent.contentUrl,
        fileName: backendContent.fileName,
        orderNumber: backendContent.orderNumber,
        isPublished: backendContent.published
      } as ContentItem))
    );
  }

  // Update content with new file
  updateContentWithFile(contentId: number, content: ContentDto, file: File): Observable<ContentItem> {
    const formData = new FormData();
    formData.append('title', content.title);
    formData.append('contentType', content.contentType);
    formData.append('orderNumber', content.orderNumber.toString());
    formData.append('isPublished', content.isPublished.toString());
    formData.append('file', file);
    
    if (content.description) {
      formData.append('description', content.description);
    }

    return this.http.put<BackendContentResponse>(`${this.baseUrl}/${contentId}/file`, formData).pipe(
      map(backendContent => ({
        contentId: backendContent.contentId,
        moduleId: backendContent.moduleId,
        title: backendContent.title,
        contentType: backendContent.type as 'document' | 'link',
        contentUrl: backendContent.contentUrl,
        fileName: backendContent.fileName,
        orderNumber: backendContent.orderNumber,
        isPublished: backendContent.published
      } as ContentItem))
    );
  }

  // Delete content
  deleteContent(contentId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${contentId}`, { responseType: 'text' });
  }

  // Update content status
  updateContentStatus(contentId: number, published: boolean): Observable<any> {
    return this.http.put(`${this.baseUrl}/${contentId}/status?published=${published}`, {}, { responseType: 'text' });
  }
}
