import type { ToastTone } from '../types';

export interface ToastView {
  show(message: string, tone?: ToastTone): void;
}

export function createToastView(element: HTMLDivElement): ToastView {
  let hideTimer: number | undefined;
  let exitTimer: number | undefined;

  return {
    show(message, tone = '') {
      window.clearTimeout(hideTimer);
      window.clearTimeout(exitTimer);
      const toneClass = tone ? `toast--${tone}` : '';
      element.className = `toast ${toneClass} toast--enter`;
      element.setAttribute('role', tone === 'error' ? 'alert' : 'status');
      element.textContent = message;
      element.hidden = false;
      const duration = tone === 'error' || tone === 'offline' ? 6_500
        : tone === 'loading' ? 6_000 : 3_800;
      hideTimer = window.setTimeout(() => {
        element.className = `toast ${toneClass} toast--exit`;
        exitTimer = window.setTimeout(() => {
          element.hidden = true;
        }, 400);
      }, duration);
    }
  };
}
