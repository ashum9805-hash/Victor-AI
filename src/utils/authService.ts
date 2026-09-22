import { UserProfile } from '../types';

const STORAGE_KEY_USER = 'victor_user_profile_v1';

export function getStoredUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === 'string' && parsed.email.includes('@')) {
      return parsed as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredUserProfile(profile: UserProfile | null): void {
  try {
    if (!profile) {
      localStorage.removeItem(STORAGE_KEY_USER);
    } else {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
    }
  } catch (e) {
    console.warn('Could not save user profile:', e);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const profile = getStoredUserProfile();
  if (profile?.email) {
    return { 'x-user-email': profile.email.trim().toLowerCase() };
  }
  return {};
}
