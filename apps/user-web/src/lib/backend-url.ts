/**
 * Resolve the backend API origin at runtime.
 *
 * Order of precedence:
 *   1. NEXT_PUBLIC_BACKEND_URL (if provided, explicit wins)
 *   2. NEXT_PUBLIC_API_URL with trailing /api or /api/v1 stripped
 *   3. If we're running in the browser on a *.overline.in host, fall back to
 *      https://api.overline.in — so Google sign-in works even if Vercel env
 *      vars were not set at build time.
 *   4. Empty string (caller will use relative URLs — fine for local dev
 *      with Next rewrites, and a last-resort).
 */
export function getBackendUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    const stripped = apiUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '').replace(/\/api$/, '');
    if (stripped) return stripped;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'overline.in' || host.endsWith('.overline.in')) {
      return 'https://api.overline.in';
    }
  }

  return '';
}

/**
 * Build an absolute URL to a backend auth endpoint, resilient to missing env.
 * Example: buildAuthUrl('/auth/google', { from: 'user' })
 */
export function buildAuthUrl(path: string, query: Record<string, string> = {}): string {
  const backend = getBackendUrl();
  const qs = new URLSearchParams(query).toString();
  const base = backend ? `${backend}/api/v1${path}` : `/api/v1${path}`;
  return qs ? `${base}?${qs}` : base;
}
