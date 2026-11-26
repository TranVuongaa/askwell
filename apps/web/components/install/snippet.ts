/** The public project key is the only project data embedded on a customer's site. */
export function installSnippet(publicKey: string, appOrigin: string): string {
  const scriptUrl = new URL('/widget.js', appOrigin).toString();
  const escapeAttribute = (value: string) => value.replace(/[&"'<>]/g, (character) => ({
    '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;',
  })[character] ?? character);
  return `<script src="${escapeAttribute(scriptUrl)}" data-key="${escapeAttribute(publicKey)}"></script>`;
}
