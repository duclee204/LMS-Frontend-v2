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
  id?: string; // Temporary ID for tracking
  questionId?: number; // Real database ID
  quizId: number;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'ESSAY';
  options?: string[]; // For multiple choice
  correctAnswers?: boolean[]; // For multiple choice
  attachmentUrl?: string; // For essay questions
  questionFileUrl?: string; // File URL for essay questions
  questionFileName?: string; // Original file name for essay questions
  points: number;
  explanation?: string;
}

@Component({
  selector: 'app-question-manager',
  standalone: true,
  templateUrl: './question-manager.component.html',
  styleUrls: ['./question-manager.component.scss'],
  imports: [CommonModule, FormsModule, RouterModule, ProfileComponent, SidebarWrapperComponent],
})
export class QuestionManagerComponent implements OnInit, AfterViewInit {
  // Properties for layout and navigation
  public currentPage = 'Tests';
  public leftMenuHidden = false;
  public showProfileDropdown = false;
  public courseId: number | null = null;
  public quizId: number | null = null;
  public courseInfo: Course | null = null;
  public quizTitle: string = '';
  public quizType: 'MULTIPLE_CHOICE' | 'ESSAY' = 'MULTIPLE_CHOICE';

  // Profile properties
  public username: string = '';
  public userRole: string = '';
  public avatarUrl: string = '';

  // Questions management
  public questions: QuestionData[] = [];
  public currentQuestionIndex = 0;
  public isEditing = false;

  // Current question being edited
  public currentQuestion: QuestionData = this.createNewQuestion();

  // Form state
  public isSaving = false;
  public selectedFile: File | null = null;

  // Validation optimization
  private validationTimeout: any = null;

  // Legacy properties for backward compatibility
  showDropdown = false;
  isMenuHidden = false;
  isMobile = false;

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

