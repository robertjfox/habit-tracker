// Get the start of the week (Monday) for a given date
export function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Get an array of dates for a given week
export function getWeekDates(startDate) {
  const dates = [];
  const start = new Date(startDate);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }

  return dates;
}

// Get initial weeks to display (enough to fill screen + buffer)
export function getInitialWeeks(weeksCount = 12) {
  const today = new Date();
  const currentWeekStart = getStartOfWeek(today);
  const weeks = [];

  // Start from 4 weeks ago, show current + 8 weeks ahead
  for (let i = -4; i < weeksCount - 4; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + i * 7);
    weeks.push(getWeekDates(weekStart));
  }

  return weeks;
}

// Get more weeks for infinite scroll
export function getMoreWeeks(lastWeekStart, count = 4) {
  const weeks = [];
  const startDate = new Date(lastWeekStart);

  for (let i = 1; i <= count; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + i * 7);
    weeks.push(getWeekDates(weekStart));
  }

  return weeks;
}

// Get previous weeks for upward scroll
export function getPreviousWeeks(firstWeekStart, count = 4) {
  const weeks = [];
  const startDate = new Date(firstWeekStart);

  for (let i = count; i >= 1; i--) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() - i * 7);
    weeks.unshift(getWeekDates(weekStart));
  }

  return weeks;
}

// Format date as YYYY-MM-DD for database storage
export function formatDateForDB(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Check if a date is today
export function isToday(date) {
  const today = new Date();
  return formatDateForDB(date) === formatDateForDB(today);
}
