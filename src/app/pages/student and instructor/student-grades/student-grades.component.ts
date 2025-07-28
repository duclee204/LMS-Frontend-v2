import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { ExamService } from '../../../services/exam.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';

interface StudentGrade {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  quizType: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  status: string;
  courseName: string;
  feedback?: string;
}

interface EssaySubmission {
  attemptId: number;
  quizTitle: string;
  submittedAt: string;
  totalQuestions: number;
  gradedCount: number;
  totalScore: number;
  maxScore: number;
  isFullyGraded: boolean;
  questions: any[];
  answers: any[];
}

@Component({
  selector: 'app-student-grades',
  standalone: true,
  imports: [CommonModule, NotificationComponent],
  templateUrl: './student-grades.component.html',
  styleUrl: './student-grades.component.scss'
})
export class StudentGradesComponent implements OnInit {
  grades: StudentGrade[] = [];
  filteredGrades: StudentGrade[] = [];
  isLoading = true;
  activeTab = 'ALL'; // ALL, MULTIPLE_CHOICE, ESSAY
  
  // For essay submission modal
  selectedSubmission?: EssaySubmission;
  isLoadingSubmission = false;

  constructor(
    private apiService: ApiService,
    private examService: ExamService,
    private notificationService: NotificationService
  ) {}

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

  ngOnInit() {
    console.log('🔍 Student grades component initialized');
    this.loadGrades();
  }

  // Get correct answers count from score
  getCorrectAnswers(grade: StudentGrade): number {
    // Backend now returns actual score (correct answers count)
    return grade.score || 0;
  }

  // Get percentage score
  getPercentage(grade: StudentGrade): number {
    const score = grade.score || 0;
    const maxScore = grade.maxScore || 1;
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  loadGrades() {
    this.isLoading = true;
    console.log('📊 Loading student grades');
    
    this.apiService.get('/grades/student').subscribe({
      next: (response: any) => {
        console.log('✅ Student grades loaded:', response);
        
        if (response.success) {
          this.grades = response.grades;
          this.filterGrades();
        } else {
          console.error('❌ Failed to load grades:', response.message);
          this.showAlert('Lỗi khi tải điểm của bạn: ' + response.message, 'error');
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading student grades:', error);
        this.showAlert('Lỗi khi tải điểm của bạn!', 'error');
        this.isLoading = false;
      }
    });
  }

  changeTab(tab: string) {
    this.activeTab = tab;
    console.log('🔄 Changing tab to:', tab);
    this.filterGrades();
  }

  filterGrades() {
    if (this.activeTab === 'ALL') {
      this.filteredGrades = [...this.grades];
    } else {
      this.filteredGrades = this.grades.filter(grade => grade.quizType === this.activeTab);
    }
    
    console.log('📋 Filtered grades:', this.filteredGrades.length, 'items');
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'badge bg-success';
      case 'PENDING_GRADE': return 'badge bg-warning';
      case 'NOT_SUBMITTED': return 'badge bg-secondary';
      default: return 'badge bg-secondary';
    }
  }

  getScoreClass(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    if (percentage >= 40) return 'score-average';
    return 'score-poor';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }

  // View essay submission details
  viewEssaySubmission(grade: StudentGrade) {
    console.log('📝 Viewing essay submission for quiz:', grade.quizId);
    
    // Show modal with animation
    this.selectedSubmission = {} as EssaySubmission; // Placeholder to show modal
    this.isLoadingSubmission = true;
    
    // Small delay for smooth animation
    setTimeout(() => {
      // Use the exam result endpoint which should work for students
      this.examService.getExamResult(grade.quizId).subscribe({
        next: (response: any) => {
          console.log('✅ Exam result loaded:', response);
          console.log('📊 Response keys:', Object.keys(response));
          console.log('📊 Response type:', typeof response);
          
          // Check if response has data (the API returns data directly)
          if (response && (response.attemptId || response.questionResults)) {
            // Transform the exam result data to our EssaySubmission format
            this.selectedSubmission = {
              attemptId: response.attemptId || grade.attemptId,
              quizTitle: grade.quizTitle,
              submittedAt: grade.submittedAt,
              totalQuestions: response.questionResults?.length || 0,
              gradedCount: response.questionResults?.filter((q: any) => q.score !== null && q.score !== undefined).length || 0,
              totalScore: response.earnedPoints || grade.score,
              maxScore: response.totalPoints || grade.maxScore,
              isFullyGraded: true, // Assume fully graded if we have results
              questions: response.questionResults || [],
              answers: response.questionResults || []
            };
          } else if (response.success) {
            // Handle wrapped response format (backup)
            this.selectedSubmission = {
              attemptId: grade.attemptId,
              quizTitle: grade.quizTitle,
              submittedAt: grade.submittedAt,
              totalQuestions: response.examResult?.totalQuestions || 0,
              gradedCount: response.examResult?.gradedQuestions || 0,
              totalScore: response.examResult?.totalScore || grade.score,
              maxScore: response.examResult?.maxScore || grade.maxScore,
              isFullyGraded: response.examResult?.isFullyGraded || false,
              questions: response.examResult?.questions || [],
              answers: response.examResult?.answers || []
            };
          } else {
            console.error('❌ Failed to load exam result: Invalid response format');
            this.showAlert('Lỗi khi tải chi tiết bài làm: Định dạng dữ liệu không hợp lệ', 'error');
            this.closeEssayModal();
          }
          
          this.isLoadingSubmission = false;
        },
        error: (error) => {
          console.error('❌ Error loading exam result:', error);
          // Fallback: try the original endpoint in case it works for some users
          this.tryOriginalEndpoint(grade);
        }
      });
    }, 100);
  }

  // Fallback method to try the original endpoint
  private tryOriginalEndpoint(grade: StudentGrade) {
    console.log('🔄 Trying original endpoint as fallback...');
    
    this.apiService.get(`/grades/student/essay-submission/${grade.attemptId}`).subscribe({
      next: (response: any) => {
        console.log('✅ Essay submission details loaded via fallback:', response);
        
        if (response.success) {
          this.selectedSubmission = response.submission;
        } else {
          console.error('❌ Failed to load essay submission:', response.message);
          this.showAlert('Lỗi khi tải chi tiết bài làm: ' + response.message, 'error');
          this.closeEssayModal();
        }
        
        this.isLoadingSubmission = false;
      },
      error: (error) => {
        console.error('❌ Error loading essay submission via fallback:', error);
        this.showAlert('Không thể tải chi tiết bài làm. Vui lòng thử lại sau!', 'error');
        this.isLoadingSubmission = false;
        this.closeEssayModal();
      }
    });
  }

  // Close essay submission modal with animation
  closeEssayModal() {
    if (this.selectedSubmission) {
      // Add fade out animation
      this.selectedSubmission = undefined;
    }
  }

  // Get answer for a specific question
  getAnswerForQuestion(questionId: number): any {
    if (!this.selectedSubmission) return null;
    
    return this.selectedSubmission.answers.find(answer => 
      answer.question && answer.question.questionId === questionId
    );
  }

  // Get score display for essay
  getEssayScoreDisplay(submission: EssaySubmission): string {
    if (!submission.isFullyGraded) {
      return `${submission.gradedCount}/${submission.totalQuestions} câu đã chấm`;
    }
    return `${submission.totalScore}/${submission.maxScore} điểm`;
  }

  // Get percentage for essay
  getEssayPercentage(submission: EssaySubmission): number {
    if (!submission.isFullyGraded || submission.maxScore === 0) return 0;
    return (submission.totalScore / submission.maxScore) * 100;
  }
}
