import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

// Discussion Models
export interface Discussion {
  discussionId?: number;
  courseId: number;
  authorId: number;
  authorName?: string;
  authorRole?: string;
  title?: string; // Optional for replies
  content: string;
  type: 'PUBLIC' | 'PRIVATE'; // PUBLIC: all course members, PRIVATE: specific user
  targetUserId?: number; // For private discussions
  targetUserName?: string;
  parentId?: number; // For replies
  replies?: Discussion[]; // For main discussions
  attachmentUrl?: string; // File attachment URL
  attachmentName?: string; // Original file name
  createdAt?: string;
  updatedAt?: string;
  repliesCount?: number;
  unreadRepliesCount?: number; // Number of unread replies
  totalRepliesCount?: number; // Total number of replies
  lastReplyAt?: string;
  lastReplyBy?: string;
  isRead?: boolean; // Whether current user has read this discussion
}

// DiscussionReply interface for backward compatibility, but now maps to Discussion
export interface DiscussionReply extends Discussion {
  replyId?: number; // Alias for discussionId
}

export interface CreateDiscussionDto {
  courseId: number;
  title?: string; // Optional for replies
  content: string;
  type: 'PUBLIC' | 'PRIVATE';
  targetUserId?: number;
  parentId?: number; // For replies
  attachmentUrl?: string; // File attachment URL
  attachmentName?: string; // Original file name
}

export interface CreateReplyDto {
  discussionId: number; // This is actually parentId
  content: string;
}

export interface DiscussionResponse {
  success: boolean;
  discussion?: Discussion;
  discussions?: Discussion[];
  replies?: DiscussionReply[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiscussionService {

  constructor(private apiService: ApiService) { }

  // Get all discussions for a course
  getDiscussionsByCourse(courseId: number): Observable<DiscussionResponse> {
    return this.apiService.get(`/discussions/course/${courseId}`).pipe(
      map((discussions: any) => {
        console.log('📨 Raw discussions from backend:', discussions);
        
        // Map backend DiscussionDTO to frontend Discussion interface
        const mappedDiscussions = (discussions || []).map((dto: any) => ({
          discussionId: dto.id, // Backend uses 'id', frontend expects 'discussionId'
          courseId: dto.courseId,
          authorId: dto.userId, // Backend uses 'userId', frontend expects 'authorId'
          authorName: dto.userName, // Backend uses 'userName', frontend expects 'authorName'
          authorRole: dto.userRole, // Backend uses 'userRole', frontend expects 'authorRole'
          title: dto.title,
          content: dto.content,
          type: dto.type || 'PUBLIC', // Use actual type from backend
          targetUserId: dto.targetUserId,
          targetUserName: dto.targetUserName,
          parentId: dto.parentId,
          attachmentUrl: dto.attachmentUrl,
          attachmentName: dto.attachmentName,
          replies: dto.replies ? dto.replies.map((reply: any) => ({
            discussionId: reply.id,
            courseId: reply.courseId,
            authorId: reply.userId,
            authorName: reply.userName,
            authorRole: reply.userRole,
            content: reply.content,
            type: reply.type || 'PUBLIC',
            parentId: reply.parentId,
            attachmentUrl: reply.attachmentUrl,
            attachmentName: reply.attachmentName,
            createdAt: reply.createdAt
          })) : [],
          createdAt: dto.createdAt,
          repliesCount: dto.replies ? dto.replies.length : 0,
          totalRepliesCount: dto.replies ? dto.replies.length : 0
        }));
        
        console.log('✅ Mapped discussions:', mappedDiscussions);
        
        return {
          success: true,
          discussions: mappedDiscussions
        };
      }),
      catchError((error: any) => {
        console.error('❌ Error fetching discussions:', error);
        return of({ success: false, discussions: [], message: error.message || 'Failed to load discussions' });
      })
    );
  }

  // Get my discussions (sent or received)
  getMyDiscussions(courseId: number): Observable<DiscussionResponse> {
    return this.apiService.get(`/discussions/my/${courseId}`);
  }

  // Get discussion by ID with replies
  getDiscussionById(discussionId: number): Observable<DiscussionResponse> {
    return this.apiService.get(`/discussions/${discussionId}/replies`).pipe(
      map((replies: any) => {
        console.log('📨 Raw replies from backend:', replies);
        
        // Map backend DiscussionDTO replies to frontend Discussion interface
        const mappedReplies = (replies || []).map((dto: any) => ({
          discussionId: dto.id,
          courseId: dto.courseId,
          authorId: dto.userId,
          authorName: dto.userName,
          authorRole: dto.userRole,
          title: dto.title,
          content: dto.content,
          type: 'PUBLIC' as const,
          parentId: dto.parentId,
          createdAt: dto.createdAt
        }));
        
        console.log('✅ Mapped replies:', mappedReplies);
        
        return {
          success: true,
          replies: mappedReplies
        };
      }),
      catchError((error: any) => {
        console.error('❌ Error fetching discussion replies:', error);
        return of({ success: false, replies: [], message: error.message || 'Failed to load replies' });
      })
    );
  }

  // Create new discussion
  createDiscussion(discussionDto: CreateDiscussionDto): Observable<DiscussionResponse> {
    console.log('🔄 Creating discussion:', discussionDto);
    
    return this.apiService.post('/discussions', discussionDto).pipe(
      map((discussion: any) => {
        console.log('✅ Discussion created:', discussion);
        
        // Map backend response to frontend interface
        const mappedDiscussion = {
          discussionId: discussion.id,
          courseId: discussion.courseId,
          authorId: discussion.userId,
          authorName: discussion.userName,
          authorRole: discussion.userRole,
          title: discussion.title,
          content: discussion.content,
          type: discussion.type || 'PUBLIC',
          targetUserId: discussion.targetUserId,
          targetUserName: discussion.targetUserName,
          parentId: discussion.parentId,
          createdAt: discussion.createdAt
        };
        
        return {
          success: true,
          discussion: mappedDiscussion
        };
      }),
      catchError((error: any) => {
        console.error('❌ Error creating discussion:', error);
        let errorMessage = 'Failed to create discussion';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 403) {
          errorMessage = 'Bạn không có quyền tạo thảo luận trong khóa học này';
        } else if (error.status === 400) {
          errorMessage = 'Dữ liệu không hợp lệ';
        }
        
        return of({ success: false, message: errorMessage });
      })
    );
  }

  // Reply to discussion
  replyToDiscussion(replyDto: CreateReplyDto): Observable<DiscussionResponse> {
    // Get the course ID from the current discussion context
    // We'll pass the parent discussion ID and let backend handle the course assignment
    const discussionDto = {
      parentId: replyDto.discussionId, // This is the parent discussion ID
      content: replyDto.content,
      type: 'PUBLIC' // Replies are typically public
    };
    
    console.log('🔄 Sending reply data:', discussionDto);
    
    return this.apiService.post('/discussions/reply', discussionDto).pipe(
      map((reply: any) => {
        console.log('✅ Reply created successfully:', reply);
        return {
          success: true,
          discussion: reply
        };
      }),
      catchError((error: any) => {
        console.error('❌ Error creating reply:', error);
        let errorMessage = 'Failed to create reply';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status === 403) {
          errorMessage = 'Bạn không có quyền trả lời thảo luận này';
        } else if (error.status === 404) {
          errorMessage = 'Không tìm thấy thảo luận gốc';
        } else if (error.status === 400) {
          errorMessage = 'Dữ liệu không hợp lệ';
        }
        
        return of({ 
          success: false, 
          message: errorMessage 
        });
      })
    );
  }

