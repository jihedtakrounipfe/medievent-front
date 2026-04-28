import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { SubAdminService } from '../services/sub-admin.service';
import { AdminPaymentRecord } from '../models/sub-admin.models';

@Component({
  selector: 'app-sub-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <div class="page-header">
        <div>
          <h1>💰 Payments</h1>
          <p class="subtitle">Transaction history and revenue analytics</p>
        </div>
      </div>

      <!-- Revenue Card -->
      <div class="revenue-card">
        <div class="revenue-left">
          <p class="revenue-label">Total Revenue</p>
          <p class="revenue-value">{{ getTotalRevenue() | number:'1.2-2' }} TND</p>
          <p class="revenue-period">From {{ countByStatus('SUCCESS') }} successful transactions</p>
        </div>
        <div class="revenue-icon">📊</div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card info">
          <div class="stat-label">Total Payments</div>
          <div class="stat-value">{{ payments.length }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Success</div>
          <div class="stat-value">{{ countByStatus('SUCCESS') }}</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-label">Pending</div>
          <div class="stat-value">{{ countByStatus('PENDING') }}</div>
        </div>
        <div class="stat-card failed">
          <div class="stat-label">Failed</div>
          <div class="stat-value">{{ countByStatus('FAILED') }}</div>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="controls-row">
        <div class="search-input">
          <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange()" placeholder="Search by session, provider or status..." />
          @if (searchTerm) {
            <button class="btn-clear-search" type="button" (click)="searchTerm=''; onSearchChange()">Clear</button>
          }
        </div>
        <div class="filter-row">
          <button class="filter-btn" [class.active]="filter === 'ALL'" (click)="setFilter('ALL')">All</button>
          <button class="filter-btn" [class.active]="filter === 'SUCCESS'" (click)="setFilter('SUCCESS')">Success</button>
          <button class="filter-btn" [class.active]="filter === 'PENDING'" (click)="setFilter('PENDING')">Pending</button>
          <button class="filter-btn" [class.active]="filter === 'FAILED'" (click)="setFilter('FAILED')">Failed</button>
        </div>
      </div>

      @if (loading) {
        <p class="loading">🔄 Loading payments...</p>
      }
      @if (error) {
        <p class="error">❌ {{ error }}</p>
      }
      @if (success) {
        <p class="success">{{ success }}</p>
      }

      <div class="table-wrap">
        @if (filtered.length === 0) {
          <div class="empty-state">
            <p>📭 No payments found</p>
          </div>
        } @else {
          <table>
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort('amount')">Amount</th>
                <th>Currency</th>
                <th>Provider</th>
                <th>Session ID</th>
                <th class="sortable" (click)="toggleSort('status')">Status</th>
                <th class="sortable" (click)="toggleSort('createdAt')">Date</th>
              </tr>
            </thead>
            <tbody>
              @for (payment of paginated; track payment.stripeSessionId) {
                <tr [class.failed-row]="payment.status === 'FAILED'">
                  <td><strong>{{ (payment.amount / 100) | number:'1.2-2' }} TND</strong></td>
                  <td>TND</td>
                  <td>{{ payment.paymentProvider ?? 'STRIPE' }}</td>
                  <td>
                    <div class="session-id-cell">
                      <span class="mono session-text">{{ payment.stripeSessionId | slice:0:18 }}...</span>
                      <button class="btn-copy" (click)="copyToClipboard(payment.stripeSessionId)" title="Copy">📋</button>
                    </div>
                  </td>
                  <td>
                    <span class="badge"
                      [class.success]="payment.status === 'SUCCESS'"
                      [class.pending]="payment.status === 'PENDING'"
                      [class.failed]="payment.status === 'FAILED'">
                      {{ payment.status }}
                    </span>
                  </td>
                  <td>{{ payment.createdAt | slice:0:10 }}</td>
                </tr>
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

    .revenue-card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 32px;
      align-items: center;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      border-radius: 16px;
      padding: 28px 32px;
      color: white;
      margin-bottom: 28px;
      box-shadow: 0 12px 32px rgba(2, 132, 199, 0.24);
    }

    .revenue-left {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .revenue-label {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.9;
      margin: 0;
    }

    .revenue-value {
      font-size: 42px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }

    .revenue-period {
      font-size: 13px;
      opacity: 0.8;
      margin: 0;
    }

    .revenue-icon {
      font-size: 60px;
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
      min-width: 250px;
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
      transition: all 0.25s ease;
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
      color: #065f46;
      background: #d1fae5;
      padding: 12px 14px;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #10b981;
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

    tbody tr.failed-row {
      background: #fff5f5;
    }

    tbody tr.failed-row:hover {
      background: #fee2e2;
    }

    .mono {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #64748b;
    }

    .session-id-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .session-text {
      flex: 1;
      word-break: break-all;
    }

    .btn-copy {
      background: none;
      border: none;
      font-size: 14px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
      opacity: 0;
    }

    .session-id-cell:hover .btn-copy {
      opacity: 1;
      background: #e2e8f0;
    }

    .btn-copy:active {
      transform: scale(1.1);
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

    .badge.success {
      background: #dcfce7;
      color: #15803d;
    }

    .badge.success::before {
      background: #15803d;
    }

    .badge.pending {
      background: #fef3c7;
      color: #b45309;
    }

    .badge.pending::before {
      background: #b45309;
    }

    .badge.failed {
      background: #fee2e2;
      color: #b91c1c;
    }

    .badge.failed::before {
      background: #b91c1c;
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
  `]
})
export class SubAdminPaymentsComponent implements OnInit {

  payments: AdminPaymentRecord[] = [];
  filter: 'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' = 'ALL';
  searchTerm = '';
  loading = false;
  error = '';
  success = '';

  sortField: 'createdAt' | 'amount' | 'status' = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  readonly pageSize = 8;

  private readonly adminService = inject(SubAdminService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getAllPayments().subscribe({
      next: (data) => { this.payments = data; this.loading = false; },
      error: () => { this.error = 'Failed to load payments.'; this.loading = false; }
    });
  }

  get filtered(): AdminPaymentRecord[] {
    let result = this.payments;

    if (this.filter !== 'ALL') {
      result = result.filter(p => p.status === this.filter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.stripeSessionId.toLowerCase().includes(term) ||
        (p.paymentProvider || '').toLowerCase().includes(term) ||
        p.status.toLowerCase().includes(term)
      );
    }

    return result;
  }

  get paginated(): AdminPaymentRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  get sorted(): AdminPaymentRecord[] {
    const data = [...this.filtered];
    data.sort((a, b) => {
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
    return data;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  setFilter(filter: 'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'): void {
    this.filter = filter;
    this.currentPage = 1;
  }

  toggleSort(field: 'createdAt' | 'amount' | 'status'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'createdAt' ? 'desc' : 'asc';
    }
    this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  countByStatus(status: string): number {
    return this.payments.filter(p => p.status === status).length;
  }
// In getTotalRevenue() — convert cents to TND
getTotalRevenue(): number {
  return this.payments
    .filter(p => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + ((p.amount || 0) / 100), 0);
}

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.success = 'Session ID copied.';
      setTimeout(() => {
        this.success = '';
      }, 3000);
    });
  }

  private getSortValue(payment: AdminPaymentRecord): number | string {
    if (this.sortField === 'amount') {
      return payment.amount || 0;
    }
    if (this.sortField === 'createdAt') {
      return new Date(payment.createdAt).getTime();
    }
    if (this.sortField === 'status') {
      return payment.status;
    }
    return payment.status;
  }
}
