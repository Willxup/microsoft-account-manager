import type { AccountItem, AccountMailItem, MailFetchMode } from './types';

export const WORKBENCH_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_WORKBENCH_PAGE_SIZE = 10;

export type WorkbenchPageSize = (typeof WORKBENCH_PAGE_SIZE_OPTIONS)[number];

export interface WorkbenchPaginationResult<T> {
  items: T[];
  page: number;
  pageCount: number;
  pageSize: WorkbenchPageSize;
  total: number;
}

export interface WorkbenchMailFilterOptions {
  keyword: string;
  sender: string;
  limit: number;
}

export interface WorkbenchAccountMetaOptions {
  aliasRegistered: number;
  aliasTotal: number;
  fetchedCount: number;
}

export interface WorkbenchMailDetailOptions {
  account: string;
  mode: MailFetchMode;
  item: AccountMailItem;
}

export interface WorkbenchMailDetail {
  id: string;
  account: string;
  mode: MailFetchMode;
  modeLabel: string;
  subject: string;
  from: string;
  receivedAt: string;
  contentKind: 'html' | 'text';
  content: string;
}

export function clampWorkbenchPageSize(value: number): WorkbenchPageSize {
  return WORKBENCH_PAGE_SIZE_OPTIONS.includes(value as WorkbenchPageSize)
    ? (value as WorkbenchPageSize)
    : DEFAULT_WORKBENCH_PAGE_SIZE;
}

export function filterWorkbenchAccounts(items: AccountItem[], keyword: string): AccountItem[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return items;
  }

  return items.filter((item) => {
    const account = item.account.toLowerCase();
    const remark = (item.remark ?? '').toLowerCase();
    return account.includes(normalizedKeyword) || remark.includes(normalizedKeyword);
  });
}

export function paginateWorkbenchAccounts<T>(
  items: T[],
  page: number,
  pageSize: number
): WorkbenchPaginationResult<T> {
  const safePageSize = clampWorkbenchPageSize(pageSize);
  const pageCount = Math.max(Math.ceil(items.length / safePageSize), 1);
  const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), pageCount);
  const start = (safePage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageCount,
    pageSize: safePageSize,
    total: items.length
  };
}

export function filterWorkbenchMailItems(
  items: AccountMailItem[],
  options: WorkbenchMailFilterOptions
): AccountMailItem[] {
  const keyword = options.keyword.trim().toLowerCase();
  const sender = options.sender.trim().toLowerCase();
  const limit = Math.max(Math.trunc(options.limit) || 10, 1);

  return items
    .filter((item) => {
      const keywordMatched =
        !keyword ||
        item.subject.toLowerCase().includes(keyword) ||
        item.preview.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword);
      const senderMatched = !sender || item.from.toLowerCase().includes(sender);
      return keywordMatched && senderMatched;
    })
    .slice(0, limit);
}

export function formatWorkbenchAccountMeta(options: WorkbenchAccountMetaOptions): string {
  const aliasTotal = Math.max(Math.trunc(options.aliasTotal) || 0, 0);
  const aliasRegistered =
    aliasTotal > 0 ? Math.min(Math.max(Math.trunc(options.aliasRegistered) || 0, 0), aliasTotal) : 0;
  const fetchedCount = Math.max(Math.trunc(options.fetchedCount) || 0, 0);

  return `别名 ${aliasRegistered}/${aliasTotal} · 取件 ${fetchedCount}`;
}

export function toggleWorkbenchSelectedId(selectedIds: number[], id: number): number[] {
  return selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id];
}

export function resolveWorkbenchFetchIds(selectedIds: number[], currentId: number | null): number[] {
  if (selectedIds.length > 0) {
    return selectedIds;
  }

  return currentId ? [currentId] : [];
}

export function buildWorkbenchMailDetail(options: WorkbenchMailDetailOptions): WorkbenchMailDetail {
  const contentType = options.item.contentType.trim().toLowerCase();
  const content = options.item.content.trim() || options.item.preview.trim();

  return {
    id: options.item.id,
    account: options.account,
    mode: options.mode,
    modeLabel: options.mode.toUpperCase(),
    subject: options.item.subject.trim() || '(无主题)',
    from: options.item.from.trim() || '-',
    receivedAt: options.item.receivedAt.trim() || '-',
    contentKind: contentType === 'html' ? 'html' : 'text',
    content
  };
}
