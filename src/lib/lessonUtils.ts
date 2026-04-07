import { Lesson } from '../types';

export function getLessonTimeStatus(lesson: Lesson, now = new Date()) {
  let isCompleted = lesson.status === 'completed';
  let isInProgress = false;

  if (lesson.status === 'cancelled' || lesson.status === 'rescheduled') {
    return { isInProgress: false, isCompleted: isCompleted };
  }

  if (lesson.startTime && lesson.endTime) {
    const startDateTime = new Date(`${lesson.date}T${lesson.startTime}:00`);
    const endDateTime = new Date(`${lesson.date}T${lesson.endTime}:00`);
    
    if (now >= startDateTime && now <= endDateTime) {
      isInProgress = true;
      isCompleted = false;
    } else if (now > endDateTime) {
      isCompleted = true;
    }
  } else {
    const endOfDay = new Date(`${lesson.date}T23:59:59`);
    if (now > endOfDay) {
      isCompleted = true;
    }
  }

  return { isInProgress, isCompleted };
}

export function isLessonWithinJustificationWindow(lessonDate: string, now = new Date()) {
  const d = new Date(lessonDate + 'T12:00:00');
  
  const minDate = new Date(now);
  minDate.setDate(now.getDate() - 2);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(now);
  maxDate.setDate(now.getDate() + 3);
  maxDate.setHours(23, 59, 59, 999);

  return d >= minDate && d <= maxDate;
}
