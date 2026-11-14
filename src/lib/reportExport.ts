import { jsPDF } from 'jspdf';
import { TrendAnalysisResult } from '../types/terratrend';

export interface ReportMetadata {
  projectTitle: string;
  author: string;
  notes: string;
}

export function exportAnalysisCsv(result: TrendAnalysisResult, meta: ReportMetadata): void {
  const lines: string[] = [
    `# TerraTrend Scientific Analysis Export`,
    `# Project Title: ${meta.projectTitle}`,
    `# Analyst: ${meta.author || 'Unspecified'}`,
    `# Dataset: ${result.datasetName} (${result.datasetId})`,
    `# Data Source: ${result.dataSource}`,
    `# Nature: ${result.datasetNature}${result.isDemo ? ' [DEMONSTRATION SYNTHETIC BENCHMARK]' : ''}`,
    `# Variable: ${result.variableName} (${result.unit})`,
    `# Region: ${result.regionName} (Lat ${result.lat.toFixed(4)}, Lon ${result.lon.toFixed(4)})`,
    `# Period: ${result.startDate} to ${result.endDate} | Granularity: ${result.granularity}`,
    `# Significance Threshold alpha: ${result.alpha}`,
    `# Classification: ${result.statusLabel}`,
    `# Sen Slope (${result.unit}/yr): ${result.sensSlope?.slopePerYear ?? 'N/A'}`,
    `# Mann-Kendall p-value: ${result.mannKendall?.pValue ?? 'N/A'} | Z: ${result.mannKendall?.zScore ?? 'N/A'}`,
    `# OLS Slope (${result.unit}/yr): ${result.linearRegression?.slopePerYear ?? 'N/A'} | R2: ${result.linearRegression?.rSquared ?? 'N/A'}`,
    `date_label,decimal_year,observed_value,moving_average,sen_trend_line,ols_trend_line`,
  ];

  for (const pt of result.series) {
    lines.push(
      [
        pt.label,
        pt.decimalYear,
        pt.value ?? '',
        pt.movingAverage ?? '',
        pt.senFitted ?? '',
        pt.olsFitted ?? '',
      ].join(',')
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `terratrend_${result.variableId.toLowerCase()}_${result.regionId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAnalysisPdf(
  result: TrendAnalysisResult,
  meta: ReportMetadata,
  chartDataUrl?: string | null
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  let y = 18;
  const maxWidth = 178;

  // Header bar
  doc.setFillColor(7, 20, 38);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(54, 217, 230);
  doc.setFontSize(9);
  doc.text('TERRATREND EARTH SCIENCE INTELLIGENCE BRIEF', margin, 11);
  doc.setTextColor(244, 248, 255);
  doc.setFontSize(15);
  doc.text(meta.projectTitle || 'Environmental Trend Detection Report', margin, 20);

  y = 36;
  doc.setTextColor(25, 35, 50);
  doc.setFontSize(10);

  const addSectionTitle = (title: string) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(11, 30, 54);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(54, 217, 230);
    doc.line(margin, y, margin + maxWidth, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(35, 45, 60);
  };

  const addKeyValue = (k: string, v: string) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(v, maxWidth - 48);
    doc.text(wrapped, margin + 48, y);
    y += Math.max(5.5, wrapped.length * 4.8);
  };

  addSectionTitle('1. Study Provenance & Configuration');
  addKeyValue('Analyst / Lead', meta.author || 'TerraTrend Researcher');
  addKeyValue('Generated', new Date(result.createdAt).toUTCString());
  addKeyValue('Variable', `${result.variableName} (${result.unit})`);
  addKeyValue('Study Region', `${result.regionName} (Lat ${result.lat.toFixed(3)}, Lon ${result.lon.toFixed(3)})`);
  addKeyValue('Observation Window', `${result.startDate} to ${result.endDate} (${result.granularity})`);
  addKeyValue('Dataset & Source', `${result.datasetName} · ${result.dataSource}`);
  addKeyValue('Data Classification', `${result.datasetNature}${result.isDemo ? ' — SYNTHETIC DEMO BENCHMARK' : ''}`);

  y += 3;
  addSectionTitle('2. Statistical Significance & Trend Metrics');
  addKeyValue('Classification', result.statusLabel);
  addKeyValue('Sample Size', `${result.validObservations} valid / ${result.totalObservations} total (${result.missingPercent}% missing)`);
  addKeyValue('Significance Alpha', `${result.alpha}`);
  if (result.mannKendall && result.sensSlope && result.linearRegression) {
    addKeyValue(
      'Mann-Kendall Test',
      `S = ${result.mannKendall.sStatistic}, Z = ${result.mannKendall.zScore.toFixed(3)}, p = ${result.mannKendall.pValue.toFixed(6)}, tau = ${result.mannKendall.tau.toFixed(4)}`
    );
    addKeyValue(
      "Sen's Slope",
      `${result.sensSlope.slopePerYear >= 0 ? '+' : ''}${result.sensSlope.slopePerYear.toFixed(5)} ${result.unit}/yr (95% CI: [${result.sensSlope.ciLowerPerYear.toFixed(5)}, ${result.sensSlope.ciUpperPerYear.toFixed(5)}])`
    );
    addKeyValue(
      'OLS Regression',
      `Slope = ${result.linearRegression.slopePerYear.toFixed(5)} ${result.unit}/yr, R² = ${result.linearRegression.rSquared.toFixed(4)}, SE = ${result.linearRegression.standardErrorPerYear.toFixed(5)}`
    );
    addKeyValue(
      'Range & Change',
      `Min ${result.minValue?.toFixed(3)} · Mean ${result.meanValue?.toFixed(3)} · Max ${result.maxValue?.toFixed(3)} ${result.unit} | Net Δ = ${result.absoluteChange?.toFixed(3)} ${result.unit}`
    );
  }

  if (chartDataUrl) {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    y += 3;
    addSectionTitle('3. Time-Series Visualization');
    doc.addImage(chartDataUrl, 'PNG', margin, y, maxWidth, 72);
    y += 77;
  }

  addSectionTitle(chartDataUrl ? '4. Scientific Interpretation' : '3. Scientific Interpretation');
  const interpLines = doc.splitTextToSize(result.interpretation, maxWidth);
  doc.text(interpLines, margin, y);
  y += interpLines.length * 4.8 + 3;

  const ratLines = doc.splitTextToSize(`Rationale: ${result.classificationRationale}`, maxWidth);
  doc.text(ratLines, margin, y);
  y += ratLines.length * 4.8 + 4;

  if (meta.notes.trim()) {
    const notesLines = doc.splitTextToSize(`Researcher Notes: ${meta.notes}`, maxWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4.8 + 4;
  }

  addSectionTitle(chartDataUrl ? '5. Limitations & Data Citations' : '4. Limitations & Data Citations');
  result.limitations.forEach((lim) => {
    if (y > 272) {
      doc.addPage();
      y = 20;
    }
    const wrapped = doc.splitTextToSize(`• ${lim}`, maxWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.6 + 1.5;
  });

  if (result.sourceUrl) {
    const srcWrapped = doc.splitTextToSize(`Source Endpoint / Reference: ${result.sourceUrl}`, maxWidth);
    doc.text(srcWrapped, margin, y + 2);
  }

  doc.save(`terratrend_report_${result.variableId.toLowerCase()}_${result.regionId}.pdf`);
}
