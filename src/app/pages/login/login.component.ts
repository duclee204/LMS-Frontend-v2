import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../components/notification/notification.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, NotificationComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  loginError: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, 
    private sessionService: SessionService,
    private notificationService: NotificationService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    this.loginError = null;
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      
      this.authService.login({ username, password }).subscribe({
        next: (res) => {
          if (res?.token) {
            // Sử dụng SessionService để quản lý session
            this.sessionService.login(res.token);
          }
          this.notificationService.success('Thành công', res?.message || 'Chào mừng bạn quay lại!');
          // Chuyển hướng đến dashboard sau khi đăng nhập thành công
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        },
        error: (err) => {
          this.loginError = err.error?.message;
          this.notificationService.error('Đăng nhập thất bại', this.loginError || 'Có lỗi xảy ra khi đăng nhập');
        }
      });
    }
  }
}
