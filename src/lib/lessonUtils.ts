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

export function parseLessonDateTime(dateStr: string, timeStr?: string): number {
  if (!dateStr || typeof dateStr !== 'string') return NaN;
  
  let y = 0, m = 0, d = 0;
  
  if (dateStr.includes('/')) {
    const parts = dateStr.substring(0, 10).split('/');
    d = Number(parts[0]); m = Number(parts[1]) - 1; y = Number(parts[2]);
  } else {
    const parts = dateStr.substring(0, 10).split('-');
    y = Number(parts[0]); m = Number(parts[1]) - 1; d = Number(parts[2]);
  }
  
  if (isNaN(y) || isNaN(m) || isNaN(d)) return NaN;
  
  let h = 12, min = 0, s = 0;
  if (timeStr && typeof timeStr === 'string') {
    const tParts = timeStr.split(':');
    h = Number(tParts[0] || 12); min = Number(tParts[1] || 0); s = Number(tParts[2] || 0);
  }
  
  return new Date(y, m, d, h, min, s).getTime();
}

export function getLessonTimeStatus(lesson: Lesson, now = new Date()) {
  let isCompleted = lesson.status === 'completed';
  let isInProgress = false;

  if (lesson.status === 'cancelled' || lesson.status === 'rescheduled') {
    return { isInProgress: false, isCompleted };
  }

  const lessonDateStr = typeof lesson.date === 'string' ? lesson.date.substring(0, 10) : '';
  if (!lessonDateStr) return { isInProgress, isCompleted };

  const startMs = parseLessonDateTime(lessonDateStr, lesson.startTime);
  const endMs = parseLessonDateTime(lessonDateStr, lesson.endTime || '23:59:59');
  const nowMs = now.getTime();

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
  const d = new Date(lessonDate.substring(0, 10) + 'T12:00:00');

  const minDate = new Date(now);
  minDate.setDate(now.getDate() - 2);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + 3);
  maxDate.setHours(23, 59, 59, 999);

  return d >= minDate && d <= maxDate;
}
