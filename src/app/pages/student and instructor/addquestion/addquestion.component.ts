import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
  OnInit,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../services/session.service';
import { CourseService, Course } from '../../../services/course.service';
import { ExamService } from '../../../services/exam.service';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';

// Interface for question data
export interface QuestionData {
  questionId?: number;
  quizId: number;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'ESSAY';
  options?: string[]; // For multiple choice
  correctAnswers?: boolean[]; // For multiple choice
  attachmentUrl?: string; // For essay questions
  points: number;
  explanation?: string;
}

@Component({
  selector: 'app-addquestion',
  standalone: true,
  templateUrl: './addquestion.component.html',
  styleUrls: ['./addquestion.component.scss'],
  imports: [CommonModule, FormsModule, RouterModule, ProfileComponent, SidebarWrapperComponent],
})
export class AddQuestionComponent implements OnInit, AfterViewInit {
  // Properties for layout and navigation
  public currentPage = 'Tests';
  public leftMenuHidden = false;
  public showProfileDropdown = false;
  public courseId: number | null = null;
  public quizId: number | null = null;
  public courseInfo: Course | null = null;
  public quizTitle: string = '';

  // Profile properties
  public username: string = '';
  public userRole: string = '';
  public avatarUrl: string = '';

  // Question form data
  public questionData: QuestionData = {
    quizId: 0,
    questionText: '',
    questionType: 'MULTIPLE_CHOICE',
    options: ['', '', '', ''],
    correctAnswers: [false, false, false, false],
    points: 1,
    explanation: ''
  };

  // Form state
  public isSaving = false;
  public selectedFile: File | null = null;
  public currentQuestionNumber = 1;
  public totalQuestionsCreated = 0;

  // Rich text editor state
  public showFormatToolbar = false;

  // Legacy properties for backward compatibility
  showDropdown = false;
  isMenuHidden = false;
  isMobile = window.innerWidth < 768;

  @ViewChild('leftMenu', { static: false }) leftMenu!: ElementRef;
  @ViewChild('toggleBtn', { static: false }) toggleBtn!: ElementRef;
  @ViewChild('contentWrapper', { static: false }) contentWrapper!: ElementRef;
  @ViewChild('questionTextArea', { static: false }) questionTextArea?: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput?: ElementRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private courseService: CourseService,
    private examService: ExamService,
    public sessionService: SessionService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // Initialize user info
    this.username = this.sessionService.getFullName() || 'User';
    this.userRole = this.sessionService.getUserRole() || 'student';
    this.avatarUrl = '';

    // Debug logging
    console.log('🔍 AddQuestion component initialized');
    console.log('👤 User role:', this.userRole);

