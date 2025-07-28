import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Kiểm tra token có hợp lệ và chưa hết hạn
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp > currentTime) {
          return true;
        } else {
          // Token hết hạn
          console.log('⏰ Token expired, redirecting to login');
          localStorage.removeItem('token');
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          router.navigate(['/login']);
          return false;
        }
      } catch (error) {
        // Token không hợp lệ
        console.error('❌ Invalid token format');
        localStorage.removeItem('token');
        router.navigate(['/login']);
        return false;
      }
    }
    
    // Không có token
    router.navigate(['/login']);
    return false;
  }
  
  // Nếu không phải browser (SSR), luôn cho qua hoặc xử lý khác tùy ý
  return true;
};