// ─── Planner request context ──────────────────────────────────────────────────
// The backend gateway authenticates every caller and injects the user id as
// the X-KM-User-Id header. Internal planner routes read it from there.

/** The authenticated user's CORE ref, or null when the header is absent. */
export function actorRef(req: Request): string | null {
  const id = req.headers.get('X-KM-User-Id');
  return id && id.trim() ? id.trim() : null;
}
