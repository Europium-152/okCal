import { useState } from 'react';
import { getTodayString } from '@/utils/dateHelpers';

/**
 * Custom hook for managing date and time entry state
 *
 * Initializes with current date/time or provided initial values
 *
 * @param initialDate - Optional initial date (defaults to today)
 * @returns Date/time state and setters
 */
export function useDateTimeEntry(initialDate?: string) {
  // Initialize date
  const defaultDate = initialDate || getTodayString();

  // Initialize time to current time
  const now = new Date();
  const defaultTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const [entryDate, setEntryDate] = useState(defaultDate);
  const [entryTime, setEntryTime] = useState(defaultTime);

  /**
   * Reset to current date and time
   */
  const resetToNow = () => {
    setEntryDate(getTodayString());
    const currentTime = new Date();
    setEntryTime(`${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`);
  };

  /**
   * Get timestamp from current date and time
   */
  const getTimestamp = (): number => {
    const [hours, minutes] = entryTime.split(':').map(Number);
    const dateObj = new Date(entryDate);
    dateObj.setHours(hours, minutes, 0, 0);
    return dateObj.getTime();
  };

  return {
    entryDate,
    setEntryDate,
    entryTime,
    setEntryTime,
    resetToNow,
    getTimestamp,
  };
}
