import { Component, OnInit, Inject, PLATFORM_ID, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DiscussionService, Discussion, CreateDiscussionDto } from '../../../services/discussion.service';
import { DiscussionReplyService, DiscussionReply } from '../../../services/discussion-reply.service';
import { SessionService } from '../../../services/session.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';

@Component({
  selector: 'app-discussion',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent, SidebarWrapperComponent, ProfileComponent],
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.scss']
})
export class DiscussionComponent implements OnInit {
  
  // Component state
  currentView: 'list' | 'create' | 'detail' = 'list';
  courseId: number | null = null;
  username: string = '';
  userRole: string = '';
  avatarUrl: string = '';
  isInstructor: boolean = false;
  
  // Discussion data
  discussions: Discussion[] = [];
  selectedDiscussion: Discussion | null = null;
  discussionReplies: DiscussionReply[] = []; // Now using DiscussionReply interface
  courseMembers: any[] = [];
  courseInstructor: any = null;
  
  // Form data
  newDiscussion: CreateDiscussionDto = {
    courseId: 0,
    title: '',
    content: '',
    type: 'PUBLIC'
  };
  replyContent: string = '';
  replyMode: 'text' | 'file' = 'text';
  
  // Reply form visibility
  showMainReplyForm: boolean = false; // Control main reply form visibility
  
  // Nested reply data
  nestedReplyContent: { [key: number]: string } = {}; // Content for each reply
  activeNestedReply: number | null = null; // Currently active nested reply form
  
  // History management for text editor
  textHistory: string[] = [];
  currentHistoryIndex: number = -1;
  
  // Nested reply history management
  nestedTextHistory: { [key: number]: string[] } = {};
  nestedCurrentHistoryIndex: { [key: number]: number } = {};
  
  // File upload for replies
  selectedReplyFile: File | null = null;
  nestedSelectedFiles: { [key: number]: File } = {};
  
  // Loading and UI states
  isLoading: boolean = false;
  showDropZone: boolean = false;
  
  // Filters and search
  filterType: 'all' | 'my' | 'public' | 'private' = 'all';
  searchTerm: string = '';
  filteredDiscussions: Discussion[] = [];
  
  // Loading states
  loading: boolean = false;
  loadingReplies: boolean = false;
  submitting: boolean = false;

  // File upload
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;

  // Scroll tracking for read status
  @ViewChild('discussionDetail', { static: false }) discussionDetailRef!: ElementRef;
  private scrollTimeout: any;
  private hasScrolledToBottom = false;

  constructor(
    private route: ActivatedRoute,
    private discussionService: DiscussionService,
    private discussionReplyService: DiscussionReplyService,
    private sessionService: SessionService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Initialize user info
    this.username = this.sessionService.getFullName() || 'User';
    this.userRole = this.sessionService.getUserRole() || 'student';
    this.isInstructor = this.userRole === 'instructor';
    this.avatarUrl = '';

    // Get courseId from query params
    this.route.queryParams.subscribe(params => {
      this.courseId = params['courseId'] ? +params['courseId'] : null;
      if (this.courseId) {
        this.newDiscussion.courseId = this.courseId;
        this.loadDiscussions();
        this.loadCourseData();
      }
    });

    // Initialize with some sample history for testing
    this.initializeHistory();
  }

  // Initialize history
  private initializeHistory() {
    // Initialize with empty string as first history entry
    this.textHistory = [''];
    this.currentHistoryIndex = 0;
    console.log('🏁 History initialized with empty entry');
  }

  // Helper method để hiển thị thông báo
  private showAlert(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (type === 'success') {
      this.notificationService.success('Thành công', message);
    } else if (type === 'error') {
      this.notificationService.error('Lỗi', message);
    } else if (type === 'warning') {
      this.notificationService.warning('Cảnh báo', message);
    } else {
      this.notificationService.info('Thông báo', message);
    }
  }

