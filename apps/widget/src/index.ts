import type { GetWidgetConfigResponse, WidgetConfig } from '@askwell/shared';

type LoaderWindow = Window & typeof globalThis;
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type WidgetMessage =
  | { type: 'close' }
  | { type: 'resize'; width?: number; height: number }
  | { type: 'unread'; count: number };

const keyPattern = /^pk_[A-Za-z0-9_-]+$/;

function isConfigResponse(value: unknown): value is GetWidgetConfigResponse {
  if (!isRecord(value) || !isRecord(value.config)) return false;
  const config = value.config;

  return (
    typeof config.buttonColor === 'string' && /^#[\da-f]{6}$/i.test(config.buttonColor) &&
    ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(config.position as string) &&
    typeof config.label === 'string' && config.label.length > 0 && config.label.length <= 80 &&
    ['fade', 'slide', 'scale'].includes(config.animation as string) &&
    typeof config.headerText === 'string' && config.headerText.length > 0 && config.headerText.length <= 120 &&
    typeof config.showBadge === 'boolean'
  );
}

function isWidgetMessage(value: unknown): value is WidgetMessage {
  if (!isRecord(value)) return false;
  if (value.type === 'close') return true;
  if (value.type === 'unread') return typeof value.count === 'number' && Number.isFinite(value.count);
  return value.type === 'resize' && typeof value.height === 'number' && Number.isFinite(value.height) &&
    (value.width === undefined || (typeof value.width === 'number' && Number.isFinite(value.width)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function waitForBody(document: Document) {
  if (document.body) return Promise.resolve(document.body);
  return new Promise<HTMLElement>((resolve) => {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) resolve(document.body);
    }, { once: true });
  });
}

const styles = `
:host{all:initial;position:fixed;z-index:2147483647;font:14px/1.4 system-ui,sans-serif;color:#151515}
:host([data-position=bottom-right]){right:20px;bottom:20px}
:host([data-position=bottom-left]){left:20px;bottom:20px}
:host([data-position=top-right]){right:20px;top:20px}
:host([data-position=top-left]){left:20px;top:20px}
button{font:inherit;cursor:pointer}
.launcher{position:absolute;right:0;bottom:0;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 40px);padding:14px 18px;border:0;border-radius:999px;background:var(--button-color);color:#fff;box-shadow:0 5px 22px #0003;font-weight:600;white-space:nowrap}
:host([data-position$=left]) .launcher{right:auto;left:0}
:host([data-position^=top]) .launcher{top:0;bottom:auto}
.badge{display:grid;min-width:19px;height:19px;padding:0 5px;place-items:center;border-radius:999px;background:#fff;color:#111;font-size:11px}
.panel{position:absolute;width:min(360px,calc(100vw - 40px));height:min(560px,calc(100vh - 104px));overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 12px 44px #0003;opacity:0;transform:translateY(0) scale(1);transition:opacity .2s,transform .2s}
.panel[data-position^=bottom]{bottom:68px}
.panel[data-position^=top]{top:68px}
.panel[data-position$=right]{right:0}
.panel[data-position$=left]{left:0}
.panel[data-animation=slide]{transform:translateY(12px)}
.panel[data-animation=scale]{transform:scale(.96)}
.panel[data-open=true]{opacity:1;transform:translateY(0) scale(1)}
.panel[hidden]{display:none}
iframe{display:block;width:100%;height:100%;border:0;background:#fff}
`;

export async function loadWidget(
  script: HTMLScriptElement,
  window: LoaderWindow,
  fetcher: Fetcher,
): Promise<HTMLElement | null> {
  const key = script.dataset.key;
  const src = script.getAttribute('src');
  if (!key || !keyPattern.test(key) || !src || script.dataset.askwellLoaded) return null;

  let scriptUrl: URL;
  try {
    scriptUrl = new URL(src, window.location.href);
  } catch {
    return null;
  }
  if (scriptUrl.protocol !== 'https:' && scriptUrl.protocol !== 'http:') return null;

  let config: WidgetConfig;
  try {
    const endpoint = new URL('/api/widget/config', scriptUrl.origin);
    endpoint.searchParams.set('key', key);
    const response = await fetcher(endpoint, { method: 'GET', mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!isConfigResponse(body)) return null;
    config = body.config;
  } catch {
    return null;
  }

  const document = window.document;
  const body = await waitForBody(document);
  const host = document.createElement('div');
  host.dataset.position = config.position;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;

  const launcher = document.createElement('button');
  launcher.className = 'launcher';
  launcher.type = 'button';
  launcher.textContent = config.label;
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-label', config.label);
  launcher.style.setProperty('--button-color', config.buttonColor);

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = '0';
  badge.hidden = true;
  badge.setAttribute('aria-label', 'Unread messages');
  if (config.showBadge) launcher.append(badge);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.dataset.position = config.position;
  panel.dataset.animation = config.animation;
  panel.hidden = true;
  panel.setAttribute('aria-label', config.headerText);
  shadow.append(style, panel, launcher);
  body.append(host);

  const iframeUrl = new URL('/embed', scriptUrl.origin);
  iframeUrl.searchParams.set('key', key);
  let iframe: HTMLIFrameElement | null = null;

  const close = () => {
    panel.hidden = true;
    panel.dataset.open = 'false';
    launcher.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    panel.hidden = false;
    panel.dataset.open = 'false';
    launcher.setAttribute('aria-expanded', 'true');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.src = iframeUrl.href;
      iframe.title = config.headerText;
      iframe.loading = 'lazy';
      iframe.addEventListener('load', () => {
        iframe?.contentWindow?.postMessage({ type: 'widget:opened' }, scriptUrl.origin);
      });
      panel.append(iframe);
    }
    window.requestAnimationFrame(() => { panel.dataset.open = 'true'; });
  };

  launcher.addEventListener('click', () => panel.hidden ? open() : close());
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (!iframe?.contentWindow || event.origin !== scriptUrl.origin || event.source !== iframe.contentWindow || !isWidgetMessage(event.data)) return;
    if (event.data.type === 'close') close();
    if (event.data.type === 'unread' && config.showBadge) {
      const count = clamp(event.data.count, 0, 999);
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = count === 0;
    }
    if (event.data.type === 'resize') {
      iframe.style.height = `${clamp(event.data.height, 360, 800)}px`;
      if (event.data.width !== undefined) {
        panel.style.width = `min(${clamp(event.data.width, 280, 480)}px,calc(100vw - 40px))`;
      }
    }
  });

  script.dataset.askwellLoaded = 'true';
  return host;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined' && document.currentScript instanceof HTMLScriptElement) {
  void loadWidget(document.currentScript, window, window.fetch.bind(window));
}
