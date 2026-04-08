import { Lesson } from '../types';

/**
 * Normaliza uma string de hora para formato HH:MM:SS
 * Aceita: "14:00", "14:00:00", "9:30", etc.
 */
function normalizeTime(time: string): string {
  // Remove segundos extras e garante formato consistente
  const parts = time.trim().split(':');
  const hours = (parts[0] || '00').padStart(2, '0');
  const minutes = (parts[1] || '00').padStart(2, '0');
  const seconds = (parts[2] || '00').padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function getLessonTimeStatus(lesson: Lesson, now = new Date()) {
  let isCompleted = lesson.status === 'completed';
  let isInProgress = false;

  if (lesson.status === 'cancelled' || lesson.status === 'rescheduled') {
    return { isInProgress: false, isCompleted };
  }

  const lessonDateStr = lesson.date?.substring(0, 10);
  if (!lessonDateStr) return { isInProgress, isCompleted };

  const [y, m, d] = lessonDateStr.split('-').map(Number);

  if (lesson.startTime && lesson.endTime) {
    const startParts = normalizeTime(lesson.startTime).split(':').map(Number);
    const endParts = normalizeTime(lesson.endTime).split(':').map(Number);

    // Construtor explícito: new Date(year, monthIndex, day, hours, minutes, seconds)
    // Isso garante que SEMPRE será interpretado no fuso horário local do navegador
    const startDateTime = new Date(y, m - 1, d, startParts[0], startParts[1], startParts[2]);
    const endDateTime = new Date(y, m - 1, d, endParts[0], endParts[1], endParts[2]);

    if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
      if (now >= startDateTime && now <= endDateTime) {
        isInProgress = true;
        isCompleted = false;
      } else if (now > endDateTime) {
        isCompleted = true;
      }
    }
  } else {
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59);
    if (!isNaN(endOfDay.getTime()) && now > endOfDay) {
      isCompleted = true;
    }
  }

  return { isInProgress, isCompleted };
}

export function isLessonWithinJustificationWindow(lessonDate: string, now = new Date()) {
  const d = new Date(lessonDate.substring(0, 10) + 'T12:00:00');

  const minDate = new Date(now);
  minDate.setDate(now.getDate() - 2);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + 3);
  maxDate.setHours(23, 59, 59, 999);

  return d >= minDate && d <= maxDate;
}