  // Load discussions
  loadDiscussions(): void {
    if (!this.courseId) return;
    
    this.loading = true;
    this.discussionService.getDiscussionsByCourse(this.courseId).subscribe({
      next: (response) => {
        if (response.success && response.discussions) {
          this.discussions = response.discussions;
          this.applyFilters();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading discussions:', error);
        this.showAlert('Không thể tải danh sách thảo luận', 'error');
        this.loading = false;
      }
    });
  }

  // Load course data based on user role
  loadCourseData(): void {
    if (this.isInstructor) {
      this.loadCourseMembers(); // Instructors can see all students
    } else {
      this.loadCourseInstructor(); // Students can see instructor
    }
  }

  // Load course instructor info for students
  loadCourseInstructor(): void {
    if (!this.courseId) return;
    
    console.log('🔍 Loading course instructor for courseId:', this.courseId);
    this.discussionService.getCourseInstructor(this.courseId).subscribe({
      next: (response) => {
        console.log('📝 Course instructor response:', response);
        
        // First try: instructor object is populated (from JOINed query)
        if (response && response.instructor && response.instructor.userId) {
          this.courseInstructor = {
            id: response.instructor.userId,
            fullName: response.instructor.fullName || response.instructor.username || 'Giảng viên',
            role: 'instructor'
          };
          console.log('👨‍🏫 Course instructor (from instructor object):', this.courseInstructor);
          this.showAlert('Đã tải thông tin giảng viên', 'success');
        } 
        // Second try: instructorId exists but instructor object is null
        else if (response && response.instructorId && response.instructorId > 0) {
          // Try to get instructor name from instructorName field if available
          const instructorName = response.instructorName || 'Giảng viên';
          this.courseInstructor = {
            id: response.instructorId,
            fullName: instructorName,
            role: 'instructor'
          };
          console.log('👨‍🏫 Course instructor (from instructorId + instructorName):', this.courseInstructor);
          this.showAlert('Đã tải thông tin giảng viên', 'success');
        }
        // Third try: Course object exists but instructorId is null - try to load from course members if instructor
        else if (response && response.courseId && !response.instructorId) {
          console.warn('⚠️ Course exists but no instructor assigned:', response);
          
          // If current user is instructor, maybe they are the instructor but data is not set properly
          if (this.isInstructor) {
            console.log('🔧 Current user is instructor, trying to use their info as course instructor');
            this.courseInstructor = {
              id: this.sessionService.getUserId(),
              fullName: this.sessionService.getFullName() || 'Giảng viên',
              role: 'instructor'
            };
            this.showAlert('Đã sử dụng thông tin của bạn làm giảng viên khóa học', 'info');
          } else {
            this.courseInstructor = null;
            this.showAlert('Khóa học này chưa có giảng viên được phân công', 'warning');
          }
        }
        // Fourth try: Handle the specific case where all instructor fields are null
        else if (response && response.instructorId === null && response.title) {
          console.warn('⚠️ Course found but instructor information is null. Trying alternative approach...', response);
          
          // For now, show warning and allow students to create public discussions only
          this.courseInstructor = null;
          this.showAlert('Khóa học này chưa có giảng viên được phân công. Bạn chỉ có thể tạo thảo luận công khai.', 'warning');
        }
        // Last resort: No valid course data
        else {
          console.warn('⚠️ Invalid or empty course response:', response);
          this.courseInstructor = null;
          this.showAlert('Không thể tải thông tin khóa học', 'error');
        }
      },
      error: (error) => {
        console.error('❌ Error loading course instructor:', error);
        this.courseInstructor = null;
        if (error.status === 404) {
          this.showAlert('Không tìm thấy khóa học', 'error');
        } else if (error.status === 403) {
          this.showAlert('Bạn không có quyền xem thông tin khóa học này', 'error');
        } else {
          this.showAlert('Không thể tải thông tin giảng viên', 'error');
        }
      }
    });
  }

  // Load course members for private messaging
  loadCourseMembers(): void {
    if (!this.courseId) return;
    
    // Check if user is instructor - only instructors can load course members
    if (!this.isInstructor) {
      console.log('🔒 Only instructors can access course members list');
      this.courseMembers = [];
      return;
    }
    
    console.log('🔍 Loading course members for courseId:', this.courseId);
    this.discussionService.getCourseMembers(this.courseId).subscribe({
      next: (response) => {
        console.log('📝 Course members response:', response);
        
        // Response là List<UserDTO> trực tiếp từ backend
        if (Array.isArray(response)) {
          this.courseMembers = response
            .filter((member: any) => member.userId !== this.sessionService.getUserId())
            .map((member: any) => ({
              userId: member.userId,
              fullName: member.fullName || member.username || `User ${member.userId}`,
              role: member.role || 'student'
            }));
          
          console.log('👥 Filtered course members:', this.courseMembers);
          
          if (this.courseMembers.length > 0) {
            this.showAlert('Đã tải danh sách thành viên khóa học', 'success');
          } else {
            this.showAlert('Không có thành viên khác trong khóa học', 'warning');
          }
        } else {
          console.warn('⚠️ Unexpected response format:', response);
          this.showAlert('Định dạng dữ liệu không đúng', 'error');
        }
      },
      error: (error) => {
        console.error('❌ Error loading course members:', error);
        if (error.status === 403) {
          this.showAlert('Bạn không có quyền xem danh sách thành viên khóa học này', 'error');
        } else if (error.status === 404) {
          this.showAlert('Không tìm thấy khóa học', 'error');
        } else {
          this.showAlert('Không thể tải danh sách thành viên', 'error');
        }
        this.courseMembers = []; // Clear members on error
      }
    });
  }

  // Reload course members manually
  reloadCourseMembers(): void {
    console.log('🔄 Manually reloading course members...');
    this.courseMembers = []; // Clear current list
    this.loadCourseMembers();
  }

  // Apply filters and search
  applyFilters(): void {
    let filtered = [...this.discussions];
    
    // Apply type filter
    if (this.filterType === 'my') {
      const currentUserId = this.sessionService.getUserId();
      filtered = filtered.filter(d => 
        d.authorId === currentUserId || d.targetUserId === currentUserId
      );
    } else if (this.filterType === 'public') {
      filtered = filtered.filter(d => d.type === 'PUBLIC');
    } else if (this.filterType === 'private') {
      filtered = filtered.filter(d => d.type === 'PRIVATE');
    }
    
    // Apply search
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        (d.title && d.title.toLowerCase().includes(searchLower)) ||
        d.content.toLowerCase().includes(searchLower) ||
        (d.authorName && d.authorName.toLowerCase().includes(searchLower))
      );
    }
    
