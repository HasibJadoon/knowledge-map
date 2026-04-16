/**
 * Mobile-safe replacement for window.prompt().
 * window.prompt() is silently blocked in iOS standalone PWA mode.
 * This renders a native-feeling dark overlay with an input field.
 */
export function mobilePrompt(
  placeholder: string,
  label?: string,
): Promise<string | null> {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#1c1c1e',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '18px',
      padding: '20px',
      width: 'min(90vw, 320px)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.85)',
      fontFamily: "'Poppins', sans-serif",
    });

    if (label) {
      const lbl = document.createElement('div');
      lbl.textContent = label;
      Object.assign(lbl.style, {
        fontSize: '0.78rem', fontWeight: '600',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: '10px',
      });
      box.appendChild(lbl);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    Object.assign(input.style, {
      width: '100%', padding: '12px 14px', fontSize: '16px',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: '10px', color: 'white', outline: 'none',
      boxSizing: 'border-box',
      fontFamily: "'Poppins', sans-serif",
    });

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', gap: '8px', marginTop: '14px' });

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    Object.assign(cancel.style, {
      flex: '1', padding: '11px', borderRadius: '10px', border: 'none',
      background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)',
      fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    });

    const confirm = document.createElement('button');
    confirm.textContent = 'Insert';
    Object.assign(confirm.style, {
      flex: '1', padding: '11px', borderRadius: '10px', border: 'none',
      background: '#c9a84c', color: '#080808',
      fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer',
      fontFamily: "'Poppins', sans-serif",
    });

    const close = (val: string | null) => { overlay.remove(); resolve(val); };

    cancel.addEventListener('pointerdown',  e => { e.preventDefault(); close(null); });
    confirm.addEventListener('pointerdown', e => { e.preventDefault(); close(input.value.trim() || null); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  close(input.value.trim() || null);
      if (e.key === 'Escape') close(null);
    });
    overlay.addEventListener('pointerdown', e => {
      if (e.target === overlay) close(null);
    });

    row.append(cancel, confirm);
    box.append(input, row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 60);
  });
}
