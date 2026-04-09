import { Lesson } from '../types';

/**
 * Normaliza uma string de hora para formato HH:MM:SS
 * Aceita: "14:00", "14:00:00", "9:30", etc.
 */
function normalizeTime(time: string): string {
  if (!time || typeof time !== 'string') return '00:00:00';
  const parts = time.trim().split(':');
  const hours = (parts[0] || '00').padStart(2, '0');
  const minutes = (parts[1] || '00').padStart(2, '0');
  const seconds = (parts[2] || '00').padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function parseLessonDateTime(dateStr: string, timeStr?: string, defaultHour = 12): number {
  if (!dateStr || typeof dateStr !== 'string') return NaN;
  
  const trimmedDate = dateStr.trim();
  const cleanDateStr = trimmedDate.substring(0, 10);
  let y = 0, m = 0, d = 0;
  
  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts[2] && parts[2].length === 4) {
      d = Number(parts[0]); m = Number(parts[1]) - 1; y = Number(parts[2]);
    } else if (parts[0] && parts[0].length === 4) {
      y = Number(parts[0]); m = Number(parts[1]) - 1; d = Number(parts[2]);
    }
  } else if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts[0] && parts[0].length === 4) {
      y = Number(parts[0]); m = Number(parts[1]) - 1; d = Number(parts[2]);
    } else {
      d = Number(parts[0]) || 1; m = (Number(parts[1]) || 1) - 1; y = Number(parts[2]) || 2024;
    }
  }
  
  if (isNaN(y) || isNaN(m) || isNaN(d) || y === 0) return NaN;
  
  let h = defaultHour, min = 0, s = 0;
  const trimmedTime = (timeStr || '').trim();
  if (trimmedTime) {
    const tParts = trimmedTime.split(':');
    h = Number(tParts[0] || defaultHour); 
    min = Number(tParts[1] || 0); 
    s = Number(tParts[2] || 0);
  } else {
    if (defaultHour === 23) { h = 23; min = 59; s = 59; }
    else { h = defaultHour; min = 0; s = 0; }
  }
  
  return new Date(y, m, d, h, min, s).getTime();
}

export function getLessonTimeStatus(lesson: Lesson, now = new Date()) {
  let isCompleted = lesson.status === 'completed';
  let isInProgress = false;

  if (lesson.status === 'cancelled' || lesson.status === 'rescheduled') {
    return { isInProgress: false, isCompleted: true };
  }

  const dateRaw = lesson.date || '';
  const lessonDateStr = typeof dateRaw === 'string' ? dateRaw.trim().substring(0, 10) : '';
  if (!lessonDateStr) return { isInProgress, isCompleted };

  const startRaw = lesson.startTime || (lesson as any).start_time || '';
  const endRaw = lesson.endTime || (lesson as any).end_time || '';
  
  const startTime = typeof startRaw === 'string' && startRaw.trim() ? startRaw : undefined;
  const endTime = typeof endRaw === 'string' && endRaw.trim() ? endRaw : undefined;
  
  let startMs = parseLessonDateTime(lessonDateStr, startTime, 0);
  let endMs = parseLessonDateTime(lessonDateStr, endTime, 23);
  const nowMs = now.getTime();

  // If we couldn't parse dates, fallback
  if (isNaN(startMs) || isNaN(endMs)) {
    return { isInProgress, isCompleted };
  }

  // Check if current time is within bounds
  if (nowMs >= startMs && nowMs <= endMs) {
    isInProgress = true;
    isCompleted = false;
  } else if (nowMs > endMs) {
    isCompleted = true;
  }

  return { isInProgress, isCompleted };
}

export function isLessonWithinJustificationWindow(lessonDate: string, now = new Date()) {
  if (!lessonDate || typeof lessonDate !== 'string') return false;
  
  // Use robust parser instead of new Date() to handle DD-MM-YYYY
  const lessonMs = parseLessonDateTime(lessonDate, '12:00', 12);
  if (isNaN(lessonMs)) return false;
  
  const d = new Date(lessonMs);

  // 1 day before
  const minDate = new Date(now);
  minDate.setDate(now.getDate() - 1);
  minDate.setHours(0, 0, 0, 0);

  // 1 day after
  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + 1);
  maxDate.setHours(23, 59, 59, 999);

  return d >= minDate && d <= maxDate;
}
