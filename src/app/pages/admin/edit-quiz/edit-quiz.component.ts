import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';

interface QuizEditData {
  quizId: number;
  title: string;
  description: string;
  timeLimit: number;
  questions: QuestionData[];
}

interface QuestionData {
  questionId?: number;
  quizId?: number;
  questionText: string;
  type: string;
  points: number;
  answers?: AnswerData[];
}

interface AnswerData {
  answerId?: number;
  questionId?: number;
  answerText: string;
  isCorrect: boolean;
  orderNumber: number;
}

@Component({
  selector: 'app-edit-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './edit-quiz.component.html',
  styleUrl: './edit-quiz.component.scss'
})
export class EditQuizComponent implements OnInit {
  editForm!: FormGroup;
  quizId!: number;
  isLoading = true;
  isSaving = false;
  deletingQuestions = new Set<number>(); // Track which questions are being deleted

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.quizId = +params['id'];
      this.loadQuizData();
    });
  }

  initForm() {
    this.editForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      timeLimit: [60, [Validators.required, Validators.min(1)]],
      questions: this.fb.array([])
    });
  }

  get questionsArray(): FormArray {
    return this.editForm.get('questions') as FormArray;
  }

  loadQuizData() {
    this.isLoading = true;
    this.apiService.get<QuizEditData>(`/quiz-management/quiz/${this.quizId}/edit`).subscribe({
      next: (data) => {
        this.populateForm(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading quiz data:', error);
        alert('Lỗi khi tải dữ liệu bài thi');
        this.isLoading = false;
      }
    });
  }

  populateForm(data: QuizEditData) {
    this.editForm.patchValue({
      title: data.title,
      description: data.description,
      timeLimit: data.timeLimit
    });

    // Clear existing questions
    while (this.questionsArray.length !== 0) {
      this.questionsArray.removeAt(0);
    }

    // Add questions from data
    data.questions.forEach(question => {
      this.questionsArray.push(this.createQuestionFormGroup(question));
    });
  }

  createQuestionFormGroup(questionData?: QuestionData): FormGroup {
    const questionForm = this.fb.group({
      questionId: [questionData?.questionId || null],
      questionText: [questionData?.questionText || '', Validators.required],
      type: [questionData?.type || 'MULTIPLE_CHOICE', Validators.required],
      points: [questionData?.points || 1, [Validators.required, Validators.min(0.1)]],
      answers: this.fb.array([])
    });

    // Add answers for multiple choice questions
    if (questionData?.type === 'MULTIPLE_CHOICE' && questionData.answers) {
      const answersArray = questionForm.get('answers') as FormArray;
      questionData.answers.forEach(answer => {
        answersArray.push(this.createAnswerFormGroup(answer));
      });
    } else if (questionData?.type === 'MULTIPLE_CHOICE') {
      // Add empty answers for new multiple choice questions
      this.addAnswerOptions(questionForm);
    }

    return questionForm;
  }

  createAnswerFormGroup(answerData?: AnswerData): FormGroup {
    return this.fb.group({
      answerId: [answerData?.answerId || null],
      answerText: [answerData?.answerText || '', Validators.required],
      isCorrect: [answerData?.isCorrect || false],
      orderNumber: [answerData?.orderNumber || 1]
    });
  }

  addQuestion() {
    this.questionsArray.push(this.createQuestionFormGroup());
  }

  removeQuestion(index: number) {
    const question = this.questionsArray.at(index);
    const questionId = question.get('questionId')?.value;
    
    if (questionId) {
      // Xóa câu hỏi đã lưu trong database
      if (confirm('Bạn có chắc muốn xóa câu hỏi này?')) {
        // Add to deleting set to show loading state
        this.deletingQuestions.add(questionId);
        
        this.apiService.delete(`/quiz-management/question/${questionId}`).subscribe({
          next: (response: any) => {
            console.log('✅ Question deleted successfully:', response);
            
            if (response.success) {
              // Remove from form array
              this.questionsArray.removeAt(index);
              alert('Xóa câu hỏi thành công');
              
              // Reload quiz data to ensure consistency
              this.loadQuizData();
            } else {
              alert('Lỗi: ' + response.message);
            }
          },
          error: (error) => {
            console.error('❌ Error deleting question:', error);
            
            let errorMessage = 'Lỗi khi xóa câu hỏi!';
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            alert(errorMessage);
          },
          complete: () => {
            // Remove from deleting set
            this.deletingQuestions.delete(questionId);
          }
        });
      }
    } else {
      // Xóa câu hỏi chưa lưu
      this.questionsArray.removeAt(index);
    }
  }

  onQuestionTypeChange(questionIndex: number) {
    const questionForm = this.questionsArray.at(questionIndex) as FormGroup;
    const type = questionForm.get('type')?.value;
    const answersArray = questionForm.get('answers') as FormArray;

    // Clear existing answers
    while (answersArray.length !== 0) {
      answersArray.removeAt(0);
    }

    // Add answer options for multiple choice
    if (type === 'MULTIPLE_CHOICE') {
      this.addAnswerOptions(questionForm);
    }
  }

  addAnswerOptions(questionForm: FormGroup) {
    const answersArray = questionForm.get('answers') as FormArray;
    
    // Add 4 empty answer options
    for (let i = 0; i < 4; i++) {
      const answerForm = this.createAnswerFormGroup();
      answerForm.get('orderNumber')?.setValue(i + 1);
      answersArray.push(answerForm);
    }
  }

  getAnswersArray(questionIndex: number): FormArray {
    return this.questionsArray.at(questionIndex).get('answers') as FormArray;
  }

  addAnswer(questionIndex: number) {
    const answersArray = this.getAnswersArray(questionIndex);
    const newAnswer = this.createAnswerFormGroup();
    newAnswer.get('orderNumber')?.setValue(answersArray.length + 1);
    answersArray.push(newAnswer);
  }

  removeAnswer(questionIndex: number, answerIndex: number) {
    const answersArray = this.getAnswersArray(questionIndex);
    answersArray.removeAt(answerIndex);
  }

  setCorrectAnswer(questionIndex: number, answerIndex: number) {
    const answersArray = this.getAnswersArray(questionIndex);
    
    // Set all answers to false first
    for (let i = 0; i < answersArray.length; i++) {
      answersArray.at(i).get('isCorrect')?.setValue(false);
    }
    
    // Set selected answer to true
    answersArray.at(answerIndex).get('isCorrect')?.setValue(true);
  }

  onSubmit() {
    if (this.editForm.invalid) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    this.isSaving = true;
    const formData = this.editForm.value;
    
    // Validate multiple choice questions have correct answers
    for (const question of formData.questions) {
      if (question.type === 'MULTIPLE_CHOICE') {
        const hasCorrectAnswer = question.answers?.some((answer: any) => answer.isCorrect);
        if (!hasCorrectAnswer) {
          alert('Mỗi câu trắc nghiệm phải có ít nhất một đáp án đúng');
          this.isSaving = false;
          return;
        }
      }
    }

    this.apiService.put(`/quiz-management/quiz/${this.quizId}/update`, formData).subscribe({
      next: (response: any) => {
        console.log('✅ Quiz update successful:', response);
        
        if (response.success) {
          alert('Cập nhật bài thi thành công!');
          // Reload the quiz data to show updated information
          this.loadQuizData();
          this.isSaving = false;
        } else {
          alert('Lỗi: ' + response.message);
          this.isSaving = false;
        }
      },
      error: (error) => {
        console.error('❌ Error updating quiz:', error);
        
        let errorMessage = 'Lỗi khi cập nhật bài thi!';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
        this.isSaving = false;
      }
    });
  }

  // Check if a question is being deleted
  isQuestionDeleting(questionId: number): boolean {
    return this.deletingQuestions.has(questionId);
  }

  cancel() {
    if (confirm('Bạn có chắc muốn hủy? Các thay đổi chưa lưu sẽ bị mất.')) {
      this.router.navigate(['/admin/quiz-list']);
    }
  }
}
