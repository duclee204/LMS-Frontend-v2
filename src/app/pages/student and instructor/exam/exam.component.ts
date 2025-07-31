import { Component, ElementRef, HostListener, ViewChild, Inject, PLATFORM_ID, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExamService, ExamItem, ExamDto, QuestionItem } from '../../../services/exam.service';
import { CourseService, Course } from '../../../services/course.service';
import { SessionService } from '../../../services/session.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';

@Component({
  selector: 'app-exam',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileComponent, SidebarWrapperComponent, NotificationComponent],
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ExamComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  public searchTerm = '';
  public exams: ExamItem[] = [];
  public filteredExams: ExamItem[] = [];
  public courseId: number | null = null;
  public courseInfo: Course | null = null;
  public currentPage = 'Tests';

  // Profile properties
  public username: string = '';
  public userRole: string = '';
  public avatarUrl: string = '';

  public leftMenuHidden = false;
  public showProfileDropdown = false;
  public editingExam: ExamItem | null = null;
  public selectedExamId: number | null = null;
  public uploadModalVisible = false;
  public selectedFile: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private examService: ExamService,
    private courseService: CourseService,
    public sessionService: SessionService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // Set current page to Tests since we're on the exam page
    this.currentPage = 'Tests';
    
    // Initialize user info
    this.username = this.sessionService.getFullName() || 'User';
    this.userRole = this.sessionService.getUserRole() || 'student';
    this.avatarUrl = '';
    
    // Debug logging
    console.log('🔍 Exam component initialized');
    console.log('👤 User role:', this.userRole);
    console.log('🎓 Is Student:', this.sessionService.isStudent());
    console.log('👨‍🏫 Can Manage Content:', this.canManageContent());
    
    // Get courseId from query params
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe(params => {
        this.courseId = params['courseId'] ? +params['courseId'] : null;
        const courseName = params['courseName'];
        console.log('📚 Course ID from query params:', this.courseId);
        console.log('📚 Course Name from query params:', courseName);
        
        // If we have courseName from params, use it immediately for breadcrumb
        if (courseName && courseName.trim()) {
          this.courseInfo = {
            courseId: this.courseId!,
            title: decodeURIComponent(courseName),
            description: '',
            categoryId: 0,
            instructorId: 0,
            status: '',
            price: 0,
            thumbnailUrl: ''
          };
          console.log('✅ Using course name from params:', decodeURIComponent(courseName));
        } else if (this.courseId) {
          console.log('🔄 No courseName in params, trying API fallback...');
          this.loadCourseInfo();
        }
        
        // Load exams
        if (this.courseId) {
          this.loadExams();
        }
      });
    }
  }

  // Helper method to check if current user can manage content (instructor/admin)
  canManageContent(): boolean {
    return this.sessionService.isInstructor() || this.sessionService.isAdmin();
  }

  // Load course information for breadcrumb
  loadCourseInfo(): void {
    if (!this.courseId) return;
    
    console.log('🔄 Loading course info for courseId:', this.courseId);
    
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course: Course) => {
        this.courseInfo = course;
        console.log('✅ Course info loaded successfully:', course.title);
      },
      error: (err: any) => {
        console.error('❌ Error loading course info:', err);
        
        // Fallback: Create a temporary courseInfo with generic title
        this.courseInfo = {
          courseId: this.courseId!,
          title: `Course ${this.courseId}`,
          description: '',
          categoryId: 0,
          instructorId: 0,
          status: '',
          price: 0,
          thumbnailUrl: ''
        };
        console.log('🔧 Using fallback course title:', `Course ${this.courseId}`);
      }
    });
  }

  loadExams(): void {
    if (this.courseId) {
      if (this.sessionService.isStudent()) {
        // For students, try published endpoint first
        this.examService.getPublishedQuizzesByCourse(this.courseId).subscribe({
          next: (data: any[]) => {
            console.log('Published exams loaded successfully:', data);
            this.processExamsData(data, true);
          },
          error: (err: any) => {
            console.log('Published endpoint not available, falling back to regular endpoint for student');
            this.loadExamsWithFallback();
          }
        });
      } else {
        // For instructors/admins, use regular endpoint
        this.examService.getQuizzesByCourse(this.courseId).subscribe({
          next: (data: any[]) => {
            console.log('All exams loaded for instructor/admin:', data);
            this.processExamsData(data, false);
          },
          error: (err: any) => {
            console.error('Error loading exams for instructor/admin:', err);
            this.exams = [];
            this.filteredExams = [];
            alert('Không thể tải danh sách exams: ' + (err.error?.message || err.message || 'Unknown error'));
          }
        });
      }
    } else {
      this.exams = [];
      this.filteredExams = [];
    }
  }

  // Process exams data based on user role
  private processExamsData(data: any[], isForStudent: boolean): void {
    console.log('Processing exams data:', data);
    console.log('Raw backend response for first exam:', JSON.stringify(data[0], null, 2));
    
    this.exams = data.map((e: any) => {
      console.log(`Mapping exam "${e.title}" - published field:`, e.published, ', publish field:', e.publish);
      
      return {
        quizId: e.quizId,
        courseId: e.courseId,
        title: e.title,
        description: e.description,
        quizType: e.quizType,
        timeLimit: e.timeLimit,
        shuffleAnswers: e.shuffleAnswers,
        allowMultipleAttempts: e.allowMultipleAttempts,
        showQuizResponses: e.showQuizResponses,
        showOneQuestionAtATime: e.showOneQuestionAtATime,
        dueDate: e.dueDate,
        availableFrom: e.availableFrom,
        availableUntil: e.availableUntil,
        publish: e.published !== undefined ? e.published : e.publish, // Try published first, fallback to publish
        expanded: false,
        questions: [],
        // Initialize completion status
        isCompleted: false,
        completionDate: undefined,
        score: undefined,
        attempts: 0
      };
    });

    console.log('Mapped exams with publish status:', this.exams.map(e => ({title: e.title, publish: e.publish})));

    // Filter exams for students - only show published exams
    if (isForStudent) {
      this.exams = this.exams.filter(e => e.publish === true);
      console.log('Filtered published exams for student:', this.exams);
      
      // Load completion status for each exam
      this.loadCompletionStatus();
    }
    
    // Sort exams by quiz ID (since orderNumber doesn't exist in backend)
    this.exams.sort((a, b) => (a.quizId || 0) - (b.quizId || 0));
    this.filteredExams = [...this.exams];
    
    // Load questions for all exams to determine exam type
    this.loadQuestionsForAllExams();
    
    console.log('Final processed exams:', this.exams);
  }

  // Fallback method for students when published endpoint is not available
  private loadExamsWithFallback(): void {
    if (!this.courseId) return;
    
    console.log('🔄 Fallback: Loading exams with regular endpoint for student');
    
    this.examService.getQuizzesByCourse(this.courseId).subscribe({
      next: (data: any[]) => {
        console.log('✅ Fallback successful - Backend response:', data);
        this.processExamsData(data, true);
      },
      error: (err: any) => {
        console.error('❌ Fallback also failed:', err);
        this.exams = [];
        this.filteredExams = [];
        
        if (this.sessionService.isStudent()) {
          console.log('Student cannot access exams - this may be normal if no published exams exist or permission denied');
        } else {
          alert('Không thể tải danh sách exams: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      }
    });
  }

  // Load completion status for all exams (for students)
  private loadCompletionStatus(): void {
    if (!this.sessionService.isStudent()) return;
    
    console.log('🔄 Loading completion status for', this.exams.length, 'exams');
    
    this.exams.forEach((exam, index) => {
      if (exam.quizId) {
        this.examService.checkExamSubmission(exam.quizId).subscribe({
          next: (response: any) => {
            if (response.success) {
              console.log(`✅ Exam ${exam.quizId} status:`, response);
              
              // Update exam with submission info
              this.exams[index].isCompleted = response.hasSubmitted || false;
              this.exams[index].attempts = response.attemptCount || 0;
              
              if (response.hasSubmitted && response.result) {
                this.exams[index].completionDate = response.result.submissionDate;
                this.exams[index].score = response.result.score;
              }
              
              // Update filtered exams as well
              const filteredIndex = this.filteredExams.findIndex(e => e.quizId === exam.quizId);
              if (filteredIndex !== -1) {
                this.filteredExams[filteredIndex] = { ...this.exams[index] };
              }
            } else {
              console.log(`📝 Exam ${exam.quizId} not completed yet`);
            }
          },
          error: (err: any) => {
            console.log(`ℹ️ Completion check failed for exam ${exam.quizId} (normal if not submitted):`, err.message);
            // Keep isCompleted as false (default)
          }
        });
      }
    });
  }

  // Load questions for all exams to determine exam type
  private loadQuestionsForAllExams(): void {
    console.log('🔄 Loading questions for all exams to determine types...');
    
    this.exams.forEach((exam, index) => {
      if (exam.quizId) {
        this.examService.getQuestionsByQuiz(exam.quizId).subscribe({
          next: (response: any) => {
            console.log(`✅ Question types loaded for exam ${exam.quizId}:`, response);
            
            // Handle the response structure: {totalQuestions: number, questionTypes: string[]}
            const questionTypes = response.questionTypes || [];
            const totalQuestions = response.totalQuestions || 0;
            
            // Update exam with question type information
            this.exams[index].questions = questionTypes.map((questionType: string, idx: number) => {
              console.log('🔄 Processing question type:', questionType);
              return {
                questionId: idx + 1,
                quizId: exam.quizId,
                questionText: '', // Not needed for type detection
                questionType: questionType,
                orderNumber: idx + 1,
                points: 1
              };
            });
            
            // Update filtered exams as well
            const filteredIndex = this.filteredExams.findIndex(e => e.quizId === exam.quizId);
            if (filteredIndex !== -1) {
              this.filteredExams[filteredIndex] = { ...this.exams[index] };
            }
            
            // Trigger change detection to update UI
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.log(`ℹ️ Could not load questions for exam ${exam.quizId}:`, err.message);
            // Keep empty questions array (default)
          }
        });
      }
    });
  }

  chooseFiles(e: Event): void {
    e.stopPropagation();
    this.fileInput.nativeElement.click();
  }

  toggleProfileDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  updateProfile(): void {
    this.notificationService.info('Thông báo', 'Chuyển đến trang cập nhật hồ sơ...');
  }

  logout(): void {
    // SessionService sẽ xử lý việc hiển thị notification và chuyển hướng
    this.sessionService.logout();
  }

  redirectToExamPage(): void {
    this.router.navigate(['/addexam']);
  }

  searchExams(): void {
    const keyword = this.searchTerm.toLowerCase();
    this.filteredExams = this.exams.filter(e => 
      e.title.toLowerCase().includes(keyword) || 
      (e.description && e.description.toLowerCase().includes(keyword))
    );
  }

  // Handle exam click - different behavior for instructor vs student
  handleExamClick(exam: ExamItem): void {
    if (this.canManageContent()) {
      // Instructor: Navigate to question management page
      this.navigateToQuestionManager(exam);
    } else {
      // Student: Navigate to take exam page
      this.navigateToTakeExam(exam);
    }
  }

  // Navigate to question manager for instructors
  navigateToQuestionManager(exam: ExamItem): void {
    if (this.courseId && this.courseInfo && exam.quizId) {
      this.router.navigate(['/question-manager'], {
        queryParams: {
          courseId: this.courseId,
          courseName: encodeURIComponent(this.courseInfo.title),
          quizId: exam.quizId,
          quizTitle: encodeURIComponent(exam.title),
          questionType: exam.quizType || 'MULTIPLE_CHOICE'
        }
      });
    }
  }

  // Navigate to take exam page for students
  navigateToTakeExam(exam: ExamItem): void {
    if (this.courseId && this.courseInfo && exam.quizId) {
      this.router.navigate(['/take-exam'], {
        queryParams: {
          courseId: this.courseId,
          courseName: encodeURIComponent(this.courseInfo.title),
          quizId: exam.quizId,
          quizTitle: encodeURIComponent(exam.title),
          questionType: exam.quizType || 'MULTIPLE_CHOICE'
        }
      });
    } else {
      console.log('🎓 Student taking exam:', exam.title);
      alert(`Không thể tải bài thi "${exam.title}". Vui lòng thử lại!`);
    }
  }

  // Toggle exam published status
  togglePublishStatus(exam: ExamItem): void {
    if (!this.canManageContent()) return;

    const newStatus = !exam.publish;
    const statusText = newStatus ? 'đã xuất bản' : 'đã chuyển về bản nháp';

    // Show confirmation dialog
    const confirmMessage = newStatus 
      ? `Bạn có chắc chắn muốn xuất bản bài thi "${exam.title}"?`
      : `Bạn có chắc chắn muốn chuyển bài thi "${exam.title}" về bản nháp?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    // Store original status for rollback
    const originalStatus = exam.publish;
    
    // Update the exam object immediately for UI feedback
    exam.publish = newStatus;

    // Call API to update only the status (more efficient)
    if (exam.quizId) {
      this.examService.updateQuizStatus(exam.quizId, newStatus).subscribe({
        next: () => {
          console.log(`✅ Exam ${exam.title} ${newStatus ? 'published' : 'unpublished'} successfully`);
          
          // Show success message
          alert(`Bài thi "${exam.title}" ${statusText} thành công!`);
          
          // Reload exams to ensure UI consistency with database
          this.loadExams();
        },
        error: (error: any) => {
          console.error('❌ Error updating exam status:', error);
          // Revert the status on error
          exam.publish = originalStatus;
          alert('Có lỗi xảy ra khi cập nhật trạng thái bài thi!');
        }
      });
    }
  }

  // Edit exam (placeholder for future implementation)
  editExam(exam: ExamItem): void {
    console.log('✏️ Edit exam:', exam.title);
    
    if (exam.quizId) {
      // Navigate to edit quiz page - use instructor route
      this.router.navigate(['/edit-quiz', exam.quizId]);
    } else {
      alert('Không tìm thấy ID của bài thi để chỉnh sửa.');
    }
  }

  // Toggle exam expanded state for viewing details (kept for backwards compatibility)
  toggleExamExpanded(exam: ExamItem): void {
    exam.expanded = !exam.expanded;
    
    // Load questions when expanding
    if (exam.expanded && exam.quizId) {
      this.loadExamQuestions(exam.quizId);
    }
  }

  // Load questions for an exam
  loadExamQuestions(quizId: number): void {
    // For now, just set empty questions since questions endpoint might not be implemented
    const exam = this.exams.find(e => e.quizId === quizId);
    if (exam) {
      exam.questions = [];
    }
  }

  // Navigate to add exam page
  showAddExam(): void {
    if (!this.canManageContent()) {
      alert('Bạn không có quyền tạo exam mới.');
      return;
    }
    
    // Navigate to add exam page with course info
    if (this.courseId && this.courseInfo) {
      this.router.navigate(['/addexam'], {
        queryParams: {
          courseId: this.courseId,
          courseName: encodeURIComponent(this.courseInfo.title)
        }
      });
    } else {
      console.error('❌ Cannot navigate to add exam: missing courseId or courseInfo');
    }
  }

  // Delete exam (keeping this for instructors/admins)
  deleteExam(exam: ExamItem): void {
    if (!this.canManageContent()) {
      alert('Bạn không có quyền xóa exam.');
      return;
    }
    
    if (!exam.quizId) return;
    
    if (confirm(`Bạn có chắc chắn muốn xóa exam "${exam.title}"?`)) {
      this.examService.deleteQuiz(exam.quizId).subscribe({
        next: (response: any) => {
          console.log('Exam deleted successfully:', response);
          this.loadExams();
          alert('Exam đã được xóa thành công!');
        },
        error: (err: any) => {
          console.error('Error deleting exam:', err);
          alert('Không thể xóa exam: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
    }
  }

  // Navigation methods - Actual routing between pages
  navigateToHome(): void {
    console.log('navigateToHome called');
    if (this.courseId) {
      this.router.navigate(['/course-home'], { queryParams: { courseId: this.courseId } });
    } else {
      this.router.navigate(['/course-home']);
    }
  }

  navigateToDiscussion(): void {
    console.log('navigateToDiscussion called');
    if (this.courseId) {
      this.router.navigate(['/discussion'], { queryParams: { courseId: this.courseId } });
    }
  }

  navigateToGrades(): void {
    console.log('navigateToGrades called');
    if (this.courseId) {
      // Check if user is instructor/admin
      if (this.canManageContent()) {
        // Navigate to instructor grades management page
        this.router.navigate(['/grades'], { queryParams: { courseId: this.courseId } });
      } else {
        // Navigate to student grades view page
        this.router.navigate(['/student-grades'], { queryParams: { courseId: this.courseId } });
      }
    }
  }

  navigateToVideo(): void {
    console.log('navigateToVideo called');
    if (this.courseId) {
      // Check if user is instructor/admin
      if (this.canManageContent()) {
        // Navigate to video upload page for instructors
        this.router.navigate(['/video-upload'], { queryParams: { courseId: this.courseId } });
      } else {
        // Navigate to learn online page for students
        this.router.navigate(['/learn-online'], { queryParams: { courseId: this.courseId } });
      }
    }
  }

  navigateToTests(): void {
    console.log('navigateToTests called');
    if (this.courseId) {
      this.router.navigate(['/exam'], { queryParams: { courseId: this.courseId } });
    }
  }

  // Profile methods
  onProfileUpdate(): void {
    console.log('Profile update requested');
  }

  onLogout(): void {
    this.sessionService.logout();
    this.router.navigate(['/login']);
  }

  getDisplayRole(role: string): string {
    if (!role) return 'User';
    const cleanRole = role.replace('ROLE_', '');
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase();
  }

  navigateToModules(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🔄 Navigating to modules...');
    
    if (this.courseId) {
      this.router.navigate(['/module'], { queryParams: { courseId: this.courseId } });
    } else {
      console.error('❌ Cannot navigate to modules: missing courseId');
    }
  }

  navigateToAnnouncements(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🔄 Navigating to announcements...');
    
    if (this.courseId && this.courseInfo) {
      this.router.navigate(['/announcements'], { 
        queryParams: { 
          courseId: this.courseId,
          courseName: encodeURIComponent(this.courseInfo.title)
        } 
      });
    } else {
      console.error('❌ Cannot navigate to announcements: missing courseId or courseInfo');
    }
  }

  navigateToDashboard(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🔄 Navigating to dashboard...');
    this.router.navigate(['/dashboard']);
  }

  handleModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      const fileName = files[0].name;
      this.selectedFile = fileName;
    }
  }

  onFileChange(event: Event): void {
    this.onFileSelected(event);
  }

  openUploadModal(): void {
    this.uploadModalVisible = true;
  }

  toggleLeftMenu(): void {
    this.leftMenuHidden = !this.leftMenuHidden;
  }

  // Get exam type based on questions
  getExamType(exam: ExamItem): string {
    console.log('🔍 Checking exam type for:', exam.title);
    console.log('📝 Questions:', exam.questions);
    
    if (!exam.questions || exam.questions.length === 0) {
      console.log('⚠️ No questions loaded yet, defaulting to Trắc nghiệm');
      return 'Trắc nghiệm'; // Default to multiple choice if no questions loaded yet
    }

    console.log('📊 Question types:', exam.questions.map(q => q.questionType));
    
    const hasEssay = exam.questions.some(q => {
      console.log(`Question "${q.questionText?.substring(0, 50)}..." type:`, q.questionType);
      // Check for both 'essay' and 'ESSAY' formats
      return q.questionType === 'essay' || q.questionType === 'ESSAY';
    });

    console.log('📝 Has essay questions:', hasEssay);
    
    // If any question is essay, it's an essay exam
    // Otherwise, it's multiple choice
    const examType = hasEssay ? 'Tự luận' : 'Trắc nghiệm';
    console.log('✅ Final exam type:', examType);
    
    return examType;
  }

  // Get exam type icon
  getExamTypeIcon(exam: ExamItem): string {
    const type = this.getExamType(exam);
    return type === 'Tự luận' ? 'fas fa-pen-fancy' : 'fas fa-list-ul';
  }

  // Get exam type color class
  getExamTypeClass(exam: ExamItem): string {
    const type = this.getExamType(exam);
    return type === 'Tự luận' ? 'type-essay' : 'type-multiple-choice';
  }
}
