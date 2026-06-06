// DOM 節點選擇器
export const screens = {
  home: document.getElementById('screen-home'),
  workout: document.getElementById('screen-workout'),
  summary: document.getElementById('screen-summary'),
  history: document.getElementById('screen-history'),
};

// 切換頁面畫面
export function showScreen(screenId) {
  Object.keys(screens).forEach((id) => {
    if (id === screenId) {
      if (screens[id]) screens[id].classList.add('active');
    } else {
      if (screens[id]) screens[id].classList.remove('active');
    }
  });

  // 更新運動紀錄按鈕圖示
  const historyToggleBtn = document.getElementById('history-toggle');
  if (historyToggleBtn) {
    const calendarIcon = historyToggleBtn.querySelector('.calendar-icon');
    const homeIcon = historyToggleBtn.querySelector('.home-icon');
    if (calendarIcon && homeIcon) {
      if (screenId === 'history') {
        calendarIcon.style.display = 'none';
        homeIcon.style.display = 'block';
        historyToggleBtn.setAttribute('aria-label', '返回列表');
      } else {
        calendarIcon.style.display = 'block';
        homeIcon.style.display = 'none';
        historyToggleBtn.setAttribute('aria-label', '運動紀錄');
      }
    }
  }
}
