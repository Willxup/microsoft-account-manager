import { connect } from 'cloudflare:sockets';
import { parseImapFetchResponse, type ImapMailItem } from './imap-parser';

const IMAP_HOST = 'outlook.office365.com';
const IMAP_PORT = 993;
const IMAP_COMMAND_TIMEOUT_MS = 20_000;
const IMAP_FETCH_CHUNK_SIZE = 25;
const IMAP_BODY_PREVIEW_BYTES = 80_000;

type ImapReadResult =
  | { ok: true; messages: ImapMailItem[] }
  | { ok: false; error: string };

interface CloudflareSocket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  opened: Promise<unknown>;
  close(): void | Promise<void>;
}

export async function readImapMessagesViaSocket(
  account: string,
  accessToken: string,
  includeBody = false
): Promise<ImapReadResult> {
  let session: ImapSession | null = null;
  try {
    session = await ImapSession.open();
    await session.authenticate(account, accessToken);

    const folders = await session.listSelectableFolders();
    const messages: ImapMailItem[] = [];

    for (const folder of folders) {
      try {
        await session.command(`EXAMINE ${quoteImapString(folder)}`);
        const searchResponse = await session.command('UID SEARCH ALL');
        const uids = parseUidSearchResponse(searchResponse).reverse();
        for (const uidChunk of chunk(uids, IMAP_FETCH_CHUNK_SIZE)) {
          const bodyClause = includeBody ? ` BODY.PEEK[TEXT]<0.${IMAP_BODY_PREVIEW_BYTES}>` : '';
          const fetchResponse = await session.command(
            `UID FETCH ${uidChunk.join(',')} (UID INTERNALDATE BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)]${bodyClause})`
          );
          messages.push(...parseImapFetchResponse(fetchResponse, folder, includeBody));
        }
      } catch {
        // Some special folders are listed as selectable but still reject EXAMINE or FETCH.
      }
    }

    messages.sort((left, right) => safeDateTime(right.receivedAt) - safeDateTime(left.receivedAt));
    return {
      ok: true,
      messages
    };
  } catch (error) {
    return {
      ok: false,
      error: `IMAP请求异常: ${error instanceof Error ? error.message : 'unknown error'}`
    };
  } finally {
    if (session) {
      await session.close();
    }
  }
}

class ImapSession {
  private readonly socket: CloudflareSocket;
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();
  private buffer = '';
  private tagCounter = 0;

  private constructor(socket: CloudflareSocket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  static async open(): Promise<ImapSession> {
    const socket = connect(
      { hostname: IMAP_HOST, port: IMAP_PORT },
      { secureTransport: 'on', allowHalfOpen: false }
    ) as CloudflareSocket;
    await socket.opened;

    const session = new ImapSession(socket);
    await session.readGreeting();
    return session;
  }

  async authenticate(account: string, accessToken: string): Promise<void> {
    const tag = this.nextTag();
    const xoauth2 = btoa(`user=${account}\x01auth=Bearer ${accessToken}\x01\x01`);
    await this.write(`${tag} AUTHENTICATE XOAUTH2\r\n`);
    await this.readContinuation();
    await this.write(`${xoauth2}\r\n`);
    const response = await this.readTaggedResponse(tag);
    assertOkResponse(tag, response, 'IMAP认证失败');
  }

  async listSelectableFolders(): Promise<string[]> {
    const response = await this.command('LIST "" "*"');
    const folders = parseListFoldersResponse(response);
    return folders.length > 0 ? folders : ['INBOX'];
  }

  async command(command: string): Promise<string> {
    const tag = this.nextTag();
    await this.write(`${tag} ${command}\r\n`);
    const response = await this.readTaggedResponse(tag);
    assertOkResponse(tag, response, `IMAP命令失败: ${command.split(' ')[0]}`);
    return response;
  }

  async close(): Promise<void> {
    try {
      await this.command('LOGOUT');
    } catch {
      // The socket may already be closed by the server.
    }

    try {
      this.reader.releaseLock();
    } catch {
      // Ignore lock release errors during cleanup.
    }

    try {
      this.writer.releaseLock();
    } catch {
      // Ignore lock release errors during cleanup.
    }

    await this.socket.close();
  }

  private nextTag(): string {
    this.tagCounter += 1;
    return `A${String(this.tagCounter).padStart(4, '0')}`;
  }

  private async readGreeting(): Promise<void> {
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex !== -1) {
        const line = this.buffer.slice(0, newlineIndex + 1);
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (/^\* OK/i.test(line)) {
          return;
        }
        throw new Error(`IMAP服务端问候异常: ${line.trim()}`);
      }
      await this.readMore();
    }
  }

  private async readContinuation(): Promise<void> {
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex !== -1) {
        const line = this.buffer.slice(0, newlineIndex + 1);
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (/^\+/.test(line)) {
          return;
        }
        throw new Error(`IMAP认证未收到继续响应: ${line.trim()}`);
      }
      await this.readMore();
    }
  }

  private async readTaggedResponse(tag: string): Promise<string> {
    const pattern = new RegExp(`(?:^|\\r?\\n)${escapeRegExp(tag)} (?:OK|NO|BAD)[^\\r\\n]*(?:\\r?\\n|$)`, 'i');

    while (true) {
      const match = this.buffer.match(pattern);
      if (match?.index !== undefined) {
        const end = match.index + match[0].length;
        const response = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end);
        return response;
      }
      await this.readMore();
    }
  }

  private async readMore(): Promise<void> {
    const result = await withTimeout(this.reader.read(), IMAP_COMMAND_TIMEOUT_MS);
    if (result.done) {
      throw new Error('IMAP连接已关闭');
    }
    this.buffer += this.decoder.decode(result.value, { stream: true });
  }

  private async write(value: string): Promise<void> {
    await withTimeout(this.writer.write(this.encoder.encode(value)), IMAP_COMMAND_TIMEOUT_MS);
  }
}

function parseListFoldersResponse(response: string): string[] {
  const folders: string[] = [];
  for (const line of response.split(/\r?\n/)) {
    if (!line.startsWith('* LIST') || /\\Noselect/i.test(line)) {
      continue;
    }

    const quotedName = line.match(/"((?:\\"|\\\\|[^"])*)"\s*$/)?.[1];
    if (quotedName) {
      folders.push(quotedName.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      continue;
    }

    const atomName = line.match(/\s([^\s"]+)\s*$/)?.[1];
    if (atomName) {
      folders.push(atomName);
    }
  }

  return Array.from(new Set(folders));
}

function parseUidSearchResponse(response: string): string[] {
  const line = response.split(/\r?\n/).find((item) => item.startsWith('* SEARCH'));
  if (!line) {
    return [];
  }

  return line
    .replace(/^\* SEARCH\s*/i, '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item));
}

function quoteImapString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function assertOkResponse(tag: string, response: string, fallbackMessage: string): void {
  const statusLine = response
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.toUpperCase().startsWith(`${tag} `));

  if (statusLine && new RegExp(`^${escapeRegExp(tag)} OK\\b`, 'i').test(statusLine)) {
    return;
  }

  throw new Error(statusLine?.trim() || fallbackMessage);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function safeDateTime(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('IMAP命令超时')), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
