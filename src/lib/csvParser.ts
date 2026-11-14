import { TimeSeriesObservation } from '../types/terratrend';

export interface ParsedCsvDataset {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  dateColumn: string;
  valueColumn: string;
  latColumn: string | null;
  lonColumn: string | null;
  detectedUnit: string;
  validRows: number;
  missingRows: number;
  errors: string[];
  warnings: string[];
  observations: TimeSeriesObservation[];
  avgLat: number | null;
  avgLon: number | null;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseFlexibleDate(raw: string): { iso: string; year: number; month: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (year >= 1850 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        year,
        month,
      };
    }
  }

  // YYYY-MM or YYYY/MM
  const ym = trimmed.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    if (year >= 1850 && year <= 2100 && month >= 1 && month <= 12) {
      return { iso: `${year}-${String(month).padStart(2, '0')}-01`, year, month };
    }
  }

  // YYYYMM
  const ymCompact = trimmed.match(/^(\d{4})(\d{2})$/);
  if (ymCompact) {
    const year = Number(ymCompact[1]);
    const month = Number(ymCompact[2]);
    if (year >= 1850 && year <= 2100 && month >= 1 && month <= 12) {
      return { iso: `${year}-${String(month).padStart(2, '0')}-01`, year, month };
    }
  }

  // YYYY only
  const yOnly = trimmed.match(/^(\d{4})$/);
  if (yOnly) {
    const year = Number(yOnly[1]);
    if (year >= 1850 && year <= 2100) {
      return { iso: `${year}-06-15`, year, month: 6 };
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    const day = parsed.getUTCDate();
    return {
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      month,
    };
  }

  return null;
}

export function parseScientificCsv(
  content: string,
  fileName: string,
  columnOverrides?: {
    dateColumn?: string;
    valueColumn?: string;
    latColumn?: string | null;
    lonColumn?: string | null;
    unit?: string;
  }
): ParsedCsvDataset {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.nc') || lowerName.endsWith('.nc4') || lowerName.endsWith('.hdf') || lowerName.endsWith('.h5')) {
    return {
      fileName,
      headers: [],
      rows: [],
      dateColumn: '',
      valueColumn: '',
      latColumn: null,
      lonColumn: null,
      detectedUnit: '',
      validRows: 0,
      missingRows: 0,
      errors: [
        `Binary scientific container (${fileName.split('.').pop()?.toUpperCase()}) cannot be parsed directly in the browser MVP without server-side HDF5/NetCDF C-libraries.`,
      ],
      warnings: [
        'Use Python xarray/pandas (`ds.to_dataframe().reset_index().to_csv(...)`) or NASA Panoply to export a CSV with date, lat, lon, and measurement columns.',
      ],
      observations: [],
      avgLat: null,
      avgLon: null,
    };
  }

  const rawLines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'));

  if (rawLines.length < 2) {
    return {
      fileName,
      headers: [],
      rows: [],
      dateColumn: '',
      valueColumn: '',
      latColumn: null,
      lonColumn: null,
      detectedUnit: '',
      validRows: 0,
      missingRows: 0,
      errors: ['CSV file must contain a header row and at least one observation row.'],
      warnings: [],
      observations: [],
      avgLat: null,
      avgLon: null,
    };
  }

  const headerLine = rawLines[0];
  const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
  const headers = splitCsvLine(headerLine, delimiter);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cells = splitCsvLine(rawLines[i], delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    rows.push(obj);
  }

  const findCol = (patterns: RegExp[]): string | null => {
    for (const pat of patterns) {
      const match = headers.find((h) => pat.test(h.toLowerCase()));
      if (match) return match;
    }
    return null;
  };

  const dateColumn =
    columnOverrides?.dateColumn ||
    findCol([/^date$/, /time/, /timestamp/, /year_month/, /month/, /^year$/]) ||
    headers[0];
  const latColumn =
    columnOverrides?.latColumn !== undefined
      ? columnOverrides.latColumn
      : findCol([/^lat$/, /latitude/, /^y$/]);
  const lonColumn =
    columnOverrides?.lonColumn !== undefined
      ? columnOverrides.lonColumn
      : findCol([/^lon$/, /^lng$/, /longitude/, /^x$/]);

  const numericCandidate = headers.find((h) => {
    if (h === dateColumn || h === latColumn || h === lonColumn) return false;
    const sample = rows.slice(0, 10).map((r) => Number(r[h]));
    return sample.some((v) => Number.isFinite(v));
  });

  const valueColumn =
    columnOverrides?.valueColumn ||
    findCol([/temp/, /precip/, /rain/, /soil/, /moisture/, /ndvi/, /sst/, /humidity/, /wind/, /value/, /anomaly/, /measurement/]) ||
    numericCandidate ||
    headers[1] ||
    headers[0];

  const unitMatch = valueColumn.match(/\(([^)]+)\)/);
  const detectedUnit = columnOverrides?.unit || unitMatch?.[1] || 'units';

  const errors: string[] = [];
  const warnings: string[] = [];
  const observations: TimeSeriesObservation[] = [];
  let validRows = 0;
  let missingRows = 0;
  let latSum = 0;
  let latCount = 0;
  let lonSum = 0;
  let lonCount = 0;

  rows.forEach((row) => {
    const d = parseFlexibleDate(row[dateColumn] || '');
    if (!d) {
      missingRows++;
      return;
    }
    const rawValStr = (row[valueColumn] || '').trim();
    const numVal = Number(rawValStr);
    const isSentinelMissing =
      rawValStr === '' ||
      rawValStr.toLowerCase() === 'na' ||
      rawValStr.toLowerCase() === 'nan' ||
      rawValStr.toLowerCase() === 'null' ||
      !Number.isFinite(numVal) ||
      numVal <= -998.9;

    if (latColumn) {
      const latV = Number(row[latColumn]);
      if (Number.isFinite(latV) && latV >= -90 && latV <= 90) {
        latSum += latV;
        latCount++;
      }
    }
    if (lonColumn) {
      const lonV = Number(row[lonColumn]);
      if (Number.isFinite(lonV) && lonV >= -180 && lonV <= 180) {
        lonSum += lonV;
        lonCount++;
      }
    }

    if (isSentinelMissing) {
      missingRows++;
      observations.push({
        date: d.iso,
        year: d.year,
        month: d.month,
        value: null,
        isMissing: true,
      });
    } else {
      validRows++;
      observations.push({
        date: d.iso,
        year: d.year,
        month: d.month,
        value: numVal,
        isMissing: false,
      });
    }
  });

  if (validRows === 0) {
    errors.push(`No valid numeric observations parsed from column "${valueColumn}" with date column "${dateColumn}".`);
  }
  if (missingRows > 0) {
    warnings.push(`${missingRows} row(s) had missing dates, NaN, or fill values (-999) and will be excluded from statistical tests.`);
  }
  if (!latColumn || !lonColumn) {
    warnings.push('Latitude/Longitude columns not detected; using selected studio coordinates for map placement.');
  }

  observations.sort((a, b) => a.date.localeCompare(b.date));

  return {
    fileName,
    headers,
    rows,
    dateColumn,
    valueColumn,
    latColumn,
    lonColumn,
    detectedUnit,
    validRows,
    missingRows,
    errors,
    warnings,
    observations,
    avgLat: latCount > 0 ? Number((latSum / latCount).toFixed(4)) : null,
    avgLon: lonCount > 0 ? Number((lonSum / lonCount).toFixed(4)) : null,
  };
}

