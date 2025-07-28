import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  verified: boolean;
  cvUrl?: string | null;
  avatarUrl?: string | null; // ✅ thêm avatarUrl để hiển thị ảnh
  password?: string; // tùy chọn khi cập nhật
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  // ✅ Lấy thông tin user hiện tại từ token
  getCurrentUserInfo(): { username: string; avatarUrl: string; role: string } {
    try {
      // ✅ Kiểm tra SSR - localStorage chỉ có ở browser
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return {
          username: 'User',
          avatarUrl: this.getDefaultAvatar(),
          role: 'student'
        };
      }

      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role || 'student';
        // Chuẩn hóa role - loại bỏ prefix ROLE_
        const normalizedRole = role.replace('ROLE_', '');
        
        return {
          username: payload.sub || 'User',
          avatarUrl: this.getDefaultAvatar(), // Sử dụng avatar mặc định
          role: normalizedRole
        };
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
    
    return {
      username: 'User',
      avatarUrl: this.getDefaultAvatar(),
      role: 'student'
    };
  }

  // ✅ Avatar mặc định từ Backend  
  private getDefaultAvatar(): string {
    return 'http://localhost:8080/images/avatars/default.png'; // ✅ Sử dụng mapping /images/avatars/** từ WebMvcConfig
  }

  // ✅ Lấy danh sách người dùng
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/list`);
  }

  // ✅ Cập nhật người dùng với FormData (kèm file avatar)
  updateUserWithForm(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${id}`, formData);
  }

  // (Optional) Nếu bạn vẫn muốn hỗ trợ PUT dạng JSON thuần
  updateUserJson(id: number, user: User): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${id}`, user);
  }
  deleteUserById(id: number): Observable<any> {
  const token = localStorage.getItem('accessToken'); // hoặc từ AuthService nếu có
  const headers = {
    Authorization: `Bearer ${token}`
  };

  return this.http.delete<any>(`${this.apiUrl}/delete/${id}`, { headers });
}


}
