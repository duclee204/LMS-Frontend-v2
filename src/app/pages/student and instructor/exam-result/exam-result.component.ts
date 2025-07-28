import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamResultService, QuizResult, QuestionResult } from '../../../services/exam-result.service';
import { AuthService } from '../../../services/auth.service';
import { SessionService } from '../../../services/session.service';

@Component({
  selector: 'app-exam-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exam-result.component.html',
  styleUrl: './exam-result.component.scss'
})
export class ExamResultComponent implements OnInit {
  result: QuizResult | null = null;
  attemptId: number = 0;
  isLoading = true;
  userRole: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examResultService: ExamResultService,
    private authService: AuthService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    this.userRole = this.sessionService.getUserRole() || '';
    
    this.route.params.subscribe(params => {
      this.attemptId = +params['attemptId'];
      if (this.attemptId) {
        this.loadResult();
      }
    });
  }

  loadResult() {
    this.isLoading = true;
    this.examResultService.getQuizResult(this.attemptId).subscribe({
      next: (result: QuizResult) => {
        this.result = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading result:', error);
        alert('Lỗi khi tải kết quả bài thi');
        this.isLoading = false;
      }
    });
  }

  getGradeLetter(): string {
    if (!this.result) return '';
    return this.examResultService.getGradeLetter(this.result.score);
  }

  getGradeClass(): string {
    if (!this.result) return '';
    const score = this.result.score;
    if (score >= 80) return 'grade-excellent';
    if (score >= 70) return 'grade-good';
    if (score >= 60) return 'grade-average';
    return 'grade-poor';
  }

  isPassing(): boolean {
    if (!this.result) return false;
    return this.examResultService.isPassing(this.result.score);
  }

  getCorrectAnswersCount(): number {
    if (!this.result) return 0;
    return this.result.questionResults.filter(q => q.isCorrect).length;
  }

  getTotalQuestions(): number {
    if (!this.result) return 0;
    return this.result.questionResults.length;
  }

  getQuestionTypeDisplay(type: string): string {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'Trắc nghiệm';
      case 'ESSAY':
        return 'Tự luận';
      default:
        return type;
    }
  }

  goBack() {
    if (this.userRole === 'INSTRUCTOR') {
      this.router.navigate(['/admin/quiz-list']);
    } else {
      this.router.navigate(['/exam']);
    }
  }

  retakeQuiz() {
    // Logic để làm lại bài thi (nếu được phép)
    this.router.navigate(['/take-exam'], { 
      queryParams: { quizId: this.result?.quizId } 
    });
  }
}
