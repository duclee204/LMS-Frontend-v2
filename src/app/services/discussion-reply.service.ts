import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface DiscussionReply {
  replyId?: number;
  discussionId: number;
  userId: number;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  content: string;
  attachmentUrl?: string; // File attachment URL
  attachmentName?: string; // Original file name
  createdAt?: string;
  parentReplyId?: number; // ID của reply cha (null nếu là reply gốc)
  replies?: DiscussionReply[]; // Các reply con
  isReplying?: boolean; // Flag để hiển thị form reply
}

@Injectable({
  providedIn: 'root'
})
export class DiscussionReplyService {

  constructor(private apiService: ApiService) { }

  createReply(reply: DiscussionReply): Observable<DiscussionReply> {
    return this.apiService.post<DiscussionReply>('/discussion-replies', reply);
  }

  getRepliesByDiscussion(discussionId: number): Observable<DiscussionReply[]> {
    return this.apiService.get<DiscussionReply[]>(`/discussion-replies/discussion/${discussionId}`);
  }

  getReplyCount(discussionId: number): Observable<{count: number}> {
    return this.apiService.get<{count: number}>(`/discussion-replies/count/${discussionId}`);
  }

  deleteReply(replyId: number): Observable<{message: string}> {
    return this.apiService.delete<{message: string}>(`/discussion-replies/${replyId}`);
  }

  // Reply to a specific reply (nested reply)
  replyToReply(reply: DiscussionReply): Observable<DiscussionReply> {
    return this.apiService.post<DiscussionReply>('/discussion-replies/nested', reply);
  }

  // Get replies with nested structure
  getRepliesWithNested(discussionId: number): Observable<DiscussionReply[]> {
    return this.apiService.get<DiscussionReply[]>(`/discussion-replies/nested/${discussionId}`);
  }

  // Upload file for reply
  uploadFile(formData: FormData): Observable<any> {
    return this.apiService.post('/discussions/upload', formData);
  }
}
