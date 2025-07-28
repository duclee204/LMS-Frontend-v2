import { Injectable } from '@angular/core';

export interface NotificationMessage {
  id?: any;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // milliseconds, default 5000
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: NotificationMessage[] = [];

  constructor() { }

  show(notification: NotificationMessage) {
    // Add unique ID for tracking
    const notificationWithId = {
      ...notification,
      id: Date.now() + Math.random(),
      duration: notification.duration || 5000
    };

    this.notifications.push(notificationWithId);

    // Auto remove after duration
    setTimeout(() => {
      this.remove(notificationWithId);
    }, notificationWithId.duration);

    return notificationWithId;
  }

  success(title: string, message: string, duration?: number) {
    return this.show({
      type: 'success',
      title,
      message,
      duration
    });
  }

  error(title: string, message: string, duration?: number) {
    return this.show({
      type: 'error',
      title,
      message,
      duration: duration || 8000 // Errors show longer
    });
  }

  warning(title: string, message: string, duration?: number) {
    return this.show({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  info(title: string, message: string, duration?: number) {
    return this.show({
      type: 'info',
      title,
      message,
      duration
    });
  }

  remove(notification: any) {
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }
  }

  clear() {
    this.notifications = [];
  }

  getNotifications() {
    return this.notifications;
  }
}
