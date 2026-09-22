/**
 * Gmail Service for Victor Autonomous Executive Assistant
 * Handles fetching, drafting, searching, and sending emails via the official Gmail REST API.
 * Uses client-side OAuth Bearer token stored in memory via googleAuthService.
 */

import { getCachedAccessToken } from './googleAuthService';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

/**
 * Encodes a string into RFC 2822 standard format and returns base64url encoded string.
 */
function createBase64Email(payload: SendEmailPayload): string {
  const emailLines: string[] = [
    `To: ${payload.to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
  ];

  if (payload.cc) {
    emailLines.push(`Cc: ${payload.cc}`);
  }
  if (payload.bcc) {
    emailLines.push(`Bcc: ${payload.bcc}`);
  }

  emailLines.push('', payload.body);

  const emailRaw = emailLines.join('\r\n');

  // Convert string to base64url
  const utf8Bytes = new TextEncoder().encode(emailRaw);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Lists latest emails from the user's Gmail inbox.
 */
export async function listGmailMessages(maxResults = 10, query?: string): Promise<GmailMessageSummary[]> {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Account not linked or session expired. Please sign in with Google in the Account settings.');
  }

  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  if (query) {
    url += `&q=${encodeURIComponent(query)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Gmail API error: ${res.statusText}`);
  }

  const data = await res.json();
  const messagesList = data.messages || [];
  if (messagesList.length === 0) {
    return [];
  }

  // Fetch individual headers for the top messages
  const detailedMessages = await Promise.all(
    messagesList.slice(0, 5).map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!detailRes.ok) return { id: msg.id, threadId: msg.threadId };
        const detailData = await detailRes.json();
        const headers = detailData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: detailData.snippet,
          subject,
          from,
          to,
          date,
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId };
      }
    })
  );

  return detailedMessages;
}

/**
 * Creates a Gmail draft message so the user can review it before sending.
 */
export async function createGmailDraft(payload: SendEmailPayload): Promise<{ id: string; messageId: string }> {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Account not linked or session expired. Please sign in with Google in the Account settings.');
  }

  const raw = createBase64Email(payload);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to create Gmail draft: ${res.statusText}`);
  }

  const result = await res.json();
  return { id: result.id, messageId: result.message?.id };
}

/**
 * Sends an email on behalf of the user via Gmail API.
 * Requires explicit user confirmation per security guidelines.
 */
export async function sendGmailMessage(payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Account not linked or session expired. Please sign in with Google in the Account settings.');
  }

  const raw = createBase64Email(payload);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to send email: ${res.statusText}`);
  }

  const result = await res.json();
  return { id: result.id, threadId: result.threadId };
}
