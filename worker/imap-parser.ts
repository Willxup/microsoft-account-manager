export interface ImapMailItem {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  preview: string;
  contentType: string;
  content: string;
}

const FETCH_BLOCK_PATTERN = /\* \d+ FETCH \(([\s\S]*?)(?=\r?\n\* \d+ FETCH \(|\r?\n[A-Za-z]\d+ (?:OK|NO|BAD)|$)/g;
const ENCODED_WORD_PATTERN = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g;
const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11
};

export function parseImapFetchResponse(
  response: string,
  folder: string,
  includeBody: boolean
): ImapMailItem[] {
  const messages: ImapMailItem[] = [];

  for (const match of response.matchAll(FETCH_BLOCK_PATTERN)) {
    const block = match[1] ?? '';
    const uid = block.match(/\bUID\s+(\d+)/i)?.[1] ?? '';
    if (!uid) {
      continue;
    }

    const headers = parseHeaders(extractHeaderLiteral(block));
    const body = includeBody ? extractBodyLiteral(block).trim() : '';
    const subject = decodeMimeHeader(headers.get('subject') ?? '');
    const from = normalizeFromAddress(headers.get('from') ?? '');
    const receivedAt = normalizeMailDate(headers.get('date') ?? '', extractInternalDate(block));
    const contentType = body && looksLikeHtml(body) ? 'html' : 'text';
    const preview = buildPreview(body);

    messages.push({
      id: `imap:${folder}:${uid}`,
      subject,
      from,
      receivedAt,
      preview,
      contentType,
      content: body
    });
  }

  return messages;
}

export function decodeMimeHeader(value: string): string {
  const compacted = value.replace(/(\?=)\s+(=\?)/g, '$1$2');
  return compacted
    .replace(ENCODED_WORD_PATTERN, (_match, charset: string, encoding: string, payload: string) => {
      try {
        const bytes = encoding.toLowerCase() === 'b' ? decodeBase64Bytes(payload) : decodeQuotedPrintableBytes(payload);
        return decodeBytes(bytes, charset);
      } catch {
        return payload;
      }
    })
    .trim();
}

function extractHeaderLiteral(block: string): string {
  const match = block.match(
    /BODY(?:\.PEEK)?\[HEADER[^\]]*\](?:<\d+>)?\s*\{\d+\}\r?\n([\s\S]*?)(?=\r?\n\s*BODY(?:\.PEEK)?\[TEXT\]|\r?\n\))/i
  );
  return (match?.[1] ?? '').trim();
}

function extractBodyLiteral(block: string): string {
  const match = block.match(/BODY(?:\.PEEK)?\[TEXT\](?:<\d+>)?\s*\{\d+\}\r?\n([\s\S]*?)(?=\r?\n\))/i);
  return match?.[1] ?? '';
}

function extractInternalDate(block: string): string {
  return block.match(/\bINTERNALDATE\s+"([^"]+)"/i)?.[1] ?? '';
}

function parseHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();
  let currentKey = '';

  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    if (!line) {
      continue;
    }

    if (/^\s/.test(line) && currentKey) {
      headers.set(currentKey, `${headers.get(currentKey) ?? ''} ${line.trim()}`.trim());
      continue;
    }

    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }

    currentKey = line.slice(0, separator).trim().toLowerCase();
    headers.set(currentKey, line.slice(separator + 1).trim());
  }

  return headers;
}

function normalizeFromAddress(value: string): string {
  const decoded = decodeMimeHeader(value);
  const bracketed = decoded.match(/<([^>]+)>/)?.[1]?.trim();
  if (bracketed) {
    return bracketed;
  }
  return decoded.replace(/^"|"$/g, '').trim();
}

function normalizeMailDate(dateHeader: string, internalDate: string): string {
  const directTime = Date.parse(dateHeader);
  if (Number.isFinite(directTime)) {
    return new Date(directTime).toISOString();
  }

  const internalTime = parseInternalDate(internalDate);
  if (Number.isFinite(internalTime)) {
    return new Date(internalTime).toISOString();
  }

  return dateHeader || internalDate;
}

function parseInternalDate(value: string): number {
  const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-])(\d{2})(\d{2})$/);
  if (!match) {
    return Number.NaN;
  }

  const [, day, monthText, year, hour, minute, second, sign, offsetHour, offsetMinute] = match;
  const month = MONTHS[monthText.toLowerCase()];
  if (month === undefined) {
    return Number.NaN;
  }

  const utc = Date.UTC(
    Number(year),
    month,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  const offsetMinutes = Number(offsetHour) * 60 + Number(offsetMinute);
  return utc - (sign === '+' ? offsetMinutes : -offsetMinutes) * 60 * 1000;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function buildPreview(value: string): string {
  return decodeHtmlEntities(stripHtml(value)).replace(/\s+/g, ' ').trim().slice(0, 240);
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function decodeBase64Bytes(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeQuotedPrintableBytes(value: string): Uint8Array {
  const bytes: number[] = [];
  const input = value.replace(/_/g, ' ');
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === '=' && /^[0-9a-fA-F]{2}$/.test(input.slice(index + 1, index + 3))) {
      bytes.push(Number.parseInt(input.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(input.charCodeAt(index));
    }
  }
  return new Uint8Array(bytes);
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}
