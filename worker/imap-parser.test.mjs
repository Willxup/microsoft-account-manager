import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

async function loadImapParserModule() {
  const outdir = join(tmpdir(), `imap-parser-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(outdir, { recursive: true });
  const outfile = join(outdir, 'imap-parser.mjs');
  await build({
    entryPoints: ['worker/imap-parser.ts'],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    logLevel: 'silent'
  });
  const module = await import(pathToFileURL(outfile).href);
  await rm(outdir, { recursive: true, force: true });
  return module;
}

const { decodeMimeHeader, parseImapFetchResponse } = await loadImapParserModule();

test('parses IMAP fetch response into mailbox messages', () => {
  const response = [
    '* 1 FETCH (UID 42 INTERNALDATE "01-Jun-2026 12:30:00 +0000" BODY[HEADER.FIELDS (FROM SUBJECT DATE)] {137}',
    'From: Sender <sender@example.com>',
    'Subject: =?UTF-8?B?5rWL6K+V6YKu5Lu2?=',
    'Date: Mon, 01 Jun 2026 12:30:00 +0000',
    '',
    ' BODY[TEXT]<0> {39}',
    '<html><body>Hello from IMAP</body></html>',
    ')',
    'A004 OK FETCH completed'
  ].join('\r\n');

  const messages = parseImapFetchResponse(response, 'INBOX', true);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, 'imap:INBOX:42');
  assert.equal(messages[0].subject, '测试邮件');
  assert.equal(messages[0].from, 'sender@example.com');
  assert.equal(messages[0].receivedAt, '2026-06-01T12:30:00.000Z');
  assert.equal(messages[0].contentType, 'html');
  assert.equal(messages[0].content, '<html><body>Hello from IMAP</body></html>');
  assert.equal(messages[0].preview, 'Hello from IMAP');
});

test('decodes adjacent MIME encoded words', () => {
  assert.equal(
    decodeMimeHeader('=?UTF-8?B?5Lit5paH?= =?UTF-8?Q?_=E9=82=AE=E4=BB=B6?='),
    '中文 邮件'
  );
});

test('decodes quoted-printable utf-8 IMAP text body for preview', () => {
  const response = [
    '* 1 FETCH (UID 43 INTERNALDATE "01-Jun-2026 12:30:00 +0000" BODY[HEADER.FIELDS (FROM SUBJECT DATE CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] {207}',
    'From: Sender <sender@example.com>',
    'Subject: Plain',
    'Date: Mon, 01 Jun 2026 12:30:00 +0000',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    ' BODY.PEEK[TEXT]<0.80000> {48}',
    '=E4=BD=A0=E5=A5=BD=EF=BC=8C=E8=BF=99=E6=98=AF IMAP =E9=A2=84=E8=A7=88',
    ')',
    'A004 OK FETCH completed'
  ].join('\r\n');

  const messages = parseImapFetchResponse(response, 'INBOX', true);

  assert.equal(messages[0].contentType, 'text');
  assert.equal(messages[0].content, '你好，这是 IMAP 预览');
  assert.equal(messages[0].preview, '你好，这是 IMAP 预览');
});

test('extracts and decodes multipart text part for IMAP preview', () => {
  const response = [
    '* 1 FETCH (UID 44 INTERNALDATE "01-Jun-2026 12:30:00 +0000" BODY[HEADER.FIELDS (FROM SUBJECT DATE CONTENT-TYPE)] {158}',
    'From: Sender <sender@example.com>',
    'Subject: Multipart',
    'Date: Mon, 01 Jun 2026 12:30:00 +0000',
    'Content-Type: multipart/alternative; boundary="mail-boundary"',
    '',
    ' BODY[TEXT]<0> {246}',
    '--mail-boundary',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    '=E7=BA=AF=E6=96=87=E6=9C=AC=E9=A2=84=E8=A7=88',
    '--mail-boundary',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    '<p>HTML</p>',
    '--mail-boundary--',
    ')',
    'A004 OK FETCH completed'
  ].join('\r\n');

  const messages = parseImapFetchResponse(response, 'INBOX', true);

  assert.equal(messages[0].contentType, 'text');
  assert.equal(messages[0].content, '纯文本预览');
  assert.equal(messages[0].preview, '纯文本预览');
});
