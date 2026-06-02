import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

async function loadWorkbenchModule() {
  const outdir = join(tmpdir(), `workbench-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(outdir, { recursive: true });
  const outfile = join(outdir, 'workbench.mjs');
  await build({
    entryPoints: ['src/workbench.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent'
  });
  const module = await import(pathToFileURL(outfile).href);
  await rm(outdir, { recursive: true, force: true });
  return module;
}

const sampleAccounts = [
  {
    id: 1,
    account: 'alpha@hotmail.com',
    password: 'p',
    clientId: null,
    refreshToken: null,
    remark: '平台 A',
    createdAt: '2026-06-01',
    syncStatus: 'idle',
    syncMessage: null,
    refreshedAt: null,
    fetchedAt: null,
    fetchedCount: 0
  },
  {
    id: 2,
    account: 'beta@hotmail.com',
    password: 'p',
    clientId: null,
    refreshToken: null,
    remark: '待注册',
    createdAt: '2026-06-01',
    syncStatus: 'fetch_success',
    syncMessage: null,
    refreshedAt: null,
    fetchedAt: null,
    fetchedCount: 18
  },
  {
    id: 3,
    account: 'gamma@outlook.com',
    password: 'p',
    clientId: null,
    refreshToken: null,
    remark: null,
    createdAt: '2026-06-01',
    syncStatus: 'refresh_failed',
    syncMessage: null,
    refreshedAt: null,
    fetchedAt: null,
    fetchedCount: 0
  }
];

test('workbench filters accounts by email and remark', async () => {
  const { filterWorkbenchAccounts } = await loadWorkbenchModule();

  assert.deepEqual(
    filterWorkbenchAccounts(sampleAccounts, '待注册').map((item) => item.id),
    [2]
  );
  assert.deepEqual(
    filterWorkbenchAccounts(sampleAccounts, 'OUTLOOK').map((item) => item.id),
    [3]
  );
  assert.deepEqual(
    filterWorkbenchAccounts(sampleAccounts, '').map((item) => item.id),
    [1, 2, 3]
  );
});

test('workbench clamps page sizes to supported options', async () => {
  const { clampWorkbenchPageSize } = await loadWorkbenchModule();

  assert.equal(clampWorkbenchPageSize(10), 10);
  assert.equal(clampWorkbenchPageSize(20), 20);
  assert.equal(clampWorkbenchPageSize(50), 50);
  assert.equal(clampWorkbenchPageSize(100), 100);
  assert.equal(clampWorkbenchPageSize(7), 10);
});

test('workbench paginates accounts and clamps out-of-range pages', async () => {
  const { paginateWorkbenchAccounts } = await loadWorkbenchModule();
  const accounts = Array.from({ length: 23 }, (_, index) => ({
    ...sampleAccounts[0],
    id: index + 1,
    account: `user${index + 1}@hotmail.com`
  }));

  const firstPage = paginateWorkbenchAccounts(accounts, 1, 10);
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.pageCount, 3);
  assert.equal(firstPage.items.length, 10);
  assert.equal(firstPage.items[0].id, 1);

  const lastPage = paginateWorkbenchAccounts(accounts, 99, 10);
  assert.equal(lastPage.page, 3);
  assert.equal(lastPage.items.length, 3);
  assert.equal(lastPage.items[0].id, 21);
});

test('workbench filters fetched mail by keyword, sender, and limit', async () => {
  const { filterWorkbenchMailItems } = await loadWorkbenchModule();
  const messages = [
    {
      id: '1',
      subject: '验证码通知',
      from: 'service@example.com',
      receivedAt: '2026-06-02T09:00:00.000Z',
      preview: '你的验证码是 123456',
      contentType: 'text',
      content: '你的验证码是 123456'
    },
    {
      id: '2',
      subject: 'Welcome',
      from: 'noreply@outlook.com',
      receivedAt: '2026-06-02T09:01:00.000Z',
      preview: 'Hello',
      contentType: 'text',
      content: 'Hello world'
    },
    {
      id: '3',
      subject: '验证码备份',
      from: 'backup@example.com',
      receivedAt: '2026-06-02T09:02:00.000Z',
      preview: '备用验证码',
      contentType: 'text',
      content: '备用验证码'
    }
  ];

  assert.deepEqual(
    filterWorkbenchMailItems(messages, { keyword: '验证码', sender: 'example.com', limit: 1 }).map((item) => item.id),
    ['1']
  );
  assert.deepEqual(
    filterWorkbenchMailItems(messages, { keyword: 'welcome', sender: '', limit: 10 }).map((item) => item.id),
    ['2']
  );
});

test('workbench account meta shows alias progress before fetched count', async () => {
  const { formatWorkbenchAccountMeta } = await loadWorkbenchModule();

  assert.equal(
    formatWorkbenchAccountMeta({ aliasRegistered: 2, aliasTotal: 5, fetchedCount: 18 }),
    '别名 2/5 · 取件 18'
  );
  assert.equal(
    formatWorkbenchAccountMeta({ aliasRegistered: 0, aliasTotal: 0, fetchedCount: -3 }),
    '别名 0/0 · 取件 0'
  );
});

test('workbench mail detail normalizes graph html and imap text messages', async () => {
  const { buildWorkbenchMailDetail } = await loadWorkbenchModule();

  const graphDetail = buildWorkbenchMailDetail({
    account: 'alpha@hotmail.com',
    mode: 'graph',
    item: {
      id: 'graph-1',
      subject: 'Graph HTML',
      from: 'service@example.com',
      receivedAt: '2026-06-02T09:00:00.000Z',
      preview: 'Preview',
      contentType: 'html',
      content: '<p>Graph body</p>'
    }
  });

  assert.equal(graphDetail.account, 'alpha@hotmail.com');
  assert.equal(graphDetail.modeLabel, 'GRAPH');
  assert.equal(graphDetail.contentKind, 'html');
  assert.equal(graphDetail.content, '<p>Graph body</p>');
  assert.equal(graphDetail.subject, 'Graph HTML');

  const imapDetail = buildWorkbenchMailDetail({
    account: 'beta@hotmail.com',
    mode: 'imap',
    item: {
      id: 'imap-1',
      subject: '',
      from: '',
      receivedAt: '',
      preview: 'IMAP preview fallback',
      contentType: 'text',
      content: ''
    }
  });

  assert.equal(imapDetail.modeLabel, 'IMAP');
  assert.equal(imapDetail.contentKind, 'text');
  assert.equal(imapDetail.content, 'IMAP preview fallback');
  assert.equal(imapDetail.subject, '(无主题)');
  assert.equal(imapDetail.from, '-');
  assert.equal(imapDetail.receivedAt, '-');
});

test('workbench toggles account selection when card is clicked', async () => {
  const { toggleWorkbenchSelectedId } = await loadWorkbenchModule();

  assert.deepEqual(toggleWorkbenchSelectedId([], 7), [7]);
  assert.deepEqual(toggleWorkbenchSelectedId([3, 7, 9], 7), [3, 9]);
  assert.deepEqual(toggleWorkbenchSelectedId([3], 9), [3, 9]);
});
