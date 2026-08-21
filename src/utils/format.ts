/**
 * Format a number as Indian Rupee currency string.
 */
export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Format an ISO date string to a readable format.
 * e.g. "21 Mar" or "Today" / "Yesterday"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const day = date.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${day} ${months[date.getMonth()]}`;
}

/**
 * Format an ISO date string to a readable date and time.
 * e.g. "Today, 4:33 PM"
 */
export function formatDateTime(isoString: string): string {
  const dateStr = formatDate(isoString);
  const date = new Date(isoString);
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateStr}, ${timeStr}`;
}

/**
 * Format percentage with % suffix.
 */
export function formatPercent(value: number): string {
  return `${Math.min(value, 999)}%`;
}

/**
 * Sanitize numeric input — strips everything except digits and decimal point.
 * Prevents pasting/typing non-numeric characters into number fields.
 */
export function sanitizeNumericInput(text: string): string {
  // Allow only digits and one decimal point
  let cleaned = text.replace(/[^0-9.]/g, '');
  // Prevent multiple decimal points
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}
