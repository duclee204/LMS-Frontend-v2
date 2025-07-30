import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
  OnInit,
  Inject,
  PLATFORM_ID,
  OnDestroy
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../services/session.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { CourseService, Course } from '../../../services/course.service';
import { ExamService } from '../../../services/exam.service';
import { ApiService } from '../../../services/api.service';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';

// Interface for exam question
export interface ExamQuestion {
  id?: string;
  questionId?: number;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'ESSAY';
  options?: string[];
  points: number;
  questionFileUrl?: string; // File URL for question attachment
  questionFileName?: string; // Original file name for question attachment
  selectedAnswer?: number[]; // For multiple choice
  essayAnswer?: string; // For essay text questions
  essaySubmissionType?: 'text' | 'file' | 'link'; // Type of essay submission
  essayLinkAnswer?: string; // For link submissions
  selectedFile?: File; // For file submissions
}

// Interface for exam data
export interface ExamData {
  quizId: number;
  title: string;
  description?: string;
  quizType: 'MULTIPLE_CHOICE' | 'ESSAY';
  timeLimit?: number;
  questions: ExamQuestion[];
  hasTimeLimit: boolean;
  shuffleAnswers?: boolean;
  allowMultipleAttempts?: boolean;
  showQuizResponses?: boolean;
  showOneQuestionAtATime?: boolean;
}

@Component({
  selector: 'app-take-exam',
  standalone: true,
  templateUrl: './take-exam.component.html',
  styleUrls: ['./take-exam.component.scss'],
  imports: [CommonModule, FormsModule, RouterModule, ProfileComponent, SidebarWrapperComponent, NotificationComponent],
})
export class TakeExamComponent implements OnInit, AfterViewInit, OnDestroy {
  // Properties for layout and navigation
  public currentPage = 'Tests';
  public leftMenuHidden = false;
  public showProfileDropdown = false;
  public courseId: number | null = null;
  public quizId: number | null = null;
  public courseInfo: Course | null = null;

  // Profile properties
  public username: string = '';
  public userRole: string = '';
  public avatarUrl: string = '';

  // Exam properties
  public examData: ExamData | null = null;
  public currentQuestionIndex = 0;
  public isExamStarted = false;
  public isExamCompleted = false;
  public timeRemaining: number = 0;
  public timerInterval: any;
  public examResult: any = null;
  public hasSubmitted = false;
  public isSubmitting = false;
  public isLoading = true;
  
  // New properties for quiz features
  public showOneQuestionAtATime = false;
  public attemptNumber = 1;
  public canViewResponses = false;

  // Legacy properties for backward compatibility
  showDropdown = false;
  isMenuHidden = false;
  isMobile = window.innerWidth < 768;

  @ViewChild('leftMenu', { static: false }) leftMenu!: ElementRef;
  @ViewChild('toggleBtn', { static: false }) toggleBtn!: ElementRef;
  @ViewChild('contentWrapper', { static: false }) contentWrapper!: ElementRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private courseService: CourseService,
    private examService: ExamService,
    private apiService: ApiService,
    public sessionService: SessionService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

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

