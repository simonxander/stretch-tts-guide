import * as stretches from '../stretches.js';

// --- 雙主題模式切換 ---

export function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const sunIcon = btn.querySelector('.sun-icon');
  const moonIcon = btn.querySelector('.moon-icon');

  btn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    if (isDark) {
      document.body.className = 'theme-light';
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    } else {
      document.body.className = 'theme-dark';
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  });
}

// 套用當前動作流程的主題顏色
export function applyActiveRoutineTheme(routine) {
  if (!routine) return;
  const theme = stretches.getRoutineTheme(routine);
  const themeClasses = [
    'routine-theme-sage',
    'routine-theme-clay',
    'routine-theme-lavender',
    'routine-theme-rose',
    'routine-theme-gold',
    'routine-theme-ocean',
  ];

  const workoutScreen = document.getElementById('screen-workout');
  const summaryScreen = document.getElementById('screen-summary');

  if (workoutScreen) {
    themeClasses.forEach((c) => workoutScreen.classList.remove(c));
    workoutScreen.classList.add(`routine-theme-${theme}`);
  }
  if (summaryScreen) {
    themeClasses.forEach((c) => summaryScreen.classList.remove(c));
    summaryScreen.classList.add(`routine-theme-${theme}`);
  }
}
