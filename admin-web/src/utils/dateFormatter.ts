/**
 * Date Formatting Utility for AHTRI Enterprise Admin
 * Formats all dates to Indian / DD-MM-YYYY standard (e.g. 06-09-2026)
 */

export function formatDateDDMMYYYY(dateInput?: string | Date | number | null): string {
  if (!dateInput && dateInput !== 0) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Already in DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    // Match YYYY-MM-DD at start
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
    }
    // Match YYYY/MM/DD
    const ymdSlashMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (ymdSlashMatch) {
      return `${ymdSlashMatch[3]}-${ymdSlashMatch[2]}-${ymdSlashMatch[1]}`;
    }
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
}

export function formatDateTimeDDMMYYYY(dateInput?: string | Date | number | null): string {
  if (!dateInput && dateInput !== 0) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // If format is YYYY-MM-DD HH:mm(:ss) or YYYY-MM-DDTHH:mm(:ss)
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}:\d{2}(?::\d{2})?)/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]} ${match[4]}`;
    }
    const matchSlash = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})[T\s](\d{2}:\d{2}(?::\d{2})?)/);
    if (matchSlash) {
      return `${matchSlash[3]}-${matchSlash[2]}-${matchSlash[1]} ${matchSlash[4]}`;
    }
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatDateDDMMYYYY(dateInput);
    const datePart = formatDateDDMMYYYY(d);
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  } catch {
    return formatDateDDMMYYYY(dateInput);
  }
}