  // Update discussion
  updateDiscussion(discussionId: number, updateData: Partial<Discussion>): Observable<DiscussionResponse> {
    return this.apiService.put(`/discussions/${discussionId}`, updateData);
  }

  // Delete discussion (only author or instructor)
  deleteDiscussion(discussionId: number): Observable<DiscussionResponse> {
    return this.apiService.delete(`/discussions/${discussionId}`);
  }

  // Mark discussion as resolved
  markAsResolved(discussionId: number): Observable<DiscussionResponse> {
    return this.apiService.put(`/discussions/${discussionId}/resolve`, {});
  }

  // Mark discussion as read
  markDiscussionAsRead(discussionId: number): Observable<any> {
    return this.apiService.post(`/discussions/${discussionId}/mark-read`, {});
  }

  // Mark reply as read  
  markReplyAsRead(replyId: number): Observable<any> {
    return this.apiService.post(`/discussion-replies/${replyId}/mark-read`, {});
  }

  // Get read status for discussion and replies
  getReadStatus(discussionId: number): Observable<any> {
    return this.apiService.get(`/discussions/${discussionId}/read-status`);
  }

  // Get course members for private messaging
  getCourseMembers(courseId: number): Observable<any> {
    return this.apiService.get(`/enrollments/course/${courseId}/enrollments`);
  }

  // Get course instructor info
  getCourseInstructor(courseId: number): Observable<any> {
    return this.apiService.get(`/courses/${courseId}`);
  }

  // Alternative method to get instructor info if the primary method fails
  getCourseInstructorAlternative(courseId: number): Observable<any> {
    // Try getting from course list with proper JOIN
    return this.apiService.get(`/courses/list?instructorId=null`);
  }

  // Method to get user info by ID (as a last resort)
  getUserById(userId: number): Observable<any> {
    return this.apiService.get(`/users/${userId}`);
  }

  // Upload file for discussion
  uploadFile(formData: FormData): Observable<any> {
    return this.apiService.post('/discussions/upload', formData);
  }
}