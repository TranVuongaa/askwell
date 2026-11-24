const publicKeyPattern = /^pk_[A-Za-z0-9_-]+$/;
const visitorIdPrefix = 'askwell:visitor:';

export function isPublicKey(value: string): boolean {
  return publicKeyPattern.test(value);
}

export interface StringStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function getOrCreateVisitorId(
  storage: StringStorage,
  publicKey: string,
  createId: () => string,
): string {
  const storageKey = `${visitorIdPrefix}${publicKey}`;
  const current = storage.getItem(storageKey);
  if (current) return current;

  const visitorId = createId();
  storage.setItem(storageKey, visitorId);
  return visitorId;
}

export type ParentHandshakeEvent = {
  source: MessageEventSource | null;
  origin: string;
  data: unknown;
};

export function getTrustedParentOrigin(
  event: ParentHandshakeEvent,
  parent: MessageEventSource,
): string | null {
  if (event.source !== parent || event.origin === 'null') return null;
  if (event.data === null || typeof event.data !== 'object' || !('type' in event.data)) return null;
  if (event.data.type !== 'widget:opened') return null;

  try {
    const origin = new URL(event.origin);
    if (origin.protocol !== 'https:' && origin.protocol !== 'http:') return null;
    return origin.origin;
  } catch {
    return null;
  }
}

export function friendlyChatErrorMessage(code: string): string | null {
  if (code === 'RATE_LIMITED') return 'Please wait a moment before sending another message.';
  if (code === 'QUOTA_EXCEEDED') return 'This chat has reached its monthly message limit. Please try again later.';
  return null;
}
