'use client';

import { APP_NAME, widgetConfigInputSchema, type WidgetConfig } from '@askwell/shared';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './embed-panel.module.css';
import {
  friendlyChatErrorMessage,
  getOrCreateVisitorId,
  getTrustedParentOrigin,
  isPublicKey,
  type ParentHandshakeEvent,
} from './protocol';

type ChatMessage = { id: number; role: 'visitor' | 'bot'; text: string };
type ConfigState = 'loading' | 'ready' | 'not-found' | 'error';
type ParentOriginListener = (origin: string) => void;

let parentOrigin: string | null = null;
const parentOriginListeners = new Set<ParentOriginListener>();

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    const origin = getTrustedParentOrigin(event as ParentHandshakeEvent, window.parent);
    if (!origin) return;

    parentOrigin = origin;
    for (const listener of parentOriginListeners) listener(origin);
  });
}

function subscribeToParentOrigin(listener: ParentOriginListener) {
  parentOriginListeners.add(listener);
  if (parentOrigin) listener(parentOrigin);
  return () => { parentOriginListeners.delete(listener); };
}

async function fetchWidgetConfig(publicKey: string, signal: AbortSignal): Promise<WidgetConfig | null> {
  const url = new URL('/api/widget/config', window.location.origin);
  url.searchParams.set('key', publicKey);
  const response = await fetch(url, { method: 'GET', signal, credentials: 'omit' });
  if (!response.ok) return null;

  const body: unknown = await response.json();
  if (body === null || typeof body !== 'object' || !('config' in body)) return null;
  const parsed = widgetConfigInputSchema.safeParse(body.config);
  return parsed.success ? parsed.data : null;
}

function mockReply(message: string) {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes('price') || normalized.includes('cost')) {
    return 'Thanks for asking! Our team can help you find the right plan. What are you looking to do?';
  }
  return 'Thanks for reaching out! I’m here to help. Could you tell me a little more?';
}

export function MessageText({ text, role }: { text: string; role: ChatMessage['role'] }) {
  return <p className={role === 'visitor' ? styles.visitorMessage : styles.botMessage}>{text}</p>;
}

export function EmbedPanel({ publicKey }: { publicKey: string }) {
  const [configState, setConfigState] = useState<ConfigState>('loading');
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const visitorId = useRef('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trustedOrigin, setTrustedOrigin] = useState<string | null>(null);
  const messageId = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPublicKey(publicKey)) {
      return;
    }

    const controller = new AbortController();
    void fetchWidgetConfig(publicKey, controller.signal).then((nextConfig) => {
      if (controller.signal.aborted) return;
      if (!nextConfig) {
        setConfigState('not-found');
        return;
      }
      setConfig(nextConfig);
      setMessages([{ id: 0, role: 'bot', text: 'Hi there! How can I help you today?' }]);
      setConfigState('ready');
    }).catch(() => {
      if (!controller.signal.aborted) setConfigState('error');
    });

    return () => controller.abort();
  }, [publicKey]);

  useEffect(() => {
    if (!isPublicKey(publicKey)) return;
    try {
      const id = getOrCreateVisitorId(window.localStorage, publicKey, () => window.crypto.randomUUID());
      visitorId.current = id;
    } catch {
      visitorId.current = window.crypto.randomUUID();
    }
  }, [publicKey]);

  const postToParent = useCallback((data: { type: 'close' } | { type: 'resize'; height: number } | { type: 'unread'; count: number }) => {
    if (!trustedOrigin) return;
    window.parent.postMessage(data, trustedOrigin);
  }, [trustedOrigin]);

  useEffect(() => subscribeToParentOrigin(setTrustedOrigin), []);

  useEffect(() => {
    if (!trustedOrigin || configState !== 'ready') return;

    const sendSize = () => postToParent({ type: 'resize', height: Math.ceil(document.documentElement.scrollHeight) });
    sendSize();
    const observer = new ResizeObserver(sendSize);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [configState, messages, isTyping, trustedOrigin, postToParent]);

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isTyping || configState !== 'ready' || !visitorId.current) return;

    setErrorMessage(null);
    setInput('');
    const nextId = messageId.current + 1;
    messageId.current = nextId;
    setMessages((current) => [...current, { id: nextId, role: 'visitor', text }]);
    setIsTyping(true);
    postToParent({ type: 'unread', count: 0 });

    typingTimer.current = setTimeout(() => {
      const replyId = messageId.current + 1;
      messageId.current = replyId;
      setMessages((current) => [...current, { id: replyId, role: 'bot', text: mockReply(text) }]);
      setIsTyping(false);
      postToParent({ type: 'unread', count: 1 });
    }, 550);
  }

  const resolvedConfigState = isPublicKey(publicKey) ? configState : 'not-found';
  const unavailable = resolvedConfigState === 'not-found' || resolvedConfigState === 'error';

  return (
    <main className={styles.shell} aria-label="Support chat">
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">A</span>
        <div className={styles.heading}>
          <h1>{config?.headerText ?? 'Support chat'}</h1>
          <p><span className={styles.onlineDot} /> Typically replies right away</p>
        </div>
        <button className={styles.close} type="button" aria-label="Close chat" onClick={() => postToParent({ type: 'close' })}>
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <section className={styles.content} aria-live="polite">
        {resolvedConfigState === 'loading' && <p className={styles.notice}>Loading chat…</p>}
        {unavailable && <div className={styles.notice} role="status">
          <strong>{resolvedConfigState === 'not-found' ? 'This chat is unavailable' : 'We couldn’t load this chat'}</strong>
          <span>Please try again later.</span>
        </div>}
        {resolvedConfigState === 'ready' && <>
          <p className={styles.dateLabel}>TODAY</p>
          <ol className={styles.messages} aria-label="Messages">
            {messages.map((message) => (
              <li className={message.role === 'visitor' ? styles.visitorRow : styles.botRow} key={message.id}>
                <MessageText role={message.role} text={message.text} />
              </li>
            ))}
          </ol>
          {isTyping && <p className={styles.typing} role="status"><span /><span /><span /> Assistant is typing</p>}
          {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
        </>}
      </section>

      <footer className={styles.footer}>
        <form className={styles.composer} onSubmit={sendMessage}>
          <label className={styles.srOnly} htmlFor="embed-message">Your message</label>
          <input
            id="embed-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={unavailable ? 'Chat unavailable' : 'Write a message…'}
            maxLength={1_000}
            disabled={resolvedConfigState !== 'ready' || isTyping}
          />
          <button aria-label="Send message" type="submit" disabled={!input.trim() || isTyping || resolvedConfigState !== 'ready'}>
            <span aria-hidden="true">↑</span>
          </button>
        </form>
        {config?.showBadge && <p className={styles.powered}>Powered by <strong>{APP_NAME}</strong></p>}
      </footer>
    </main>
  );
}

export { friendlyChatErrorMessage };
