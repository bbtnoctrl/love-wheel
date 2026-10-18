import { qrcodegen } from './vendor/qrcodegen.js?v=mystery-20261018-1';

/** Share the actual page: preserve its path and query, without an in-page tab hash. */
export function buildShareUrl(href) {
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    url.username = '';
    url.password = '';
    url.hash = '';
    return url.href;
  } catch { return ''; }
}

/** Generate every QR module locally. No QR service, CDN, or network request is used. */
export function createQrSvgDataUrl(text) {
  if (typeof text !== 'string' || !text) throw new TypeError('A share URL is required.');
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  const border = 4;
  const dimension = qr.size + border * 2;
  const paths = [];
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.getModule(x, y)) paths.push(`M${x + border},${y + border}h1v1h-1z`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${dimension}" height="${dimension}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${paths.join('')}" fill="#543b37"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
