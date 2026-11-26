'use client';

import { useState } from 'react';
import dashboard from '../dashboard/dashboard.module.css';
import styles from './install.module.css';

export function InstallCode({ snippet }: { snippet: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  return <div className={styles.codeArea}>
    <pre className={styles.snippet}><code>{snippet}</code></pre>
    <div className={styles.copyRow}>
      <button className={dashboard['dashboard-primary']} type="button" onClick={() => void copy()}>
        {copyState === 'copied' ? 'Copied' : 'Copy code'}
      </button>
      <span role="status">{copyState === 'copied' ? 'Paste this code into your site.' : copyState === 'error' ? 'Copy failed. Select and copy the code above.' : ''}</span>
    </div>
  </div>;
}
