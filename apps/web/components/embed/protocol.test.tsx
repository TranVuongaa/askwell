import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MessageText } from './embed-panel';
import {
  friendlyChatErrorMessage,
  getOrCreateVisitorId,
  getTrustedParentOrigin,
  isPublicKey,
} from './protocol';

describe('embed panel behavior', () => {
  it('reuses a visitor ID from iframe localStorage for the same public key', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const createId = vi.fn(() => 'visitor_random_1');

    expect(getOrCreateVisitorId(storage, 'pk_project_a', createId)).toBe('visitor_random_1');
    expect(getOrCreateVisitorId(storage, 'pk_project_a', createId)).toBe('visitor_random_1');
    expect(createId).toHaveBeenCalledOnce();
    expect(getOrCreateVisitorId(storage, 'pk_project_b', () => 'visitor_random_2')).toBe('visitor_random_2');
  });

  it('rejects malformed public keys before loading config', () => {
    expect(isPublicKey('pk_public_123')).toBe(true);
    expect(isPublicKey('https://other.test/pk_public_123')).toBe(false);
    expect(isPublicKey('pk_')).toBe(false);
  });

  it('renders visitor content as text rather than HTML', () => {
    const markup = renderToStaticMarkup(<MessageText role="visitor" text={'<img src=x onerror="alert(1)">'} />);

    expect(markup).toContain('&lt;img');
    expect(markup).not.toContain('<img');
  });

  it('accepts only a parent-origin handshake from window.parent', () => {
    const parent = {} as MessageEventSource;
    const otherWindow = {} as MessageEventSource;
    const handshake = { source: parent, origin: 'https://customer.example', data: { type: 'widget:opened' } };

    expect(getTrustedParentOrigin(handshake, parent)).toBe('https://customer.example');
    expect(getTrustedParentOrigin({
      ...handshake,
      data: { type: 'widget:opened', origin: 'https://attacker.example' },
    }, parent)).toBe('https://customer.example');
    expect(getTrustedParentOrigin({ ...handshake, source: otherWindow }, parent)).toBeNull();
    expect(getTrustedParentOrigin({ ...handshake, origin: 'null' }, parent)).toBeNull();
    expect(getTrustedParentOrigin({ ...handshake, origin: 'file://customer.example' }, parent)).toBeNull();
    expect(getTrustedParentOrigin({ ...handshake, data: { type: 'untrusted', origin: 'https://customer.example' } }, parent)).toBeNull();
  });

  it('has friendly rate limit and quota placeholders', () => {
    expect(friendlyChatErrorMessage('RATE_LIMITED')).toContain('wait a moment');
    expect(friendlyChatErrorMessage('QUOTA_EXCEEDED')).toContain('monthly message limit');
    expect(friendlyChatErrorMessage('INTERNAL_ERROR')).toBeNull();
  });
});
