import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

/** QR as inline SVG for print HTML (no extra network). */
export function qrSvgMarkup(value: string, size: number): string {
  return renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value,
      size,
      level: 'M',
      includeMargin: true,
    })
  );
}
