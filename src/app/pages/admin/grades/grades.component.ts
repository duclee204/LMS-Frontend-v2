import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';

interface Grade {
  attemptId: number;
  userId: number;
  studentName: string;
  quizId: number;
  quizTitle: string;
  quizType: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  status: string;
  textAnswer?: string;
  linkAnswer?: string;
  fileName?: string;
  filePath?: string;
  questionId?: number;
  questionText?: string;
  isGraded?: boolean;
  feedback?: string;
  userAnswerId?: number; // Add this for essay details loading
}

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grades.component.html',
  styleUrl: './grades.component.scss'
})
export class GradesComponent implements OnInit {
  @Input() courseId?: number; // Accept courseId as input from parent component
  
  grades: Grade[] = [];
  filteredGrades: Grade[] = [];
  isLoading = true;
  activeTab = 'ALL'; // ALL, MULTIPLE_CHOICE, ESSAY
  isInstructor = false;
  
  // For grading modal
  selectedGrade?: Grade;
  gradingScore = 0;
  gradingFeedback = '';
  isGrading = false;
  isLoadingEssayDetails = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  // Get correct answers count from score
  getCorrectAnswers(grade: Grade): number {
    // Backend now returns actual score (correct answers count)
    return grade.score || 0;
  }

  // Get percentage score
  getPercentage(grade: Grade): number {
    const score = grade.score || 0;
    const maxScore = grade.maxScore || 1;
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  // Check if essay is already graded
  isEssayGraded(grade: Grade): boolean {
    return grade.status === 'COMPLETED';
  }

  ngOnInit() {
    console.log('🔍 Grades component initialized');
    
    // Check if user is instructor/admin
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.isInstructor = payload.role === 'ROLE_instructor' || payload.role === 'ROLE_admin';
      console.log('👤 User role:', payload.role, 'Is Instructor:', this.isInstructor);
    }

    // Get course ID from route params if available, or use input
    this.route.queryParams.subscribe(params => {
      if (!this.courseId) {
        this.courseId = params['courseId'] ? parseInt(params['courseId']) : undefined;
      }
      console.log('📚 Course ID:', this.courseId);
      this.loadGrades();
    });
  }

  loadGrades() {
    this.isLoading = true;
    
    if (this.isInstructor && this.courseId) {
      // Load grades for instructor
      this.loadInstructorGrades();
    } else {
      // Load grades for student
      this.loadStudentGrades();
    }
  }

