interface ClickParticlesOptions {
  enabled?: boolean;
  color?: string;
}

interface ClickParticlesController {
  destroy: () => void;
  setEnabled: (enabled: boolean) => void;
}

const NO_PARTICLE_SELECTOR = 'input, textarea, [contenteditable="true"], [data-no-fx]';
const STYLE_ID = 'click-particles-style';
const PARTICLE_CLASS = 'click-particle';
const CONFIG = {
  particleCount: 8,
  minSize: 4,
  maxSize: 7,
  minDistance: 30,
  maxDistance: 55,
  minDuration: 400,
  maxDuration: 550,
  gravity: 12,
  angleJitter: 15,
  maxAliveParticles: 80,
  colorsLight: ['#c9a96a', '#e6c98f', '#a8895a', '#fff3d6'],
  colorsDark: ['#fff3d6', '#ffe7a8', '#c9a96a'],
};

let activeController: ClickParticlesController | null = null;
let aliveParticles = 0;

export function initClickParticles(options: ClickParticlesOptions = {}): ClickParticlesController {
  activeController?.destroy();

  const config = {
    enabled: options.enabled ?? true,
    colorsLight: options.color ? [options.color, ...CONFIG.colorsLight.slice(1)] : CONFIG.colorsLight,
  };

  const coarsePointerQuery = window.matchMedia('(hover: none), (pointer: coarse)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = config.enabled;
  let mounted = false;
  let style: HTMLStyleElement | null = null;

  const shouldMount = () => enabled && !coarsePointerQuery.matches;

  const handleClick = (event: MouseEvent) => {
    if (!mounted || reducedMotionQuery.matches) return;
    if (event.target instanceof Element && event.target.closest(NO_PARTICLE_SELECTOR)) return;
    if (aliveParticles + CONFIG.particleCount > CONFIG.maxAliveParticles) return;

    createParticleBurst(event.clientX, event.clientY, config.colorsLight);
  };

  const mount = () => {
    if (mounted || !shouldMount()) return;
    style = ensureStyle();
    window.addEventListener('click', handleClick, true);
    mounted = true;
  };

  const unmount = () => {
    if (!mounted) return;
    window.removeEventListener('click', handleClick, true);
    document.querySelectorAll(`.${PARTICLE_CLASS}`).forEach((particle) => particle.remove());
    aliveParticles = 0;
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

  const handleCapabilityChange = () => syncMountState();
  coarsePointerQuery.addEventListener('change', handleCapabilityChange);
  syncMountState();

  const controller: ClickParticlesController = {
    destroy: () => {
      unmount();
      coarsePointerQuery.removeEventListener('change', handleCapabilityChange);
      if (activeController === controller) {
        activeController = null;
      }
    },
    setEnabled: (nextEnabled: boolean) => {
      enabled = nextEnabled;
      syncMountState();
    },
  };

  activeController = controller;
  return controller;
}

function createParticleBurst(x: number, y: number, colorsLight: string[]) {
  const colors = getParticleColors(colorsLight);
  const baseAngle = 360 / CONFIG.particleCount;

  for (let index = 0; index < CONFIG.particleCount; index += 1) {
    const size = randomBetween(CONFIG.minSize, CONFIG.maxSize);
    const angle = toRadians(index * baseAngle + randomBetween(-CONFIG.angleJitter, CONFIG.angleJitter));
    const distance = randomBetween(CONFIG.minDistance, CONFIG.maxDistance);
    const duration = randomBetween(CONFIG.minDuration, CONFIG.maxDuration);
    const gravity = CONFIG.gravity + randomBetween(-2, 4);
    const particle = document.createElement('div');
    const done = () => {
      particle.remove();
      aliveParticles = Math.max(0, aliveParticles - 1);
    };

    particle.className = PARTICLE_CLASS;
    particle.setAttribute('aria-hidden', 'true');
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${x - size / 2}px`;
    particle.style.top = `${y - size / 2}px`;
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];

    document.body.appendChild(particle);
    aliveParticles += 1;

    const animation = particle.animate(
      [
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        {
          opacity: 0,
          transform: `translate3d(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + gravity}px, 0) scale(0.4)`,
        },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        fill: 'forwards',
      },
    );

    animation.onfinish = done;
    animation.oncancel = done;
  }
}

function getParticleColors(colorsLight: string[]) {
  const darkMode = document.documentElement.classList.contains('dark')
    || document.body.classList.contains('dark')
    || window.matchMedia('(prefers-color-scheme: dark)').matches;

  return darkMode ? CONFIG.colorsDark : colorsLight;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function ensureStyle(): HTMLStyleElement {
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle instanceof HTMLStyleElement) {
    return existingStyle;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${PARTICLE_CLASS} {
      position: fixed;
      pointer-events: none;
      z-index: 9998;
      border-radius: 50%;
      will-change: transform, opacity;
      opacity: 1;
    }

    @media (hover: none), (pointer: coarse) {
      .${PARTICLE_CLASS} {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .${PARTICLE_CLASS} {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
  return style;
}
