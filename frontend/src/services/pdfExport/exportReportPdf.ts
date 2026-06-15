/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Генерує A4 PDF-звіт із даних ReportResponse + DOM-знімків діаграм.
 * Уся текстова частина — selectable; діаграми — растровані через html2canvas.
 * Heatmap відображається як справжня таблиця (autoTable) із кольоровими клітинками.
 */

import jsPDF from 'jspdf';
import autoTable, {type RowInput} from 'jspdf-autotable';
import {toPng} from 'html-to-image';

import {FONT_FAMILY, registerCyrillicFonts} from './fonts';
import type {CompetitorReportResponse} from '../../api/analysisService';

export const PDF_CHART_IDS = {
  map: 'pdf-capture-map',
  radar: 'pdf-capture-radar',
  positioning: 'pdf-capture-positioning',
  trends: 'pdf-capture-trends',
} as const;

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
};
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

const ASPECT_LABELS: Record<string, string> = {
  SERVICE: 'Сервіс',
  PRODUCT_QUALITY: 'Якість продукту',
  PRICE: 'Ціна',
  LOCATION: 'Локація',
};

interface CursorState {
  y: number;
}

export interface ExportContext {
  report: CompetitorReportResponse;
  businessName: string;
  businessAddress?: string;
  businessNiche?: string;
}

export async function exportReportPdf(ctx: ExportContext): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  await registerCyrillicFonts(doc);

  const cursor: CursorState = { y: PAGE.margin };

  renderCover(doc, ctx, cursor);
  renderSummary(doc, ctx, cursor);
  await renderChartImage(doc, PDF_CHART_IDS.map, 'Карта конкурентів', cursor);
  await renderChartImage(doc, PDF_CHART_IDS.radar, 'Профілі конкурентів (Radar)', cursor);
  renderHeatmapTable(doc, ctx, cursor);
  await renderChartImage(doc, PDF_CHART_IDS.positioning, 'Матриця позиціювання (ціна × якість)', cursor);
  await renderChartImage(doc, PDF_CHART_IDS.trends, 'Динаміка тональності по місяцях', cursor);
  renderRecommendations(doc, ctx, cursor);
  renderFootersAndPageNumbers(doc, ctx);

  const fileName = buildFileName(ctx.report);
  doc.save(fileName);
}

function ensureSpace(doc: jsPDF, cursor: CursorState, needed: number): void {
  if (cursor.y + needed > PAGE.height - PAGE.margin - 8) {
    doc.addPage();
    cursor.y = PAGE.margin;
  }
}

function renderCover(doc: jsPDF, ctx: ExportContext, cursor: CursorState): void {
  const { report, businessName, businessAddress, businessNiche } = ctx;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39);
  doc.text(report.reportName || 'Аналітичний звіт', PAGE.margin, cursor.y + 8);
  cursor.y += 14;

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99);
  if (businessName) {
    doc.text(`Заклад: ${businessName}`, PAGE.margin, cursor.y);
    cursor.y += 5;
  }
  const meta = [businessNiche, businessAddress].filter(Boolean).join(' · ');
  if (meta) {
    doc.text(meta, PAGE.margin, cursor.y);
    cursor.y += 5;
  }

  const dateLabel = report.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('uk-UA', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '';
  doc.text(`Дата формування: ${dateLabel}`, PAGE.margin, cursor.y);
  cursor.y += 5;
  doc.text(`ID сесії: ${report.sessionId}`, PAGE.margin, cursor.y);
  cursor.y += 8;

  if (report.aiMarked) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(PAGE.margin, cursor.y, CONTENT_WIDTH, 8, 1.5, 1.5, 'FD');
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text('AI-generated content (AI Act ст. 50(2))', PAGE.margin + 3, cursor.y + 5.4);
    cursor.y += 12;
  }

  if (report.disclaimer) {
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    const lines = doc.splitTextToSize(report.disclaimer, CONTENT_WIDTH);
    doc.text(lines, PAGE.margin, cursor.y);
    cursor.y += lines.length * 4 + 4;
  }
}

function renderSummary(doc: jsPDF, ctx: ExportContext, cursor: CursorState): void {
  ensureSpace(doc, cursor, 40);
  sectionHeader(doc, 'Зведена статистика', cursor);

  const summary = ctx.report.aggregatedStatistics;
  const competitorsCount = ctx.report.competitors?.length ?? 0;
  const reviewsCount = (ctx.report.competitors || []).reduce(
    (sum, c: any) => sum + (c.reviewCount ?? 0), 0
  );
  const recommendationsCount = ctx.report.recommendations?.length ?? 0;
  const aspectsTracked = summary?.radarChart?.[0]?.aspects
    ? Object.keys(summary.radarChart[0].aspects).length
    : 4;

  autoTable(doc, {
    startY: cursor.y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    styles: { font: FONT_FAMILY, fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold' },
    body: [
      ['Конкурентів у вибірці', String(competitorsCount)],
      ['Проаналізовано відгуків', String(reviewsCount)],
      ['Аспектів аналізу', String(aspectsTracked)],
      ['Стратегічних рекомендацій', String(recommendationsCount)],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [55, 65, 81], cellWidth: 80 },
      1: { halign: 'right', textColor: [17, 24, 39] },
    },
  });
  cursor.y = (doc as any).lastAutoTable.finalY + 8;
}

