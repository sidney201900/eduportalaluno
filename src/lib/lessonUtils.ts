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
  
  const cleanDateStr = dateStr.substring(0, 10);
  let y = 0, m = 0, d = 0;
  
  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    d = Number(parts[0]); m = Number(parts[1]) - 1; y = Number(parts[2]);
  } else {
    const parts = cleanDateStr.split('-');
    y = Number(parts[0]); m = Number(parts[1]) - 1; d = Number(parts[2]);
  }
  
  if (isNaN(y) || isNaN(m) || isNaN(d)) return NaN;
  
  let h = defaultHour, min = 0, s = 0;
  if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
    const tParts = timeStr.trim().split(':');
    h = Number(tParts[0] || defaultHour); min = Number(tParts[1] || 0); s = Number(tParts[2] || 0);
    if (tParts.length === 1) h = Number(tParts[0]); // Handle case "14"
  } else {
    // If timeStr is missing, used defaultHour: 00 for start, 23 for end
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

  const lessonDateStr = typeof lesson.date === 'string' ? lesson.date.substring(0, 10) : '';
  if (!lessonDateStr) return { isInProgress, isCompleted };

  const startTime = lesson.startTime || (lesson as any).start_time;
  const endTime = lesson.endTime || (lesson as any).end_time;
  
  let startMs = parseLessonDateTime(lessonDateStr, startTime, 0);
  let endMs = parseLessonDateTime(lessonDateStr, endTime, 23);
  const nowMs = now.getTime();

  if (!isNaN(startMs) && !isNaN(endMs) && startMs > endMs) {
    if ((startMs - endMs) > 12 * 3600 * 1000) {
      // In case 14:00 to 01:00 next day (though rare)
      endMs += 24 * 3600 * 1000;
    } else {
      const temp = startMs;
      startMs = endMs;
      endMs = temp;
    }
  }

  if (!isNaN(startMs) && !isNaN(endMs)) {
    if (nowMs >= startMs && nowMs <= endMs) {
      isInProgress = true;
      isCompleted = false;
    } else if (nowMs > endMs) {
      isCompleted = true;
    }
  } else if (!isNaN(endMs) && nowMs > endMs) {
    isCompleted = true;
  }

  return { isInProgress, isCompleted };
}

export function isLessonWithinJustificationWindow(lessonDate: string, now = new Date()) {
  if (!lessonDate || typeof lessonDate !== 'string') return false;
  
  // Lesson date at noon to avoid boundary issues
  const d = new Date(lessonDate.substring(0, 10) + 'T12:00:00');

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