  ngOnInit(): void {
    // Initialize user info
    this.username = this.sessionService.getFullName() || 'User';
    this.userRole = this.sessionService.getUserRole() || 'student';
    this.avatarUrl = '';

    // Debug logging
    console.log('🎓 TakeExam component initialized');

    // Get parameters from query params
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe(params => {
        this.courseId = params['courseId'] ? +params['courseId'] : null;
        this.quizId = params['quizId'] ? +params['quizId'] : null;
        const courseName = params['courseName'];

        console.log('📚 Course ID:', this.courseId);
        console.log('🧪 Quiz ID:', this.quizId);

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
        } else if (this.courseId) {
          this.loadCourseInfo();
        }

        // Load exam data
        if (this.quizId) {
          this.checkSubmissionStatus();
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Check if user has already submitted this exam
  checkSubmissionStatus(): void {
    if (!this.quizId) return;

    console.log('🔍 Checking submission status for quiz:', this.quizId);

    this.examService.checkExamSubmission(this.quizId).subscribe({
      next: (response: any) => {
        console.log('✅ Submission status checked:', response);
        
        if (response.success !== false) {
          // Normal response - either submitted or not submitted
          this.hasSubmitted = response.hasSubmitted || false;
          
          // Update attempt information
          if (response.attemptCount !== undefined) {
            this.attemptNumber = (response.attemptCount || 0) + 1;
            console.log('📊 Current attempt number:', this.attemptNumber);
          }
          
          if (this.hasSubmitted) {
            // User has already submitted, show result view
            this.examResult = response.result;
            this.isExamCompleted = true;
            this.isLoading = false; // Stop loading immediately
            console.log('📋 User has already submitted. Showing result view.');
          } else {
            // User hasn't submitted, load exam for taking
            console.log('📝 User hasn\'t submitted. Loading exam for taking.');
            this.loadExamData();
          }
        } else {
          // Error response - default to allowing exam
          console.log('⚠️ Error response but allowing exam:', response.message);
          this.loadExamData();
        }
      },
      error: (error: any) => {
        console.error('❌ Error checking submission status:', error);
        // Fallback: allow taking exam
        console.log('🔄 Fallback: Loading exam for taking');
        this.loadExamData();
      }
    });
  }

  // Load course information
  loadCourseInfo(): void {
    if (!this.courseId) return;

    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course: Course) => {
        this.courseInfo = course;
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

  // Load exam data
  loadExamData(): void {
    if (!this.quizId) return;

    console.log('📝 Loading exam data for quiz:', this.quizId);
    
    this.examService.getQuizWithQuestions(this.quizId).subscribe({
      next: (response: any) => {
        console.log('✅ Exam data loaded:', response);
        
        const quiz = response.quiz;
        const questions = response.questions;
        
        this.examData = {
          quizId: quiz.quizId,
          title: quiz.title,
          description: quiz.description,
          quizType: quiz.quizType === 'MULTIPLE_CHOICE' ? 'MULTIPLE_CHOICE' : 'ESSAY',
          timeLimit: quiz.timeLimit,
          hasTimeLimit: quiz.timeLimit && quiz.timeLimit > 0,
          shuffleAnswers: quiz.shuffleAnswers || false,
          allowMultipleAttempts: quiz.allowMultipleAttempts || false,
          showQuizResponses: quiz.showQuizResponses || false,
          showOneQuestionAtATime: quiz.showOneQuestionAtATime || false,
          questions: questions.map((q: any, index: number) => {
            const question: ExamQuestion = {
              questionId: q.questionId,
              questionText: q.questionText,
              questionType: q.type === 'MULTIPLE_CHOICE' ? 'MULTIPLE_CHOICE' : 'ESSAY',
              points: q.points || 1,
              questionFileUrl: q.questionFileUrl || null,
              questionFileName: q.questionFileName || null,
            };

            if (question.questionType === 'MULTIPLE_CHOICE') {
              // Sử dụng answers thật từ database
              if (q.answers && q.answers.length > 0) {
                // Sort answers by orderNumber
                let sortedAnswers = q.answers.sort((a: any, b: any) => 
                  (a.orderNumber || 0) - (b.orderNumber || 0)
                );
                
                // Shuffle answers if enabled
                if (this.examData?.shuffleAnswers) {
                  sortedAnswers = this.shuffleArray([...sortedAnswers]);
                }
                
                question.options = sortedAnswers.map((answer: any) => answer.answerText || '');
                question.selectedAnswer = []; // Array of selected indices
              } else {
                // Fallback nếu chưa có answers
                let options = ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'];
                if (this.examData?.shuffleAnswers) {
                  options = this.shuffleArray([...options]);
                }
                question.options = options;
                question.selectedAnswer = [];
              }
            } else {
              question.essayAnswer = '';
              question.essaySubmissionType = 'text'; // Default to text
              question.essayLinkAnswer = '';
            }

            return question;
          })
        };
        
        // Set quiz options
        this.showOneQuestionAtATime = this.examData.showOneQuestionAtATime || false;
        this.canViewResponses = this.examData.showQuizResponses || false;
        
        this.isLoading = false; // Stop loading when exam data is ready
      },
      error: (error) => {
        console.error('❌ Error loading exam data:', error);
        // Fallback to mock data if API fails
        this.loadMockExamData();
      }
    });
  }

  // Fallback mock data
  private loadMockExamData(): void {
    this.examData = {
      quizId: this.quizId!,
      title: `Bài kiểm tra ${this.quizId}`,
      description: 'Bài kiểm tra kiến thức về khóa học',
      quizType: 'MULTIPLE_CHOICE',
      timeLimit: 60, // 60 minutes
      hasTimeLimit: true,
      questions: [
        {
          questionId: 1,
          questionText: 'Câu hỏi 1: Đây là câu hỏi trắc nghiệm mẫu?',
          questionType: 'MULTIPLE_CHOICE',
          options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
          points: 1,
          selectedAnswer: []
        },
        {
          questionId: 2,
          questionText: 'Câu hỏi 2: Hãy viết bài luận ngắn về chủ đề này.',
          questionType: 'ESSAY',
          points: 2,
          essayAnswer: '',
          essaySubmissionType: 'text',
          essayLinkAnswer: ''
        }
      ]
    };
    
    this.isLoading = false; // Stop loading for mock data as well
  }

  // Start exam
  startExam(): void {
    if (!this.examData) return;

    this.isExamStarted = true;
    
    if (this.examData.hasTimeLimit && this.examData.timeLimit) {
      this.timeRemaining = this.examData.timeLimit * 60; // Convert to seconds
      this.startTimer();
    }

    console.log('🚀 Exam started:', this.examData.title);
  }

  // Start timer
  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining <= 0) {
        this.submitExam();
      }
    }, 1000);
  }

