import { initClickParticles } from './clickParticles';

const handUrl = '/assets/cursors/hand.cur';

interface CursorFxOptions {
  enabled?: boolean;
  color?: string;
}

interface CursorFxController {
  destroy: () => void;
  setEnabled: (enabled: boolean) => void;
}

const STYLE_ID = 'custom-cursor-style';
const ROOT_CLASS = 'custom-cursor-enabled';
const PRESSING_CLASS = 'is-pressing';
const TEXT_INPUT_SELECTOR = [
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="number"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input:not([type])',
  'textarea',
  '[contenteditable="true"]',
].join(', ');

let activeController: CursorFxController | null = null;

export function initCursorFx(options: CursorFxOptions = {}): CursorFxController {
  activeController?.destroy();

  const particleController = initClickParticles(options);
  let enabled = options.enabled ?? true;
  let mounted = false;
  let style: HTMLStyleElement | null = null;

  const shouldMount = () => enabled;

  const clearPressing = () => {
    document.documentElement.classList.remove(PRESSING_CLASS);
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest(TEXT_INPUT_SELECTOR)) return;
    document.documentElement.classList.add(PRESSING_CLASS);
  };

  const mount = () => {
    if (mounted || !shouldMount()) return;
    style = ensureStyle();
    const rootStyle = document.documentElement.style;

    rootStyle.setProperty('--cursor-hand', `url("${handUrl}") 10 3, pointer`);
    document.documentElement.classList.add(ROOT_CLASS);

    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', clearPressing, { passive: true });
    window.addEventListener('blur', clearPressing);
    document.addEventListener('mouseleave', clearPressing);
    mounted = true;
  };

  const unmount = () => {
    if (!mounted) return;
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mouseup', clearPressing);
    window.removeEventListener('blur', clearPressing);
    document.removeEventListener('mouseleave', clearPressing);
    document.documentElement.classList.remove(ROOT_CLASS);
    clearPressing();
    document.documentElement.style.removeProperty('--cursor-hand');
    style?.remove();
    style = null;
    mounted = false;
  };

  const syncMountState = () => {
    if (shouldMount()) {
      mount();
    } else {
      unmount();
    }
  };

  syncMountState();

  const controller: CursorFxController = {
    destroy: () => {
      unmount();
      particleController.destroy();
      if (activeController === controller) {
        activeController = null;
      }
    },
    setEnabled: (nextEnabled: boolean) => {
      enabled = nextEnabled;
      particleController.setEnabled(nextEnabled);
      syncMountState();
    },
  };

  activeController = controller;
  return controller;
}

function ensureStyle(): HTMLStyleElement {
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle instanceof HTMLStyleElement) {
    return existingStyle;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.${ROOT_CLASS},
    html.${ROOT_CLASS} body,
    html.${ROOT_CLASS} body * {
      cursor: var(--cursor-hand);
    }

    html.${ROOT_CLASS}.${PRESSING_CLASS},
    html.${ROOT_CLASS}.${PRESSING_CLASS} body,
    html.${ROOT_CLASS}.${PRESSING_CLASS} body * {
      cursor: var(--cursor-hand);
    }

    html.${ROOT_CLASS} :is(
      input[type="text"],
      input[type="search"],
      input[type="email"],
      input[type="password"],
      input[type="number"],
      input[type="tel"],
      input[type="url"],
      input:not([type]),
      textarea,
      [contenteditable="true"]
    ) {
      cursor: text;
    }
  `;
  document.head.appendChild(style);
  return style;
}