    // Check if running in browser and set mobile flag
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth < 768;
    }

    // Debug logging
    console.log('🔍 QuestionManager component initialized');

    // Get parameters from query params
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe(params => {
        this.courseId = params['courseId'] ? +params['courseId'] : null;
        this.quizId = params['quizId'] ? +params['quizId'] : null;
        this.quizTitle = params['quizTitle'] ? decodeURIComponent(params['quizTitle']) : 'Quiz';
        this.quizType = params['questionType'] as 'MULTIPLE_CHOICE' | 'ESSAY' || 'MULTIPLE_CHOICE';
        const courseName = params['courseName'];

        console.log('📚 Course ID:', this.courseId);
        console.log('🧪 Quiz ID:', this.quizId);
        console.log('📝 Quiz Title:', this.quizTitle);
        console.log('❓ Question Type:', this.quizType);

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

        // Initialize first question
        this.currentQuestion = this.createNewQuestion();
        
        // Load existing questions if editing
        if (this.quizId) {
          this.loadExistingQuestions();
        } else {
          // Add first question to the list immediately so it shows at index 0
          if (this.questions.length === 0) {
            this.createAndAddFirstQuestion();
          }
        }
      });
    }
  }

  // Load existing questions for editing
  private loadExistingQuestions(): void {
    if (!this.quizId) return;

    console.log('📚 Loading existing questions for quiz:', this.quizId);
    
    // Try to use the quiz with questions endpoint
    this.examService.getQuizWithQuestions(this.quizId).subscribe({
      next: (response: any) => {
        console.log('✅ Loaded quiz with questions:', response);
        
        const questions = response.questions || [];
        
        if (questions && questions.length > 0) {
          // Convert backend questions to frontend format
          this.questions = questions.map((q: any) => this.convertFromBackendQuestion(q));
          this.currentQuestionIndex = 0;
          this.currentQuestion = { ...this.questions[0] };
          this.isEditing = true;
          
          console.log(`✅ Loaded ${this.questions.length} existing questions`);
        } else {
          // No existing questions, add first new question
          this.createAndAddFirstQuestion();
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading questions:', error);
        // If error loading, just start with new question
        this.createAndAddFirstQuestion();
      }
    });
  }

  // Fallback method to load questions directly
  private loadQuestionsDirectly(): void {
    this.examService.getQuestionsForEditing(this.quizId!).subscribe({
      next: (questions: any[]) => {
        console.log('✅ Loaded questions directly:', questions);
        
        if (questions && questions.length > 0) {
          // Convert backend questions to frontend format
          this.questions = questions.map((q: any) => this.convertFromBackendQuestion(q));
          this.currentQuestionIndex = 0;
          this.currentQuestion = { ...this.questions[0] };
          this.isEditing = true;
          
          console.log(`✅ Loaded ${this.questions.length} existing questions`);
        } else {
          // No existing questions, add first new question
          this.createAndAddFirstQuestion();
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading questions directly:', error);
        // If still error, just start with new question
        this.createAndAddFirstQuestion();
      }
    });
  }

  // Convert backend question to frontend format
  private convertFromBackendQuestion(backendQ: any): QuestionData {
    const questionData: QuestionData = {
      id: `db_${backendQ.questionId}`,
      questionId: backendQ.questionId,
      quizId: backendQ.quizId || this.quizId || 0,
      questionText: backendQ.questionText || '',
      questionType: backendQ.type || 'MULTIPLE_CHOICE',
      points: backendQ.points || 1,
      explanation: backendQ.explanation || ''
    };

    // Nếu là trắc nghiệm và có answers
    if (backendQ.type === 'MULTIPLE_CHOICE' && backendQ.answers && backendQ.answers.length > 0) {
      questionData.options = [];
      questionData.correctAnswers = [];
      
      // Sort answers by orderNumber - fix null check
      const sortedAnswers = backendQ.answers
        .filter((answer: any) => answer !== null && answer !== undefined)
        .sort((a: any, b: any) => 
          (a?.orderNumber || 0) - (b?.orderNumber || 0)
        );
      
      sortedAnswers.forEach((answer: any) => {
        if (answer) {
          questionData.options!.push(answer.answerText || '');
          questionData.correctAnswers!.push(answer.isCorrect || false);
        }
      });

      // Đảm bảo ít nhất có 4 options
      while (questionData.options!.length < 4) {
        questionData.options!.push('');
        questionData.correctAnswers!.push(false);
      }
    } else if (backendQ.type === 'MULTIPLE_CHOICE') {
      // Trắc nghiệm nhưng chưa có answers
      questionData.options = ['', '', '', ''];
      questionData.correctAnswers = [false, false, false, false];
    }

    return questionData;
  }

  // Create new question template
  private createNewQuestion(): QuestionData {
    return {
      id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      quizId: this.quizId || 0,
      questionText: '',
      questionType: this.quizType,
      options: this.quizType === 'MULTIPLE_CHOICE' ? ['', '', '', ''] : undefined,
      correctAnswers: this.quizType === 'MULTIPLE_CHOICE' ? [false, false, false, false] : undefined,
      points: 1,
      explanation: ''
    };
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

  // Add new question
  addNewQuestion(): void {
    // Ngăn thêm câu hỏi mới nếu là đề thi tự luận
    if (this.quizType === 'ESSAY') {
      alert('Đề thi tự luận chỉ được phép có 1 câu hỏi duy nhất!');
      return;
    }

    // Only save to database if current question has valid content
    if (this.currentQuestion.questionText && this.currentQuestion.questionText.trim().length > 0) {
      // First update local array
      this.updateCurrentQuestionLocally();
      
      // Then save to database and WAIT for completion before adding new question
      this.saveCurrentQuestionToDatabaseAsync().then(() => {
        console.log(`💾 Saved current question to database, now creating new question`);
        this.createAndAddNewQuestion();
      }).catch((error: any) => {
        console.error('❌ Error saving current question, but creating new question anyway:', error);
        this.createAndAddNewQuestion();
      });
    } else {
      // No current question to save, directly create new one
      this.createAndAddNewQuestion();
    }
  }

  // Helper method to create and add first question (bypasses essay restriction)
  private createAndAddFirstQuestion(): void {
    const newQuestion = this.createNewQuestion();
    this.questions.push(newQuestion);
    this.currentQuestionIndex = this.questions.length - 1;
    this.currentQuestion = { ...newQuestion };
    this.isEditing = false;
    
    console.log(`➕ Added first question ${this.questions.length} (Index: ${this.currentQuestionIndex})`);
    console.log(`📝 First question data:`, this.currentQuestion);
  }

  // Helper method to create and add new question
  private createAndAddNewQuestion(): void {
    const newQuestion = this.createNewQuestion();
    this.questions.push(newQuestion);
    this.currentQuestionIndex = this.questions.length - 1;
    this.currentQuestion = { ...newQuestion };
    this.isEditing = false;
    
    console.log(`➕ Added new question ${this.questions.length} (Index: ${this.currentQuestionIndex})`);
    console.log(`📝 New question data:`, this.currentQuestion);
  }

  // Switch to a specific question
  switchToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      // Only save to database if current question has valid content
      if (this.currentQuestion.questionText && this.currentQuestion.questionText.trim().length > 0) {
        // First update local array
        this.updateCurrentQuestionLocally();
        
        // Then save to database and WAIT for completion before switching
        this.saveCurrentQuestionToDatabaseAsync().then(() => {
          console.log(`💾 Saved current question to database, now switching`);
          this.performQuestionSwitch(index);
        }).catch((error: any) => {
          console.error('❌ Error saving current question, but switching anyway:', error);
          this.performQuestionSwitch(index);
        });
      } else {
        // No current question to save, directly switch
        this.performQuestionSwitch(index);
      }
    }
  }

  // Helper method to perform the actual question switch
  private performQuestionSwitch(index: number): void {
    this.currentQuestionIndex = index;
    const selectedQuestion = this.questions[index];
    
    // If question exists in database (has questionId), reload from database
    if (selectedQuestion.questionId) {
      console.log(`🔄 Loading question ${selectedQuestion.questionId} from database...`);
      this.loadQuestionFromDatabase(selectedQuestion.questionId, index);
    } else {
      // New question not in database yet, use local data
      this.currentQuestion = { ...selectedQuestion };
      this.isEditing = true;
      console.log(`🔄 Switched to local question ${index + 1}`);
    }
  }

  // Load question from database and update UI
  private loadQuestionFromDatabase(questionId: number, index: number): void {
    this.examService.getQuestionById(questionId).subscribe({
      next: (response: any) => {
        console.log(`✅ Loaded question from database:`, response);
        
        // Convert backend question to frontend format
        const updatedQuestion = this.convertFromBackendQuestion(response);
        
        // Update both the array and current question
        this.questions[index] = updatedQuestion;
        this.currentQuestion = { ...updatedQuestion };
        this.isEditing = true;
        
        console.log(`🔄 Switched to database question ${index + 1}`, updatedQuestion);
      },
      error: (error: any) => {
        console.error(`❌ Error loading question ${questionId} from database:`, error);
        
        // Fallback to local data if database call fails
        this.currentQuestion = { ...this.questions[index] };
        this.isEditing = true;
        console.log(`🔄 Fallback: Switched to local question ${index + 1}`);
        
        // Show warning to user
        alert('Không thể tải câu hỏi từ database. Hiển thị dữ liệu local.');
      }
    });
  }

  // Save current question
  saveCurrentQuestion(): void {
    console.log('🔍 === Saving Current Question ===');
    console.log('currentQuestion before save:', this.currentQuestion);
    console.log('questionText value:', `"${this.currentQuestion.questionText}"`);
    console.log('questionText length:', this.currentQuestion.questionText?.length);
    
    if (!this.isFormValid()) {
      alert('Vui lòng điền đầy đủ thông tin câu hỏi!');
      console.log('❌ Form validation failed!');
      return;
    }

    if (this.isEditing) {
      // Update existing question
      this.questions[this.currentQuestionIndex] = { ...this.currentQuestion };
      console.log(`💾 Updated question ${this.currentQuestionIndex + 1}`);
      alert('Câu hỏi đã được cập nhật!');
    } else {
      // Add new question to list
      this.questions.push({ ...this.currentQuestion });
      this.currentQuestionIndex = this.questions.length - 1;
      this.isEditing = true;
      console.log(`💾 Saved new question ${this.questions.length}`);
      alert('Câu hỏi đã được lưu!');
    }
    
    console.log('Final questions array:', this.questions);
  }

  // Save current question silently (without alerts)
  private saveCurrentQuestionSilently(): void {
    if (this.isEditing) {
      // Update existing question
      this.questions[this.currentQuestionIndex] = { ...this.currentQuestion };
      console.log(`💾 Auto-updated question ${this.currentQuestionIndex + 1}`);
    } else {
      // Add new question to list
      this.questions.push({ ...this.currentQuestion });
      this.currentQuestionIndex = this.questions.length - 1;
      this.isEditing = true;
      console.log(`💾 Auto-saved new question ${this.questions.length}`);
    }
  }

  // Save current question to database immediately (async version)
  private saveCurrentQuestionToDatabaseAsync(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Only require question text to save (allow partial saves)
      if (!this.currentQuestion.questionText || this.currentQuestion.questionText.trim().length === 0) {
        console.log('❌ Cannot save question without question text');
        resolve(null);
        return;
      }

      // Don't modify the local array here - it should already be updated by updateCurrentQuestionLocally()
      const questionToSave = this.currentQuestion;

      // Check if it's a new question (no questionId) or existing question that needs update
      if (!questionToSave.questionId) {
        // New question - save to database (allow partial saves)
        const questionDto = this.convertToQuestionDtoAllowPartial(questionToSave);
        
        console.log('🚀 Saving NEW question to database (async, partial save allowed):', questionDto);
        
        this.examService.createQuestion(questionDto).subscribe({
          next: (response: any) => {
            console.log(`✅ Question saved to database:`, response);
            
            // Update the question with the returned ID in both current question and array
            if (response.questionId) {
              // Update current question
              this.currentQuestion.questionId = response.questionId;
              
              // Update question in array if it exists
              if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
                this.questions[this.currentQuestionIndex].questionId = response.questionId;
              }
              
              console.log(`✅ Updated questionId to ${response.questionId} for current question`);
            }
            resolve(response);
          },
          error: (error: any) => {
            console.error('❌ Error saving question to database:', error);
            reject(error);
          }
        });
      } else {
        // Existing question - update in database (allow partial saves)
        const questionDto = this.convertToQuestionDtoAllowPartial(questionToSave);
        
        console.log('🚀 Updating existing question in database (async, partial save allowed):', questionDto);
        
        this.examService.updateQuestion(questionToSave.questionId, questionDto).subscribe({
          next: (response: any) => {
            console.log(`✅ Question updated in database:`, response);
            resolve(response);
          },
          error: (error: any) => {
            console.error('❌ Error updating question in database:', error);
            reject(error);
          }
        });
      }
    });
  }

  // Save current question to database immediately
  saveCurrentQuestionToDatabase(): void {
    // Only require question text to save (allow partial saves)
    if (!this.currentQuestion.questionText || this.currentQuestion.questionText.trim().length === 0) {
      console.log('❌ Cannot save question without question text');
      return;
    }

    // Don't modify the local array here - it should already be updated by updateCurrentQuestionLocally()
    const questionToSave = this.currentQuestion;

    // Check if it's a new question (no questionId) or existing question that needs update
    if (!questionToSave.questionId) {
      // New question - save to database (allow partial saves)
      const questionDto = this.convertToQuestionDtoAllowPartial(questionToSave);
      
      console.log('🚀 Saving NEW question to database (partial save allowed):', questionDto);
      
      this.examService.createQuestion(questionDto).subscribe({
        next: (response: any) => {
          console.log(`✅ Question saved to database:`, response);
          
          // Update the question with the returned ID in both current question and array
          if (response.questionId) {
            // Update current question
            this.currentQuestion.questionId = response.questionId;
            
            // Update question in array if it exists
            if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
              this.questions[this.currentQuestionIndex].questionId = response.questionId;
            }
            
            console.log(`✅ Updated questionId to ${response.questionId} for current question`);
          }
        },
        error: (error: any) => {
          console.error('❌ Error saving question to database:', error);
          // Question still saved locally even if database save fails
        }
      });
    } else {
      // Existing question - update in database (allow partial saves)
      const questionDto = this.convertToQuestionDtoAllowPartial(questionToSave);
      
      console.log('🚀 Updating existing question in database (partial save allowed):', questionDto);
      
      this.examService.updateQuestion(questionToSave.questionId, questionDto).subscribe({
        next: (response: any) => {
          console.log(`✅ Question updated in database:`, response);
        },
        error: (error: any) => {
          console.error('❌ Error updating question in database:', error);
          // Question still updated locally even if database update fails
        }
      });
    }
  }

  // Check if current question has unsaved changes
  private hasUnsavedChanges(): boolean {
    if (!this.isEditing || this.currentQuestionIndex >= this.questions.length) {
      return true; // New question always has changes to save
    }

    const existingQuestion = this.questions[this.currentQuestionIndex];
    
    // Compare basic properties
    if (existingQuestion.questionText !== this.currentQuestion.questionText ||
        existingQuestion.questionType !== this.currentQuestion.questionType ||
        existingQuestion.points !== this.currentQuestion.points ||
        existingQuestion.explanation !== this.currentQuestion.explanation) {
      return true;
    }

    // Compare options for multiple choice
    if (this.currentQuestion.questionType === 'MULTIPLE_CHOICE') {
      if (JSON.stringify(existingQuestion.options) !== JSON.stringify(this.currentQuestion.options) ||
          JSON.stringify(existingQuestion.correctAnswers) !== JSON.stringify(this.currentQuestion.correctAnswers)) {
        return true;
      }
    }

    return false;
  }

  // Public method to check if there's an unsaved question
  hasUnsavedQuestion(): boolean {
    return this.currentQuestion.questionText.trim().length > 0 && this.isFormValid() && 
           (!this.isEditing || this.hasUnsavedChanges());
  }

  // Delete question
  deleteQuestion(index: number): void {
    // Ngăn xóa câu hỏi cuối cùng trong đề thi tự luận
    if (this.quizType === 'ESSAY' && this.questions.length === 1) {
      alert('Đề thi tự luận phải có ít nhất 1 câu hỏi!');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa câu hỏi ${index + 1}?`)) {
      const questionToDelete = this.questions[index];
      
      // If question exists in database, delete from backend first
      if (questionToDelete.questionId) {
        console.log('🗑️ Deleting question from database:', questionToDelete.questionId);
        
        this.examService.deleteQuestion(questionToDelete.questionId).subscribe({
          next: (response: any) => {
            console.log('✅ Question deleted from database:', response);
            this.removeQuestionFromList(index);
            alert('Câu hỏi đã được xóa khỏi cơ sở dữ liệu!');
          },
          error: (error: any) => {
            console.error('❌ Error deleting question from database:', error);
            // Still remove from local list even if backend delete fails
            this.removeQuestionFromList(index);
            alert('Đã xóa câu hỏi khỏi danh sách (có thể chưa xóa khỏi cơ sở dữ liệu)');
          }
        });
      } else {
        // Question not in database yet, just remove from list
        this.removeQuestionFromList(index);
      }
    }
  }

  // Remove question from local list
  private removeQuestionFromList(index: number): void {
    this.questions.splice(index, 1);
    
    // Adjust current index
    if (this.currentQuestionIndex >= this.questions.length) {
      this.currentQuestionIndex = Math.max(0, this.questions.length - 1);
    }
    
    if (this.questions.length > 0) {
      this.currentQuestion = { ...this.questions[this.currentQuestionIndex] };
      this.isEditing = true;
    } else {
      this.currentQuestion = this.createNewQuestion();
      this.isEditing = false;
    }
    
    console.log(`🗑️ Question removed from list, remaining: ${this.questions.length}`);
  }

  // Form validation with debouncing
  isFormValid(): boolean {
    // Quick check first to avoid unnecessary logging
    if (!this.currentQuestion.questionText || this.currentQuestion.questionText.trim().length === 0) {
      return false;
    }
    
    const basicValid = this.currentQuestion.questionText.trim().length > 0 && 
                      this.currentQuestion.points > 0;

    if (this.currentQuestion.questionType === 'MULTIPLE_CHOICE') {
      const hasOptions = this.currentQuestion.options?.some(option => option.trim().length > 0) || false;
      const hasCorrectAnswer = this.currentQuestion.correctAnswers?.some(answer => answer) || false;
      
      const finalValid = basicValid && hasOptions && hasCorrectAnswer;
      return finalValid;
    }

    return basicValid;
  }

  // Debounced validation for real-time UI updates
  private debouncedValidation(): void {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    this.validationTimeout = setTimeout(() => {
      // Only log validation details when needed
      if (this.currentQuestion.questionText && this.currentQuestion.questionText.trim().length > 0) {
        console.log('✅ Question validation passed for:', this.currentQuestion.questionText.substring(0, 20) + '...');
      }
    }, 300);
  }

  // Check if a question is complete and ready to save
  private isQuestionComplete(question: QuestionData): boolean {
    // Quick return for obviously incomplete questions to reduce noise
    if (!question.questionText || question.questionText.trim().length === 0) {
      return false;
    }
    
    const hasQuestionText = question.questionText && question.questionText.trim().length > 0;
    const hasValidPoints = question.points > 0;
    const basicValid = hasQuestionText && hasValidPoints;

    if (question.questionType === 'MULTIPLE_CHOICE') {
      const hasOptions = question.options?.some(option => option && option.trim().length > 0) || false;
      const hasCorrectAnswer = question.correctAnswers?.some(answer => answer) || false;
      const multipleChoiceValid = basicValid && hasOptions && hasCorrectAnswer;
      
      return !!multipleChoiceValid;
    }

    return !!basicValid;
  }

  // Add option for multiple choice
  addOption(): void {
    if (this.currentQuestion.options && this.currentQuestion.correctAnswers && 
        this.currentQuestion.options.length < 6) {
      this.currentQuestion.options.push('');
      this.currentQuestion.correctAnswers.push(false);
    }
  }

  // Remove option for multiple choice
  removeOption(index: number): void {
    if (this.currentQuestion.options && this.currentQuestion.correctAnswers && 
        this.currentQuestion.options.length > 2) {
      this.currentQuestion.options.splice(index, 1);
      this.currentQuestion.correctAnswers.splice(index, 1);
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

  // Remove existing file from question
  removeExistingFile(): void {
    this.currentQuestion.questionFileUrl = undefined;
    this.currentQuestion.questionFileName = undefined;
    
    // Update questions array
    if (this.isEditing && this.currentQuestionIndex < this.questions.length) {
      this.questions[this.currentQuestionIndex].questionFileUrl = undefined;
      this.questions[this.currentQuestionIndex].questionFileName = undefined;
    }
    
    console.log('🗑️ Existing file removed from question');
  }

  // Rich text formatting functions for essay questions
  formatText(command: string): void {
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
      this.currentQuestion.questionText = textarea.value;
    }
  }

  // Save all questions to backend
  saveAllQuestions(): void {
    // Auto-save current question if form is valid and not already saved
    if (this.isFormValid() && (!this.isEditing || this.hasUnsavedChanges())) {
      this.saveCurrentQuestionSilently();
    }

    // Clean up empty questions before validation
    this.cleanupEmptyQuestions();

    if (this.questions.length === 0) {
      alert('Chưa có câu hỏi nào để lưu!');
      return;
    }

    // Count incomplete questions
    const incompleteQuestions = this.questions.filter(q => !this.isQuestionComplete(q));
    if (incompleteQuestions.length > 0) {
      const message = `Có ${incompleteQuestions.length} câu hỏi chưa hoàn thành. Chỉ những câu hỏi hoàn thành mới được lưu. Tiếp tục?`;
      if (!confirm(message)) {
        return;
      }
    }

    this.isSaving = true;
    console.log('💾 Saving all questions:', this.questions);

    // Save questions to database
    this.saveQuestionsToDatabase();
  }

  // Clean up questions with empty questionText
  private cleanupEmptyQuestions(): void {
    const originalLength = this.questions.length;
    this.questions = this.questions.filter(q => q.questionText && q.questionText.trim().length > 0);
    
    if (this.questions.length < originalLength) {
      console.log(`🧹 Cleaned up ${originalLength - this.questions.length} empty questions`);
      
      // Adjust current index if needed
      if (this.currentQuestionIndex >= this.questions.length) {
        this.currentQuestionIndex = Math.max(0, this.questions.length - 1);
      }
      
      // Update current question if needed
      if (this.questions.length > 0 && this.currentQuestionIndex < this.questions.length) {
        this.currentQuestion = { ...this.questions[this.currentQuestionIndex] };
        this.isEditing = true;
      } else if (this.questions.length === 0) {
        this.currentQuestion = this.createNewQuestion();
        this.isEditing = false;
      }
    }
  }

  // Save questions to database
  private saveQuestionsToDatabase(): void {
    // Upload file first if selected
    if (this.selectedFile && this.currentQuestion.questionType === 'ESSAY') {
      this.uploadQuestionFile().then(() => {
        this.proceedWithSaving();
      }).catch((error) => {
        console.error('❌ File upload failed:', error);
        alert('Lưu file thất bại: ' + error.message);
        this.isSaving = false;
      });
    } else {
      this.proceedWithSaving();
    }
  }

  // Upload question file
  private uploadQuestionFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.selectedFile) {
        resolve();
        return;
      }

      const formData = new FormData();
      formData.append('file', this.selectedFile);

      console.log('📤 Uploading question file:', this.selectedFile.name);

      this.examService.uploadQuestionFile(formData).subscribe({
        next: (response: any) => {
          console.log('✅ Question file uploaded:', response);
          
          // Update current question with file info
          this.currentQuestion.questionFileUrl = response.fileUrl;
          this.currentQuestion.questionFileName = response.fileName;
          
          // Update questions array
          if (this.isEditing && this.currentQuestionIndex < this.questions.length) {
            this.questions[this.currentQuestionIndex].questionFileUrl = response.fileUrl;
            this.questions[this.currentQuestionIndex].questionFileName = response.fileName;
          }
          
          this.selectedFile = null; // Clear selected file
          resolve();
        },
        error: (error: any) => {
          console.error('❌ Question file upload failed:', error);
          reject(new Error(error.error?.message || 'File upload failed'));
        }
      });
    });
  }

  // Proceed with saving questions after file upload
  private proceedWithSaving(): void {
    // Filter out questions with valid content only - enhanced filtering
    const questionsToSave = this.questions.filter(q => {
      // Skip questions with empty questionText immediately
      if (!q.questionText || q.questionText.trim().length === 0) {
        return false;
      }
      
      const isNew = !q.questionId;
      const hasValidText = q.questionText && q.questionText.trim().length > 0;
      const isComplete = this.isQuestionComplete(q);
      
      console.log(`🔍 New question check: isNew=${isNew}, hasValidText=${hasValidText}, isComplete=${isComplete}`, q.questionText);
      
      return isNew && hasValidText && isComplete;
    });
    
    const questionsToUpdate = this.questions.filter(q => {
      // Skip questions with empty questionText immediately
      if (!q.questionText || q.questionText.trim().length === 0) {
        return false;
      }
      
      const hasId = q.questionId && q.questionId > 0;
      const hasChanged = this.hasQuestionChanged(q);
      const hasValidText = q.questionText && q.questionText.trim().length > 0;
      const isComplete = this.isQuestionComplete(q);
      
      console.log(`🔍 Update question check: hasId=${hasId}, hasChanged=${hasChanged}, hasValidText=${hasValidText}, isComplete=${isComplete}`, q.questionText);
      
      return hasId && hasChanged && hasValidText && isComplete;
    });
    
    let savedCount = 0;
    let updatedCount = 0;
    let totalToSave = questionsToSave.length;
    let totalToUpdate = questionsToUpdate.length;
    let totalOperations = totalToSave + totalToUpdate;

    console.log('📊 Questions Analysis:');
    console.log(`- Total questions: ${this.questions.length}`);
    console.log(`- Questions to save (new): ${totalToSave}`);
    console.log(`- Questions to update: ${totalToUpdate}`);
    console.log(`- Total operations: ${totalOperations}`);

    if (totalOperations === 0) {
      console.log('✅ All questions already saved and up-to-date');
      this.isSaving = false;
      alert(`Tất cả câu hỏi đã được lưu!`);
      return;
    }

    // Save new questions
    questionsToSave.forEach(question => {
      // Final safety check before sending to API
      if (!question.questionText || question.questionText.trim().length === 0) {
        console.warn('⚠️ Skipping question with empty text:', question);
        savedCount++;
        this.checkOperationComplete(savedCount + updatedCount, totalOperations);
        return;
      }
      
      const questionDto = this.convertToQuestionDto(question);
      
      console.log('🚀 === Sending NEW Question to API ===');
      console.log('API Endpoint: /api/questions');
      console.log('Full URL: http://localhost:8080/api/questions');
      console.log('Method: POST');
      console.log('Question DTO being sent:', JSON.stringify(questionDto, null, 2));
      console.log('Headers will include Authorization token automatically');
      console.log('=========================================');
      
      this.examService.createQuestion(questionDto).subscribe({
        next: (response: any) => {
          savedCount++;
          console.log(`✅ NEW Question saved successfully:`, response);
          
          // Update the question with the returned ID
          const index = this.questions.findIndex(q => q.id === question.id);
          if (index >= 0 && response.questionId) {
            this.questions[index].questionId = response.questionId;
          }
          
          this.checkOperationComplete(savedCount + updatedCount, totalOperations);
        },
        error: (error: any) => {
          savedCount++;
          console.error('❌ Error saving NEW question:', error);
          console.error('Error details:', error.error);
          console.error('Status:', error.status);
          console.error('Status Text:', error.statusText);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          this.checkOperationComplete(savedCount + updatedCount, totalOperations);
        }
      });
    });

    // Update existing questions
    questionsToUpdate.forEach(question => {
      // Final safety check before sending to API
      if (!question.questionText || question.questionText.trim().length === 0) {
        console.warn('⚠️ Skipping update for question with empty text:', question);
        updatedCount++;
        this.checkOperationComplete(savedCount + updatedCount, totalOperations);
        return;
      }
      
      const questionDto = this.convertToQuestionDto(question);
      
      this.examService.updateQuestion(question.questionId!, questionDto).subscribe({
        next: (response: any) => {
          updatedCount++;
          console.log(`✅ Question updated:`, response);
          this.checkOperationComplete(savedCount + updatedCount, totalOperations);
        },
        error: (error: any) => {
          updatedCount++;
          console.error('❌ Error updating question:', error);
          this.checkOperationComplete(savedCount + updatedCount, totalOperations);
        }
      });
    });
  }

  // Check if all operations are complete
  private checkOperationComplete(completedCount: number, totalOperations: number): void {
    if (completedCount === totalOperations) {
      this.isSaving = false;
      console.log('✅ All question operations completed');
      alert(`Đã lưu thành công tất cả câu hỏi!`);
      this.navigateBackToQuiz();
    }
  }

  // Check if a question has changed (for update detection)
  private hasQuestionChanged(question: QuestionData): boolean {
    // For now, assume questions with questionId might need updates
    // In a real app, you'd track original values to compare
    return true; // Simplified - always update existing questions
  }

  // Convert QuestionData to backend DTO format
  private convertToQuestionDto(question: QuestionData): any {
    console.log('🔍 === Converting QuestionData to DTO ===');
    console.log('Input QuestionData:', question);
    console.log('question.quizId:', question.quizId);
    console.log('question.questionText:', `"${question.questionText}"`);
    console.log('question.questionText length:', question.questionText?.length);
    console.log('question.questionType:', question.questionType);
    console.log('question.points:', question.points);
    
    const dto: any = {
      quizId: question.quizId,
      questionText: question.questionText,
      type: question.questionType,
      points: question.points,
      questionFileUrl: question.questionFileUrl,
      questionFileName: question.questionFileName
    };

    // Nếu là trắc nghiệm, thêm answers
    if (question.questionType === 'MULTIPLE_CHOICE' && question.options && question.correctAnswers) {
      dto.answers = [];
      for (let i = 0; i < question.options.length; i++) {
        if (question.options[i] && question.options[i].trim().length > 0) {
          dto.answers.push({
            answerText: question.options[i],
            isCorrect: question.correctAnswers[i] || false,
            orderNumber: i + 1
          });
        }
      }
    }

    console.log('🔄 Final DTO:', dto);
    return dto;
  }

  // Convert QuestionData to backend DTO format - allow partial saves
  private convertToQuestionDtoAllowPartial(question: QuestionData): any {
    console.log('🔍 === Converting QuestionData to DTO (Partial Save Allowed) ===');
    console.log('Input QuestionData:', question);
    console.log('question.quizId:', question.quizId);
    console.log('question.questionText:', `"${question.questionText}"`);
    console.log('question.questionText length:', question.questionText?.length);
    console.log('question.questionType:', question.questionType);
    console.log('question.points:', question.points);
    
    const dto: any = {
      quizId: question.quizId,
      questionText: question.questionText || '',
      type: question.questionType,
      points: question.points || 1, // Default to 1 point if not set
      questionFileUrl: question.questionFileUrl,
      questionFileName: question.questionFileName
    };

    // Nếu là trắc nghiệm, thêm answers nếu có
    if (question.questionType === 'MULTIPLE_CHOICE') {
      dto.answers = [];
      if (question.options && question.correctAnswers) {
        for (let i = 0; i < question.options.length; i++) {
          // Allow empty options in partial saves
          dto.answers.push({
            answerText: question.options[i] || '',
            isCorrect: question.correctAnswers[i] || false,
            orderNumber: i + 1
          });
        }
      } else {
        // Create default empty answers if none exist
        for (let i = 0; i < 4; i++) {
          dto.answers.push({
            answerText: '',
            isCorrect: false,
            orderNumber: i + 1
          });
        }
      }
    }

    console.log('🔄 Final DTO (partial save):', dto);
    return dto;
  }

  // Cancel and go back
  cancelQuestions(): void {
    if (this.questions.length > 0) {
      if (confirm(`Bạn có ${this.questions.length} câu hỏi chưa lưu. Bạn có chắc chắn muốn hủy?`)) {
        this.navigateBackToQuiz();
      }
    } else {
      this.navigateBackToQuiz();
    }
  }

  // Navigate back to quiz/exam page
  private navigateBackToQuiz(): void {
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

  // Helper method to check if current user can manage content (instructor/admin)
  canManageContent(): boolean {
    return this.sessionService.isInstructor() || this.sessionService.isAdmin();
  }

  // TrackBy function for ngFor performance optimization
  trackByIndex(index: number, item: any): number {
    return index;
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
    // Add event listeners for form changes to auto-save current question
    this.setupFormAutoSave();
  }

  // Setup auto-save for form changes
  private setupFormAutoSave(): void {
    // Auto-save disabled - only save on explicit actions (+ button or switch questions)
    console.log('📝 Auto-save disabled - manual save only');
  }

  // Update current question locally only (no database save)
  private updateCurrentQuestionLocally(): void {
    if (this.currentQuestion.questionText && this.currentQuestion.questionText.trim().length > 0) {
      if (this.isEditing && this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
        // Update existing question in the array locally only
        this.questions[this.currentQuestionIndex] = { ...this.currentQuestion };
        console.log(`💾 Updated question ${this.currentQuestionIndex + 1} locally only`);
      } else {
        // This case should be handled by the calling function (addNewQuestion)
        console.log(`📝 New question ready to be added to array by caller`);
      }
    }
  }

  // Method to trigger when form content changes (called from template)
  onQuestionContentChange(): void {
    // Only validation, no auto-save
    this.debouncedValidation();
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