  loadInstructorGrades() {
    if (!this.courseId) return;

    console.log('📊 Loading instructor grades for course:', this.courseId);
    
    this.apiService.get(`/grades/instructor/${this.courseId}?type=${this.activeTab}`).subscribe({
      next: (response: any) => {
        console.log('✅ Instructor grades loaded:', response);
        
        if (response.success) {
          this.grades = response.grades;
          this.filterGrades();
        } else {
          console.error('❌ Failed to load grades:', response.message);
          alert('Lỗi khi tải danh sách điểm: ' + response.message);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading instructor grades:', error);
        alert('Lỗi khi tải danh sách điểm!');
        this.isLoading = false;
      }
    });
  }

  loadStudentGrades() {
    console.log('📊 Loading student grades');
    
    this.apiService.get('/grades/student').subscribe({
      next: (response: any) => {
        console.log('✅ Student grades loaded:', response);
        
        if (response.success) {
          this.grades = response.grades;
          this.filterGrades();
        } else {
          console.error('❌ Failed to load grades:', response.message);
          alert('Lỗi khi tải điểm của bạn: ' + response.message);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading student grades:', error);
        alert('Lỗi khi tải điểm của bạn!');
        this.isLoading = false;
      }
    });
  }

  changeTab(tab: string) {
    this.activeTab = tab;
    console.log('🔄 Changing tab to:', tab);
    
    if (this.isInstructor) {
      this.loadInstructorGrades();
    } else {
      this.filterGrades();
    }
  }

  filterGrades() {
    if (this.activeTab === 'ALL') {
      this.filteredGrades = [...this.grades];
    } else {
      this.filteredGrades = this.grades.filter(grade => grade.quizType === this.activeTab);
    }
    
    console.log('📋 Filtered grades:', this.filteredGrades.length, 'items');
  }

  openGradingModal(grade: Grade) {
    this.selectedGrade = grade;
    
    // Reset form values first
    this.gradingScore = 0;
    this.gradingFeedback = '';
    
    console.log('📝 Opening grading modal for:', grade);
    
    // Load detailed essay answer if it's an essay question
    if (grade.quizType === 'ESSAY' && grade.userAnswerId) {
      this.loadEssayDetails(grade.userAnswerId);
    }
  }

  loadEssayDetails(userAnswerId: number) {
    console.log('📄 Loading essay details for userAnswerId:', userAnswerId);
    this.isLoadingEssayDetails = true;
    
    this.apiService.get(`/grades/essay-details/${userAnswerId}`).subscribe({
      next: (response: any) => {
        console.log('✅ Essay details loaded:', response);
        
        if (response.success && this.selectedGrade) {
          const essayDetails = response.essayDetails;
          
          // Update selected grade with detailed information
          this.selectedGrade.textAnswer = essayDetails.answerText;
          this.selectedGrade.linkAnswer = essayDetails.linkAnswer;
          this.selectedGrade.fileName = essayDetails.fileName;
          this.selectedGrade.filePath = essayDetails.filePath;
          this.selectedGrade.questionText = essayDetails.question?.questionText;
          
          // IMPORTANT: Keep the userAnswerId for grading
          this.selectedGrade.userAnswerId = userAnswerId;
          
          // Load existing score and feedback if already graded
          if (essayDetails.manualScore !== null && essayDetails.manualScore !== undefined) {
            this.gradingScore = essayDetails.manualScore;
            console.log('📊 Loaded existing score:', this.gradingScore);
          }
          
          if (essayDetails.instructorFeedback) {
            this.gradingFeedback = essayDetails.instructorFeedback;
            console.log('💬 Loaded existing feedback:', this.gradingFeedback);
          }
          
          console.log('📋 Updated grade with essay details:', this.selectedGrade);
        }
        this.isLoadingEssayDetails = false;
      },
      error: (error) => {
        console.error('❌ Error loading essay details:', error);
        this.isLoadingEssayDetails = false;
        // Don't show alert, just log the error since modal still works without details
      }
    });
  }

  closeGradingModal() {
    this.selectedGrade = undefined;
    this.gradingScore = 0;
    this.gradingFeedback = '';
  }

  submitGrade() {
    if (!this.selectedGrade || !this.selectedGrade.userAnswerId) {
      alert('Không tìm thấy thông tin bài làm để chấm điểm!');
      return;
    }

    this.isGrading = true;
    console.log('💾 Submitting grade:', {
      userAnswerId: this.selectedGrade.userAnswerId,
      score: this.gradingScore,
      feedback: this.gradingFeedback
    });

    const gradeData = {
      userAnswerId: this.selectedGrade.userAnswerId,
      score: this.gradingScore,
      feedback: this.gradingFeedback
    };

    this.apiService.post('/grades/grade-essay', gradeData).subscribe({
      next: (response: any) => {
        console.log('✅ Grade submitted:', response);
        
        if (response.success) {
          alert('Chấm điểm thành công!');
          
          // Update local grade data to reflect changes immediately
          if (this.selectedGrade) {
            // Update the grade in the grades array
            const gradeIndex = this.grades.findIndex(g => g.attemptId === this.selectedGrade!.attemptId);
            if (gradeIndex !== -1) {
              this.grades[gradeIndex].status = 'COMPLETED';
              this.grades[gradeIndex].feedback = this.gradingFeedback;
              
              console.log('✅ Updated local grade status');
            }
            
            // Update filtered grades as well
            this.filterGrades();
          }
          
          this.closeGradingModal();
          
          // Reload grades to get updated score from backend
          console.log('🔄 Reloading grades after grading...');
          this.loadGrades();
        } else {
          alert('Lỗi: ' + response.message);
        }
        
        this.isGrading = false;
      },
      error: (error) => {
        console.error('❌ Error submitting grade:', error);
        let errorMessage = 'Lỗi khi chấm điểm!';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        alert(errorMessage);
        this.isGrading = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'badge bg-success';
      case 'PENDING_GRADE': return 'badge bg-warning';
      case 'NOT_SUBMITTED': return 'badge bg-secondary';
      default: return 'badge bg-secondary';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }
}
