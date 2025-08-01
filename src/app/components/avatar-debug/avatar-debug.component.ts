import { Component, OnInit } from '@angular/core';
import { AvatarService } from '../../services/avatar.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; background: #f5f5f5; margin: 10px;">
      <h3>🔧 Avatar Debug Tool</h3>
      
      <div style="margin: 10px 0;">
        <button (click)="testCurrentAvatar()" style="padding: 10px; margin: 5px;">
          Test Current Avatar
        </button>
        <button (click)="testAllUrls()" style="padding: 10px; margin: 5px;">
          Test All Possible URLs
        </button>
      </div>

      <div style="margin: 10px 0;">
        <strong>Database Avatar Path:</strong>
        <code>{{ databaseAvatarPath }}</code>
      </div>

      <div style="margin: 10px 0;">
        <strong>Current Avatar URL:</strong>
        <code>{{ currentAvatarUrl }}</code>
      </div>

      <div style="margin: 10px 0;">
        <img [src]="currentAvatarUrl" 
             alt="Current Avatar" 
             style="width: 100px; height: 100px; border: 1px solid #ccc;"
             (error)="onImageError($event)"
             (load)="onImageLoad($event)">
      </div>

      <div style="margin: 10px 0; font-family: monospace; background: white; padding: 10px; max-height: 300px; overflow-y: auto;">
        <div *ngFor="let log of debugLogs" [style.color]="log.includes('✅') ? 'green' : log.includes('❌') ? 'red' : 'black'">
          {{ log }}
        </div>
      </div>
    </div>
  `
})
export class AvatarDebugComponent implements OnInit {
  databaseAvatarPath = '/uploads/avatars/dcafd554-f94a-4c1f-aa29-21ce01f073a8_Screenshot_2025-05-22_153152.png';
  currentAvatarUrl = '';
  debugLogs: string[] = [];

  constructor(private avatarService: AvatarService) {}

  ngOnInit() {
    this.currentAvatarUrl = this.avatarService.processAvatarUrl(this.databaseAvatarPath) || '';
    this.addLog('🔧 Debug tool initialized');
    this.addLog(`Database path: ${this.databaseAvatarPath}`);
    this.addLog(`Processed URL: ${this.currentAvatarUrl}`);
  }

  testCurrentAvatar() {
    this.addLog('🧪 Testing current avatar URL...');
    this.avatarService.testAvatarUrl(this.currentAvatarUrl);
  }

  testAllUrls() {
    this.addLog('🧪 Testing all possible URLs...');
    this.avatarService.testAllPossibleUrls(this.databaseAvatarPath);
  }

  onImageLoad(event: any) {
    this.addLog(`✅ Image loaded successfully: ${event.target.src}`);
  }

  onImageError(event: any) {
    this.addLog(`❌ Image failed to load: ${event.target.src}`);
    event.target.src = this.avatarService.getDefaultAvatarUrl();
  }

  addLog(message: string) {
    this.debugLogs.push(`${new Date().toLocaleTimeString()} - ${message}`);
  }
}