  // Get formatted time remaining
  getFormattedTime(): string {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Navigate to next question
  nextQuestion(): void {
    if (this.examData && this.currentQuestionIndex < this.examData.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  // Navigate to previous question
  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  // Go to specific question
  goToQuestion(index: number): void {
    if (this.examData && index >= 0 && index < this.examData.questions.length) {
      this.currentQuestionIndex = index;
    }
  }

  // Handle multiple choice answer selection
  selectAnswer(questionIndex: number, optionIndex: number): void {
    if (this.examData && this.examData.questions[questionIndex]) {
      const question = this.examData.questions[questionIndex];
      if (!question.selectedAnswer) {
        question.selectedAnswer = [];
      }
      
      // For single selection, clear previous answers
      question.selectedAnswer = [optionIndex];
    }
  }

  // Check if option is selected
  isOptionSelected(questionIndex: number, optionIndex: number): boolean {
    if (this.examData && this.examData.questions[questionIndex]) {
      const question = this.examData.questions[questionIndex];
      return question.selectedAnswer?.includes(optionIndex) || false;
    }
    return false;
  }

  // Check if question is answered
  isQuestionAnswered(index: number): boolean {
    if (!this.examData || !this.examData.questions[index]) return false;

    const question = this.examData.questions[index];
    
    if (question.questionType === 'MULTIPLE_CHOICE') {
      return !!(question.selectedAnswer && question.selectedAnswer.length > 0);
    } else {
      // For essay questions, check based on submission type
      if (question.essaySubmissionType === 'text') {
        return !!(question.essayAnswer && question.essayAnswer.trim().length > 0);
      } else if (question.essaySubmissionType === 'file') {
        return !!question.selectedFile;
      } else if (question.essaySubmissionType === 'link') {
        return !!(question.essayLinkAnswer && question.essayLinkAnswer.trim().length > 0);
      }
      return false;
    }
  }

  // Get current question
  getCurrentQuestion(): ExamQuestion | null {
    if (this.examData && this.examData.questions[this.currentQuestionIndex]) {
      return this.examData.questions[this.currentQuestionIndex];
    }
    return null;
  }

  // Get option letter (A, B, C, D)
  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Get count of correct answers from exam result
  getCorrectAnswersCount(): number {
    if (!this.examResult || !this.examResult.questionResults) {
      return 0;
    }
    return this.examResult.questionResults.filter((q: any) => q.correct).length; // Changed from q.isCorrect to q.correct
  }

  // Get total questions count
  getTotalQuestionsCount(): number {
    if (!this.examResult || !this.examResult.questionResults) {
      return 0;
    }
    return this.examResult.questionResults.length;
  }

  // Get earned points (tổng điểm thực tế đạt được)
  getEarnedPoints(): number {
    if (!this.examResult || !this.examResult.questionResults) {
      return 0;
    }
    const earned = this.examResult.questionResults
      .reduce((total: number, q: any) => total + (q.earnedPoints || 0), 0);
    
    console.log('🔍 getEarnedPoints:', earned);
    console.log('🔍 questionResults:', this.examResult.questionResults);
    return earned;
  }

  // Get total points (tổng điểm tối đa)
  getTotalPoints(): number {
    if (!this.examResult || !this.examResult.questionResults) {
      return 0;
    }
    const total = this.examResult.questionResults
      .reduce((total: number, q: any) => total + (q.points || 1), 0);
    
    console.log('🔍 getTotalPoints:', total);
    return total;
  }

  // Get percentage score from actual points earned
  getPercentageScore(): number {
    const total = this.getTotalPoints();
    const earned = this.getEarnedPoints();
    return total > 0 ? (earned * 100) / total : 0;
  }

  // Submit exam
  submitExam(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (!this.examData) {
      this.showAlert('Không có dữ liệu bài thi để nộp!', 'error');
      return;
    }

    if (this.isSubmitting) {
      return; // Prevent double submission
    }

    this.isSubmitting = true;

    // Prepare submission data
    const submissionData = {
      quizId: this.examData.quizId,
      answers: this.examData.questions.map(question => {
        const answer: any = {
          questionId: question.questionId
        };

        if (question.questionType === 'MULTIPLE_CHOICE') {
          // For multiple choice, find the selected answer ID
          if (question.selectedAnswer && question.selectedAnswer.length > 0) {
            const selectedIndex = question.selectedAnswer[0];
            // We need to get the actual answer ID from the backend data
            // For now, we'll send the selected index and handle it on backend
            answer.selectedIndex = selectedIndex;
            answer.answerText = question.options?.[selectedIndex] || '';
          }
        } else if (question.questionType === 'ESSAY') {
          // Handle different essay submission types
          if (question.essaySubmissionType === 'text') {
            answer.answerText = question.essayAnswer || '';
          } else if (question.essaySubmissionType === 'link') {
            answer.answerText = ''; // No text for link submission
            answer.linkAnswer = question.essayLinkAnswer || '';
          } else if (question.essaySubmissionType === 'file') {
            answer.answerText = ''; // No text for file submission
            answer.fileName = question.selectedFile?.name || '';
            // Note: File upload will be handled separately via FormData
          }
        }

        return answer;
      }),
      timeSpent: this.examData.timeLimit ? 
        (this.examData.timeLimit * 60 - this.timeRemaining) : 0
    };

    console.log('📝 Submitting exam answers:', submissionData);

    // Handle file uploads first if there are any
    this.uploadEssayFiles(submissionData).then((updatedSubmissionData) => {
      // Submit exam with potentially updated file paths
      this.examService.submitExam(updatedSubmissionData).subscribe({
        next: (response: any) => {
          console.log('✅ Exam submitted successfully:', response);
          
          this.isExamCompleted = true;
          this.hasSubmitted = true;
          this.examResult = response.result;
          
          // Update attempt count if provided
          if (response.attemptCount !== undefined) {
            this.attemptNumber = response.attemptCount;
            console.log('📊 Updated attempt count:', this.attemptNumber);
          }
          
          this.showAlert('Bài thi đã được nộp thành công!', 'success');
          
          // Show result if it's multiple choice
          if (this.examData?.quizType === 'MULTIPLE_CHOICE' && this.examResult) {
            console.log('📊 Displaying exam result:', this.examResult);
          }
        },
        error: (error: any) => {
          console.error('❌ Error submitting exam:', error);
          
          let errorMessage = 'Lỗi khi nộp bài thi!';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          
          this.showAlert(errorMessage, 'error');
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }).catch((error) => {
      console.error('❌ Error uploading files:', error);
      this.showAlert('Lỗi khi upload file: ' + error.message, 'error');
      this.isSubmitting = false;
    });
  }

  // Upload essay files for questions that have file submissions
  private async uploadEssayFiles(submissionData: any): Promise<any> {
    console.log('📤 Starting file uploads for essay questions...');
    
    if (!this.examData) {
      return submissionData;
    }

    // Find questions with file submissions
    const fileUploadPromises: Promise<void>[] = [];
    
    for (let i = 0; i < this.examData.questions.length; i++) {
      const question = this.examData.questions[i];
      
      if (question.questionType === 'ESSAY' && 
          question.essaySubmissionType === 'file' && 
          question.selectedFile) {
        
        console.log(`📁 Uploading file for question ${question.questionId}:`, question.selectedFile.name);
        
        const uploadPromise = this.uploadSingleFile(question.selectedFile, question.questionId || 0, i, submissionData);
        fileUploadPromises.push(uploadPromise);
      }
    }

    // Wait for all uploads to complete
    if (fileUploadPromises.length > 0) {
      await Promise.all(fileUploadPromises);
      console.log('✅ All file uploads completed successfully');
    } else {
      console.log('ℹ️ No files to upload');
    }

    return submissionData;
  }

  // Upload a single file
  private uploadSingleFile(file: File, questionId: number, answerIndex: number, submissionData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', this.courseId!.toString());
      formData.append('quizId', this.examData!.quizId.toString());

      this.apiService.uploadEssayFile(formData).subscribe({
        next: (response: any) => {
          console.log('✅ File uploaded successfully:', response);
          
          if (response.success) {
            // Update submission data with file information
            if (submissionData.answers[answerIndex]) {
              submissionData.answers[answerIndex].fileName = response.fileName;
              submissionData.answers[answerIndex].filePath = response.filePath;
            }
            resolve();
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        },
        error: (error: any) => {
          console.error('❌ File upload failed:', error);
          reject(new Error(error.error?.message || 'File upload failed'));
        }
      });
    });
  }

  // Cancel exam and go back
  cancelExam(): void {
    if (confirm('Bạn có chắc chắn muốn hủy bài thi? Mọi câu trả lời sẽ bị mất.')) {
      this.navigateBackToExams();
    }
  }

  // Navigate back to exams page
  navigateBackToExams(): void {
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

  // Retake exam (for multiple attempts)
  retakeExam(): void {
    if (!this.examData?.allowMultipleAttempts) {
      this.showAlert('Bài thi này không cho phép làm lại', 'warning');
      return;
    }

    // Reset exam state
    this.isExamStarted = false;
    this.isExamCompleted = false;
    this.hasSubmitted = false;
    this.currentQuestionIndex = 0;
    this.examResult = null;
    this.timeRemaining = 0;

    // Increment attempt number
    this.attemptNumber++;

    // Clear timer if exists
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Reload exam data to get fresh questions
    this.loadExamData();

    this.showAlert('Bắt đầu lần làm mới', 'info');
  }

  // Navigation methods
  navigateToHome(): void { this.currentPage = 'Home'; }
  navigateToDiscussion(): void { this.currentPage = 'Discussion'; }
  navigateToGrades(): void { this.currentPage = 'Grades'; }
  
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
  onProfileUpdate(): void { console.log('Profile update requested'); }
  
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
    // Initialize any view-related setup
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

  // Essay submission methods
  setEssaySubmissionType(type: 'text' | 'file' | 'link'): void {
    const currentQuestion = this.getCurrentQuestion();
    if (currentQuestion && currentQuestion.questionType === 'ESSAY') {
      currentQuestion.essaySubmissionType = type;
      
      // Initialize default value for essay submission type if not set
      if (!currentQuestion.essaySubmissionType) {
        currentQuestion.essaySubmissionType = 'text';
      }
      
      console.log('📝 Essay submission type changed to:', type);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    const currentQuestion = this.getCurrentQuestion();
    
    if (file && currentQuestion) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.showAlert('File quá lớn! Vui lòng chọn file nhỏ hơn 10MB.', 'warning');
        return;
      }

      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.showAlert('Loại file không được hỗ trợ! Vui lòng chọn file PDF, DOC, DOCX, TXT, JPG hoặc PNG.', 'warning');
        return;
      }

      currentQuestion.selectedFile = file;
      console.log('📎 File selected:', file.name, this.formatFileSize(file.size));
    }
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    const currentQuestion = this.getCurrentQuestion();
    if (currentQuestion) {
      currentQuestion.selectedFile = undefined;
      console.log('🗑️ File removed');
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Utility method to shuffle array
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Check if all questions are answered
  isAllQuestionsAnswered(): boolean {
    if (!this.examData) return false;
    
    return this.examData.questions.every(question => {
      if (question.questionType === 'MULTIPLE_CHOICE') {
        return question.selectedAnswer && question.selectedAnswer.length > 0;
      } else {
        return question.essayAnswer?.trim() || 
               question.essayLinkAnswer?.trim() || 
               question.selectedFile;
      }
    });
  }

  // Get questions to display based on mode
  getQuestionsToDisplay(): ExamQuestion[] {
    if (!this.examData) return [];
    
    if (this.showOneQuestionAtATime) {
      return [this.examData.questions[this.currentQuestionIndex]];
    } else {
      return this.examData.questions;
    }
  }

  // Check if can take another attempt
  canTakeAnotherAttempt(): boolean {
    return this.examData?.allowMultipleAttempts || false;
  }

  // Get question file download URL
  getQuestionFileDownloadUrl(fileUrl: string): string {
    // If fileUrl already includes the base URL, return as is
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    
    // Otherwise, prepend the API base URL
    return `http://localhost:8080${fileUrl}`;
  }
}
