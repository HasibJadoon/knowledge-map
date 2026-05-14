// Thin, safe wrapper around @capacitor/haptics. Capacitor's web shim is
// a no-op on browsers without a vibration API, so this is safe to call
// anywhere; we additionally swallow errors so a missing plugin never
// breaks a user-initiated tap.
//
// Honours `prefers-reduced-motion` — vestibular accessibility guidance
// treats haptics as a form of motion feedback the user has opted out of.

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function reduceMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

/** A whisper-soft tick — page turns, tab switches, light selections. */
export async function hapticTick(): Promise<void> {
  if (reduceMotion()) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* no-op */ }
}

/** Medium impact — modal open, primary action confirm. */
export async function hapticTap(): Promise<void> {
  if (reduceMotion()) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch { /* no-op */ }
}

/** Success notification — copy confirmed, save complete. */
export async function hapticSuccess(): Promise<void> {
  if (reduceMotion()) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* no-op */ }
}

/** Selection drag (continuous, very light) — slider/scrubber feedback. */
export async function hapticSelection(): Promise<void> {
  if (reduceMotion()) return;
  try { await Haptics.selectionChanged(); } catch { /* no-op */ }
}
