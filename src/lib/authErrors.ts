import { RovieApiError } from '../sdk/httpClient';

/**
 * Turns a failed auth request into something worth reading.
 *
 * Better Auth returns a stable `code` plus a terse English `message`. We map
 * the codes we can act on to wording that says what to do next, and fall back
 * to the server's own message rather than a generic "something went wrong" -
 * a wrong-password message the user can't distinguish from an outage is worse
 * than a slightly technical one.
 *
 * Deliberately does NOT distinguish "no such account" from "wrong password":
 * portal-api answers both with INVALID_EMAIL_OR_PASSWORD so the form can't be
 * used to test which addresses have accounts, and this preserves that.
 */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'That email and password don’t match an account.',
  USER_ALREADY_EXISTS: 'An account already exists for that email. Sign in instead.',
  PASSWORD_TOO_SHORT: 'Use at least 12 characters.',
  PASSWORD_TOO_LONG: 'That password is too long.',
  INVALID_EMAIL: 'Enter a valid email address.',
  INVALID_ORIGIN: 'This page isn’t allowed to sign in. Check PORTAL_WEB_ORIGIN on portal-api.',
  EMAIL_NOT_VERIFIED: 'Verify your email address first — check your inbox.',
  // Reset links expire after an hour and work once. Both failures land here,
  // and both have the same remedy, so the message gives it rather than
  // distinguishing two cases the user can't act on differently.
  INVALID_TOKEN: 'That reset link has expired or was already used. Request a new one.',
  // Only reachable from the signed-in change-password form, where it means
  // the current password was wrong - not the new one.
  INVALID_PASSWORD: 'That current password isn’t right.',
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    'This account signs in with Google or GitHub, so it has no password to change.',
  RESET_PASSWORD_DISABLED:
    'Password resets aren’t configured on this deployment. Sign in with a link instead.',
};

interface AuthErrorBody {
  code?: string;
  message?: string;
}

export function messageForAuthError(err: unknown): string {
  if (err instanceof RovieApiError) {
    const body = err.body as AuthErrorBody | null;

    if (body?.code && MESSAGES[body.code]) return MESSAGES[body.code];
    if (body?.message) return body.message;

    // Rate limiting has no body worth showing but a very specific remedy.
    if (err.status === 429) return 'Too many attempts. Wait a minute and try again.';
    if (err.status === undefined) {
      return 'Can’t reach Rovie right now. Check your connection and try again.';
    }
  }

  return 'Something went wrong. Try again.';
}
