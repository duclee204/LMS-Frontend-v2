import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebaradminComponent } from '../../../components/sidebaradmin/sidebaradmin.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { UserService, User } from '../../../services/user.service';
import { SessionService } from '../../../services/session.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface RegistrationStatistics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  total: number;
}

interface ChartData {
  label: string;
  value: number;
}

@Component({
  selector: 'app-registration-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebaradminComponent, ProfileComponent],
  templateUrl: './registration-statistics.component.html',
  styleUrls: ['./registration-statistics.component.scss']
})
export class RegistrationStatisticsComponent implements OnInit {
  
  // Profile component properties
  userName: string = '';
  userRole: string = '';
  username: string = '';
  avatarUrl: string = '';

  // Statistics data
  statistics: RegistrationStatistics = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    total: 0
  };

  // Chart data for daily registrations in current month
  dailyRegistrations: ChartData[] = [];
  
  // Chart data for weekly registrations in current month
  weeklyRegistrations: ChartData[] = [];
  
  // Monthly registrations in current year
  monthlyRegistrations: ChartData[] = [];
  
  // All users with pagination
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  totalUsers = 0;
  
  // Filter and search
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  selectedTimeFilter = ''; // 'today', 'week', 'month', 'year', ''
  
  // Sorting
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Loading state
  loading = true;
  error: string | null = null;

  // Data quality indicators
  hasRegistrationDates = false;
  usersWithoutDates = 0;

  // Selected time period for filtering
  selectedPeriod: string = 'month';

  // Expose Math to template
  Math = Math;

  constructor(
    private userService: UserService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    this.initializeUserProfile();
    this.loadRegistrationStatistics();
  }

  initializeUserProfile() {
    const userInfo = this.userService.getCurrentUserInfo();
    this.userName = userInfo.username;
    this.userRole = userInfo.role;
    this.username = userInfo.username;
    this.avatarUrl = userInfo.avatarUrl;
  }

  async loadRegistrationStatistics() {
    try {
      this.loading = true;
      
      // Load all users to calculate statistics
      const users = await this.userService.getUsers().toPromise() || [];
      
      // Try to get statistics from API first, fallback to manual calculation
      try {
        const apiStats = await this.userService.getUserRegistrationStatistics().toPromise();
        if (apiStats) {
          this.statistics = apiStats;
        } else {
          this.calculateStatistics(users);
        }
      } catch (apiError) {
        console.log('API statistics not available, calculating manually...');
        this.calculateStatistics(users);
      }
      
      this.generateChartData(users);
      this.setupAllUsers(users);
      
    } catch (error) {
      console.error('Error loading registration statistics:', error);
      this.error = 'Không thể tải dữ liệu thống kê';
    } finally {
      this.loading = false;
    }
  }

  private calculateStatistics(users: User[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let yearCount = 0;
    let usersWithDates = 0;

    users.forEach(user => {
      // Try to parse registration date from createdAt or registrationDate
      const registrationDate = this.getUserRegistrationDate(user);
      
      if (registrationDate) {
        usersWithDates++;
        
        if (registrationDate >= today) {
          todayCount++;
        }
        if (registrationDate >= weekStart) {
          weekCount++;
        }
        if (registrationDate >= monthStart) {
          monthCount++;
        }
        if (registrationDate >= yearStart) {
          yearCount++;
        }
      }
    });

    // Update data quality indicators
    this.hasRegistrationDates = usersWithDates > 0;
    this.usersWithoutDates = users.length - usersWithDates;

    this.statistics = {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      thisYear: yearCount,
      total: users.length
    };
  }

  private generateChartData(users: User[]) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Generate daily registrations for current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    this.dailyRegistrations = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(currentYear, currentMonth, day);
      const dayEnd = new Date(currentYear, currentMonth, day + 1);
      
      const count = users.filter(user => {
        let registrationDate: Date | null = null;
        
        if (user.createdAt) {
          registrationDate = new Date(user.createdAt);
        } else if (user.registrationDate) {
          registrationDate = new Date(user.registrationDate);
        }
        
        return registrationDate && 
               registrationDate >= dayStart && 
               registrationDate < dayEnd;
      }).length;
      
      this.dailyRegistrations.push({
        label: `${day}`,
        value: count
      });
    }

    // Generate weekly registrations for current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    this.weeklyRegistrations = [];
    let weekNumber = 1;
    let weekStart = new Date(firstDayOfMonth);
    
    while (weekStart <= lastDayOfMonth) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days to get end of week
      
      // Don't go beyond the month
      if (weekEnd > lastDayOfMonth) {
        weekEnd.setTime(lastDayOfMonth.getTime());
      }
      
      const count = users.filter(user => {
        let registrationDate: Date | null = null;
        
        if (user.createdAt) {
          registrationDate = new Date(user.createdAt);
        } else if (user.registrationDate) {
          registrationDate = new Date(user.registrationDate);
        }
        
        return registrationDate && 
               registrationDate >= weekStart && 
               registrationDate <= weekEnd;
      }).length;
      
      this.weeklyRegistrations.push({
        label: `Tuần ${weekNumber}`,
        value: count
      });
      
      // Move to next week
      weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() + 1);
      weekNumber++;
    }

    // Generate monthly registrations for current year
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    
    this.monthlyRegistrations = months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1);
      const monthEnd = new Date(currentYear, index + 1, 1);
      
      const count = users.filter(user => {
        let registrationDate: Date | null = null;
        
        if (user.createdAt) {
          registrationDate = new Date(user.createdAt);
        } else if (user.registrationDate) {
          registrationDate = new Date(user.registrationDate);
        }
        
        return registrationDate && 
               registrationDate >= monthStart && 
               registrationDate < monthEnd;
      }).length;
      
      return {
        label: month,
        value: count
      };
    });
  }

  // Setup all users for pagination
  private setupAllUsers(users: User[]) {
    this.allUsers = users;
    this.applyFilters();
  }

  // Apply filters and update pagination
  applyFilters() {
    let filtered = [...this.allUsers];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.fullName && user.fullName.toLowerCase().includes(searchLower))
      );
    }

    // Apply role filter
    if (this.selectedRole) {
      filtered = filtered.filter(user => 
        user.role.toLowerCase().replace('role_', '') === this.selectedRole.toLowerCase()
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      const isVerified = this.selectedStatus === 'verified';
      filtered = filtered.filter(user => user.verified === isVerified);
    }

    // Apply time filter
    if (this.selectedTimeFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(user => {
        const userDate = this.getUserRegistrationDate(user);
        if (!userDate) return false;

        switch (this.selectedTimeFilter) {
          case 'today':
            const userDay = new Date(userDate.getFullYear(), userDate.getMonth(), userDate.getDate());
            return userDay.getTime() === today.getTime();
            
          case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return userDate >= weekStart;
            
          case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return userDate >= monthStart;
            
          case 'year':
            const yearStart = new Date(today.getFullYear(), 0, 1);
            return userDate >= yearStart;
            
          default:
            return true;
        }
      });
    }

    this.filteredUsers = filtered;
    this.applySorting();
    this.totalUsers = this.filteredUsers.length;
    this.totalPages = Math.ceil(this.totalUsers / this.itemsPerPage);
    
    // Reset to first page if current page is out of bounds
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedUsers();
  }

  // Apply sorting
  applySorting() {
    if (!this.sortField) return;

    this.filteredUsers.sort((a, b) => {
      let valueA: any = a[this.sortField as keyof User];
      let valueB: any = b[this.sortField as keyof User];

      // Handle special cases
      if (this.sortField === 'createdAt' || this.sortField === 'registrationDate') {
        valueA = this.getUserRegistrationDate(a)?.getTime() || 0;
        valueB = this.getUserRegistrationDate(b)?.getTime() || 0;
      } else if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Sort by field
  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  // Update paginated users based on current page
  updatePaginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedUsers();
    }
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  // Get page numbers for pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Change items per page
  changeItemsPerPage(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
    this.applyFilters();
  }

  // Search and filter handlers
  onSearchChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onRoleFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  // Time filter handlers
  filterByTime(timeFilter: string) {
    this.selectedTimeFilter = this.selectedTimeFilter === timeFilter ? '' : timeFilter;
    this.currentPage = 1;
    this.applyFilters();
    
    // Scroll to users section
    setTimeout(() => {
      const usersSection = document.querySelector('.all-users-section');
      if (usersSection) {
        usersSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  filterByToday() {
    this.filterByTime('today');
  }

  filterByWeek() {
    this.filterByTime('week');
  }

  filterByMonth() {
    this.filterByTime('month');
  }

  filterByYear() {
    this.filterByTime('year');
  }

  filterByTotal() {
    // Clear all filters to show all users
    this.selectedTimeFilter = '';
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.sortField = '';
    this.sortDirection = 'asc';
    this.currentPage = 1;
    this.applyFilters();
    
    // Scroll to users section
    setTimeout(() => {
      const usersSection = document.querySelector('.all-users-section');
      if (usersSection) {
        usersSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  // Get time filter label for display
  getTimeFilterLabel(): string {
    switch (this.selectedTimeFilter) {
      case 'today':
        return 'hôm nay';
      case 'week':
        return 'tuần này';
      case 'month':
        return 'tháng này';
      case 'year':
        return 'năm này';
      default:
        return '';
    }
  }

  // Clear all filters
  clearFilters() {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.selectedTimeFilter = '';
    this.sortField = '';
    this.sortDirection = 'asc';
    this.currentPage = 1;
    this.applyFilters();
  }

  // Format role để hiển thị
  getDisplayRole(role: string): string {
    const cleanRole = role.replace('ROLE_', '').toLowerCase();
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
  }

  // Get max value for chart scaling
  getMaxValue(data: ChartData[]): number {
    return Math.max(...data.map(item => item.value));
  }

  // Calculate bar height for chart
  getBarHeight(value: number, maxValue: number): number {
    return (value / maxValue) * 100;
  }

  // Get total daily registrations
  getTotalDailyRegistrations(): number {
    return this.dailyRegistrations.reduce((sum, item) => sum + item.value, 0);
  }

  // Get peak daily registration
  getPeakDailyRegistration(): ChartData {
    if (this.dailyRegistrations.length === 0) {
      return { label: 'N/A', value: 0 };
    }
    return this.dailyRegistrations.reduce((max, item) => item.value > max.value ? item : max, this.dailyRegistrations[0]);
  }

  // Get total monthly registrations
  getTotalMonthlyRegistrations(): number {
    return this.monthlyRegistrations.reduce((sum, item) => sum + item.value, 0);
  }

  // Get peak monthly registration
  getPeakMonthlyRegistration(): ChartData {
    if (this.monthlyRegistrations.length === 0) {
      return { label: 'N/A', value: 0 };
    }
    return this.monthlyRegistrations.reduce((max, item) => item.value > max.value ? item : max, this.monthlyRegistrations[0]);
  }

  // Get total weekly registrations
  getTotalWeeklyRegistrations(): number {
    return this.weeklyRegistrations.reduce((sum, item) => sum + item.value, 0);
  }

  // Get peak weekly registration
  getPeakWeeklyRegistration(): ChartData {
    if (this.weeklyRegistrations.length === 0) {
      return { label: 'N/A', value: 0 };
    }
    return this.weeklyRegistrations.reduce((max, item) => item.value > max.value ? item : max, this.weeklyRegistrations[0]);
  }

  // Helper method to parse user registration date
  private getUserRegistrationDate(user: User): Date | null {
    if (user.createdAt) {
      const date = new Date(user.createdAt);
      return isNaN(date.getTime()) ? null : date;
    }
    if (user.registrationDate) {
      const date = new Date(user.registrationDate);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  // Get formatted date for display
  getFormattedDate(dateString: string | undefined): string {
    if (!dateString) return 'Chưa có';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Không hợp lệ';
    
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Profile component event handlers
  onProfileUpdate() {
    console.log('Profile update requested');
  }

  onLogout() {
    this.sessionService.logout();
  }

  // Export statistics to PDF
  async exportToPDF() {
    const element = document.getElementById('statistics-content');
    if (!element) {
      console.error('Element not found for PDF export');
      return;
    }

    try {
      // Show loading state
      const exportBtn = document.querySelector('.btn-pdf') as HTMLButtonElement;
      if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xuất PDF...';
      }

      // Configure html2canvas options
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        width: element.scrollWidth
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add title page
      pdf.setFontSize(20);
      pdf.text('Báo cáo thống kê đăng ký người dùng', 105, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 105, 45, { align: 'center' });
      pdf.text(`Người xuất: ${this.username}`, 105, 55, { align: 'center' });

      // Add summary statistics
      pdf.setFontSize(14);
      pdf.text('Tóm tắt thống kê:', 20, 80);
      
      pdf.setFontSize(11);
      let yPos = 95;
      pdf.text(`• Đăng ký hôm nay: ${this.statistics.today} người`, 25, yPos);
      yPos += 10;
      pdf.text(`• Đăng ký tuần này: ${this.statistics.thisWeek} người`, 25, yPos);
      yPos += 10;
      pdf.text(`• Đăng ký tháng này: ${this.statistics.thisMonth} người`, 25, yPos);
      yPos += 10;
      pdf.text(`• Đăng ký năm này: ${this.statistics.thisYear} người`, 25, yPos);
      yPos += 10;
      pdf.text(`• Tổng số người dùng: ${this.statistics.total} người`, 25, yPos);

      // Add new page for charts
      pdf.addPage();
      
      // Add the main content image
      pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add footer to all pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.text(`Trang ${i} / ${pageCount}`, 105, 285, { align: 'center' });
        pdf.text('CMC Learn - Hệ thống quản lý học tập', 105, 290, { align: 'center' });
      }

      // Save the PDF
      const fileName = `thong-ke-dang-ky-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Reset button state
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Xuất PDF';
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.');
      
      // Reset button state
      const exportBtn = document.querySelector('.btn-pdf') as HTMLButtonElement;
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Xuất PDF';
      }
    }
  }

  // Export statistics
  exportStatistics() {
    const data = {
      statistics: this.statistics,
      dailyRegistrations: this.dailyRegistrations,
      weeklyRegistrations: this.weeklyRegistrations,
      monthlyRegistrations: this.monthlyRegistrations
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registration-statistics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Refresh data
  refreshData() {
    this.loadRegistrationStatistics();
  }
}
