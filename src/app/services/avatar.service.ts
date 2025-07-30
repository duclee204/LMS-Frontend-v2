import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private readonly BASE_URL = 'http://localhost:8080';

  constructor() { }

  /**
   * Process avatar URL to add base URL if needed
   * @param avatarUrl - The avatar URL from backend
   * @returns Full URL to avatar or null if no avatar
   */
 processAvatarUrl(avatarUrl: string | null | undefined): string | null {
  console.log('🔍 Processing avatar URL:', avatarUrl);
  
  if (!avatarUrl) {
    console.log('❌ No avatar URL provided');
    return null;
  }

  // Nếu URL bắt đầu bằng http(s), giữ nguyên
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    console.log('✅ Avatar URL is already full URL:', avatarUrl);
    return avatarUrl;
  }

  // Nếu URL bắt đầu bằng /uploads/avatars/, chuyển thành /images/avatars/
  if (avatarUrl.startsWith('/uploads/avatars/')) {
    const convertedUrl = avatarUrl.replace('/uploads/avatars/', '/images/avatars/');
    const fullUrl = `${this.BASE_URL}${convertedUrl}`;
    console.log('🔁 Converted /uploads/avatars to /images/avatars:', fullUrl);
    return fullUrl;
  }

  // Nếu bắt đầu bằng /, thêm base URL
  if (avatarUrl.startsWith('/')) {
    const fullUrl = `${this.BASE_URL}${avatarUrl}`;
    console.log('✅ Avatar URL with base URL:', fullUrl);
    return fullUrl;
  }

  // Nếu là URL tương đối, thêm base URL + /images/avatars/
  const fullUrl = `${this.BASE_URL}/images/avatars/${avatarUrl}`;
  console.log('✅ Avatar URL with full path:', fullUrl);
  return fullUrl;
}
}