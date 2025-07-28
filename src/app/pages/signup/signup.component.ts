import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from '../../components/notification/notification.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, CommonModule, NotificationComponent],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  signupForm: FormGroup;
  cvFile: File | null = null;
  signupError: string | null = null;
  passwordStrength: any = {
    hasLength: false,
    hasNumber: false,
    hasLetter: false,
    hasSpecial: false,
    isValid: false
  };

  constructor(private fb: FormBuilder, private authService: AuthService, private notificationService: NotificationService, private router: Router) {
    this.signupForm = this.fb.group({
      fullname: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
      role: ['student', Validators.required]
      
    }, { validators: this.passwordMatchValidator });

    this.signupForm.get('password')?.valueChanges.subscribe(password => {
      this.checkPasswordStrength(password || '');
    });
  }

  strongPasswordValidator(control: any) {
    const password = control.value;
    if (!password) return null;

    const hasLength = password.length >= 10;
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const valid = hasLength && hasNumber && hasLetter && hasSpecial;
    return valid ? null : { weakPassword: true };
  }

  checkPasswordStrength(password: string) {
    this.passwordStrength = {
      hasLength: password.length >= 10,
      hasNumber: /[0-9]/.test(password),
      hasLetter: /[a-zA-Z]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      isValid: false
    };

    this.passwordStrength.isValid =
      this.passwordStrength.hasLength &&
      this.passwordStrength.hasNumber &&
      this.passwordStrength.hasLetter &&
      this.passwordStrength.hasSpecial;
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    this.cvFile = file ? file : null;
  }

 onSubmit(): void {
  this.signupError = null;

  if (this.signupForm.invalid) {
    this.notificationService.warning('Thông tin chưa đầy đủ', 'Vui lòng điền đầy đủ thông tin!');
    return;
  }

  if (!this.passwordStrength.isValid) {
    this.notificationService.warning('Mật khẩu không đủ mạnh', 'Mật khẩu phải có ít nhất 10 ký tự, bao gồm chữ, số và ký tự đặc biệt!');
    return;
  }

  const password = this.signupForm.get('password')?.value;
  const confirmPassword = this.signupForm.get('confirmPassword')?.value;
  if (password !== confirmPassword) {
    this.notificationService.warning('Mật khẩu không khớp', 'Mật khẩu xác nhận không khớp!');
    return;
  }

  const email = this.signupForm.get('email')?.value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    this.notificationService.warning('Email không hợp lệ', 'Vui lòng nhập địa chỉ email hợp lệ!');
    return;
  }

  const { username, password: pwd, email: userEmail, fullname, role } = this.signupForm.value;

  // ✅ Ánh xạ 'teacher' thành 'instructor' để gửi lên backend
  const mappedRole = role === 'teacher' ? 'instructor' : role;

  this.authService.register(
    {
      username,
      password: pwd,
      email: userEmail,
      fullName: fullname,
      role: mappedRole
    },
    this.cvFile
  ).subscribe({
    next: (res) => {
      this.notificationService.success('Đăng ký thành công', res?.message || 'Tài khoản của bạn đã được tạo!');
      
      // Delay 1.5 giây để người dùng thấy thông báo trước khi chuyển trang
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    },
    error: (err) => {
      if (err.status === 409 && err.error?.message) {
        this.signupError = err.error.message;
        this.notificationService.error('Đăng ký thất bại', this.signupError || 'Có lỗi xảy ra');
      } else if (err.error?.message) {
        this.signupError = err.error.message;
        this.notificationService.error('Đăng ký thất bại', this.signupError || 'Có lỗi xảy ra');
      } else {
        this.signupError = 'Đăng ký thất bại!';
        this.notificationService.error('Đăng ký thất bại', this.signupError);
      }
    }
  });
}
}