async function renderChartImage(
    doc: jsPDF,
    domId: string,
    caption: string,
    cursor: CursorState
): Promise<void> {
  const element = document.getElementById(domId);
  if (!element) return;

  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await new Promise(resolve => setTimeout(resolve, 150)); // Легка затримка для надійності

  let imgData: string;
  try {
    imgData = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
  } catch (err) {
    console.warn(`Не вдалося захопити ${domId}:`, err);
    return;
  }

  const ratio = element.clientHeight / element.clientWidth;
  const imgWidth = CONTENT_WIDTH;
  const imgHeight = imgWidth * ratio;

  ensureSpace(doc, cursor, imgHeight + 12);
  sectionHeader(doc, caption, cursor);
  doc.addImage(imgData, 'PNG', PAGE.margin, cursor.y, imgWidth, imgHeight);
  cursor.y += imgHeight + 8;
}

function renderHeatmapTable(doc: jsPDF, ctx: ExportContext, cursor: CursorState): void {
  const heatmap = ctx.report.aggregatedStatistics?.heatmap;
  if (!heatmap || heatmap.length === 0) return;

  ensureSpace(doc, cursor, 40);
  sectionHeader(doc, 'Gap Analysis — теплова карта аспектів', cursor);

  const aspectKeys = ['SERVICE', 'PRODUCT_QUALITY', 'PRICE', 'LOCATION'] as const;
  const head = [['Конкурент', ...aspectKeys.map(k => ASPECT_LABELS[k] || k)]];

  const body: RowInput[] = heatmap.map(row => {
    const cells: any[] = [
      { content: row.competitorName, styles: { fontStyle: 'bold', textColor: [17, 24, 39] } },
    ];
    for (const key of aspectKeys) {
      const value = row.aspects[key];
      cells.push({
        content: value == null ? '—' : (value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)),
        styles: {
          halign: 'center',
          fillColor: heatmapColor(value),
          textColor: heatmapTextColor(value),
          fontStyle: value == null ? 'normal' : 'bold',
        },
      });
    }
    return cells;
  });

  autoTable(doc, {
    startY: cursor.y,
    head,
    body,
    margin: { left: PAGE.margin, right: PAGE.margin },
    styles: { font: FONT_FAMILY, fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { halign: 'left', cellWidth: 60 } },
  });
  cursor.y = (doc as any).lastAutoTable.finalY + 4;

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(
    'Шкала: зелений — позитивна тональність, червоний — негативна, «—» — клієнти не згадують аспект.',
    PAGE.margin, cursor.y
  );
  cursor.y += 8;
}

function heatmapColor(value: number | null | undefined): [number, number, number] {
  if (value == null) return [243, 244, 246];
  if (value === 0) return [229, 231, 235];
  const abs = Math.min(Math.abs(value), 1);
  if (value > 0) {
    if (abs > 0.7) return [5, 150, 105];
    if (abs > 0.3) return [167, 243, 208];
    return [209, 250, 229];
  }
  if (abs > 0.7) return [254, 202, 202];
  if (abs > 0.3) return [254, 226, 226];
  return [255, 241, 242];
}

function heatmapTextColor(value: number | null | undefined): [number, number, number] {
  if (value == null) return [156, 163, 175];
  if (value > 0.7) return [255, 255, 255];
  if (value > 0) return [6, 78, 59];
  if (value < 0) return [136, 19, 55];
  return [55, 65, 81];
}

function renderRecommendations(doc: jsPDF, ctx: ExportContext, cursor: CursorState): void {
  const recs = ctx.report.recommendations || [];
  if (recs.length === 0) return;

  ensureSpace(doc, cursor, 20);
  sectionHeader(doc, 'Стратегічні рекомендації', cursor);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);

  recs.forEach((rec, idx) => {
    const sourcesCount = rec.sourceReviewIds?.length ?? 0;
    const titleText = `${idx + 1}. Стратегічна рекомендація`;
    const bodyLines = doc.splitTextToSize(rec.text || '', CONTENT_WIDTH - 4);
    const footerText = `Базується на ${sourcesCount} першоджерелах`;
    const blockHeight = 6 + bodyLines.length * 4.5 + 6;

    ensureSpace(doc, cursor, blockHeight);

    // Лівий маркер
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.8);
    doc.line(PAGE.margin, cursor.y, PAGE.margin, cursor.y + blockHeight - 3);

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text(titleText, PAGE.margin + 3, cursor.y + 4);

    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    doc.text(bodyLines, PAGE.margin + 3, cursor.y + 9);

    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text(footerText, PAGE.margin + 3, cursor.y + 9 + bodyLines.length * 4.5 + 2);

    cursor.y += blockHeight + 3;
  });
}

function renderFootersAndPageNumbers(doc: jsPDF, ctx: ExportContext): void {
  const total = doc.getNumberOfPages();
  const footerText = ctx.report.aiMarked
    ? 'AI-generated content per AI Act Art. 50(2)'
    : '';

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    if (footerText) {
      doc.text(footerText, PAGE.margin, PAGE.height - 6);
    }
    doc.text(
      `Сторінка ${i} з ${total}`,
      PAGE.width - PAGE.margin,
      PAGE.height - 6,
      { align: 'right' }
    );
  }
}

function sectionHeader(doc: jsPDF, title: string, cursor: CursorState): void {
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(title, PAGE.margin, cursor.y);
  cursor.y += 2;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, cursor.y, PAGE.margin + CONTENT_WIDTH, cursor.y);
  cursor.y += 4;
}

function buildFileName(report: CompetitorReportResponse): string {
  const date = report.generatedAt
    ? new Date(report.generatedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const safeName = (report.reportName || 'report')
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
    .slice(0, 60) || 'report';
  return `${safeName}-${date}.pdf`;
}
