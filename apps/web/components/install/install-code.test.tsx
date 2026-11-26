// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { InstallCode } from './install-code';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
});

describe('InstallCode', () => {
  it('copies the complete script tag and confirms success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const snippet = '<script src="https://preview.example.com/widget.js" data-key="pk_example"></script>';

    await act(async () => root?.render(<InstallCode snippet={snippet} />));
    await act(async () => container?.querySelector('button')?.click());

    expect(writeText).toHaveBeenCalledWith(snippet);
    expect(container.textContent).toContain('Copied');
  });
});
