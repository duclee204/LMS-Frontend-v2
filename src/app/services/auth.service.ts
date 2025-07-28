import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8080/api';
  constructor(private http: HttpClient) {}

  login(data: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/login`, data);
  }

  
  // 📌 Đăng ký: gửi dữ liệu theo multipart/form-data nếu có file
  register(
  data: {
    username: string;
    password: string;
    email: string;
    fullName: string;
    role: string;
    isVerified?: boolean; // 👈 thêm nếu muốn gửi
  },
  cvFile?: File | null
): Observable<any> {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('password', data.password);
  formData.append('email', data.email);
  formData.append('fullName', data.fullName);
  formData.append('role', data.role);

  if (data.role === 'instructor' && cvFile) {
    formData.append('cv', cvFile);
  }

  // ✅ Nếu là student hoặc admin và có isVerified → gửi
  if ((data.role === 'student' || data.role === 'admin') && data.isVerified !== undefined) {
    formData.append('isVerified', String(data.isVerified));
  }

  return this.http.post(`${this.apiUrl}/users/register`, formData);
}}

