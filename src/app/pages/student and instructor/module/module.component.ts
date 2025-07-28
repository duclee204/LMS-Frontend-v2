import { Component, ElementRef, HostListener, ViewChild, Inject, PLATFORM_ID, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModuleService, ModuleItem, ModuleDto } from '../../../services/module.service';
import { ContentService, ContentDto, ContentItem } from '../../../services/content.service';
import { CourseService, Course } from '../../../services/course.service';
import { SessionService } from '../../../services/session.service';
import { NotificationService } from '../../../services/notification.service';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { GradesComponent } from '../../admin/grades/grades.component';
import { StudentGradesComponent } from '../student-grades/student-grades.component';

@Component({
  selector: 'app-module',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileComponent, SidebarWrapperComponent, NotificationComponent, GradesComponent, StudentGradesComponent],
  templateUrl: './module.component.html',
  styleUrls: ['./module.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ModuleComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  public searchTerm = '';
  public modules: ModuleItem[] = [];
  public filteredModules: ModuleItem[] = [];
  public courseId: number | null = null;
  public courseInfo: Course | null = null; // 👈 Thêm thông tin khóa học
  public currentPage = 'Home'; // Track current page for menu highlighting

  // Profile properties
  public username: string = '';
  public userRole: string = '';
  public avatarUrl: string = '';

  public leftMenuHidden = false;
  public showProfileDropdown = false;
  public showAddModuleModal = false;
  public showEditModuleModal = false;
  public editingModule: ModuleItem | null = null;
  public showAddContentModal = false;
  public showEditContentModal = false;
  public editingContent: ContentItem | null = null;
  public selectedModuleId: number | null = null;
  public showModuleSelector = false; // True when modal is opened from upload area
  public newModule = {
    title: '',
    description: '',
    orderNumber: 1,
    status: 'NotPublished' as 'Published' | 'NotPublished'
  };
  public newContent = {
    title: '',
    description: '',
    contentType: 'document' as 'document' | 'link',
    contentUrl: '',
    orderNumber: 1,
    isPublished: false
  };
  public contentFile: File | null = null;
  public selectedFile: File | null = null; // For edit content file upload

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private moduleService: ModuleService, // 👈 Sử dụng service
    private contentService: ContentService, // 👈 Thêm content service
    private courseService: CourseService, // 👈 Thêm course service
    public sessionService: SessionService, // 👈 Thêm session service
    private notificationService: NotificationService, // 👈 Thêm notification service
    private cdr: ChangeDetectorRef, // 👈 Thêm change detector
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  // Helper method để hiển thị thông báo
  private showAlert(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (type === 'success') {
      this.notificationService.success('Thành công', message);
    } else if (type === 'error') {
      this.notificationService.error('Lỗi', message);
    } else if (type === 'warning') {
      this.notificationService.warning('Cảnh báo', message);
    } else {
      this.notificationService.info('Thông báo', message);
    }
  }

  ngOnInit(): void {
    // Initialize user info
    this.username = this.sessionService.getFullName() || 'User';
    this.userRole = this.sessionService.getUserRole() || 'student';
    this.avatarUrl = ''; // Will use default avatar from ProfileComponent
    
    // Debug logging for student access
    console.log('🔍 Module component initialized');
    console.log('👤 User role:', this.userRole);
    console.log('🎓 Is Student:', this.sessionService.isStudent());
    console.log('👨‍🏫 Can Manage Content:', this.canManageContent());
    
    // Get courseId from query params
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe(params => {
        this.courseId = params['courseId'] ? +params['courseId'] : null;
        const courseName = params['courseName'];
        const requestedPage = params['page']; // Check for specific page request
        console.log('📚 Course ID from query params:', this.courseId);
        console.log('📚 Course Name from query params:', courseName);
        console.log('📄 Requested page from query params:', requestedPage);
        
        // Set current page based on query parameter or default to Home
        if (requestedPage && requestedPage === 'Modules') {
          this.currentPage = 'Modules';
          console.log('✅ Setting current page to Modules from query params');
        } else {
          this.currentPage = 'Home';
          console.log('✅ Setting current page to Home (default)');
        }
        
        // If we have courseName from params, use it immediately for breadcrumb
        if (courseName && courseName.trim()) {
          this.courseInfo = {
            courseId: this.courseId!,
            title: decodeURIComponent(courseName), // Decode URL encoding
            description: '',
            categoryId: 0,
            instructorId: 0,
            status: '',
            price: 0,
            thumbnailUrl: ''
          };
          console.log('✅ Using course name from params:', decodeURIComponent(courseName));
        } else if (this.courseId) {
          // Fallback to API if no courseName in params
          console.log('🔄 No courseName in params, trying API fallback...');
          this.loadCourseInfo();
        }
        
        // Load modules
        if (this.courseId) {
          this.loadModules();
        }
      });
    }
  }

  // 👈 Load course information for breadcrumb
  loadCourseInfo(): void {
    if (!this.courseId) return;
    
    console.log('🔄 Loading course info for courseId:', this.courseId);
    
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course: Course) => {
        this.courseInfo = course;
        console.log('✅ Course info loaded successfully:', course.title);
        console.log('📚 Full course data:', course);
      },
      error: (err: any) => {
        console.error('❌ Error loading course info:', err);
        console.log('🔍 Error details:', {
          status: err.status,
          message: err.message,
          error: err.error
        });
        
        // Fallback: Create a temporary courseInfo with generic title
        this.courseInfo = {
          courseId: this.courseId!,
          title: `Course ${this.courseId}`, // Generic fallback title
          description: '',
          categoryId: 0,
          instructorId: 0,
          status: '',
          price: 0,
          thumbnailUrl: ''
        };
        console.log('🔧 Using fallback course title:', `Course ${this.courseId}`);
      }
    });
  }

  loadModules(): void {
    if (this.courseId) {
      // For students, try published endpoint first, but fall back immediately if not available
      if (this.sessionService.isStudent()) {
        // Try published endpoint first
        this.moduleService.getPublishedModulesByCourse(this.courseId).subscribe({
          next: (data: any[]) => {
            console.log('Published modules loaded successfully:', data);
            this.processModulesData(data, true); // true indicates this is for students
          },
          error: (err: any) => {
            console.log('Published endpoint not available, falling back to regular endpoint for student');
            // Immediately fall back to regular endpoint with client-side filtering
            this.loadModulesWithFallback();
          }
        });
      } else {
        // For instructors/admins, use regular endpoint
        this.moduleService.getModulesByCourse(this.courseId).subscribe({
          next: (data: any[]) => {
            console.log('All modules loaded for instructor/admin:', data);
            this.processModulesData(data, false); // false indicates this is for instructors/admins
          },
          error: (err: any) => {
            console.error('Error loading modules for instructor/admin:', err);
            this.modules = [];
            this.filteredModules = [];
            this.showAlert('Không thể tải danh sách modules: ' + (err.error?.message || err.message || 'Unknown error'), 'error');
          }
        });
      }
    } else {
      // No courseId, show empty modules
      this.modules = [];
      this.filteredModules = [];
    }
  }

  // Process modules data based on user role
  private processModulesData(data: any[], isForStudent: boolean): void {
    console.log('Processing modules data:', data);
    
    this.modules = data.map((m: any) => ({
      moduleId: m.moduleId,
      title: m.title,
      orderNumber: m.orderNumber,
      description: m.description,
      status: m.published ? 'Published' : 'NotPublished',
      expanded: true,
      contents: []
    }));

    // Filter modules for students - only show published modules
    if (isForStudent) {
      this.modules = this.modules.filter(m => m.status === 'Published');
      console.log('Filtered published modules for student:', this.modules);
    }
    
    // Sort modules by order number
    this.modules.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    this.filteredModules = [...this.modules];
    
    // Load contents for all expanded modules
    this.modules.forEach(module => {
      if (module.expanded && module.moduleId) {
        this.loadModuleContents(module);
      }
    });
    
    console.log('Final processed modules:', this.modules);
  }

  // Fallback method for students when published endpoint is not available
  private loadModulesWithFallback(): void {
    if (!this.courseId) return;
    
    console.log('🔄 Fallback: Loading modules with regular endpoint for student');
    
    // Try the regular endpoint but handle permissions client-side
    this.moduleService.getModulesByCourse(this.courseId).subscribe({
      next: (data: any[]) => {
        console.log('✅ Fallback successful - Backend response:', data);
        this.processModulesData(data, true); // true indicates this is for students (with filtering)
      },
      error: (err: any) => {
        console.error('❌ Fallback also failed:', err);
        this.modules = [];
        this.filteredModules = [];
        
        // Show a user-friendly message for students
        if (this.sessionService.isStudent()) {
          console.log('Student cannot access modules - this may be normal if no published modules exist or permission denied');
          // Don't show error alert to students for permission issues
        } else {
          this.showAlert('Không thể tải danh sách modules: ' + (err.error?.message || err.message || 'Unknown error'), 'error');
        }
      }
    });
  }

  onSearch(): void {
    const keyword = this.searchTerm.toLowerCase();
    let searchResults = this.modules.filter(item =>
      item.title && item.title.toLowerCase().includes(keyword)
    );
    
    // For students, ensure only published modules are shown in search results (additional safety check)
    if (this.sessionService.isStudent()) {
      searchResults = searchResults.filter(m => m.status === 'Published');
    }
    
    this.filteredModules = searchResults;
    console.log('Search results:', searchResults);
  }

  toggleDropdown(item: ModuleItem): void {
    this.modules.forEach(m => {
      m.showDropdown = m === item ? !item.showDropdown : false;
      // Also close content dropdowns
      if (m.contents) {
        m.contents.forEach(c => c.showDropdown = false);
      }
    });
  }

  toggleContentDropdown(content: ContentItem): void {
    // Close all module dropdowns
    this.modules.forEach(m => m.showDropdown = false);
    // Close all other content dropdowns
    this.modules.forEach(m => {
      if (m.contents) {
        m.contents.forEach(c => c.showDropdown = c === content ? !content.showDropdown : false);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.modules.forEach(m => {
        m.showDropdown = false;
        if (m.contents) {
          m.contents.forEach(c => c.showDropdown = false);
        }
      });
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showAddModuleModal) {
      this.closeAddModuleModal();
    }
    if (event.key === 'Escape' && this.showEditModuleModal) {
      this.closeEditModuleModal();
    }
    if (event.key === 'Escape' && this.showAddContentModal) {
      this.closeAddContentModal();
    }
    if (event.key === 'Escape' && this.showEditContentModal) {
      this.closeEditContentModal();
    }
  }

  // Toggle module expansion
  toggleModule(module: ModuleItem): void {
    console.log('🔄 toggleModule called, moduleId:', module.moduleId);
    console.log('📊 Module expandedModules state:', { title: module.title, expanded: module.expanded });
    module.expanded = !module.expanded;
    
    // Load contents if expanding for the first time
    if (module.expanded && module.moduleId && (!module.contents || module.contents.length === 0)) {
      console.log('� Loading contents for module:', module.moduleId);
      this.loadModuleContents(module);
    }
  }

  // Load contents for a specific module
  loadModuleContents(module: ModuleItem): void {
    if (!module.moduleId) return;
    
    console.log('🔄 Loading contents for module:', module.moduleId);
    
    // For students, try published endpoint first, but fall back immediately if not available
    if (this.sessionService.isStudent()) {
      this.contentService.getPublishedContentsByModule(module.moduleId).subscribe({
        next: (contents: ContentItem[]) => {
          console.log('✅ Published contents loaded successfully:', contents);
          this.processModuleContents(module, contents, true); // true indicates this is for students
        },
        error: (err: any) => {
          console.log('Published contents endpoint not available, falling back for module:', module.moduleId);
          // Immediately fall back to regular endpoint with client-side filtering
          this.loadModuleContentsWithFallback(module);
        }
      });
    } else {
      // For instructors/admins, use regular endpoint
      this.contentService.getContentsByModule(module.moduleId).subscribe({
        next: (contents: ContentItem[]) => {
          console.log('✅ All contents loaded for instructor/admin:', contents);
          this.processModuleContents(module, contents, false); // false indicates this is for instructors/admins
        },
        error: (err: any) => {
          console.error('❌ Error loading module contents for instructor/admin:', err);
          module.contents = [];
        }
      });
    }
  }

  // Process module contents based on user role
  private processModuleContents(module: ModuleItem, contents: ContentItem[], isForStudent: boolean): void {
    // Filter content for students - only show published content
    if (isForStudent) {
      contents = contents.filter(content => content.isPublished);
      console.log('Filtered published contents for student:', contents);
    }
    
    module.contents = contents.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    console.log('📋 Module contents after processing:', module.contents);
  }

  // Fallback method to load contents for students
  private loadModuleContentsWithFallback(module: ModuleItem): void {
    if (!module.moduleId) return;
    
    console.log('🔄 Fallback: Loading contents with regular endpoint for student, module:', module.moduleId);
    
    this.contentService.getContentsByModule(module.moduleId).subscribe({
      next: (contents: ContentItem[]) => {
        console.log('✅ Fallback successful - Loaded contents:', contents);
        this.processModuleContents(module, contents, true); // true indicates this is for students (with filtering)
      },
      error: (err: any) => {
        console.error('❌ Fallback also failed for module contents:', err);
        module.contents = [];
        
        if (this.sessionService.isStudent()) {
          console.log('Student cannot access module contents - this may be normal for module:', module.title);
          // Don't show error alert to students for permission issues
        }
      }
    });
  }

  // View content (navigate to content viewer)
  viewContent(content: ContentItem): void {
    console.log('📖 Viewing content:', content.title);
    console.log('📖 Content type:', content.contentType);
    console.log('📖 Content URL:', content.contentUrl);
    
    if (content.contentUrl) {
      let fullUrl = content.contentUrl;
      
      // Nếu là content type 'link', URL đã là đầy đủ (https://youtu.be/...)
      if (content.contentType === 'link') {
        fullUrl = content.contentUrl;
      } else if (content.contentType === 'document') {
        // Nếu là document, cần thêm base URL
        fullUrl = `http://localhost:8080${content.contentUrl}`;
      }
      
      window.open(fullUrl, '_blank');
      console.log('🔗 Opening URL:', fullUrl);
    } else {
      console.warn('⚠️ Content URL not available for:', content.title);
      console.warn('📋 Content type:', content.contentType);
      
      // Show appropriate message based on content type
      if (content.contentType === 'document') {
        alert('Tài liệu chưa được tải lên cho nội dung này.');
      } else if (content.contentType === 'link') {
        alert('Liên kết chưa được thiết lập cho nội dung này.');
      } else {
        alert('Nội dung này chưa có tài liệu hoặc liên kết đính kèm.');
      }
    }
  }

  // Open add content modal
  openAddContentModal(moduleId: number): void {
    this.selectedModuleId = moduleId;
    this.showModuleSelector = false; // Modal opened from specific module, don't show selector
    this.showAddContentModal = true;
    
    // Set default order number for content
    const module = this.modules.find(m => m.moduleId === moduleId);
    if (module && module.contents) {
      this.newContent.orderNumber = module.contents.length > 0 ? 
        Math.max(...module.contents.map(c => c.orderNumber || 0)) + 1 : 1;
    } else {
      this.newContent.orderNumber = 1;
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Close add content modal
  closeAddContentModal(): void {
    this.showAddContentModal = false;
    this.selectedModuleId = null;
    this.showModuleSelector = false; // Reset module selector state
    this.contentFile = null;
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Reset form
    this.newContent = {
      title: '',
      description: '',
      contentType: 'document',
      contentUrl: '',
      orderNumber: 1,
      isPublished: false
    };
  }

  // Close edit content modal  
  closeEditContentModal(): void {
    this.showEditContentModal = false;
    this.editingContent = null;
    this.selectedModuleId = null;
    this.contentFile = null;
    this.selectedFile = null; // ✅ Reset selectedFile
    
    // Reset file input
    const fileInput = document.getElementById('editContentFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Reset form
    this.newContent = {
      title: '',
      description: '',
      contentType: 'document',
      contentUrl: '',
      orderNumber: 1,
      isPublished: false
    };
  }

  // Handle content file selection
  onContentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      if (this.showEditContentModal) {
        // Khi edit content, lưu file vào selectedFile
        this.selectedFile = input.files[0];
      } else {
        // Khi tạo content mới, lưu vào contentFile
        this.contentFile = input.files[0];
      }
    }
  }

  // Clear selected file
  clearSelectedFile(): void {
    if (this.showEditContentModal) {
      this.selectedFile = null;
      // Reset file input for edit modal
      const fileInput = document.getElementById('editContentFile') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } else {
      this.contentFile = null;
      // Reset file input for add content modal
      const fileInput = document.getElementById('contentFile') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }

  // Get selected module name for display
  getSelectedModuleName(): string {
    if (!this.selectedModuleId) return '';
    const module = this.modules.find(m => m.moduleId === this.selectedModuleId);
    return module ? module.title : '';
  }

  // Submit new content
  submitContent(): void {
    if (!this.selectedModuleId || this.selectedModuleId === null) {
      this.showAlert('Vui lòng chọn một module để thêm content.', 'warning');
      return;
    }

    if (!this.newContent.title.trim()) {
      this.showAlert('Vui lòng nhập tiêu đề content.', 'warning');
      return;
    }

    if (this.newContent.contentType === 'link' && !this.newContent.contentUrl.trim()) {
      this.showAlert('Vui lòng nhập URL cho content link.', 'warning');
      return;
    }

    if (this.editingContent) {
      // Update existing content - không tự động thay đổi order_number
      this.updateContent();
    } else {
      // Create new content - tự động set order_number
      const selectedModule = this.modules.find(m => m.moduleId === this.selectedModuleId);
      if (selectedModule && selectedModule.contents) {
        this.newContent.orderNumber = selectedModule.contents.length > 0 ? 
          Math.max(...selectedModule.contents.map(c => c.orderNumber || 0)) + 1 : 1;
      } else {
        this.newContent.orderNumber = 1;
      }
      this.createContent();
    }
  }

  private createContent(): void {
    if (!this.selectedModuleId) return;

    const contentDto: ContentDto = {
      moduleId: this.selectedModuleId,
      title: this.newContent.title,
      contentType: this.newContent.contentType,
      description: this.newContent.description || '',
      orderNumber: this.newContent.orderNumber,
      isPublished: this.newContent.isPublished
    };

    this.contentService.createContent(contentDto, this.contentFile || undefined).subscribe({
      next: (result) => {
        console.log('Content created successfully:', result);
        this.showAlert('Tạo content thành công', 'success');
        this.closeAddContentModal();
        
        // ✅ Cập nhật trực tiếp UI thay vì load lại
        const module = this.modules.find(m => m.moduleId === this.selectedModuleId);
        if (module) {
          if (!module.contents) {
            module.contents = [];
          }
          
          const newContent: ContentItem = {
            contentId: result.contentId,
            moduleId: result.moduleId,
            title: result.title,
            contentType: result.contentType,
            contentUrl: result.contentUrl,
            description: result.description,
            orderNumber: result.orderNumber,
            isPublished: result.isPublished
          };
          
          module.contents.push(newContent);
          module.contents.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
          
          // Force re-render by updating reference
          module.contents = [...module.contents];
          
          // Update the same module in filteredModules
          const filteredModule = this.filteredModules.find(m => m.moduleId === this.selectedModuleId);
          if (filteredModule) {
            filteredModule.contents = [...module.contents];
          }
          
          // Multiple levels of change detection
          this.cdr.detectChanges();
          this.cdr.markForCheck();
          
          // Force complete re-render
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
          
          // Force full UI refresh as final step
          this.forceUIRefresh();
          
          console.log('✅ Content created and UI updated:', newContent);
        }
      },
      error: (err: any) => {
        console.error('Error creating content:', err);
        const errorMessage = this.parseErrorMessage(err, 'Không thể tạo content mới');
        this.showErrorMessage(errorMessage);
      }
    });
  }

  private updateContent(): void {
    if (!this.editingContent || !this.editingContent.contentId) return;

    // Kiểm tra xem có thay đổi gì cần update với file/URL không
    const hasUrlChange = this.newContent.contentType === 'link' && 
                        this.newContent.contentUrl !== this.editingContent.contentUrl;
    
    const hasFileChange = this.newContent.contentType === 'document' && 
                         this.selectedFile !== null;

    // Nếu có file mới được upload cho document type, sử dụng endpoint cập nhật file
    if (hasFileChange) {
      const contentDto: ContentDto = {
        moduleId: this.selectedModuleId!,
        title: this.newContent.title,
        contentType: this.newContent.contentType,
        description: this.newContent.description || '',
        orderNumber: this.newContent.orderNumber,
        isPublished: this.newContent.isPublished
      };
      
      // Sử dụng updateContentWithFile để upload file mới và cập nhật content
      this.contentService.updateContentWithFile(this.editingContent.contentId, contentDto, this.selectedFile!).subscribe({
        next: (result: any) => {
          console.log('Content updated with new file:', result);
          this.showAlert('Cập nhật content với file mới thành công', 'success');
          this.closeEditContentModal();
          
          // Cập nhật UI
          const module = this.modules.find(m => m.moduleId === this.selectedModuleId);
          if (module && module.contents) {
            const contentIndex = module.contents.findIndex(c => c.contentId === this.editingContent!.contentId);
            if (contentIndex !== -1) {
              module.contents[contentIndex] = {
                contentId: result.contentId,
                moduleId: result.moduleId,
                title: result.title,
                contentType: result.contentType,
                contentUrl: result.contentUrl,
                description: result.description,
                orderNumber: result.orderNumber,
                isPublished: result.isPublished
              };
              
              // Resort contents by order number
              module.contents.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
              
              console.log('✅ UI updated with new file content:', module.contents[contentIndex]);
              
              // Force re-render by updating reference
              module.contents = [...module.contents];
              
              // Update the same module in filteredModules
              const filteredModule = this.filteredModules.find(m => m.moduleId === this.selectedModuleId);
              if (filteredModule && filteredModule.contents) {
                const filteredContentIndex = filteredModule.contents.findIndex(c => c.contentId === this.editingContent!.contentId);
                if (filteredContentIndex !== -1) {
                  filteredModule.contents[filteredContentIndex] = { ...module.contents[contentIndex] };
                  filteredModule.contents.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
                  filteredModule.contents = [...filteredModule.contents];
                }
              }
              
              // Multiple levels of change detection
              this.cdr.detectChanges();
              this.cdr.markForCheck();
              
              // Force complete re-render
              setTimeout(() => {
                this.cdr.detectChanges();
              }, 0);
              
              // Force full UI refresh as final step
              this.forceUIRefresh();
              
              console.log('✅ Content updated with file and UI refreshed:', module.contents[contentIndex]);
            }
          }
        },
        error: (err: any) => {
          console.error('Error updating content with file:', err);
          const errorMessage = this.parseErrorMessage(err, 'Không thể cập nhật content với file mới');
          this.showErrorMessage(errorMessage);
        }
      });
      return;
    }

    // Nếu không có file mới, cập nhật thông tin như bình thường
    const contentDto: Partial<ContentDto> = {
      title: this.newContent.title,
      contentType: this.newContent.contentType,
      description: this.newContent.description || '',
      orderNumber: this.newContent.orderNumber,
      isPublished: this.newContent.isPublished
    };

    let updateObservable;

    if (hasUrlChange) {
      // Nếu có thay đổi URL cho link, sử dụng endpoint cập nhật với URL
      (contentDto as any).contentUrl = this.newContent.contentUrl;
      updateObservable = this.contentService.updateContent(this.editingContent.contentId, contentDto);
      console.log('🔄 Updating content with URL change:', contentDto);
    } else {
      // Nếu không thay đổi URL/file, chỉ cập nhật thông tin
      updateObservable = this.contentService.updateContentInfo(this.editingContent.contentId, contentDto);
      console.log('🔄 Updating content info only (no URL/file change):', contentDto);
    }

    updateObservable.subscribe({
      next: (result: any) => {
        console.log('Content updated successfully:', result);
        this.showAlert('Cập nhật content thành công', 'success');
        this.closeEditContentModal();
        
        // ✅ Cập nhật trực tiếp UI thay vì load lại
        const module = this.modules.find(m => m.moduleId === this.selectedModuleId);
        if (module && module.contents) {
          const contentIndex = module.contents.findIndex(c => c.contentId === this.editingContent!.contentId);
          if (contentIndex !== -1) {
            console.log('🔄 Before update:', JSON.stringify(module.contents[contentIndex]));
            
            // Cập nhật toàn bộ content với dữ liệu từ response
            module.contents[contentIndex] = {
              ...module.contents[contentIndex],
              contentId: result.contentId,
              moduleId: result.moduleId,
              title: result.title,
              contentType: result.contentType,
              contentUrl: result.contentUrl, // ✅ Đảm bảo URL được cập nhật
              description: result.description,
              orderNumber: result.orderNumber,
              isPublished: result.isPublished
            };
            
            console.log('🔄 After update:', JSON.stringify(module.contents[contentIndex]));
            
            console.log('🔄 Before sort:', JSON.stringify(module.contents[contentIndex]));
            
            // Resort contents by order number
            module.contents.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
            
            console.log('🔄 After sort:', JSON.stringify(module.contents[contentIndex]));
            console.log('✅ UI updated with new content data:', module.contents[contentIndex]);
            
            // Force re-render by updating reference
            module.contents = [...module.contents];
            
            // Update the same module in filteredModules
            const filteredModule = this.filteredModules.find(m => m.moduleId === this.selectedModuleId);
            if (filteredModule && filteredModule.contents) {
              const filteredContentIndex = filteredModule.contents.findIndex(c => c.contentId === this.editingContent!.contentId);
              if (filteredContentIndex !== -1) {
                filteredModule.contents[filteredContentIndex] = { ...module.contents[contentIndex] };
                filteredModule.contents = [...filteredModule.contents];
              }
            }
            
            // Multiple levels of change detection
            this.cdr.detectChanges();
            this.cdr.markForCheck();
            
            // Force complete re-render
            setTimeout(() => {
              this.cdr.detectChanges();
            }, 0);
            
            // Force full UI refresh as final step
            this.forceUIRefresh();
          }
        }
      },
      error: (err: any) => {
        console.error('Error updating content:', err);
        const errorMessage = this.parseErrorMessage(err, 'Không thể cập nhật content');
        this.showErrorMessage(errorMessage);
      }
    });
  }

  changeStatus(item: ModuleItem, status: 'Published' | 'NotPublished'): void {
    if (!item.moduleId) return;

    const published = status === 'Published';
    const statusText = published ? 'xuất bản' : 'ẩn';

    // Show confirmation dialog
    const confirmMessage = published 
      ? `Bạn có chắc chắn muốn xuất bản module "${item.title}"?\n\nTất cả nội dung bên trong module cũng sẽ được xuất bản.`
      : `Bạn có chắc chắn muốn ẩn module "${item.title}"?\n\nTất cả nội dung bên trong module cũng sẽ bị ẩn.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    // Store original status for rollback
    const originalStatus = item.status;

    // Immediately update UI
    item.status = status;
    item.showDropdown = false;

    // Then update backend
    this.moduleService.updateModuleStatus(item.moduleId, published).subscribe({
      next: (response: any) => {
        console.log('Status updated successfully:', response);
        
        // Show detailed success notification
        let successMessage = `Module "${item.title}" đã được ${statusText} thành công!`;
        
        if (response?.details) {
          successMessage = response.details;
        } else if (response?.totalContentCount !== undefined) {
          const contentInfo = published 
            ? `Đã xuất bản ${response.totalContentCount} nội dung bên trong module`
            : `Đã ẩn ${response.totalContentCount} nội dung bên trong module`;
          successMessage += ` ${contentInfo}.`;
        }
        
        this.notificationService.success(
          published ? 'Xuất bản thành công' : 'Ẩn thành công',
          successMessage,
          6000
        );
        
        // Reload modules to ensure UI consistency
        this.loadModules();
      },
      error: (err: any) => {
        console.error('Error updating status:', err);
        
        // Revert status if backend update fails
        item.status = originalStatus;
        
        const errorMessage = err.error?.message || err.message || 'Lỗi không xác định';
        this.notificationService.error(
          `Không thể ${statusText} module`,
          `Lỗi: ${errorMessage}`,
          8000
        );
      }
    });
  }

  // Edit module
  editModule(module: ModuleItem): void {
    this.editingModule = module;
    
    // Populate form with existing module data
    this.newModule = {
      title: module.title,
      description: module.description || '',
      orderNumber: module.orderNumber,
      status: module.status
    };
    
    this.showEditModuleModal = true;
    module.showDropdown = false;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Delete module
  deleteModule(module: ModuleItem): void {
    if (!module.moduleId) return;
    
    const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa module "${module.title}"?`);
    if (!confirmDelete) return;

    this.moduleService.deleteModule(module.moduleId).subscribe({
      next: () => {
        console.log('Module deleted successfully');
        this.showAlert('Xóa module thành công', 'success');
        
        // ✅ Cập nhật trực tiếp UI thay vì load lại
        this.modules = this.modules.filter(m => m.moduleId !== module.moduleId);
        this.filteredModules = [...this.modules];
      },
      error: (err: any) => {
        console.error('Error deleting module:', err);
        this.showAlert('Không thể xóa module: ' + (err.error?.message || err.message || 'Unknown error'), 'error');
      }
    });
    
    module.showDropdown = false;
  }

  changeContentStatus(content: ContentItem, published: boolean): void {
    if (!content.contentId) return;

    // Immediately update UI
    content.isPublished = published;
    content.showDropdown = false;
    
    // Multiple levels of change detection for immediate UI update
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    
    // Force complete re-render
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
    
    // Force full UI refresh
    this.forceUIRefresh();

    // Then update backend
    this.contentService.updateContentStatus(content.contentId, published).subscribe({
      next: () => {
        console.log('Content status updated successfully');
        
        // Additional change detection to ensure UI is fully updated
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Error updating content status:', err);
        // Revert status if backend update fails
        content.isPublished = !published;
        this.showAlert('Không thể cập nhật trạng thái content: ' + (err.error?.message || err.message || 'Unknown error'), 'error');
        
        // Trigger change detection for reverted status
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      }
    });
  }

  // Edit content
  editContent(content: ContentItem): void {
    this.editingContent = content;
    this.selectedModuleId = content.moduleId;
    
    // Populate form with existing content data
    this.newContent = {
      title: content.title,
      description: content.description || '',
      contentType: content.contentType,
      contentUrl: content.contentUrl || '',
      orderNumber: content.orderNumber,
      isPublished: content.isPublished
    };
    
    this.showEditContentModal = true;
    content.showDropdown = false;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Delete content
  deleteContent(content: ContentItem): void {
    if (!content.contentId) return;
    
    const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa content "${content.title}"?`);
    if (!confirmDelete) return;

    this.contentService.deleteContent(content.contentId).subscribe({
      next: () => {
        console.log('Content deleted successfully');
        this.showAlert('Xóa content thành công', 'success');
        
        // ✅ Cập nhật UI ngay lập tức
        const module = this.modules.find(m => m.moduleId === content.moduleId);
        if (module && module.contents) {
          module.contents = module.contents.filter(c => c.contentId !== content.contentId);
          
          // Force re-render by updating reference
          module.contents = [...module.contents];
          
          // Update the same module in filteredModules
          const filteredModule = this.filteredModules.find(m => m.moduleId === content.moduleId);
          if (filteredModule) {
            filteredModule.contents = [...module.contents];
          }
          
          // Multiple levels of change detection
          this.cdr.detectChanges();
          this.cdr.markForCheck();
          
          // Force complete re-render
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
          
          // Force full UI refresh as final step
          this.forceUIRefresh();
          
          console.log('✅ Content deleted and UI updated');
        }
      },
      error: (err: any) => {
        console.error('Error deleting content:', err);
        this.showAlert('Không thể xóa content: ' + (err.error?.message || err.message || 'Unknown error'), 'error');
      }
    });
    
    content.showDropdown = false;
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.courseId) {
      this.showAlert('Không thể thêm content: Không tìm thấy thông tin khóa học.', 'error');
      return;
    }

    // Check if there are any modules available
    if (this.modules.length === 0) {
      this.showAlert('Vui lòng tạo ít nhất một module trước khi thêm content.', 'warning');
      return;
    }

    // Pre-fill the add content modal with the selected file
    this.contentFile = file;
    this.newContent = {
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      description: '',
      contentType: 'document' as 'document' | 'link',
      contentUrl: '',
      orderNumber: 1,
      isPublished: true // Default to published
    };

    // Clear the selectedModuleId so user can choose which module
    this.selectedModuleId = null;
    this.showModuleSelector = true; // Show module selector since opened from upload area
    
    // Open the add content modal
    this.showAddContentModal = true;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Clear the input value so the same file can be selected again
    input.value = '';
  }

  toggleLeftMenu(): void {
    this.leftMenuHidden = !this.leftMenuHidden;
  }

  updateProfile(): void {
    this.showAlert('Chuyển đến trang cập nhật hồ sơ...', 'info');
  }

  logout(): void {
    // SessionService sẽ xử lý việc hiển thị notification và chuyển hướng
    this.sessionService.logout();
  }

  goToAddModule(): void {
    this.router.navigate(['/addmodule']);
  }

  openAddModuleModal(): void {
    this.showAddModuleModal = true;
    // Set default order number to next available
    this.newModule.orderNumber = this.modules.length > 0 ? Math.max(...this.modules.map(m => m.orderNumber || 0)) + 1 : 1;
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  closeAddModuleModal(): void {
    this.showAddModuleModal = false;
    // Restore body scroll
    document.body.style.overflow = '';
    // Reset form
    this.newModule = {
      title: '',
      description: '',
      orderNumber: 1,
      status: 'NotPublished' as 'Published' | 'NotPublished'
    };
  }

  closeEditModuleModal(): void {
    this.showEditModuleModal = false;
    this.editingModule = null;
    // Restore body scroll
    document.body.style.overflow = '';
    // Reset form
    this.newModule = {
      title: '',
      description: '',
      orderNumber: 1,
      status: 'NotPublished' as 'Published' | 'NotPublished'
    };
  }

  submitModule(): void {
    console.log('submitModule called');
    console.log('courseId:', this.courseId);
    console.log('newModule:', this.newModule);
    
    if (!this.courseId) {
      this.showAlert('Không thể tạo module: Không tìm thấy thông tin khóa học.', 'error');
      return;
    }

    if (!this.newModule.title.trim()) {
      this.showAlert('Vui lòng nhập tiêu đề module.', 'warning');
      return;
    }

    if (this.editingModule) {
      // Update existing module
      this.updateModule();
    } else {
      // Create new module
      this.createModule();
    }
  }

  private createModule(): void {
    if (!this.courseId) return;

    // Check if module title already exists
    const exists = this.modules.some(m => m.title === this.newModule.title);
    if (exists) {
      this.showAlert('Module đã tồn tại trong danh sách.', 'warning');
      return;
    }

    // Convert the frontend format to backend format
    const moduleDto = {
      courseId: this.courseId,
      title: this.newModule.title,
      description: this.newModule.description || '',
      orderNumber: this.newModule.orderNumber,
      published: this.newModule.status === 'Published'
    };

    console.log('Calling createModuleForCourse with:', this.courseId, moduleDto);
    this.moduleService.createModuleForCourse(this.courseId, moduleDto).subscribe({
      next: (result) => {
        console.log('Module created successfully:', result);
        this.showAlert('Tạo module thành công', 'success');
        
        // ✅ Cập nhật trực tiếp UI thay vì load lại
        const newModule: ModuleItem = {
          moduleId: (result as any).moduleId,
          title: (result as any).title,
          orderNumber: (result as any).orderNumber,
          description: (result as any).description,
          status: (result as any).published ? 'Published' : 'NotPublished',
          expanded: true, // Mặc định expand
          contents: []
        };
        
        this.modules.push(newModule);
        this.modules.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
        this.filteredModules = [...this.modules];
        
        // Load contents cho module mới
        if (newModule.moduleId) {
          this.loadModuleContents(newModule);
        }
        
        this.closeAddModuleModal();
      },
      error: (err: any) => {
        console.error('Error creating module:', err);
        const errorMessage = this.parseErrorMessage(err, 'Không thể tạo module mới');
        this.showErrorMessage(errorMessage);
      }
    });
  }

  private updateModule(): void {
    if (!this.editingModule || !this.editingModule.moduleId) return;

    const updatedModule: ModuleItem = {
      ...this.editingModule,
      title: this.newModule.title,
      description: this.newModule.description || '',
      orderNumber: this.newModule.orderNumber,
      status: this.newModule.status
    };

    this.moduleService.updateModule(updatedModule).subscribe({
      next: (result) => {
        console.log('Module updated successfully:', result);
        this.showAlert('Cập nhật module thành công', 'success');
        
        // ✅ Cập nhật trực tiếp UI thay vì load lại
        const moduleIndex = this.modules.findIndex(m => m.moduleId === this.editingModule!.moduleId);
        if (moduleIndex !== -1) {
          this.modules[moduleIndex] = {
            ...this.modules[moduleIndex],
            title: this.newModule.title,
            description: this.newModule.description || '',
            orderNumber: this.newModule.orderNumber,
            status: this.newModule.status
          };
          
          // Resort modules by order number
          this.modules.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
          this.filteredModules = [...this.modules];
        }
        
        this.closeEditModuleModal();
      },
      error: (err: any) => {
        console.error('Error updating module:', err);
        const errorMessage = this.parseErrorMessage(err, 'Không thể cập nhật module');
        this.showErrorMessage(errorMessage);
      }
    });
  }

  // Helper method để parse error message từ Angular HttpErrorResponse
  private parseErrorMessage(err: any, defaultMessage: string): string {
    console.error('Full error object:', JSON.stringify(err, null, 2));
    
    let errorMessage = defaultMessage;
    
    if (err.error) {
      if (typeof err.error === 'string') {
        // Error body là string
        errorMessage = err.error;
      } else if (err.error.message) {
        // Error body là object với message
        errorMessage = err.error.message;
      } else if (err.error.error) {
        // Error body có nested error
        errorMessage = err.error.error;
      } else if (err.error.detail) {
        // Spring Boot thường dùng field 'detail'
        errorMessage = err.error.detail;
      }
    } else if (err.message && !err.message.includes('Http failure response')) {
      // Sử dụng message nếu không phải generic HTTP error
      errorMessage = err.message;
    }
    
    return errorMessage;
  }

  // Helper method để hiển thị thông báo lỗi đẹp hơn
  private showErrorMessage(message: string): void {
    // TODO: Có thể thay thế bằng toast notification hoặc modal đẹp hơn
    // Tạm thời dùng alert với style tốt hơn
    
    // Tạo một modal đơn giản thay vì alert
    const modalHtml = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      ">
        <div style="
          background: white;
          padding: 20px 30px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          max-width: 400px;
          width: 90%;
        ">
          <div style="
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          ">
            <span style="
              color: #dc3545;
              font-size: 24px;
              margin-right: 10px;
            ">⚠️</span>
            <h3 style="
              color: #dc3545;
              margin: 0;
              font-size: 18px;
            ">Thông báo lỗi</h3>
          </div>
          <p style="
            margin: 0 0 20px 0;
            color: #333;
            line-height: 1.5;
          ">${message}</p>
          <div style="text-align: right;">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
              background: #dc3545;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">Đóng</button>
          </div>
        </div>
      </div>
    `;
    
    // Tạo element và thêm vào DOM
    const modal = document.createElement('div');
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);
    
    // Auto-close sau 10 giây
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 10000);
  }

  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  // Profile methods
  onProfileUpdate(): void {
    // Handle profile update
    console.log('Profile update requested');
  }

  onLogout(): void {
    // Handle logout
    this.sessionService.logout();
    this.router.navigate(['/login']);
  }

  trackContentById(index: number, content: ContentItem): any {
    return content.contentId || index;
  }

  trackModuleById(index: number, module: ModuleItem): any {
    return module.moduleId || index;
  }

  // Force full UI refresh
  private forceUIRefresh(): void {
    // Update modules reference to trigger ngFor re-render
    this.modules = [...this.modules];
    this.filteredModules = [...this.filteredModules];
    
    // Force change detection
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    
    // Async change detection
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
    
    // Additional force refresh for nested content arrays
    setTimeout(() => {
      this.modules.forEach(module => {
        if (module.contents) {
          module.contents = [...module.contents];
        }
      });
      this.cdr.detectChanges();
    }, 10);
  }

  getDisplayRole(role: string): string {
    // Convert role to display format
    if (!role) return 'User';
    
    // Remove ROLE_ prefix if present
    const cleanRole = role.replace('ROLE_', '');
    
    // Convert to proper case
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase();
  }

  // Helper method to check if current user is a student
  isStudent(): boolean {
    return this.sessionService.isStudent();
  }

  // Helper method to check if current user can manage content (instructor/admin)
  canManageContent(): boolean {
    return this.sessionService.isInstructor() || this.sessionService.isAdmin();
  }

  // Navigation methods for left menu
  navigateToHome(): void {
    this.currentPage = 'Home';
    console.log('📍 Navigated to Home');
  }

  navigateToDiscussion(): void {
    this.currentPage = 'Discussion';
    console.log('📍 Navigating to Discussion');
    
    if (this.courseId) {
      this.router.navigate(['/discussion'], { 
        queryParams: { courseId: this.courseId } 
      });
    } else {
      this.notificationService.error('Lỗi', 'Không tìm thấy thông tin khóa học');
    }
  }

  navigateToGrades(): void {
    console.log('📍 Navigating to Grades');
    
    // Check if user is instructor/admin
    if (this.canManageContent()) {
      // For instructors, go to grades management with courseId
      this.router.navigate(['/grades'], {
        queryParams: { courseId: this.courseId }
      });
    } else {
      // For students, go to student grades page
      this.router.navigate(['/student-grades']);
    }
  }

  navigateToModules(): void {
    this.currentPage = 'Modules';
    console.log('📍 Navigated to Modules');
  }

  navigateToTests(): void {
    console.log('📍 Navigating to Tests');
    // Navigate to exam page with courseId
    this.router.navigate(['/exam'], {
      queryParams: { 
        courseId: this.courseId,
        courseName: this.courseInfo?.title || `Course ${this.courseId}`
      }
    });
  }
}
