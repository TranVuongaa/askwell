import { describe, expect, it } from 'vitest';
import { installSnippet } from './snippet';

describe('installSnippet', () => {
  it('uses the deployed widget URL and only the public project key', () => {
    expect(installSnippet('pk_example', 'https://preview.example.com/dashboard')).toBe(
      '<script src="https://preview.example.com/widget.js" data-key="pk_example"></script>',
    );
  });

  it('escapes attribute values in the HTML snippet', () => {
    expect(installSnippet('pk_"<test>&', 'https://preview.example.com')).toContain(
      'data-key="pk_&quot;&lt;test&gt;&amp;"',
    );
  });
});
