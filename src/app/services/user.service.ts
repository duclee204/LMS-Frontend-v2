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
          avatarUrl: '', // Don't use default avatar, return empty string
          role: 'student'
        };
      }

      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role || 'student';
        // Chuẩn hóa role - loại bỏ prefix ROLE_
        const normalizedRole = role.replace('ROLE_', '');
        
        // Xử lý avatar URL từ token
        let avatarUrl = payload.avatarUrl;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          // Nếu avatar URL không có base URL, thêm vào
          if (avatarUrl.startsWith('/')) {
            avatarUrl = `http://localhost:8080${avatarUrl}`;
          } else {
            avatarUrl = `http://localhost:8080/uploads/avatars/${avatarUrl}`;
          }
        }
 
        return {
          username: payload.fullName || payload.sub || 'User',
          avatarUrl: avatarUrl || '', // Don't use default avatar, return empty string
          role: normalizedRole
        };
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
    
    return {
      username: 'User',
      avatarUrl: '', // Don't use default avatar, return empty string
      role: 'student'
    };
  }

  // ✅ Avatar mặc định từ Backend  
  private getDefaultAvatar(): string {
    return 'http://localhost:8080/uploads/avatars/default.png'; // ✅ Sử dụng đường dẫn uploads thay vì images
  }

  // ✅ Lấy danh sách người dùng
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/list`);
  }

  // ✅ Lấy thông tin user theo ID
  getUserById(id: number): Observable<User> {
    const token = localStorage.getItem('token');
    const headers = {
      Authorization: `Bearer ${token}`
    };
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers });
  }

  // ✅ Lấy thông tin user hiện tại (từ token)
  getCurrentUser(): Observable<User> {
    const token = localStorage.getItem('token');
    const headers = {
      Authorization: `Bearer ${token}`
    };
    // Thử endpoint /me hoặc /current trước, nếu không có thì dùng endpoint khác
    return this.http.get<User>(`${this.apiUrl}/me`, { headers });
  }

  // ✅ Kiểm tra email có tồn tại không
  checkEmailExists(email: string, excludeUserId?: number): Observable<{exists: boolean}> {
    const token = localStorage.getItem('token');
    const headers = {
      Authorization: `Bearer ${token}`
    };
    let url = `${this.apiUrl}/check-email?email=${encodeURIComponent(email)}`;
    if (excludeUserId) {
      url += `&excludeUserId=${excludeUserId}`;
    }
    return this.http.get<{exists: boolean}>(url, { headers });
  }

  // ✅ Kiểm tra username có tồn tại không
  checkUsernameExists(username: string, excludeUserId?: number): Observable<{exists: boolean}> {
    const token = localStorage.getItem('token');
    const headers = {
      Authorization: `Bearer ${token}`
    };
    let url = `${this.apiUrl}/check-username?username=${encodeURIComponent(username)}`;
    if (excludeUserId) {
      url += `&excludeUserId=${excludeUserId}`;
    }
    return this.http.get<{exists: boolean}>(url, { headers });
  }

  // ✅ Cập nhật người dùng với FormData (kèm file avatar)
  updateUserWithForm(id: number, formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = {
      Authorization: `Bearer ${token}`
    };
    return this.http.put(`${this.apiUrl}/update/${id}`, formData, { headers });
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
