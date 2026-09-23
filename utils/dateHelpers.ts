export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDate = (dateString: string): Date => {
  // Parse the date string as local date, not UTC
  // Ignore any time suffix (e.g. '2024-03-15T10:30:00')
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatDisplayDate = (dateString: string): string => {
  const date = parseDate(dateString);
  const today = new Date();

  // Check for Today
  if (formatDate(date) === formatDate(today)) {
    return 'Today';
  }

  // Check for Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (formatDate(date) === formatDate(yesterday)) {
    return 'Yesterday';
  }

  // Check for Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (formatDate(date) === formatDate(tomorrow)) {
    return 'Tomorrow';
  }

  // For dates within the same week (±6 days from today), show day of week
  // Compare calendar days (both at local midnight) so the time of day doesn't skew the count
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffInDays = Math.abs(Math.round((date.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffInDays <= 6) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long'
    });
  }

  // For dates further away, show short date format
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const getTodayString = (): string => {
  return formatDate(new Date());
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
