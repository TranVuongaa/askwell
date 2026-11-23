// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWidget } from './index';

const validConfig = {
  buttonColor: '#123abc',
  position: 'bottom-left',
  label: 'Ask us',
  animation: 'slide',
  headerText: 'Questions?',
  showBadge: true,
};

function makeScript(key = 'pk_public_test') {
  const script = document.createElement('script');
  script.src = 'https://cdn.askwell.test/widget.js';
  script.dataset.key = key;
  return script;
}

function mockFetch(body: unknown) {
  const requests: string[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return { ok: true, json: async () => body } as Response;
  });
  return { fetcher, requests };
}

function message(type: unknown, origin = 'https://cdn.askwell.test', source: MessageEventSource | null = null) {
  return new MessageEvent('message', { data: type, origin, source });
}

describe('widget loader', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };
    vi.restoreAllMocks();
  });

  it('renders nothing and skips config fetch for a bad key', async () => {
    const { fetcher } = mockFetch({ config: validConfig });

    const host = await loadWidget(makeScript('sk_secret'), window, fetcher);

    expect(host).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(document.body.children).toHaveLength(0);
  });

  it('fetches config from the script origin and renders inside an isolated shadow root', async () => {
    const { fetcher, requests } = mockFetch({ config: validConfig });

    const host = await loadWidget(makeScript(), window, fetcher);

    expect(host).not.toBeNull();
    const requestUrl = new URL(requests[0] ?? '');
    expect(requestUrl.origin).toBe('https://cdn.askwell.test');
    expect(requestUrl.pathname).toBe('/api/widget/config');
    expect(requestUrl.searchParams.get('key')).toBe('pk_public_test');
    expect(host?.shadowRoot?.querySelector('style')?.textContent).toContain(':host');
    expect(host?.shadowRoot?.querySelector('button')?.childNodes[0].textContent).toBe('Ask us');
    expect(document.querySelector('style')).toBeNull();
    expect(host?.dataset.position).toBe('bottom-left');
  });

  it('does not render when config is rejected or malformed', async () => {
    const { fetcher } = mockFetch({ config: { ...validConfig, buttonColor: 'red;position:fixed' } });

    const host = await loadWidget(makeScript(), window, fetcher);

    expect(host).toBeNull();
    expect(document.body.children).toHaveLength(0);
  });

  it('opens the embed iframe and handles only same-origin messages from that iframe', async () => {
    const { fetcher } = mockFetch({ config: validConfig });
    const host = await loadWidget(makeScript(), window, fetcher);
    const shadow = host?.shadowRoot;
    const launcher = shadow?.querySelector('button');
    const panel = shadow?.querySelector<HTMLElement>('.panel');

    expect(shadow?.querySelector('iframe')).toBeNull();
    launcher?.click();

    const iframe = shadow?.querySelector<HTMLIFrameElement>('iframe');
    expect(iframe).not.toBeNull();
    expect(new URL(iframe?.src ?? '').origin).toBe('https://cdn.askwell.test');
    expect(new URL(iframe?.src ?? '').pathname).toBe('/embed');
    expect(new URL(iframe?.src ?? '').searchParams.get('key')).toBe('pk_public_test');
    expect(panel?.dataset.animation).toBe('slide');
    expect(launcher?.getAttribute('aria-expanded')).toBe('true');

    if (!iframe?.contentWindow) throw new Error('The iframe fixture must expose a content window');
    const frameWindow = iframe.contentWindow;
    const postMessage = vi.spyOn(frameWindow, 'postMessage').mockImplementation(() => {});
    iframe?.dispatchEvent(new Event('load'));
    expect(postMessage).toHaveBeenCalledWith({ type: 'widget:opened' }, 'https://cdn.askwell.test');

    window.dispatchEvent(message({ type: 'unread', count: 4 }, 'https://evil.test', frameWindow));
    const badge = shadow?.querySelector<HTMLElement>('.badge');
    expect(badge?.hidden).toBe(true);

    window.dispatchEvent(message({ type: 'unread', count: 4 }, 'https://cdn.askwell.test', frameWindow));
    expect(badge?.hidden).toBe(false);
    expect(badge?.textContent).toBe('4');

    window.dispatchEvent(message({ type: 'resize', height: 640 }, 'https://cdn.askwell.test', frameWindow));
    expect(iframe?.style.height).toBe('640px');
    window.dispatchEvent(message({ type: 'resize', height: 640, width: 420 }, 'https://cdn.askwell.test', frameWindow));
    expect(panel?.style.width).toContain('420px');

    window.dispatchEvent(message({ type: 'close' }, 'https://cdn.askwell.test', null));
    expect(panel?.hidden).toBe(false);
    window.dispatchEvent(message({ type: 'close' }, 'https://cdn.askwell.test', frameWindow));
    expect(panel?.hidden).toBe(true);
    expect(launcher?.getAttribute('aria-expanded')).toBe('false');
  });
});
