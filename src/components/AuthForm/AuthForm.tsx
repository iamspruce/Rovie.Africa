import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { rovie } from '../../sdk';
import type { AuthMethods, SocialProvider } from '../../sdk';
import styles from './AuthForm.module.scss';

/**
 * The form furniture the sign-in and sign-up pages share: labelled fields, a
 * form-level error, the OAuth divider, and the "or use a link instead"
 * alternative. Kept together because the two pages must not drift apart -
 * they're the same form with different verbs.
 */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Static guidance, always visible. Not an error. */
  hint?: string;
  error?: string | null;
}

export function Field({ label, hint, error, ...inputProps }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        // Both are named so a screen reader gets the rule and the failure,
        // not just whichever happens to be rendered.
        aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
      />
      {hint && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.fieldError} id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Form-level failures. `role="alert"` so it's announced when it appears -
 * these arrive after a submit, when focus is still on the button.
 */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p className={styles.formError} role="alert">
      {children}
    </p>
  );
}

export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.formNotice} role="status">
      {children}
    </p>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className={styles.divider}>
      <span>{label}</span>
    </div>
  );
}

/**
 * Brand marks, drawn inline rather than fetched: each is a handful of paths,
 * and both providers' guidelines require their own colours, which an <img>
 * from a CDN would fetch on the one page that must load with nothing between
 * the visitor and the form.
 */
const MARKS: Record<SocialProvider, ReactNode> = {
  google: (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  ),
  github: (
    // The Octicon mark in currentColor, so it stays legible when the theme
    // flips - a black GitHub logo on the dark surface would disappear.
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  ),
};

const LABELS: Record<SocialProvider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
};

/**
 * Order matters and is fixed: the button in the same place on both pages, and
 * on the page a returning visitor last used, is the one they can hit without
 * reading. Google first because it's the account most people already carry.
 */
const PROVIDER_ORDER: SocialProvider[] = ['google', 'github'];

export function SocialButton({
  provider,
  onClick,
  disabled,
  loading,
}: {
  provider: SocialProvider;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.social}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {MARKS[provider]}
      {loading ? `Redirecting…` : LABELS[provider]}
    </button>
  );
}

/**
 * The OAuth block above the form: one button per provider this deployment has
 * configured, then the divider - and nothing at all when none are, so the
 * form never sits under an orphaned "or".
 *
 * Buttons are drawn only for providers portal-api reports credentials for, so
 * there's never one that fails on click. `methods` is null until /auth-config
 * answers; email and password work in the meantime.
 */
export function SocialAuth({
  methods,
  callbackURL,
  disabled,
}: {
  methods: AuthMethods | null;
  /** Absolute URL portal-api sends the browser back to once the provider returns. */
  callbackURL: string;
  disabled?: boolean;
}) {
  const available = PROVIDER_ORDER.filter((provider) => methods?.[provider]);
  const [pending, setPending] = useState<SocialProvider | null>(null);

  if (available.length === 0) return null;

  async function handleSocialClick(provider: SocialProvider) {
    if (pending) return; // already in-flight
    setPending(provider);
    try {
      // Better Auth v1 social sign-in is a POST that returns the provider
      // authorization URL. Navigate only once we have that URL.
      const url = await rovie.portal.initiateSocialSignIn(provider, callbackURL);
      window.location.href = url;
    } catch {
      // Navigation failed — reset so the user can try again.
      setPending(null);
    }
  }

  return (
    <>
      <div className={styles.socialGroup}>
        {available.map((provider) => (
          <SocialButton
            key={provider}
            provider={provider}
            disabled={disabled || pending !== null}
            loading={pending === provider}
            onClick={() => { void handleSocialClick(provider); }}
          />
        ))}
      </div>
      <Divider label="or" />
    </>
  );
}
