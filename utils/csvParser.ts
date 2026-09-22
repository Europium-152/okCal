/**
 * CSV Parser Utility
 *
 * Parses CSV files from various platforms (MacroFactor, etc.)
 */

export interface MacroFactorRow {
  date: string;           // YYYY-MM-DD
  time: string;           // HH:MM AM/PM
  foodName: string;
  servingQty: number;
  servingWeight: number;  // grams
  calories: number;       // kcal
  fat: number;            // grams
  carbs: number;          // grams
  protein: number;        // grams
}

/**
 * Parse MacroFactor CSV format
 *
 * Expected columns:
 * - Date (YYYY-MM-DD)
 * - Time (HH:MM AM/PM)
 * - Food Name
 * - Serving Qty
 * - Serving Weight (g)
 * - Calories (kcal)
 * - Fat (g)
 * - Carbs (g)
 * - Protein (g)
 */
export function parseMacroFactorCSV(csvContent: string): MacroFactorRow[] {
  const lines = csvContent.trim().split('\n');

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Find column indices
  const dateIdx = findColumnIndex(headers, ['Date']);
  const timeIdx = findColumnIndex(headers, ['Time']);
  const foodNameIdx = findColumnIndex(headers, ['Food Name']);
  const servingQtyIdx = findColumnIndex(headers, ['Serving Qty']);
  const servingWeightIdx = findColumnIndex(headers, ['Serving Weight (g)', 'Serving Weight']);
  const caloriesIdx = findColumnIndex(headers, ['Calories (kcal)', 'Calories']);
  const fatIdx = findColumnIndex(headers, ['Fat (g)', 'Fat']);
  const carbsIdx = findColumnIndex(headers, ['Carbs (g)', 'Carbs']);
  const proteinIdx = findColumnIndex(headers, ['Protein (g)', 'Protein']);

  // Validate required columns
  if (dateIdx === -1) throw new Error('Missing required column: Date');
  if (timeIdx === -1) throw new Error('Missing required column: Time');
  if (foodNameIdx === -1) throw new Error('Missing required column: Food Name');
  if (servingQtyIdx === -1) throw new Error('Missing required column: Serving Qty');
  if (servingWeightIdx === -1) throw new Error('Missing required column: Serving Weight');
  if (caloriesIdx === -1) throw new Error('Missing required column: Calories');
  if (fatIdx === -1) throw new Error('Missing required column: Fat');
  if (carbsIdx === -1) throw new Error('Missing required column: Carbs');
  if (proteinIdx === -1) throw new Error('Missing required column: Protein');

  // Parse data rows
  const rows: MacroFactorRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);

    if (values.length < headers.length) {
      console.warn(`Skipping row ${i + 1}: insufficient columns (expected ${headers.length}, got ${values.length})`);
      console.warn(`Line content: ${line.substring(0, 100)}...`);
      continue;
    }

    try {
      const row: MacroFactorRow = {
        date: values[dateIdx].trim(),
        time: values[timeIdx].trim(),
        foodName: values[foodNameIdx].trim(),
        servingQty: parseFloat(values[servingQtyIdx]) || 0,
        servingWeight: parseFloat(values[servingWeightIdx]) || 0,
        calories: parseFloat(values[caloriesIdx]) || 0,
        fat: parseFloat(values[fatIdx]) || 0,
        carbs: parseFloat(values[carbsIdx]) || 0,
        protein: parseFloat(values[proteinIdx]) || 0,
      };

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        console.warn(`Skipping row ${i + 1}: invalid date format '${row.date}'`);
        continue;
      }

      rows.push(row);
    } catch (error) {
      console.warn(`Skipping row ${i + 1}: ${error}`);
      continue;
    }
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted values with commas
 * MacroFactor-specific: Does NOT use doubled quotes ("") for escaping
 * Instead, quotes within fields are literal characters
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : null;
    const prevChar = i > 0 ? line[i - 1] : null;

    if (char === '"') {
      // Check if this is the START of a quoted field
      if (!insideQuotes && (prevChar === null || prevChar === ',')) {
        // Opening quote - start of quoted field
        insideQuotes = true;
      } else if (insideQuotes && (nextChar === ',' || nextChar === null)) {
        // Closing quote - end of quoted field (followed by comma or end of line)
        insideQuotes = false;
      } else {
        // Quote in the middle of content - treat as literal character
        currentValue += char;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      values.push(currentValue);
      currentValue = '';
    } else {
      // Regular character
      currentValue += char;
    }
  }

  // Add the last value
  values.push(currentValue);

  return values;
}

/**
 * Find column index by trying multiple possible column names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}