    // Get parameters from query params
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe(params => {
        this.courseId = params['courseId'] ? +params['courseId'] : null;
        this.quizId = params['quizId'] ? +params['quizId'] : null;
        this.quizTitle = params['quizTitle'] || 'Quiz';
        const courseName = params['courseName'];
        const questionType = params['questionType'] as 'MULTIPLE_CHOICE' | 'ESSAY';

        console.log('📚 Course ID from query params:', this.courseId);
        console.log('🧪 Quiz ID from query params:', this.quizId);
        console.log('📝 Quiz Title from query params:', this.quizTitle);
        console.log('❓ Question Type from query params:', questionType);

        if (this.quizId) {
          this.questionData.quizId = this.quizId;
        }

        if (questionType) {
          this.questionData.questionType = questionType;
          
          // Initialize options based on question type
          if (questionType === 'MULTIPLE_CHOICE') {
            this.questionData.options = ['', '', '', ''];
            this.questionData.correctAnswers = [false, false, false, false];
          } else {
            this.questionData.options = undefined;
            this.questionData.correctAnswers = undefined;
          }
        }

        // Set course info from params
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
          this.loadCourseInfo();
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
      }
    });
  }

  // Form validation
  isFormValid(): boolean {
    const basicValid = this.questionData.questionText.trim().length > 0 && 
                      this.questionData.points > 0 && 
                      this.quizId !== null;

    if (this.questionData.questionType === 'MULTIPLE_CHOICE') {
      const hasOptions = this.questionData.options?.some(option => option.trim().length > 0) || false;
      const hasCorrectAnswer = this.questionData.correctAnswers?.some(answer => answer) || false;
      return basicValid && hasOptions && hasCorrectAnswer;
    }

    return basicValid;
  }

  // Add new option for multiple choice
  addOption(): void {
    if (this.questionData.options && this.questionData.correctAnswers && 
        this.questionData.options.length < 6) {
      this.questionData.options.push('');
      this.questionData.correctAnswers.push(false);
    }
  }

  // Remove option for multiple choice
  removeOption(index: number): void {
    if (this.questionData.options && this.questionData.correctAnswers && 
        this.questionData.options.length > 2) {
      this.questionData.options.splice(index, 1);
      this.questionData.correctAnswers.splice(index, 1);
    }
  }

  // Handle file selection for essay questions
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only images, PDF, and Word documents are allowed');
        return;
      }

      this.selectedFile = file;
      console.log('📎 File selected:', file.name);
    }
  }

  // Rich text formatting functions for essay questions
  formatText(command: string, value?: string): void {
    if (this.questionTextArea) {
      const textarea = this.questionTextArea.nativeElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      
      let newText = '';
      switch (command) {
        case 'bold':
          newText = `<b>${selectedText}</b>`;
          break;
        case 'italic':
          newText = `<i>${selectedText}</i>`;
          break;
        case 'underline':
          newText = `<u>${selectedText}</u>`;
          break;
        default:
          newText = selectedText;
      }
      
      textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
      this.questionData.questionText = textarea.value;
    }
  }

  // Save question
  saveQuestion(): void {
    if (!this.isFormValid() || this.isSaving) return;

    this.isSaving = true;

    const questionDto = this.buildQuestionDto();

    console.log('💾 Saving question:', questionDto);

    // TODO: Create question service and API endpoint
    // this.questionService.createQuestion(questionDto).subscribe({...});

    // For now, simulate saving
    setTimeout(() => {
      console.log('✅ Question saved successfully');
      this.isSaving = false;
      alert('Câu hỏi đã được lưu thành công!');
      this.navigateBackToQuiz();
    }, 1000);
  }

  // Save and continue to create next question
  saveAndContinue(): void {
    if (!this.isFormValid() || this.isSaving) return;

    this.isSaving = true;

    const questionDto = this.buildQuestionDto();

    console.log('💾 Saving question and continuing:', questionDto);

    // TODO: Create question service and API endpoint
    // this.questionService.createQuestion(questionDto).subscribe({...});

    // For now, simulate saving
    setTimeout(() => {
      console.log('✅ Question saved successfully, preparing next question');
      this.isSaving = false;
      alert('Câu hỏi đã được lưu! Tiếp tục tạo câu hỏi tiếp theo.');
      this.resetForm();
    }, 1000);
  }

  // Reset form for next question
  private resetForm(): void {
    this.totalQuestionsCreated++;
    this.currentQuestionNumber++;

    this.questionData = {
      quizId: this.quizId || 0,
      questionText: '',
      questionType: this.questionData.questionType, // Keep same question type
      options: this.questionData.questionType === 'MULTIPLE_CHOICE' ? ['', '', '', ''] : undefined,
      correctAnswers: this.questionData.questionType === 'MULTIPLE_CHOICE' ? [false, false, false, false] : undefined,
      points: 1,
      explanation: ''
    };

    this.selectedFile = null;

    // Reset file input if it exists
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }

    console.log(`🔄 Form reset for question ${this.currentQuestionNumber} (${this.totalQuestionsCreated} questions created so far)`);
  }

  // Build question DTO for API
  private buildQuestionDto(): any {
    const dto: any = {
      quizId: this.questionData.quizId,
      questionText: this.questionData.questionText.trim(),
      questionType: this.questionData.questionType,
      points: this.questionData.points,
      explanation: this.questionData.explanation?.trim() || null
    };

    if (this.questionData.questionType === 'MULTIPLE_CHOICE') {
      dto.options = this.questionData.options?.filter(opt => opt.trim().length > 0);
      dto.correctAnswers = this.questionData.correctAnswers?.slice(0, dto.options.length);
    }

    return dto;
  }

  // Cancel question creation
  cancelQuestion(): void {
    if (confirm('Bạn có chắc chắn muốn hủy tạo câu hỏi? Tất cả thông tin đã nhập sẽ bị mất.')) {
      this.navigateBackToQuiz();
    }
  }

  // Navigate back to quiz/exam page
  private navigateBackToQuiz(): void {
    if (this.courseId && this.courseInfo) {
      this.router.navigate(['/exam'], {
        queryParams: {
          courseId: this.courseId,
          courseName: encodeURIComponent(this.courseInfo.title),
          quizId: this.quizId
        }
      });
    } else {
      this.router.navigate(['/exam']);
    }
  }

  // Navigation methods
  navigateToHome(): void {
    this.currentPage = 'Home';
  }

  navigateToDiscussion(): void {
    this.currentPage = 'Discussion';
  }

  navigateToGrades(): void {
    this.currentPage = 'Grades';
  }

  navigateToModules(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.courseId && this.courseInfo) {
      this.router.navigate(['/module'], {
        queryParams: {
          courseId: this.courseId,
          courseName: encodeURIComponent(this.courseInfo.title),
          page: 'Modules'
        }
      });
    }
  }

  navigateToTests(): void {
    if (this.courseId && this.courseInfo) {
      this.router.navigate(['/exam'], {
        queryParams: {
          courseId: this.courseId,
          courseName: encodeURIComponent(this.courseInfo.title)
        }
      });
    } else {
      this.router.navigate(['/exam']);
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

  toggleLeftMenu(): void {
    this.leftMenuHidden = !this.leftMenuHidden;
    this.isMenuHidden = this.leftMenuHidden;
  }

  toggleProfileDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.showProfileDropdown = !this.showProfileDropdown;
    this.showDropdown = this.showProfileDropdown;
  }

  ngAfterViewInit(): void {
    // Initialize rich text editor if needed
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.profile')) {
      this.showDropdown = false;
      this.showProfileDropdown = false;
    }

    if (this.isMobile && this.leftMenu && this.toggleBtn) {
      if (
        !this.leftMenu.nativeElement.contains(event.target) &&
        !this.toggleBtn.nativeElement.contains(event.target)
      ) {
        this.isMenuHidden = true;
        this.leftMenuHidden = true;
      }
    }
  }
}