export const SAMPLE_EARTH_CSV = `date,latitude,longitude,temperature_c
2010-01-01,35.1,-111.6,2.14
2010-04-01,35.1,-111.6,10.82
2010-07-01,35.1,-111.6,23.45
2010-10-01,35.1,-111.6,12.10
2011-01-01,35.1,-111.6,1.95
2011-04-01,35.1,-111.6,11.05
2011-07-01,35.1,-111.6,23.90
2011-10-01,35.1,-111.6,12.40
2012-01-01,35.1,-111.6,2.45
2012-04-01,35.1,-111.6,11.40
2012-07-01,35.1,-111.6,24.12
2012-10-01,35.1,-111.6,12.68
2013-01-01,35.1,-111.6,2.30
2013-04-01,35.1,-111.6,11.65
2013-07-01,35.1,-111.6,24.30
2013-10-01,35.1,-111.6,12.85
2014-01-01,35.1,-111.6,2.72
2014-04-01,35.1,-111.6,11.90
2014-07-01,35.1,-111.6,24.55
2014-10-01,35.1,-111.6,13.10
2015-01-01,35.1,-111.6,2.85
2015-04-01,35.1,-111.6,12.12
2015-07-01,35.1,-111.6,24.78
2015-10-01,35.1,-111.6,13.25
2016-01-01,35.1,-111.6,3.02
2016-04-01,35.1,-111.6,12.35
2016-07-01,35.1,-111.6,25.04
2016-10-01,35.1,-111.6,13.48
2017-01-01,35.1,-111.6,3.18
2017-04-01,35.1,-111.6,12.50
2017-07-01,35.1,-111.6,25.25
2017-10-01,35.1,-111.6,13.70
`;
