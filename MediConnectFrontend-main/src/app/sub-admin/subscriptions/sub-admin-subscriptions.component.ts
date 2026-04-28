import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { SubAdminService } from '../services/sub-admin.service';
import { AdminSubscriptionRecord } from '../models/sub-admin.models';

@Component({
  selector: 'app-sub-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <div class="page-header">
        <div>
          <h1>📋 Subscriptions</h1>
          <p class="subtitle">Manage and track all active subscriptions</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card success">
          <div class="stat-label">Active</div>
          <div class="stat-value">{{ countByStatus('ACTIVE') }}</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-label">Pending</div>
          <div class="stat-value">{{ countByStatus('EXPIRED') }}</div>
        </div>
        <div class="stat-card failed">
          <div class="stat-label">Cancelled</div>
          <div class="stat-value">{{ countByStatus('CANCELLED') }}</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">Total</div>
          <div class="stat-value">{{ subscriptions.length }}</div>
        </div>
      </div>

      <!-- Filter -->
      <div class="controls-row">
        <div class="search-input">
          <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange()" placeholder="Search by plan, type or billing..." />
          @if (searchTerm) {
            <button class="btn-clear-search" type="button" (click)="searchTerm=''; onSearchChange()">Clear</button>
          }
        </div>
        <div class="filter-row">
          <button class="filter-btn" [class.active]="filter === 'ALL'" (click)="setFilter('ALL')">All</button>
          <button class="filter-btn" [class.active]="filter === 'ACTIVE'" (click)="setFilter('ACTIVE')">Active</button>
          <button class="filter-btn" [class.active]="filter === 'CANCELLED'" (click)="setFilter('CANCELLED')">Cancelled</button>
          <button class="filter-btn" [class.active]="filter === 'EXPIRED'" (click)="setFilter('EXPIRED')">Expired</button>
        </div>
      </div>

      @if (loading) {
        <p class="loading">🔄 Loading subscriptions...</p>
      }
      @if (error) {
        <p class="error">❌ {{ error }}</p>
      }
      @if (success) {
        <p class="success">✓ {{ success }}</p>
      }

      <div class="table-wrap">
        @if (filtered.length === 0) {
          <div class="empty-state">
            <p>📭 No subscriptions found</p>
          </div>
        } @else {
          <table>
            <thead>
              <tr>
                <th></th>
                <th class="sortable" (click)="toggleSort('planName')">Plan</th>
                <th>Type</th>
                <th>Billing</th>
                <th class="sortable" (click)="toggleSort('startDate')">Active Period</th>
                <th class="sortable" (click)="toggleSort('status')">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (sub of paginated; track sub.id) {
                <tr [class.cancelled]="sub.status === 'CANCELLED'">
                  <td class="expand-cell">
                    <button class="expand-btn" (click)="toggleExpand(sub.id)" [class.expanded]="expandedId === sub.id">
                      ▶
                    </button>
                  </td>
                  <td><strong [class.strikethrough]="sub.status === 'CANCELLED'">{{ sub.planName }}</strong></td>
                  <td>{{ sub.planType }}</td>
                  <td>{{ sub.billingCycle }}</td>
                  <td>{{ sub.startDate }} → {{ sub.endDate }}</td>
                  <td>
                    <span class="badge"
                      [class.active]="sub.status === 'ACTIVE'"
                      [class.cancelled]="sub.status === 'CANCELLED'"
                      [class.expired]="sub.status === 'EXPIRED'">
                      {{ sub.status }}
                    </span>
                  </td>
                  <td>
                    @if (sub.status === 'ACTIVE') {
                      <button class="btn-sm btn-danger" (click)="cancel(sub.id)">Cancel</button>
                    } @else {
                      <span class="na">—</span>
                    }
                  </td>
                </tr>

                @if (expandedId === sub.id) {
                  <tr class="expand-row">
                    <td colspan="7">
                      <div class="expand-content">
                        <div class="detail-grid">
                          <div class="detail-item">
                            <span class="detail-label">Subscription ID</span>
                            <span class="detail-value mono">{{ sub.id }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-label">Payment Provider</span>
                            <span class="detail-value">{{ sub.paymentProvider }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-label">Plan Duration</span>
                            <span class="detail-value">{{ sub.startDate }} to {{ sub.endDate }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
          <div class="pagination-row">
            <span>Page {{ currentPage }} of {{ totalPages }} • {{ filtered.length }} records</span>
            <div class="pagination-actions">
              <button class="btn-page" [disabled]="currentPage === 1" (click)="previousPage()">Previous</button>
              <button class="btn-page" [disabled]="currentPage === totalPages" (click)="nextPage()">Next</button>
            </div>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background:
        radial-gradient(900px 260px at -12% -16%, rgba(14, 165, 233, 0.12), transparent 55%),
        radial-gradient(900px 260px at 116% -16%, rgba(245, 158, 11, 0.12), transparent 55%);
      border-radius: 20px;
    }

    .page-header {
      margin-bottom: 32px;
      padding: 0 8px;
    }

    h1 {
      font-size: 34px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      font-weight: 600;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }

    .controls-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-input {
      position: relative;
      flex: 1;
    }

    .search-input input {
      width: 100%;
      min-height: 44px;
      padding: 10px 86px 10px 90px;
      border: 1px solid #dbe6f4;
      border-radius: 100px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      transition: all 0.2s ease;
      min-width: 250px;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }

    .search-input input:focus {
      outline: none;
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
    }

    .search-input::before {
      content: 'Quick Search';
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #64748b;
      pointer-events: none;
    }

    .btn-clear-search {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      border: 1px solid #dbeafe;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      cursor: pointer;
    }

    .filter-row {
      display: flex;
      gap: 8px;
    }

    .filter-btn {
      padding: 8px 16px;
      border-radius: 100px;
      border: 1px solid #e2e8f0;
      background: white;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.18s;
      font-family: inherit;
      white-space: nowrap;
    }

    .filter-btn:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .filter-btn.active {
      background: #0f172a;
      border-color: #0f172a;
      color: white;
    }

    .loading {
      color: #0369a1;
      background: #e0f2fe;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #0369a1;
    }

    .error {
      color: #b91c1c;
      background: #fee2e2;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #b91c1c;
    }

    .success {
      color: #15803d;
      background: #dcfce7;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #15803d;
    }

    .table-wrap {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #94a3b8;
    }

    .empty-state p {
      font-size: 16px;
      margin: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      position: sticky;
      top: 0;
    }

    th {
      padding: 14px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }

    th.sortable {
      cursor: pointer;
      user-select: none;
    }

    th.sortable:hover {
      color: #1d4ed8;
      background: #eff6ff;
    }

    td {
      padding: 14px 16px;
      font-size: 13px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
    }

    tbody tr {
      transition: all 0.15s ease;
    }

    tbody tr:nth-child(even) {
      background: #fafbfc;
    }

    tbody tr:hover {
      background: #f0f4f8;
    }

    tbody tr.cancelled {
      background: #fffbfa;
    }

    tbody tr.cancelled:hover {
      background: #fff5f5;
    }

    .expand-cell {
      width: 40px;
      text-align: center;
      padding: 0;
    }

    .expand-btn {
      width: 100%;
      height: 48px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      color: #94a3b8;
      padding: 0;
    }

    .expand-btn:hover {
      color: #0284c7;
      background: #f0f4f8;
    }

    .expand-btn.expanded {
      transform: rotate(90deg);
      color: #0284c7;
    }

    .expand-row {
      background: #f8fafc;
      box-shadow: inset 0 2px 8px rgba(2, 132, 199, 0.08);
    }

    .expand-row td {
      padding: 20px 16px;
      border: none;
    }

    .expand-content {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e2e8f0;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
    }

    .detail-value {
      font-size: 13px;
      color: #0f172a;
      font-weight: 600;
    }

    .mono {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #64748b;
    }

    .strikethrough {
      text-decoration: line-through;
      opacity: 0.6;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .badge.active {
      background: #dcfce7;
      color: #15803d;
    }

    .badge.active::before {
      background: #15803d;
    }

    .badge.cancelled {
      background: #ffedd5;
      color: #c2410c;
    }

    .badge.cancelled::before {
      background: #c2410c;
    }

    .badge.expired {
      background: #f1f5f9;
      color: #64748b;
    }

    .badge.expired::before {
      background: #64748b;
    }

    .btn-sm {
      padding: 6px 14px;
      border-radius: 8px;
      border: none;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.18s;
    }

    .btn-danger {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .btn-danger:hover {
      background: #fecaca;
      border-color: #fca5a5;
    }

    .pagination-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.8rem 1rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .pagination-actions {
      display: inline-flex;
      gap: 0.45rem;
    }

    .btn-page {
      padding: 0.35rem 0.7rem;
      border-radius: 0.55rem;
      border: 1px solid #d1d9e3;
      background: #fff;
      color: #334155;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-page:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .na { color: #cbd5e1; font-size: 16px; }
  `]
})
export class SubAdminSubscriptionsComponent implements OnInit {

  subscriptions: AdminSubscriptionRecord[] = [];
  filter: 'ALL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' = 'ALL';
  searchTerm = '';
  expandedId: string | null = null;
  loading = false;
  error = '';
  success = '';
  sortField: 'planName' | 'status' | 'startDate' | 'endDate' = 'startDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  readonly pageSize = 8;

  private readonly adminService = inject(SubAdminService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getAllSubscriptions().subscribe({
      next: (data) => { this.subscriptions = data; this.loading = false; },
      error: () => { this.error = 'Failed to load subscriptions.'; this.loading = false; }
    });
  }

  get filtered(): AdminSubscriptionRecord[] {
    let result = this.subscriptions;

    if (this.filter !== 'ALL') {
      result = result.filter(s => s.status === this.filter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(s =>
        s.planName.toLowerCase().includes(term) ||
        s.planType.toLowerCase().includes(term) ||
        s.billingCycle.toLowerCase().includes(term)
      );
    }

    return result;
  }

  get sorted(): AdminSubscriptionRecord[] {
    const result = [...this.filtered];
    result.sort((a, b) => {
      const first = this.getSortValue(a);
      const second = this.getSortValue(b);
      if (first < second) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (first > second) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return result;
  }

  get paginated(): AdminSubscriptionRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  setFilter(filter: 'ALL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'): void {
    this.filter = filter;
    this.currentPage = 1;
    this.expandedId = null;
  }

  toggleSort(field: 'planName' | 'status' | 'startDate' | 'endDate'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'startDate' || field === 'endDate' ? 'desc' : 'asc';
    }
    this.currentPage = 1;
    this.expandedId = null;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
      this.expandedId = null;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.expandedId = null;
    }
  }

  countByStatus(status: string): number {
    return this.subscriptions.filter(s => s.status === status).length;
  }

  cancel(id: string): void {
    this.adminService.cancelSubscription(id).subscribe({
      next: () => { this.success = 'Subscription cancelled.'; this.load(); },
      error: () => { this.error = 'Failed to cancel subscription.'; }
    });
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  private getSortValue(sub: AdminSubscriptionRecord): number | string {
    if (this.sortField === 'startDate') {
      return new Date(sub.startDate).getTime();
    }
    if (this.sortField === 'endDate') {
      return new Date(sub.endDate).getTime();
    }
    if (this.sortField === 'status') {
      return sub.status;
    }
    return sub.planName;
  }
}
