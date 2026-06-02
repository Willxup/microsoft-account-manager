import assert from 'node:assert/strict';
import test from 'node:test';

const moduleUrl = process.env.IMAP_PARSER_MODULE;

if (!moduleUrl) {
  throw new Error('Set IMAP_PARSER_MODULE to the compiled imap-parser module URL');
}

const { decodeMimeHeader, parseImapFetchResponse } = await import(moduleUrl);

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