    this.filteredDiscussions = filtered;
  }

  // Change filter
  changeFilter(type: 'all' | 'my' | 'public' | 'private'): void {
    this.filterType = type;
    this.applyFilters();
  }

  // Search discussions
  onSearch(): void {
    this.applyFilters();
  }

  // View discussion detail
  viewDiscussion(discussion: Discussion): void {
    this.selectedDiscussion = discussion;
    this.currentView = 'detail';
    // Reset scroll tracking for new discussion
    this.hasScrolledToBottom = false;
    this.loadDiscussionReplies();
  }

  // Load discussion replies
  loadDiscussionReplies(): void {
    if (!this.selectedDiscussion?.discussionId) return;
    
    console.log('🔄 Loading replies for discussion:', this.selectedDiscussion.discussionId);
    
    this.loadingReplies = true;
    // Load all replies (both root and nested) and handle structure in frontend
    this.discussionReplyService.getRepliesByDiscussion(this.selectedDiscussion.discussionId).subscribe({
      next: (replies) => {
        console.log('📨 Replies response:', replies);
        this.discussionReplies = replies;
        console.log('✅ Loaded replies:', this.discussionReplies.length);
        console.log('📊 Root replies:', this.getRootReplies().length);
        console.log('📊 Nested replies:', replies.filter(r => r.parentReplyId).length);
        this.loadingReplies = false;
      },
      error: (error) => {
        console.error('❌ Error loading replies:', error);
        this.showAlert('Không thể tải danh sách trả lời', 'error');
        this.discussionReplies = [];
        this.loadingReplies = false;
      }
    });
  }

  // Create new discussion
  createDiscussion(): void {
    if (!this.validateDiscussionForm()) return;
    
    this.submitting = true;

    // If file is selected, upload it first
    if (this.selectedFile) {
      this.uploadFile(this.selectedFile).then((uploadResponse) => {
        // File uploaded successfully, now create discussion with attachment info
        this.newDiscussion.attachmentUrl = uploadResponse.fileUrl;
        this.newDiscussion.attachmentName = uploadResponse.fileName;
        this.submitDiscussion();
      }).catch((error) => {
        console.error('❌ File upload failed:', error);
        this.showAlert('Lỗi khi upload file: ' + (error.error?.message || error.message), 'error');
        this.submitting = false;
      });
    } else {
      // No file, create discussion directly
      this.submitDiscussion();
    }
  }

  private submitDiscussion(): void {
    this.discussionService.createDiscussion(this.newDiscussion).subscribe({
      next: (response) => {
        if (response.success) {
          this.showAlert('Tạo thảo luận thành công!', 'success');
          this.resetDiscussionForm();
          this.currentView = 'list';
          this.loadDiscussions();
        } else {
          this.showAlert(response.message || 'Không thể tạo thảo luận', 'error');
        }
        this.submitting = false;
      },
      error: (error) => {
        console.error('Error creating discussion:', error);
        this.showAlert('Lỗi khi tạo thảo luận', 'error');
        this.submitting = false;
      }
    });
  }

  // Reply to discussion
  replyToDiscussion(): void {
    this.submitReply();
  }

  // Delete discussion
  deleteDiscussion(discussion: Discussion): void {
    if (!discussion.discussionId || !confirm('Bạn có chắc chắn muốn xóa thảo luận này?')) return;
    
    this.discussionService.deleteDiscussion(discussion.discussionId).subscribe({
      next: (response) => {
        if (response.success) {
          this.showAlert('Xóa thảo luận thành công', 'success');
          this.loadDiscussions();
          if (this.selectedDiscussion?.discussionId === discussion.discussionId) {
            this.currentView = 'list';
            this.selectedDiscussion = null;
          }
        } else {
          this.showAlert(response.message || 'Không thể xóa thảo luận', 'error');
        }
      },
      error: (error) => {
        console.error('Error deleting discussion:', error);
        this.showAlert('Lỗi khi xóa thảo luận', 'error');
      }
    });
  }

  // Delete reply
  deleteReply(reply: any): void {
    if (!reply.id || !confirm('Bạn có chắc chắn muốn xóa trả lời này?')) return;
    
    this.discussionReplyService.deleteReply(reply.id).subscribe({
      next: (response) => {
        this.showAlert('Xóa trả lời thành công', 'success');
        // Reload replies for current discussion
        if (this.selectedDiscussion?.discussionId) {
          this.loadDiscussionReplies();
        }
      },
      error: (error) => {
        console.error('Error deleting reply:', error);
        this.showAlert('Lỗi khi xóa trả lời', 'error');
      }
    });
  }

  // Form validation
  validateDiscussionForm(): boolean {
    // For main discussions, title is required
    if (!this.newDiscussion.parentId && (!this.newDiscussion.title || !this.newDiscussion.title.trim())) {
      this.showAlert('Vui lòng nhập tiêu đề thảo luận', 'warning');
      return false;
    }
    
    if (!this.newDiscussion.content || !this.newDiscussion.content.trim()) {
      this.showAlert('Vui lòng nhập nội dung thảo luận', 'warning');
      return false;
    }
    
    if (this.newDiscussion.type === 'PRIVATE' && !this.newDiscussion.targetUserId) {
      this.showAlert('Vui lòng chọn người nhận cho thảo luận riêng tư', 'warning');
      return false;
    }
    
    return true;
  }

  // Handle type change for form data
  onTypeChange(type: string): void {
    this.newDiscussion.type = type as 'PUBLIC' | 'PRIVATE';
    if (this.newDiscussion.type === 'PUBLIC') {
      this.newDiscussion.targetUserId = undefined;
    } else if (this.newDiscussion.type === 'PRIVATE' && !this.isInstructor && this.courseInstructor) {
      // Tự động set targetUserId là instructor khi student chọn private
      this.newDiscussion.targetUserId = this.courseInstructor.id;
    }
  }

  // Reset form
  resetDiscussionForm(): void {
    this.newDiscussion = {
      courseId: this.courseId || 0,
      title: '',
      content: '',
      type: 'PUBLIC' // Always default to PUBLIC
    };
    this.removeSelectedFile(); // Clear selected file
  }

  // View navigation
  showCreateForm(): void {
    this.currentView = 'create';
    this.resetDiscussionForm();
  }

  backToList(): void {
    this.currentView = 'list';
    this.selectedDiscussion = null;
    this.replyContent = '';
  }

  // Utility methods
  canManageDiscussion(discussion: Discussion): boolean {
    const currentUserId = this.sessionService.getUserId();
    return discussion.authorId === currentUserId || this.isInstructor;
  }

  // Check if current user is the owner of discussion
  isOwner(discussion: Discussion): boolean {
    const currentUserId = this.sessionService.getUserId();
    return discussion.authorId === currentUserId;
  }

  // Check if current user can delete (owner or admin)
  canDelete(discussion: Discussion): boolean {
    const currentUserId = this.sessionService.getUserId();
    const userRole = this.sessionService.getUserRole();
    return discussion.authorId === currentUserId || userRole === 'admin';
  }

  // Check if current user can delete reply (owner or admin)
  canDeleteReply(reply: any): boolean {
    const currentUserId = this.sessionService.getUserId();
    const userRole = this.sessionService.getUserRole();
    return reply.userId === currentUserId || userRole === 'admin';
  }

  // Scroll listener to track reading
  @HostListener('scroll', ['$event'])
  onScroll(event: any): void {
    this.trackScrolling(event.target);
  }

  // Track scrolling to mark as read
  private trackScrolling(element: any): void {
    if (!element || !this.selectedDiscussion) return;
    
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Check if user has scrolled to bottom (90% threshold)
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage >= 0.9 && !this.hasScrolledToBottom) {
      this.hasScrolledToBottom = true;
      this.markDiscussionAsRead();
    }
  }

  // Mark current discussion as read
  private markDiscussionAsRead(): void {
    if (!this.selectedDiscussion?.discussionId) return;
    
    this.discussionService.markDiscussionAsRead(this.selectedDiscussion.discussionId).subscribe({
      next: (response) => {
        console.log('📖 Discussion marked as read');
        // Update read status in UI
        if (this.selectedDiscussion) {
          this.selectedDiscussion.isRead = true;
          // Update the discussion in the list as well
          const discussionInList = this.discussions.find(d => d.discussionId === this.selectedDiscussion?.discussionId);
          if (discussionInList) {
            discussionInList.isRead = true;
            discussionInList.unreadRepliesCount = 0; // Mark all replies as read when discussion is read
          }
        }
      },
      error: (error) => {
        console.error('Error marking discussion as read:', error);
      }
    });
  }

  isInstructorRole(): boolean {
    return this.isInstructor;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }

  getDisplayRole(role: string): string {
    return role === 'instructor' ? 'Giảng viên' : 'Sinh viên';
  }

  // Format text methods for rich textarea
  formatText(command: string, target?: string) {
    console.log('Format command:', command);
    
    // Get the active textarea
    let textarea: HTMLTextAreaElement;
    if (target === 'reply') {
      textarea = document.querySelector('textarea[name="replyContent"]') as HTMLTextAreaElement;
    } else {
      textarea = document.querySelector('textarea[name="discussionContent"]') as HTMLTextAreaElement;
    }
    
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    let newText = '';
    let newCursorPos = start;

    switch (command) {
      case 'bold':
        if (selectedText) {
          newText = `**${selectedText}**`;
          newCursorPos = start + newText.length;
        } else {
          newText = '**in đậm**';
          newCursorPos = start + 2;
        }
        break;
      
      case 'italic':
        if (selectedText) {
          newText = `*${selectedText}*`;
          newCursorPos = start + newText.length;
        } else {
          newText = '*in nghiêng*';
          newCursorPos = start + 1;
        }
        break;
      
      case 'underline':
        if (selectedText) {
          newText = `<u>${selectedText}</u>`;
          newCursorPos = start + newText.length;
        } else {
          newText = '<u>gạch chân</u>';
          newCursorPos = start + 3;
        }
        break;
      
      case 'bulletList':
        if (selectedText) {
          const lines = selectedText.split('\n');
          newText = lines.map(line => line.trim() ? `• ${line.trim()}` : '').join('\n');
        } else {
          newText = '• Mục danh sách\n• Mục thứ hai';
          newCursorPos = start + 2;
        }
        break;
      
      case 'numberList':
        if (selectedText) {
          const lines = selectedText.split('\n');
          newText = lines.map((line, index) => line.trim() ? `${index + 1}. ${line.trim()}` : '').join('\n');
        } else {
          newText = '1. Mục đầu tiên\n2. Mục thứ hai';
          newCursorPos = start + 3;
        }
        break;
      
      case 'link':
        this.insertLink(textarea, start, end, selectedText);
        return;
      
      default:
        return;
    }

    // Update textarea value
    const fullText = beforeText + newText + afterText;
    if (target === 'reply') {
      this.replyContent = fullText;
    } else {
      this.newDiscussion.content = fullText;
    }

    // Set cursor position after update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  }

  // Insert link functionality
  insertLink(textarea: HTMLTextAreaElement, start: number, end: number, selectedText: string) {
    const linkText = selectedText || 'văn bản hiển thị';
    const linkUrl = prompt('Nhập URL:', 'https://');
    
    if (linkUrl && linkUrl.trim() !== 'https://') {
      const linkMarkdown = `[${linkText}](${linkUrl.trim()})`;
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);
      const fullText = beforeText + linkMarkdown + afterText;
      
      // Update the appropriate model
      if (textarea.name === 'replyContent') {
        this.replyContent = fullText;
      } else {
        this.newDiscussion.content = fullText;
      }
      
      // Set cursor position after the link
      setTimeout(() => {
        textarea.focus();
        const newPos = start + linkMarkdown.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 10);
    }
  }

  // Save current text to history
  saveToHistory(text: string, target?: string) {
    // Add to history if it's different from the last entry
    if (this.textHistory.length === 0 || this.textHistory[this.textHistory.length - 1] !== text) {
      this.textHistory.push(text);
      // Keep only last 50 entries for more detailed history
      if (this.textHistory.length > 50) {
        this.textHistory.shift();
      }
      this.currentHistoryIndex = this.textHistory.length - 1;
      console.log('📝 Saved to history:', text.substring(0, 30) + (text.length > 30 ? '...' : ''), 'Total:', this.textHistory.length, 'Index:', this.currentHistoryIndex);
    }
  }

  // Navigate history backward
  navigateHistoryBack(target?: string) {
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      const historyText = this.textHistory[this.currentHistoryIndex];
      
      if (target === 'reply') {
        this.replyContent = historyText;
      } else if (target === 'create') {
        this.newDiscussion.content = historyText;
      } else {
        // Fallback: determine target based on current view
        if (this.currentView === 'create') {
          this.newDiscussion.content = historyText;
        } else {
          this.replyContent = historyText;
        }
      }
      
      console.log('⬅️ Navigate back to:', historyText.substring(0, 50) + '...', 'Index:', this.currentHistoryIndex, 'Target:', target);
    }
  }

  // Navigate history forward
  navigateHistoryForward(target?: string) {
    if (this.currentHistoryIndex < this.textHistory.length - 1) {
      this.currentHistoryIndex++;
      const historyText = this.textHistory[this.currentHistoryIndex];
      
      if (target === 'reply') {
        this.replyContent = historyText;
      } else if (target === 'create') {
        this.newDiscussion.content = historyText;
      } else {
        // Fallback: determine target based on current view
        if (this.currentView === 'create') {
          this.newDiscussion.content = historyText;
        } else {
          this.replyContent = historyText;
        }
      }
      
      console.log('➡️ Navigate forward to:', historyText.substring(0, 50) + '...', 'Index:', this.currentHistoryIndex, 'Target:', target);
    }
  }

  // Trigger file upload from toolbar
  triggerFileUpload(target?: string) {
    if (target === 'reply') {
      const fileInput = document.getElementById('replyFileUpload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    } else {
      const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  }

  // Check if can navigate back in history
  canNavigateBack(): boolean {
    const canNav = this.currentHistoryIndex > 0;
    console.log('🔍 Can navigate back:', canNav, 'Current index:', this.currentHistoryIndex, 'History length:', this.textHistory.length);
    return canNav;
  }

  // Check if can navigate forward in history
  canNavigateForward(): boolean {
    const canNav = this.currentHistoryIndex < this.textHistory.length - 1;
    console.log('🔍 Can navigate forward:', canNav, 'Current index:', this.currentHistoryIndex, 'History length:', this.textHistory.length);
    return canNav;
  }

  // File icon helper
  getFileIconClass(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
      case 'pdf': return 'fas fa-file-pdf text-red-500';
      case 'doc':
      case 'docx': return 'fas fa-file-word text-blue-500';
      case 'txt': return 'fas fa-file-alt text-gray-500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fas fa-file-image text-green-500';
      default: return 'fas fa-file text-gray-400';
    }
  }

  // Remove reply file
  removeReplyFile() {
    this.selectedReplyFile = null;
    const fileInput = document.getElementById('replyFileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Reply file select handler
  onReplyFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedReplyFile = file;
    }
  }

  // Submit reply - support both text and file
  submitReply() {
    if (!this.selectedDiscussion?.discussionId) {
      this.showAlert('Không tìm thấy thảo luận', 'error');
      return;
    }

    // Validate: must have text content
    if (!this.replyContent.trim()) {
      this.showAlert('Vui lòng nhập nội dung trả lời', 'warning');
      return;
    }
    
    this.isLoading = true;

    // Prepare reply data
    const replyDto: DiscussionReply = {
      discussionId: this.selectedDiscussion.discussionId,
      userId: this.sessionService.getUserId() || 0,
      content: this.replyContent.trim()
    };

    // If file is selected, upload it first
    if (this.selectedReplyFile) {
      this.uploadReplyFile(this.selectedReplyFile).then((uploadResponse) => {
        // File uploaded successfully, add attachment info to reply
        replyDto.attachmentUrl = uploadResponse.fileUrl;
        replyDto.attachmentName = uploadResponse.fileName;
        this.createReplyRequest(replyDto);
      }).catch((error) => {
        console.error('❌ Reply file upload failed:', error);
        this.showAlert('Lỗi khi upload file: ' + (error.error?.message || error.message), 'error');
        this.isLoading = false;
      });
    } else {
      // No file, create reply directly
      this.createReplyRequest(replyDto);
    }
  }

  // Create reply request
  private createReplyRequest(replyDto: DiscussionReply) {
    this.discussionReplyService.createReply(replyDto).subscribe({
      next: (reply) => {
        this.showAlert('Trả lời thành công!', 'success');
        this.resetReplyForm();
        this.loadDiscussionReplies();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error replying to discussion:', error);
        this.showAlert('Lỗi khi trả lời', 'error');
        this.isLoading = false;
      }
    });
  }

  // Reset reply form
  private resetReplyForm() {
    // Save current content to history before clearing
    if (this.replyContent.trim()) {
      this.saveToHistory(this.replyContent, 'reply');
    }
    
    this.replyContent = '';
    this.selectedReplyFile = null;
    
    // Reset file inputs
    const fileInput = document.getElementById('replyFileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Toggle nested reply form
  toggleNestedReply(replyId: number) {
    if (this.activeNestedReply === replyId) {
      // Close current nested reply form
      this.activeNestedReply = null;
      delete this.nestedReplyContent[replyId];
    } else {
      // Open nested reply form for this reply
      this.activeNestedReply = replyId;
      if (!this.nestedReplyContent[replyId]) {
        this.nestedReplyContent[replyId] = '';
      }
      
      // Initialize nested history for this reply if not exists
      if (!this.nestedTextHistory[replyId]) {
        this.nestedTextHistory[replyId] = [''];
        this.nestedCurrentHistoryIndex[replyId] = 0;
        console.log('🏁 Nested history initialized for reply', replyId);
      }
    }
  }

  // Submit nested reply
  async submitNestedReply(parentReplyId: number) {
    if (!this.selectedDiscussion?.discussionId) {
      this.showAlert('Không tìm thấy thảo luận', 'error');
      return;
    }

    const content = this.nestedReplyContent[parentReplyId];
    const hasFile = this.nestedSelectedFiles[parentReplyId];

    if (!content?.trim() && !hasFile) {
      this.showAlert('Vui lòng nhập nội dung trả lời hoặc chọn file', 'warning');
      return;
    }

    this.isLoading = true;

    try {
      let fileUrl = '';
      
      // Upload file if present
      if (hasFile) {
        const uploadResult = await this.uploadReplyFile(hasFile);
        fileUrl = uploadResult.url || uploadResult.filePath || '';
        console.log('📎 Nested reply file uploaded:', fileUrl);
      }

      const nestedReplyDto: DiscussionReply = {
        discussionId: this.selectedDiscussion.discussionId,
        userId: this.sessionService.getUserId() || 0,
        content: content?.trim() || '',
        parentReplyId: parentReplyId,
        attachmentUrl: fileUrl,
        attachmentName: hasFile ? hasFile.name : undefined
      };

      // Use regular createReply with parentReplyId
      this.discussionReplyService.createReply(nestedReplyDto).subscribe({
        next: (reply) => {
          this.showAlert('Trả lời thành công!', 'success');
          // Reset nested reply form
          this.activeNestedReply = null;
          delete this.nestedReplyContent[parentReplyId];
          delete this.nestedSelectedFiles[parentReplyId];
          // Clear history for this reply
          delete this.nestedTextHistory[parentReplyId];
          delete this.nestedCurrentHistoryIndex[parentReplyId];
          // Reload replies to show new nested reply
          this.loadDiscussionReplies();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error creating nested reply:', error);
          this.showAlert('Lỗi khi trả lời', 'error');
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error uploading nested file:', error);
      this.showAlert('Lỗi khi tải file lên', 'error');
      this.isLoading = false;
    }
  }

  // Cancel nested reply
  cancelNestedReply(replyId: number) {
    this.activeNestedReply = null;
    delete this.nestedReplyContent[replyId];
    delete this.nestedSelectedFiles[replyId];
    // Clear history for this reply
    delete this.nestedTextHistory[replyId];
    delete this.nestedCurrentHistoryIndex[replyId];
  }

  // Show main reply form
  showReplyForm() {
    this.showMainReplyForm = true;
  }

  // Hide main reply form
  hideReplyForm() {
    this.showMainReplyForm = false;
    // Optionally clear content when hiding
    // this.replyContent = '';
  }

  // Toggle main reply form
  toggleMainReplyForm() {
    this.showMainReplyForm = !this.showMainReplyForm;
  }

  // Handle text change for auto-saving to history
  onTextChange(text: string, target?: string) {
    // Save to history on every meaningful change for better undo experience
    if (text.length > 0) {
      // Save every 5 characters for more granular undo
      if (text.length % 5 === 0 || text.length === 1) {
        this.saveToHistory(text, target);
      }
      
      // Also save on word boundaries (spaces) and punctuation
      if (text.endsWith(' ') || text.endsWith('.') || text.endsWith(',') || 
          text.endsWith('!') || text.endsWith('?') || text.endsWith('\n')) {
        this.saveToHistory(text, target);
      }
    }
  }

  // Handle text input with debounce for history saving
  onTextInput(event: any, target?: string) {
    const text = event.target.value;
    
    // Clear existing timeout
    if (this.textInputTimeout) {
      clearTimeout(this.textInputTimeout);
    }
    
    // Save to history immediately after each character (with short delay to avoid spam)
    this.textInputTimeout = setTimeout(() => {
      if (text.length > 0) { // Save even with just 1 character
        this.saveToHistory(text, target);
      }
    }, 100); // Very short delay - 100ms
  }

  // Handle keyboard events for Enter key
  onKeyDown(event: KeyboardEvent, target?: string) {
    if (event.key === 'Enter' && !event.shiftKey) {
      // Allow normal Enter behavior (line break) in textarea
      // Don't prevent default - let textarea handle the line break naturally
      const textarea = event.target as HTMLTextAreaElement;
      
      // Update the appropriate model with current value including the new line
      setTimeout(() => {
        if (target === 'reply') {
          this.replyContent = textarea.value;
          this.onTextChange(textarea.value, target);
        } else {
          // For new discussion content
          this.newDiscussion.content = textarea.value;
          this.onTextChange(textarea.value, target);
        }
      }, 0);
    }
  }

  private textInputTimeout: any;

  // Validate reply form
  isInvalidReply(): boolean {
    // Only require text content
    return !this.replyContent.trim();
  }

  // Get root replies (those without parentReplyId)
  getRootReplies(): DiscussionReply[] {
    return this.discussionReplies.filter(reply => !reply.parentReplyId);
  }

  // Get nested replies for a specific parent reply
  getNestedReplies(parentReplyId: number): DiscussionReply[] {
    return this.discussionReplies.filter(reply => reply.parentReplyId === parentReplyId);
  }

  // TrackBy function for performance optimization
  trackDiscussionById(index: number, discussion: Discussion): number {
    return discussion.discussionId || index;
  }

  // Profile event handlers
  onProfileUpdate(): void {
    this.showAlert('Chuyển đến trang cập nhật hồ sơ...', 'info');
  }

  onLogout(): void {
    this.sessionService.logout();
  }

  // File upload methods
  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.showAlert('File quá lớn. Kích thước tối đa là 10MB', 'error');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.showAlert('Loại file không được hỗ trợ. Chỉ chấp nhận PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WEBP', 'error');
        return;
      }

      this.selectedFile = file;
      console.log('📎 File selected:', file.name, 'Size:', this.formatFileSize(file.size));
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    // Reset the file input
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Upload file to server
  private uploadFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', this.courseId?.toString() || '');

      this.isUploading = true;
      this.uploadProgress = 0;

      // Use the HTTP client to upload file
      this.discussionService.uploadFile(formData).subscribe({
        next: (response) => {
          console.log('✅ File uploaded successfully:', response);
          this.isUploading = false;
          resolve(response);
        },
        error: (error) => {
          console.error('❌ Error uploading file:', error);
          this.isUploading = false;
          reject(error);
        }
      });
    });
  }

  // Reply file handling methods
  onReplyFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.showAlert('File quá lớn. Kích thước tối đa là 10MB', 'error');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.showAlert('Loại file không được hỗ trợ. Chỉ chấp nhận PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WEBP', 'error');
        return;
      }

      this.selectedReplyFile = file;
      console.log('📎 Reply file selected:', file.name, 'Size:', this.formatFileSize(file.size));
    }
  }

  removeSelectedReplyFile(): void {
    this.selectedReplyFile = null;
    // Reset the file input
    const fileInput = document.getElementById('replyFileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Upload file for reply
  private uploadReplyFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', this.courseId?.toString() || '');

      this.isUploading = true;
      this.uploadProgress = 0;

      // Use the discussion reply service to upload file
      this.discussionReplyService.uploadFile(formData).subscribe({
        next: (response) => {
          console.log('✅ Reply file uploaded successfully:', response);
          this.isUploading = false;
          resolve(response);
        },
        error: (error) => {
          console.error('❌ Error uploading reply file:', error);
          this.isUploading = false;
          reject(error);
        }
      });
    });
  }

  // ==================== NESTED REPLY RICH TEXT EDITOR METHODS ====================

  // Create link in nested reply
  createLinkInNested(replyId: number) {
    const textareaId = 'nested-' + replyId;
    const textarea = document.querySelector(`textarea[name="nestedReply${replyId}"]`) as HTMLTextAreaElement;
    
    if (!textarea) {
      this.showAlert('Không tìm thấy ô nhập liệu', 'error');
      return;
    }

    const url = prompt('Nhập URL (ví dụ: https://example.com):');
    
    if (url) {
      // Validate URL format
      try {
        new URL(url);
        
        const linkText = prompt('Nhập text hiển thị (để trống sẽ dùng URL):') || url;
        const markdownLink = `[${linkText}](${url})`;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentContent = this.nestedReplyContent[replyId] || '';
        
        // Insert the markdown link
        const newContent = currentContent.substring(0, start) + markdownLink + currentContent.substring(end);
        this.nestedReplyContent[replyId] = newContent;
        
        // Update history
        this.saveToNestedHistory(newContent, replyId);
        
        // Set cursor position after the inserted link
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + markdownLink.length, start + markdownLink.length);
        }, 0);
        
        this.showAlert('Đã thêm liên kết!', 'success');
      } catch (error) {
        this.showAlert('URL không hợp lệ. Vui lòng nhập URL đúng định dạng.', 'error');
      }
    }
  }

  // Trigger nested file upload
  triggerNestedFileUpload(replyId: number) {
    const fileInput = document.getElementById(`nestedFileUpload${replyId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Handle nested file selection
  onNestedFileSelect(event: any, replyId: number) {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.showAlert('File quá lớn. Kích thước tối đa là 10MB', 'error');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.showAlert('Loại file không được hỗ trợ. Chỉ chấp nhận PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WEBP', 'error');
        return;
      }

      this.nestedSelectedFiles[replyId] = file;
      console.log('📎 Nested reply file selected:', file.name, 'Size:', this.formatFileSize(file.size));
    }
  }

  // Remove nested file
  removeNestedFile(replyId: number) {
    delete this.nestedSelectedFiles[replyId];
    // Reset the file input
    const fileInput = document.getElementById(`nestedFileUpload${replyId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Nested text change handler
  onNestedTextChange(text: string, replyId: number) {
    // Save to history on every meaningful change for better undo experience
    if (text.length > 0) {
      // Save every 5 characters for more granular undo
      if (text.length % 5 === 0 || text.length === 1) {
        this.saveToNestedHistory(text, replyId);
      }
      
      // Also save on word boundaries (spaces) and punctuation
      if (text.endsWith(' ') || text.endsWith('.') || text.endsWith(',') || 
          text.endsWith('!') || text.endsWith('?') || text.endsWith('\n')) {
        this.saveToNestedHistory(text, replyId);
      }
    }
  }

  // Nested text input handler
  onNestedTextInput(event: any, replyId: number) {
    const text = event.target.value;
    
    // Update nested content
    this.nestedReplyContent[replyId] = text;
    
    // Save to history immediately after each character (with short delay to avoid spam)
    if (this.nestedTextInputTimeouts) {
      if (this.nestedTextInputTimeouts[replyId]) {
        clearTimeout(this.nestedTextInputTimeouts[replyId]);
      }
    } else {
      this.nestedTextInputTimeouts = {};
    }
    
    this.nestedTextInputTimeouts[replyId] = setTimeout(() => {
      if (text.length > 0) { // Save even with just 1 character
        this.saveToNestedHistory(text, replyId);
      }
    }, 100); // Very short delay - 100ms
  }

  private nestedTextInputTimeouts: { [key: number]: any } = {};

  // Save to nested history
  private saveToNestedHistory(text: string, replyId: number) {
    // Initialize history for this reply if it doesn't exist
    if (!this.nestedTextHistory[replyId]) {
      this.nestedTextHistory[replyId] = [''];
      this.nestedCurrentHistoryIndex[replyId] = 0;
    }

    const history = this.nestedTextHistory[replyId];
    const currentIndex = this.nestedCurrentHistoryIndex[replyId];

    // Don't save if it's the same as the last entry
    if (history.length > 0 && history[history.length - 1] === text) {
      return;
    }

    // If we're not at the end of history, remove everything after current position
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    // Add new state
    history.push(text);
    this.nestedCurrentHistoryIndex[replyId] = history.length - 1;

    // Limit history size to prevent memory issues
    if (history.length > 100) {
      history.shift();
      this.nestedCurrentHistoryIndex[replyId]--;
    }
    
    console.log('📝 Nested history saved for reply', replyId, ':', text.substring(0, 30) + (text.length > 30 ? '...' : ''), 'Total:', history.length, 'Index:', this.nestedCurrentHistoryIndex[replyId]);
  }

  // Navigate nested history back
  navigateHistoryBackNested(replyId: number) {
    const history = this.nestedTextHistory[replyId];
    const currentIndex = this.nestedCurrentHistoryIndex[replyId];

    if (history && currentIndex > 0) {
      this.nestedCurrentHistoryIndex[replyId]--;
      this.nestedReplyContent[replyId] = history[this.nestedCurrentHistoryIndex[replyId]];
    }
  }

  // Navigate nested history forward
  navigateHistoryForwardNested(replyId: number) {
    const history = this.nestedTextHistory[replyId];
    const currentIndex = this.nestedCurrentHistoryIndex[replyId];

    if (history && currentIndex < history.length - 1) {
      this.nestedCurrentHistoryIndex[replyId]++;
      this.nestedReplyContent[replyId] = history[this.nestedCurrentHistoryIndex[replyId]];
    }
  }

  // Check if can navigate back in nested history
  canNavigateBackNested(replyId: number): boolean {
    const currentIndex = this.nestedCurrentHistoryIndex[replyId];
    const canNav = currentIndex !== undefined && currentIndex > 0;
    console.log('🔍 Can navigate back nested for reply', replyId, ':', canNav, 'Current index:', currentIndex);
    return canNav;
  }

  // Check if can navigate forward in nested history
  canNavigateForwardNested(replyId: number): boolean {
    const history = this.nestedTextHistory[replyId];
    const currentIndex = this.nestedCurrentHistoryIndex[replyId];
    const canNav = history && currentIndex !== undefined && currentIndex < history.length - 1;
    console.log('🔍 Can navigate forward nested for reply', replyId, ':', canNav, 'Current index:', currentIndex, 'History length:', history?.length);
    return canNav;
  }

}
