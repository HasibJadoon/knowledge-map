// ─── Studio request context ───────────────────────────────────────────────────
// The backend gateway authenticates every caller and injects the user id as the
// X-KM-User-Id header. Internal studio routes read it from there.

export { actorRef } from '../../shared/src/auth';
