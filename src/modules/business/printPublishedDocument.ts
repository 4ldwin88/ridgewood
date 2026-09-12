/** Print only the selected frozen revision, without the application's hidden layout. */
export function printPublishedDocument(article: HTMLElement) {
  const popup = window.open('', '_blank');
  if (!popup) { window.alert('Allow pop-ups for this site to open the printable document.'); return; }
  popup.opener = null;
  const doc = popup.document;
  doc.title = article.querySelector('h2')?.textContent ?? 'Published document';
  const style = doc.createElement('style');
  style.textContent = `@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#171717;background:white;font:12px/1.5 Arial,sans-serif}h2{font-size:22px;margin:8px 0}p{margin:8px 0}small{overflow-wrap:anywhere}dl{margin:20px 0}dl>div{break-inside:avoid;margin-bottom:12px}dt{font-weight:700}dd{margin:3px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.document-footnote{border-top:1px solid #ccc;padding-top:12px;font-size:10px}header{break-inside:avoid}`;
  doc.head.append(style);
  const content = article.cloneNode(true) as HTMLElement;
  content.style.removeProperty('zoom');
  content.querySelectorAll('.document-print').forEach(node => node.remove());
  doc.body.append(content);
  popup.focus();
  popup.setTimeout(() => popup.print(), 100);
}
