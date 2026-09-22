/**
 * Excel Parser Utility
 *
 * Parses Excel files from various platforms (MacroFactor, etc.)
 */

import * as XLSX from 'xlsx';

export interface MacroFactorWeightRow {
  date: string;     // YYYY-MM-DD
  weightKg: number; // Weight in kg
}

/**
 * Parse MacroFactor Weight Excel format
 *
 * Expected columns:
 * - Date (YYYY-MM-DD)
 * - Weight (kg)
 */
export function parseMacroFactorWeightExcel(fileContent: ArrayBuffer): MacroFactorWeightRow[] {
  try {
    // Read the workbook from array buffer
    const workbook = XLSX.read(fileContent, { type: 'array' });

    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Excel file has no sheets');
    }

    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Parse header row
    const headers = data[0] as string[];

    // Find column indices (case-insensitive)
    const dateIdx = findColumnIndex(headers, ['Date']);
    const weightIdx = findColumnIndex(headers, ['Weight (kg)', 'Weight']);

    // Validate required columns
    if (dateIdx === -1) throw new Error('Missing required column: Date');
    if (weightIdx === -1) throw new Error('Missing required column: Weight (kg)');

    // Parse data rows
    const rows: MacroFactorWeightRow[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];

      if (!row || row.length === 0) continue; // Skip empty rows

      try {
        const dateValue = row[dateIdx];
        const weightValue = row[weightIdx];

        // Skip rows with missing data
        if (dateValue === undefined || dateValue === null || dateValue === '') continue;
        if (weightValue === undefined || weightValue === null || weightValue === '') continue;

        // Parse date - handle both string and Excel date serial number
        let dateStr: string;
        if (typeof dateValue === 'number') {
          // Excel date serial number - convert to date
          const excelDate = XLSX.SSF.parse_date_code(dateValue);
          dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
        } else {
          dateStr = String(dateValue).trim();
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          console.warn(`Skipping row ${i + 1}: invalid date format '${dateStr}'`);
          continue;
        }

        // Parse weight
        const weightKg = parseFloat(String(weightValue));
        if (isNaN(weightKg) || weightKg <= 0) {
          console.warn(`Skipping row ${i + 1}: invalid weight value '${weightValue}'`);
          continue;
        }

        rows.push({
          date: dateStr,
          weightKg,
        });
      } catch (error) {
        console.warn(`Skipping row ${i + 1}: ${error}`);
        continue;
      }
    }

    return rows;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw error;
  }
}

/**
 * Find column index by trying multiple possible column names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h =>
      String(h).trim().toLowerCase() === name.toLowerCase()
    );
    if (index !== -1) return index;
  }
  return -1;
}
