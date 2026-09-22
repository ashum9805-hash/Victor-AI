/**
 * Google Workspace Service for Victor Autonomous Executive Assistant
 * Handles Docs, Drive, and Calendar operations via official Google REST APIs
 * using the in-memory OAuth Bearer token from googleAuthService.
 */

import { getCachedAccessToken } from './googleAuthService';

export interface GoogleDocResult {
  documentId: string;
  title: string;
  webViewLink?: string;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  startDateTime: string; // ISO string e.g. 2026-09-22T14:00:00Z
  endDateTime: string;   // ISO string e.g. 2026-09-22T15:00:00Z
  htmlLink?: string;
  attendees?: string[];
}

/**
 * Creates a new Google Doc with the specified title and initial body text.
 */
export async function createGoogleDoc(title: string, bodyText?: string): Promise<GoogleDocResult> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace not linked or session expired. Please sign in with Google in Account settings.');
  }

  // 1. Create empty document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const errorJson = await createRes.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to create Google Doc: ${createRes.statusText}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. If body text is provided, insert it via batchUpdate
  if (bodyText && bodyText.trim().length > 0) {
    try {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: bodyText,
              },
            },
          ],
        }),
      });
    } catch (insertErr) {
      console.warn('Warning: Failed inserting body text into doc:', insertErr);
    }
  }

  const webViewLink = `https://docs.google.com/document/d/${documentId}/edit`;
  return {
    documentId,
    title,
    webViewLink,
  };
}

/**
 * Lists Google Drive files created by or shared with this app.
 */
export async function listDriveFiles(pageSize = 10): Promise<Array<{ id: string; name: string; mimeType: string; webViewLink?: string }>> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace not linked. Please sign in with Google.');
  }

  const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,webViewLink)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to fetch Drive files: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Creates an event in Google Calendar.
 */
export async function createCalendarEvent(event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace not linked. Please sign in with Google.');
  }

  const payload: any = {
    summary: event.summary,
    description: event.description || '',
    start: {
      dateTime: event.startDateTime,
    },
    end: {
      dateTime: event.endDateTime,
    },
  };

  if (event.attendees && event.attendees.length > 0) {
    payload.attendees = event.attendees.map((email) => ({ email }));
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to create Calendar event: ${res.statusText}`);
  }

  const result = await res.json();
  return {
    id: result.id,
    summary: result.summary,
    description: result.description,
    startDateTime: result.start?.dateTime || event.startDateTime,
    endDateTime: result.end?.dateTime || event.endDateTime,
    htmlLink: result.htmlLink,
  };
}

/**
 * Lists upcoming calendar events for the user.
 */
export async function listUpcomingEvents(maxResults = 5): Promise<GoogleCalendarEvent[]> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace not linked. Please sign in with Google.');
  }

  const nowIso = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    nowIso
  )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Failed to fetch Calendar events: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '(Untitled Event)',
    description: item.description,
    startDateTime: item.start?.dateTime || item.start?.date || '',
    endDateTime: item.end?.dateTime || item.end?.date || '',
    htmlLink: item.htmlLink,
  }));
}
