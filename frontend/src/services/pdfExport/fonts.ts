/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Реєстрація Roboto у jsPDF. Roboto має повну підтримку кирилиці,
 * стандартні Helvetica/Times у jsPDF — ні. Шрифт лінк лінивий,
 * тому додає вагу до bundle лише при відкритому PDF-експорті.
 *
 * Файли повинні лежати у frontend/public/fonts/:
 *   - Roboto-Regular.ttf
 *   - Roboto-Bold.ttf
 *
 * Завантажуються з base URL (Vite — `/fonts/...`).
 */

import type jsPDF from 'jspdf';

export const FONT_FAMILY = 'Roboto';

let cachedRegular: string | null = null;
let cachedBold: string | null = null;

async function fetchAsBase64(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити шрифт ${path}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}

export async function registerCyrillicFonts(doc: jsPDF): Promise<void> {
  if (!cachedRegular) {
    cachedRegular = await fetchAsBase64('/fonts/Roboto-Regular.ttf');
  }
  if (!cachedBold) {
    cachedBold = await fetchAsBase64('/fonts/Roboto-Bold.ttf');
  }

  doc.addFileToVFS('Roboto-Regular.ttf', cachedRegular);
  doc.addFont('Roboto-Regular.ttf', FONT_FAMILY, 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', cachedBold);
  doc.addFont('Roboto-Bold.ttf', FONT_FAMILY, 'bold');

  doc.setFont(FONT_FAMILY, 'normal');
}
