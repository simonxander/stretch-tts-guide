// UI 介面控制與事件處理 (繁體中文版)
import * as stretches from './stretches.js';
import * as engine from './engine.js';
import * as tts from './tts.js';
import * as history from './history.js';
import { getAnimationSVG } from './animations.js';
import { signIn, signOut, onAuthChange, syncFromCloud } from './firebase.js';
import LZString from 'lz-string';

// DOM 節點選擇器
const screens = {
  home: document.getElementById('screen-home'),
  workout: document.getElementById('screen-workout'),
  summary: document.getElementById('screen-summary'),
  history: document.getElementById('screen-history'),
};

// 彈出視窗
const modals = {
  create: document.getElementById('modal-create-routine'),
  import: document.getElementById('modal-import-routine'),
  share: document.getElementById('modal-share-routine'),
  aiImport: document.getElementById('modal-ai-import'),
  preview: document.getElementById('modal-preview-routine'),
};

// 圓形計時環常數
const TIMER_RING_DASHARRAY = 282.7; // 2 * Math.PI * 45

// 自訂流程編輯中的 ID
let editingRoutineId = null;
let initialFormState = null;

function getCurrentFormState() {
  const name = document.getElementById('custom-routine-name')?.value.trim() || '';
  const desc = document.getElementById('custom-routine-desc')?.value.trim() || '';
  const form = document.getElementById('form-custom-routine');
  const theme = form?.querySelector('input[name="routine-theme"]:checked')?.value || 'blue';
  const restTime = document.getElementById('custom-routine-rest-time')?.value || '5';

  const steps = [];
  const list = document.getElementById('builder-stretches-list');
  if (list) {
    const items = list.querySelectorAll('.builder-stretch-item');
    items.forEach((item) => {
      steps.push({
        name: item.querySelector('.stretch-name')?.value.trim() || '',
        duration: item.querySelector('.stretch-duration')?.value || '',
        repeat: item.querySelector('.stretch-repeat')?.value || '',
        bilateral: item.querySelector('.stretch-bilateral')?.checked || false,
        desc: item.querySelector('.stretch-desc')?.value.trim() || '',
      });
    });
  }
  return JSON.stringify({ name, desc, theme, restTime, steps });
}

function setupModalScrollLock() {
  const observer = new MutationObserver(() => {
    const hasActive = document.querySelector('.modal-overlay.active, .drawer.active') !== null;
    document.body.style.overflow = hasActive ? 'hidden' : '';
  });

  const config = { attributes: true, attributeFilter: ['class'] };
  document.querySelectorAll('.modal-overlay, .drawer').forEach(el => observer.observe(el, config));
}

// 初始化 UI
export function initUI() {
  setupThemeToggle();
  setupSettingsDrawer();
  setupWorkoutControls();
  setupHistoryUI();
  setupBuilderDragAndDrop('builder-stretches-list');
  setupModalScrollLock();

  // 註冊 Engine 回呼
  engine.registerCallbacks({
    onStateChange: handleEngineStateChange,
    onTick: handleEngineTick,
    onBreathing: handleEngineBreathing,
    onComplete: handleEngineComplete,
  });
  setupModals();
  setupRoutineCreator();
  setupMobileLayout();

  // 初始化語音選擇器
  tts.initTTS(populateVoiceDropdown);

  // 註冊核心計時器回呼事件
  engine.registerCallbacks({
    onStateChange: handleEngineStateChange,
    onTick: handleEngineTick,
    onBreathing: handleEngineBreathing,
    onComplete: handleEngineComplete,
  });

  // 註冊語音播放時的音頻波形同步
  tts.setTTSCallbacks(
    () => {
      const visualizer = document.getElementById('tts-audio-indicator');
      if (visualizer) visualizer.className = 'audio-waveform-active';
    },
    () => {
      const visualizer = document.getElementById('tts-audio-indicator');
      if (visualizer) visualizer.className = 'audio-waveform-hidden';
    }
  );

  // 檢查 URL 雜湊 (Hash) 中是否含有分享的動作資料
  handleSharedUrlImport();

  // 綁定「隱藏內建流程」切換開關
  const hidePresetsCheckbox = document.getElementById('toggle-hide-presets');
  if (hidePresetsCheckbox) {
    const savedHidePresets = localStorage.getItem('zenstretch_hide_presets') === 'true';
    hidePresetsCheckbox.checked = savedHidePresets;
    hidePresetsCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('zenstretch_hide_presets', e.target.checked);
      renderRoutinesList();

      // 動態載入並觸發同步
      import('./firebase.js').then((module) => {
        module.syncToCloud();
      });
    });
  }

  // 繪製流程列表
  renderRoutinesList();
}

// 繪製首頁伸展流程卡片
function renderRoutinesList() {
  const container = document.getElementById('routines-list');
  if (!container) return;

  const hidePresets = localStorage.getItem('zenstretch_hide_presets') === 'true';
  let routinesList = stretches.getAllRoutines();
  if (hidePresets) {
    routinesList = routinesList.filter((r) => r.isCustom);
  }

  container.innerHTML = '';

  routinesList.forEach((routine) => {
    const card = document.createElement('div');
    const theme = stretches.getRoutineTheme(routine);
    card.className = `routine-card card fade-in routine-theme-${theme}`;

    // 標題區域
    const header = document.createElement('div');
    header.className = 'routine-card-header';
    header.innerHTML = `
      <h4>${escapeHTML(routine.name)}</h4>
      <p>${escapeHTML(routine.description || '無提供說明。')}</p>
    `;
    card.appendChild(header);

    // 腳部統計數據
    const footer = document.createElement('div');
    footer.className = 'routine-card-footer';

    const meta = document.createElement('div');
    meta.className = 'routine-meta';
    meta.innerHTML = `
      <div class="routine-meta-item"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${escapeHTML(routine.durationText || calculateDurationText(routine))}</div>
      <div class="routine-meta-item"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-right: 4px;"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>${routine.steps.reduce((sum, s) => sum + (s.repeat || 1) * (s.bilateral ? 2 : 1), 0)} 個步驟</div>
    `;
    footer.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'routine-actions';

    // 分享按鈕
    const shareBtn = document.createElement('button');
    shareBtn.className = 'routine-action-btn';
    shareBtn.title = '分享此流程';
    shareBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>';
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openShareModal(routine);
    });
    actions.appendChild(shareBtn);

    // 自訂動作流程的編輯與刪除按鈕
    if (routine.isCustom) {
      // 編輯按鈕
      const editBtn = document.createElement('button');
      editBtn.className = 'routine-action-btn';
      editBtn.title = '編輯此流程';
      editBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditRoutineModal(routine);
      });
      actions.appendChild(editBtn);

      // 刪除按鈕
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'routine-action-btn';
      deleteBtn.title = '刪除此流程';
      deleteBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
      deleteBtn.style.color = 'var(--danger-color)';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmDialog(`確定要刪除「${routine.name}」伸展流程嗎？`, () => {
          stretches.deleteCustomRoutine(routine.id);
          renderRoutinesList();
        });
      });
      actions.appendChild(deleteBtn);
    }

    const startBtn = document.createElement('div');
    startBtn.className = 'routine-start-btn';
    startBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      engine.startWorkout(routine);
    });
    actions.appendChild(startBtn);

    footer.appendChild(actions);
    card.appendChild(footer);

    // 點擊卡片開啟預覽視窗
    card.addEventListener('click', () => {
      openPreviewModal(routine);
    });

    container.appendChild(card);
  });
}

// 切換頁面畫面
function showScreen(screenId) {
  Object.keys(screens).forEach((id) => {
    if (id === screenId) {
      screens[id].classList.add('active');
    } else {
      screens[id].classList.remove('active');
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

// --- 計時器引擎狀態更新回呼 ---

// 套用當前動作流程的主題顏色
function applyActiveRoutineTheme(routine) {
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

function handleEngineStateChange(state, details) {
  const historyToggleBtn = document.getElementById('history-toggle');
  if (historyToggleBtn) {
    if (state !== engine.States.IDLE && state !== engine.States.COMPLETED) {
      historyToggleBtn.disabled = true;
      historyToggleBtn.title = '運動進行中無法查看紀錄';
      historyToggleBtn.style.opacity = '0.5';
      historyToggleBtn.style.cursor = 'not-allowed';
    } else {
      historyToggleBtn.disabled = false;
      historyToggleBtn.title = '運動紀錄';
      historyToggleBtn.style.opacity = '1';
      historyToggleBtn.style.cursor = 'pointer';
    }
  }

  if (state === engine.States.IDLE) {
    releaseWakeLock();
    showScreen('home');
    return;
  }

  if (state === engine.States.COMPLETED) {
    releaseWakeLock();
  } else {
    if (!wakeLock) {
      requestWakeLock();
    }
  }

  showScreen('workout');
  applyActiveRoutineTheme(details.routine);

  // 更新步驟標題與顯示
  const routineNameEl = document.getElementById('workout-routine-name');
  const stepIndicatorEl = document.getElementById('workout-step-indicator');
  if (routineNameEl) routineNameEl.textContent = details.routine.name;
  if (stepIndicatorEl)
    stepIndicatorEl.textContent = `第 ${details.stepIndex + 1} / ${details.routine.steps.length} 步`;

  // 取得動作詳細資料與 SVG
  const stretchNameEl = document.getElementById('current-stretch-name');
  const instructionsContainer = document.getElementById('current-stretch-instructions');
  const animationContainer = document.getElementById('animation-container');

  // 切換播放/暫停按鈕圖示
  togglePlayPauseIcon(true);

  // 取得秒數單位標籤
  const secLabel = document.querySelector('.timer-sec-label');

  // 更新組數指示器
  const setIndicator = document.getElementById('timer-set-indicator');
  const setCurrent = document.getElementById('timer-set-current');
  const setTotal = document.getElementById('timer-set-total');

  if (
    details.step &&
    details.step.totalSets > 1 &&
    state !== engine.States.PREPARE &&
    state !== engine.States.EXPLANATION
  ) {
    if (setIndicator) setIndicator.style.display = 'flex';
    if (setCurrent) setCurrent.textContent = details.step.set;
    if (setTotal) setTotal.textContent = details.step.totalSets;
  } else {
    if (setIndicator) setIndicator.style.display = 'none';
  }

  if (state === engine.States.PREPARE) {
    if (secLabel) secLabel.style.display = 'inline';
    if (stretchNameEl) stretchNameEl.textContent = '準備開始';
    if (instructionsContainer) {
      instructionsContainer.innerHTML = `
        <p>請準備好姿勢，下一個動作是：<strong>${escapeHTML(details.step.name)}</strong></p>
        <p>請確保您的裝置已開啟音量以聽到語音指引。</p>
      `;
    }
    if (animationContainer) {
      animationContainer.innerHTML = getAnimationSVG('default');
    }

    document.getElementById('timer-state-label').textContent = '準備';
  } else if (state === engine.States.EXPLANATION) {
    if (secLabel) secLabel.style.display = 'none';
    if (stretchNameEl) stretchNameEl.textContent = details.step.name;
    if (instructionsContainer) {
      const listItems = details.step.instructions
        .map((inst) => `<li>${escapeHTML(inst)}</li>`)
        .join('');
      instructionsContainer.innerHTML = `<ol>${listItems}</ol>`;
    }
    if (animationContainer) {
      animationContainer.innerHTML = getAnimationSVG(details.step.animationType);
    }

    document.getElementById('timer-state-label').textContent = '解說';
    document.getElementById('timer-countdown').textContent = '💬';
    const progressBar = document.getElementById('timer-progress-bar');
    if (progressBar) progressBar.style.strokeDashoffset = TIMER_RING_DASHARRAY;
  } else if (state === engine.States.STRETCHING) {
    if (secLabel) secLabel.style.display = 'inline';
    if (stretchNameEl) stretchNameEl.textContent = details.step.name;
    if (instructionsContainer) {
      const listItems = details.step.instructions
        .map((inst) => `<li>${escapeHTML(inst)}</li>`)
        .join('');
      instructionsContainer.innerHTML = `<ol>${listItems}</ol>`;
    }
    if (animationContainer) {
      animationContainer.innerHTML = getAnimationSVG(details.step.animationType);
    }

    document.getElementById('timer-state-label').textContent = '伸展';
  } else if (state === engine.States.REST) {
    if (secLabel) secLabel.style.display = 'inline';
    document.getElementById('timer-state-label').textContent = '休息';
  }

  // 切換 REST 狀態專用的 CSS Class
  const timerCard = document.querySelector('.timer-card-focused');
  if (timerCard) {
    if (state === engine.States.REST) {
      timerCard.classList.add('is-rest-mode');
    } else {
      timerCard.classList.remove('is-rest-mode');
    }
  }
}

function handleEngineTick(timeRemaining, percent) {
  const countdownEl = document.getElementById('timer-countdown');
  if (countdownEl) countdownEl.textContent = timeRemaining;

  const progressBar = document.getElementById('timer-progress-bar');
  if (progressBar) {
    const offset = TIMER_RING_DASHARRAY - (percent / 100) * TIMER_RING_DASHARRAY;
    progressBar.style.strokeDashoffset = offset;
  }
}

function handleEngineBreathing(breathingState, _progress) {
  const ring = document.getElementById('breathing-ring');
  const label = document.getElementById('breathing-text');

  if (!ring || !label) return;

  if (breathingState === 'inhale') {
    ring.className = 'breathing-ring inhale';
    label.textContent = '吸氣';
  } else if (breathingState === 'exhale') {
    ring.className = 'breathing-ring exhale';
    label.textContent = '吐氣';
  } else if (breathingState === 'prepare') {
    ring.className = 'breathing-ring';
    label.textContent = '準備';
  } else {
    ring.className = 'breathing-ring';
    label.textContent = '放鬆';
  }
}

// --- Custom Confirm Dialog ---
function showConfirmDialog(message, onConfirm) {
  const modal = document.getElementById('modal-confirm');
  const msgEl = document.getElementById('modal-confirm-message');
  const btnOk = document.getElementById('btn-confirm-ok');
  const btnCancel = document.getElementById('btn-confirm-cancel');

  if (!modal || !msgEl || !btnOk || !btnCancel) return;

  msgEl.textContent = message;
  modal.classList.add('active');

  // Clean up previous listeners by cloning
  const newBtnOk = btnOk.cloneNode(true);
  const newBtnCancel = btnCancel.cloneNode(true);
  btnOk.parentNode.replaceChild(newBtnOk, btnOk);
  btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

  newBtnCancel.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  newBtnOk.addEventListener('click', () => {
    modal.classList.remove('active');
    if (onConfirm) onConfirm();
  });
}

// 顯示 Toast 浮動提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '2rem';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'var(--accent-primary)';
  toast.style.color = 'white';
  toast.style.padding = '0.75rem 1.5rem';
  toast.style.borderRadius = '9999px';
  toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
  toast.style.zIndex = '9999';
  toast.style.opacity = '0';
  toast.style.fontWeight = 'bold';
  toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  document.body.appendChild(toast);

  // 觸發進場動畫
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
  });

  // 3秒後自動消失
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function handleEngineComplete(stats) {
  showScreen('summary');

  const minutes = Math.floor(stats.totalTime / 60);
  const seconds = stats.totalTime % 60;
  const timeString = `${minutes} 分 ${seconds < 10 ? '0' : ''}${seconds} 秒`;

  document.getElementById('summary-total-time').textContent = timeString;
  document.getElementById('summary-exercises-count').textContent = stats.stepCount;

  // 儲存至運動紀錄
  const routine = engine.getCurrentRoutine();
  if (routine) {
    history.saveRecord(routine.id, routine.name, stats.totalTime);
  }
}

// --- 雙主題模式切換 ---

function setupThemeToggle() {
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

// --- 運動紀錄 UI ---

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let currentFilterDate = null;

function setupHistoryUI() {
  const historyToggleBtn = document.getElementById('history-toggle');
  const historyBackBtn = document.getElementById('btn-history-back');

  if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', () => {
      const isHistoryScreen = screens.history && screens.history.classList.contains('active');
      if (isHistoryScreen) {
        showScreen('home');
      } else {
        currentCalYear = new Date().getFullYear();
        currentCalMonth = new Date().getMonth();
        currentFilterDate = null;
        showScreen('history');
        renderCalendar();
        renderHistoryList();
      }
    });
  }

  if (historyBackBtn) {
    historyBackBtn.addEventListener('click', () => {
      showScreen('home');
    });
  }

  const btnPrev = document.getElementById('btn-cal-prev');
  const btnNext = document.getElementById('btn-cal-next');
  const btnClear = document.getElementById('btn-clear-date-filter');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentCalMonth--;
      if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
      }
      renderCalendar();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentCalMonth++;
      if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
      }
      renderCalendar();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      currentFilterDate = null;
      renderCalendar();
      renderHistoryList();
    });
  }
}

function renderCalendar() {
  const calGrid = document.getElementById('calendar-grid');
  const calHeader = document.getElementById('calendar-month-year');
  if (!calGrid || !calHeader) return;

  const monthNames = [
    '1 月',
    '2 月',
    '3 月',
    '4 月',
    '5 月',
    '6 月',
    '7 月',
    '8 月',
    '9 月',
    '10 月',
    '11 月',
    '12 月',
  ];
  calHeader.textContent = `${currentCalYear} 年 ${monthNames[currentCalMonth]}`;

  const records = history.getAllRecords();
  const daysWithRecords = new Set();
  records.forEach((r) => {
    const d = new Date(r.date);
    const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    daysWithRecords.add(dateStr);
  });

  calGrid.innerHTML = '';

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  dayNames.forEach((day) => {
    const headerCell = document.createElement('div');
    headerCell.className = 'calendar-day-header';
    headerCell.textContent = day;
    calGrid.appendChild(headerCell);
  });

  const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell empty';
    calGrid.appendChild(emptyCell);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const dateStr = `${currentCalYear}-${currentCalMonth}-${d}`;
    const isoDateStr = `${currentCalYear}-${(currentCalMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

    if (
      currentCalYear === today.getFullYear() &&
      currentCalMonth === today.getMonth() &&
      d === today.getDate()
    ) {
      cell.classList.add('today');
    }

    if (currentFilterDate === isoDateStr) {
      cell.classList.add('selected');
    }

    const numSpan = document.createElement('span');
    numSpan.className = 'date-num';
    numSpan.textContent = d;
    cell.appendChild(numSpan);

    if (daysWithRecords.has(dateStr)) {
      const stamp = document.createElement('span');
      stamp.className = 'calendar-stamp';
      stamp.style.display = 'flex';
      stamp.style.alignItems = 'center';
      stamp.style.justifyContent = 'center';
      stamp.style.width = '100%';
      stamp.style.height = '100%';
      stamp.innerHTML =
        '<div style="width: 32px; height: 32px; border: 2px solid var(--accent-primary); border-radius: 50%; opacity: 0.6;"></div>';
      cell.appendChild(stamp);
    }

    cell.addEventListener('click', () => {
      if (currentFilterDate === isoDateStr) {
        currentFilterDate = null;
      } else {
        currentFilterDate = isoDateStr;
      }
      renderCalendar();
      renderHistoryList();
    });

    calGrid.appendChild(cell);
  }
}

function renderHistoryList() {
  const container = document.getElementById('history-list');
  const title = document.getElementById('history-list-title');
  const clearBtn = document.getElementById('btn-clear-date-filter');
  if (!container) return;

  let records = history.getAllRecords();

  if (currentFilterDate) {
    records = records.filter((r) => {
      const d = new Date(r.date);
      const rDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      return rDateStr === currentFilterDate;
    });
    if (title) title.textContent = `${currentFilterDate} 的紀錄`;
    if (clearBtn) clearBtn.style.display = 'inline-block';
  } else {
    if (title) title.textContent = '所有紀錄';
    if (clearBtn) clearBtn.style.display = 'none';
  }

  container.innerHTML = '';

  if (records.length === 0) {
    container.innerHTML = '<div class="loading-placeholder">暫無運動紀錄</div>';
    return;
  }

  records.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'history-card card fade-in';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between';
    card.style.padding = '0.75rem 1rem';
    card.style.marginBottom = '0.75rem';

    const d = new Date(record.date);
    const dateStr = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const min = Math.floor(record.duration / 60);
    const sec = record.duration % 60;
    const timeStr = `${min} 分 ${sec} 秒`;

    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex: 1; overflow: hidden; padding-right: 0.5rem; gap: 0.5rem;">
        <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1.05rem;" title="${escapeHTML(record.routineName)}">
          ${escapeHTML(record.routineName)}
        </h4>
        <div style="font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap; flex-shrink: 0;">
          <span>${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}</span> • <span>${timeStr}</span>
        </div>
      </div>
      <button class="icon-btn btn-delete-history" aria-label="刪除紀錄" style="color: var(--danger-color); padding: 0.25rem; min-height: auto; flex-shrink: 0;">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    const deleteBtn = card.querySelector('.btn-delete-history');
    deleteBtn.addEventListener('click', () => {
      showConfirmDialog('確定要刪除這筆運動紀錄嗎？', () => {
        history.deleteRecord(record.id);
        renderHistoryList();
      });
    });

    container.appendChild(card);
  });
}

// --- 設定面板 Drawer ---

function setupSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const overlay = document.getElementById('settings-overlay');
  const toggleBtn = document.getElementById('settings-toggle');
  const closeBtn = document.getElementById('btn-close-settings');

  if (!drawer || !toggleBtn) return;

  const openDrawer = () => drawer.classList.add('active');
  const closeDrawer = () => drawer.classList.remove('active');

  toggleBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // 顯示版本更新時間
  const buildTimeEl = document.getElementById('app-build-time');
  if (buildTimeEl) {
    /* global __BUILD_TIME__ */
    try {
      buildTimeEl.textContent = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '開發環境';
    } catch (e) {
      buildTimeEl.textContent = '開發環境';
    }
  }

  // 更改語音選項
  const voiceSelect = document.getElementById('tts-voice');
  voiceSelect.addEventListener('change', (e) => {
    tts.setVoice(e.target.value);
  });

  // 更改速度
  const rateSlider = document.getElementById('tts-rate');
  const rateVal = document.getElementById('tts-rate-val');
  rateSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value).toFixed(1);
    rateVal.textContent = `${val}x`;
    tts.setRate(val);
  });

  // 更改音量
  const volSlider = document.getElementById('tts-volume');
  const volVal = document.getElementById('tts-volume-val');
  volSlider.addEventListener('input', (e) => {
    const val = Math.round(e.target.value * 100);
    volVal.textContent = `${val}%`;
    tts.setVolume(e.target.value);
  });

  // 提示音效開關
  const sfxToggle = document.getElementById('sfx-toggle');
  sfxToggle.addEventListener('change', (e) => {
    tts.setSoundEffectsEnabled(e.target.checked);
  });

  // 語音測試按鈕
  document.getElementById('btn-test-voice').addEventListener('click', () => {
    tts.speak('這是 ZenStretch 語音引導系統的測試。一切運作正常，準備好開始伸展了嗎？');
  });

  // 預載快取數值至 DOM
  rateSlider.value = tts.getRate();
  rateVal.textContent = `${tts.getRate()}x`;

  volSlider.value = tts.getVolume();
  volVal.textContent = `${Math.round(tts.getVolume() * 100)}%`;

  sfxToggle.checked = tts.getSoundEffectsEnabled();

  // 綁定 Google 登入/登出按鈕
  const loginBtn = document.getElementById('btn-google-login');
  const logoutBtn = document.getElementById('btn-google-logout');
  const authStatusText = document.getElementById('auth-status-text');

  loginBtn.addEventListener('click', async () => {
    try {
      await signIn();
    } catch (e) {
      console.error('Login failed', e);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout failed', e);
    }
  });

  // 監聽登入狀態改變
  onAuthChange(async (user) => {
    const promptPopup = document.getElementById('login-prompt-popup');
    const closePromptBtn = document.getElementById('btn-close-login-prompt');

    if (closePromptBtn && !closePromptBtn.dataset.bound) {
      closePromptBtn.dataset.bound = 'true';
      closePromptBtn.addEventListener('click', () => {
        if (promptPopup) promptPopup.style.display = 'none';
        localStorage.setItem('zenstretch_dismissed_login_prompt', 'true');
      });
    }

    if (user) {
      if (promptPopup) promptPopup.style.display = 'none';
      authStatusText.textContent = `已登入：${user.email}`;
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-block';

      // 登入成功後，嘗試從雲端下載最新資料並覆蓋本地
      const hasUpdates = await syncFromCloud();
      if (hasUpdates) {
        // 更新畫面上的狀態
        renderRoutinesList();

        // 更新 TTS 設定與隱藏預設開關的顯示狀態
        const hidePresetsCheckbox = document.getElementById('toggle-hide-presets');
        if (hidePresetsCheckbox) {
          hidePresetsCheckbox.checked = localStorage.getItem('zenstretch_hide_presets') === 'true';
        }

        rateSlider.value = tts.getRate();
        rateVal.textContent = `${tts.getRate()}x`;
        volSlider.value = tts.getVolume();
        volVal.textContent = `${Math.round(tts.getVolume() * 100)}%`;
        sfxToggle.checked = tts.getSoundEffectsEnabled();
      }
    } else {
      authStatusText.textContent = '尚未登入';
      loginBtn.style.display = 'inline-block';
      logoutBtn.style.display = 'none';

      if (promptPopup && localStorage.getItem('zenstretch_dismissed_login_prompt') !== 'true') {
        setTimeout(() => {
          promptPopup.style.display = 'block';
        }, 1500);
      }
    }
  });
}

function populateVoiceDropdown(voices, currentVoice) {
  const voiceSelect = document.getElementById('tts-voice');
  if (!voiceSelect) return;

  voiceSelect.innerHTML = '';

  voices.forEach((voice) => {
    const option = document.createElement('option');
    option.value = voice.voiceURI;

    // 如果是 Google 的中文語音，特別加上標記以便辨識
    let voiceDisplayName = `${voice.name} (${voice.lang})`;
    if (voice.name.includes('Google') && (voice.lang.includes('zh') || voice.lang.includes('ZH'))) {
      voiceDisplayName = `⭐ ${voiceDisplayName}`;
    }

    option.textContent = voiceDisplayName;
    if (currentVoice && voice.voiceURI === currentVoice.voiceURI) {
      option.selected = true;
    }
    voiceSelect.appendChild(option);
  });
}

// --- 運動控制按鈕設定 ---

function setupWorkoutControls() {
  const playPauseBtn = document.getElementById('btn-play-pause');
  const stopBtn = document.getElementById('btn-stop-workout');
  const nextBtn = document.getElementById('btn-next');
  const prevBtn = document.getElementById('btn-prev');
  const backHomeBtn = document.getElementById('btn-back-home');

  if (!playPauseBtn) return;

  playPauseBtn.addEventListener('click', () => {
    const isPaused = playPauseBtn.querySelector('.play-icon').style.display === 'block';

    if (isPaused) {
      engine.resumeWorkout();
      togglePlayPauseIcon(true);
    } else {
      engine.pauseWorkout();
      togglePlayPauseIcon(false);
    }
  });

  stopBtn.addEventListener('click', () => {
    engine.pauseWorkout();
    togglePlayPauseIcon(false);
    showConfirmDialog('確定要放棄並結束這次的伸展運動嗎？', () => {
      // 紀錄未完成的伸展流程
      const routine = engine.getCurrentRoutine();
      const totalTime = engine.getTotalTimeElapsed();
      if (routine && totalTime > 0) {
        history.saveRecord(routine.id, routine.name + ' (未完成)', totalTime);
      }

      engine.stopWorkout();
    });
  });

  nextBtn.addEventListener('click', () => {
    engine.skipNext();
  });

  prevBtn.addEventListener('click', () => {
    engine.skipPrev();
  });

  backHomeBtn.addEventListener('click', () => {
    engine.stopWorkout();
    showScreen('home');
  });
}

function togglePlayPauseIcon(isPlaying) {
  const playPauseBtn = document.getElementById('btn-play-pause');
  if (!playPauseBtn) return;

  const pauseIcon = playPauseBtn.querySelector('.pause-icon');
  const playIcon = playPauseBtn.querySelector('.play-icon');

  if (isPlaying) {
    pauseIcon.style.display = 'block';
    playIcon.style.display = 'none';
  } else {
    pauseIcon.style.display = 'none';
    playIcon.style.display = 'block';
  }
}

// 重置自訂流程表單狀態
function resetCreateModalState() {
  editingRoutineId = null;
  const modalTitle = document.getElementById('modal-create-title');
  if (modalTitle) modalTitle.textContent = '建立自訂伸展流程';
  const form = document.getElementById('form-custom-routine');
  if (form) form.reset();
  const restTimeInput = document.getElementById('custom-routine-rest-time');
  if (restTimeInput) restTimeInput.value = '5';
  const list = document.getElementById('builder-stretches-list');
  if (list) {
    list.innerHTML = '';
    // 補上一個預設空白動作步驟
    const item = document.createElement('div');
    item.className = 'builder-stretch-item';
    item.innerHTML = `
      <span class="drag-handle"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" style="pointer-events: none;"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></span>
      <div class="form-inputs-container">
        <!-- 第一行：動作名稱 -->
        <div class="form-inputs-row">
          <input type="text" class="input-text-field stretch-name" required placeholder="動作名稱 (如: 轉腰拉伸)">
        </div>
        <!-- 第二行：秒數、組數、雙側 -->
        <div class="form-inputs-row details-row">
          <div class="input-unit-wrapper">
            <input type="number" class="input-text-field stretch-duration" required placeholder="秒數" min="5" max="300" value="20">
            <span class="input-unit-label">秒</span>
          </div>
          <div class="input-unit-wrapper">
            <input type="number" class="input-text-field stretch-repeat" required placeholder="組數" min="1" max="10" value="1">
            <span class="input-unit-label">組</span>
          </div>
          <label class="checkbox-label stretch-bilateral-label">
            <input type="checkbox" class="stretch-bilateral"> 雙側
          </label>
        </div>
        <!-- 第三行：動作說明 -->
        <div class="form-inputs-row description-row">
          <textarea class="input-textarea-field stretch-desc" placeholder="動作說明 (選填，可分行輸入多個指引)" rows="2"></textarea>
        </div>
      </div>
      <button type="button" class="routine-action-btn remove-step-btn" title="移除動作" style="color: var(--danger-color);"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    `;
    item.querySelector('.remove-step-btn').addEventListener('click', () => item.remove());
    list.appendChild(item);
    makeItemDraggable(item);
  }
}

// 開啟預覽視窗
function openPreviewModal(routine) {
  const titleEl = document.getElementById('preview-routine-title');
  const metaEl = document.getElementById('preview-routine-meta');
  const stepsEl = document.getElementById('preview-routine-steps');
  const actionsLeftEl = document.getElementById('preview-routine-actions-left');
  const startBtn = document.getElementById('btn-start-preview');

  if (!titleEl || !metaEl || !stepsEl || !actionsLeftEl || !startBtn || !modals.preview) return;

  titleEl.textContent = routine.name;

  // 渲染 Meta
  const totalSteps = routine.steps.reduce(
    (sum, s) => sum + (s.repeat || 1) * (s.bilateral ? 2 : 1),
    0
  );
  metaEl.innerHTML = `
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: ${routine.description ? '0.75rem' : '0'};">
      <div class="routine-meta-item"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${escapeHTML(routine.durationText || calculateDurationText(routine))}</div>
      <div class="routine-meta-item"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-right: 4px;"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>${totalSteps} 個步驟</div>
    </div>
    ${routine.description ? `<p style="margin: 0; font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary);">${escapeHTML(routine.description)}</p>` : ''}
  `;

  // 渲染步驟列表
  stepsEl.innerHTML = '';
  routine.steps.forEach((step, index) => {
    const item = document.createElement('div');
    item.className = 'preview-step-item';

    let metaText = `${step.duration} 秒`;
    if (step.repeat && step.repeat > 1) {
      metaText += ` × ${step.repeat} 組`;
    }
    if (step.bilateral) {
      metaText += ` (雙側)`;
    }

    item.innerHTML = `
      <div class="preview-step-name">
        <span style="color: var(--text-light); margin-right: 0.5rem; font-size: 0.85rem;">${index + 1}.</span>
        ${escapeHTML(step.name)}
      </div>
      <div class="preview-step-meta">${metaText}</div>
    `;
    stepsEl.appendChild(item);
  });

  // 渲染快捷動作按鈕
  actionsLeftEl.innerHTML = '';

  const shareBtn = document.createElement('button');
  shareBtn.className = 'icon-btn';
  shareBtn.title = '分享此流程';
  shareBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>';
  shareBtn.addEventListener('click', () => {
    modals.preview.classList.remove('active');
    openShareModal(routine);
  });
  actionsLeftEl.appendChild(shareBtn);

  if (routine.isCustom) {
    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.title = '編輯此流程';
    editBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
    editBtn.addEventListener('click', () => {
      modals.preview.classList.remove('active');
      openEditRoutineModal(routine);
    });
    actionsLeftEl.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.title = '刪除此流程';
    deleteBtn.style.color = 'var(--danger-color)';
    deleteBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
    deleteBtn.addEventListener('click', () => {
      modals.preview.classList.remove('active');
      showConfirmDialog(`確定要刪除「${routine.name}」伸展流程嗎？`, () => {
        stretches.deleteCustomRoutine(routine.id);
        renderRoutinesList();
      });
    });
    actionsLeftEl.appendChild(deleteBtn);
  }

  // 綁定開始運動
  startBtn.onclick = () => {
    modals.preview.classList.remove('active');
    engine.startWorkout(routine);
  };

  modals.preview.classList.add('active');
}

// --- 彈出視窗事件設定 ---

function setupModals() {
  const createBtn = document.getElementById('btn-create-routine');
  const importBtn = document.getElementById('btn-import-routine');
  const createAiBtn = document.getElementById('btn-create-routine-ai');

  const closeCreateBtn = document.getElementById('btn-close-create-modal');
  const closeImportBtn = document.getElementById('btn-close-import-modal');
  const closeShareBtn = document.getElementById('btn-close-share-modal');
  const closeAiBtn = document.getElementById('btn-close-ai-modal');
  const closePreviewBtn = document.getElementById('btn-close-preview');

  const cancelCreateBtn = document.getElementById('btn-cancel-create');
  const cancelImportBtn = document.getElementById('btn-cancel-import');
  const closeShareBtn2 = document.getElementById('btn-close-share');
  const cancelAiBtn = document.getElementById('btn-cancel-ai-import');

  // 開啟視窗
  createBtn.addEventListener('click', () => {
    initialFormState = getCurrentFormState();
    modals.create.classList.add('active');
  });
  importBtn.addEventListener('click', () => modals.import.classList.add('active'));
  if (createAiBtn) {
    createAiBtn.addEventListener('click', () => {
      document.getElementById('ai-json-input').value = '';
      if (modals.aiImport) modals.aiImport.classList.add('active');
    });
  }

  // 關閉視窗
  const hideModals = () => {
    Object.values(modals).forEach((m) => {
      if (m) m.classList.remove('active');
    });
  };

  const handleCancelCreate = () => {
    if (initialFormState === getCurrentFormState()) {
      resetCreateModalState();
      hideModals();
      return;
    }
    showConfirmDialog('確定要取消編輯嗎？尚未儲存的變更將會遺失。', () => {
      resetCreateModalState();
      hideModals();
    });
  };

  closeCreateBtn.addEventListener('click', handleCancelCreate);
  closeImportBtn.addEventListener('click', hideModals);
  closeShareBtn.addEventListener('click', hideModals);
  if (closeAiBtn) closeAiBtn.addEventListener('click', hideModals);
  if (closePreviewBtn) closePreviewBtn.addEventListener('click', hideModals);

  cancelCreateBtn.addEventListener('click', handleCancelCreate);
  cancelImportBtn.addEventListener('click', hideModals);
  closeShareBtn2.addEventListener('click', hideModals);
  if (cancelAiBtn) cancelAiBtn.addEventListener('click', hideModals);

  // 點擊背景遮罩關閉
  Object.values(modals).forEach((m) => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        // 編輯時點擊外部不自動關閉，避免誤觸遺失資料
        if (m === modals.create) {
          return;
        }
        hideModals();
      }
    });
  });

  // 處理匯入流程提交
  document.getElementById('btn-submit-import').addEventListener('click', () => {
    const importText = document.getElementById('import-text').value.trim();
    const errorEl = document.getElementById('import-error');
    errorEl.style.display = 'none';

    if (!importText) return;

    let base64Data = importText;

    if (importText.includes('#share=')) {
      base64Data = importText.split('#share=')[1];
    }

    try {
      // Base64 解碼為 JSON 字串
      const jsonString = decodeURIComponent(escape(atob(base64Data)));
      const routine = JSON.parse(jsonString);

      if (!routine.name || !routine.steps || !Array.isArray(routine.steps)) {
        throw new Error('格式錯誤');
      }

      // 儲存匯入的自訂流程
      stretches.saveCustomRoutine(routine);
      renderRoutinesList();
      hideModals();
      document.getElementById('import-text').value = '';
    } catch (err) {
      console.error('匯入自訂流程失敗:', err);
      errorEl.style.display = 'block';
    }
  });

  // 處理 AI 匯入
  const btnCopyAiPrompt = document.getElementById('btn-copy-ai-prompt');
  if (btnCopyAiPrompt) {
    btnCopyAiPrompt.addEventListener('click', () => {
      const promptText = document.getElementById('ai-prompt-text').innerText;
      navigator.clipboard.writeText(promptText).then(() => {
        const originalText = btnCopyAiPrompt.innerText;
        btnCopyAiPrompt.innerText = '✅ 已複製';
        setTimeout(() => {
          btnCopyAiPrompt.innerText = originalText;
        }, 2000);
      });
    });
  }

  const btnSubmitAiImport = document.getElementById('btn-submit-ai-import');
  if (btnSubmitAiImport) {
    btnSubmitAiImport.addEventListener('click', () => {
      let jsonStr = document.getElementById('ai-json-input').value.trim();
      if (!jsonStr) return;

      // 去除可能夾帶的 Markdown 標籤 (如 ```json ... ```)
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (!parsed.steps || !Array.isArray(parsed.steps)) {
          throw new Error('匯入的資料格式不正確，找不到 steps 陣列');
        }

        // 將解析出的動作陣列轉換為 Routine 格式，交給 openEditRoutineModal 處理
        const fakeRoutine = {
          name: parsed.name || 'AI 生成伸展流程',
          description: parsed.description || '由 AI 產生的伸展流程，請確認內容後儲存。',
          theme: 'ocean',
          restTime: 5,
          steps: parsed.steps.map((s, idx) => ({
            name: s.name || `動作 ${idx + 1}`,
            duration: parseInt(s.duration) || 30,
            repeat: parseInt(s.repeat) || 1,
            bilateral: !!s.bilateral,
            description: s.description || '',
          })),
        };

        hideModals();
        openEditRoutineModal(fakeRoutine);
      } catch (err) {
        alert('解析 JSON 失敗，請確認格式是否正確。\n' + err.message);
      }
    });
  }
}

// --- 自訂動作編輯器邏輯 (Form Builder) ---

function setupRoutineCreator() {
  const list = document.getElementById('builder-stretches-list');
  const addStepBtn = document.getElementById('btn-add-builder-stretch');
  const form = document.getElementById('form-custom-routine');

  if (!addStepBtn) return;

  // 新增一個動作輸入群組
  const addStretchStep = () => {
    const item = document.createElement('div');
    item.className = 'builder-stretch-item';
    item.innerHTML = `
      <span class="drag-handle"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" style="pointer-events: none;"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></span>
      <div class="form-inputs-container">
        <!-- 第一行：動作名稱 -->
        <div class="form-inputs-row">
          <input type="text" class="input-text-field stretch-name" required placeholder="動作名稱 (如: 轉腰拉伸)">
        </div>
        <!-- 第二行：秒數、組數、雙側 -->
        <div class="form-inputs-row details-row">
          <div class="input-unit-wrapper">
            <input type="number" class="input-text-field stretch-duration" required placeholder="秒數" min="5" max="300" value="20">
            <span class="input-unit-label">秒</span>
          </div>
          <div class="input-unit-wrapper">
            <input type="number" class="input-text-field stretch-repeat" required placeholder="組數" min="1" max="10" value="1">
            <span class="input-unit-label">組</span>
          </div>
          <label class="checkbox-label stretch-bilateral-label">
            <input type="checkbox" class="stretch-bilateral"> 雙側
          </label>
        </div>
        <!-- 第三行：動作說明 -->
        <div class="form-inputs-row description-row">
          <textarea class="input-textarea-field stretch-desc" placeholder="動作說明 (選填，可分行輸入多個指引)" rows="2"></textarea>
        </div>
      </div>
      <button type="button" class="routine-action-btn remove-step-btn" title="移除動作" style="color: var(--danger-color);"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    `;

    item.querySelector('.remove-step-btn').addEventListener('click', () => {
      item.remove();
    });

    list.appendChild(item);
    makeItemDraggable(item);
  };

  addStepBtn.addEventListener('click', addStretchStep);

  // 預設添加第一個動作欄位
  addStretchStep();

  // 防止在輸入框按 Enter 鍵時意外送出表單，但允許 textarea 進行換行
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.target.tagName.toLowerCase() === 'textarea') {
        return;
      }
      e.preventDefault();
    }
  });

  // 自訂表單送出儲存
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const routineName = document.getElementById('custom-routine-name').value.trim();
    const items = list.querySelectorAll('.builder-stretch-item');

    if (items.length === 0) {
      showToast('請至少新增一個動作步驟。');
      return;
    }

    const steps = [];

    items.forEach((item, index) => {
      const name = item.querySelector('.stretch-name').value.trim();
      const duration = parseInt(item.querySelector('.stretch-duration').value);
      const repeat = parseInt(item.querySelector('.stretch-repeat').value || '1');
      const bilateral = item.querySelector('.stretch-bilateral').checked;
      const stepDesc = item.querySelector('.stretch-desc').value.trim();
      const animationType = 'default';

      // 支援多行動作說明，以換行分割
      const stepDescLines = stepDesc
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // 自動生成中文說明
      const instructions = [];
      if (stepDescLines.length > 0) {
        instructions.push(...stepDescLines);
      } else {
        instructions.push(`請做好準備，調整成適合「${name}」的舒適姿勢。`);
      }

      // 自動生成語音播報內容，將多行以逗號連接
      const ttsText =
        stepDescLines.length > 0
          ? stepDescLines.join('，')
          : `請做好準備，調整成適合「${name}」的舒適姿勢。`;

      // 自動生成繁體中文語音播報 timeline
      const ttsCues = [{ time: 0, text: `${name}。${ttsText}` }];

      if (duration >= 15) {
        const midpoint = Math.floor(duration / 2);
        ttsCues.push({ time: midpoint, text: `時間過半，請保持深長呼吸。` });
      }

      steps.push({
        id: `step-${index}-${Date.now()}`,
        name,
        duration,
        repeat,
        bilateral,
        description: stepDesc,
        animationType,
        instructions,
        ttsCues,
      });
    });

    const routineDescInput = document.getElementById('custom-routine-desc');
    const description =
      (routineDescInput && routineDescInput.value.trim()) ||
      `包含 ${steps.length} 個動作的自訂伸展流程。`;

    const selectedThemeEl = form.querySelector('input[name="routine-theme"]:checked');
    const theme = selectedThemeEl ? selectedThemeEl.value : 'sage';

    const restTimeInput = document.getElementById('custom-routine-rest-time');
    const restTime = restTimeInput ? parseInt(restTimeInput.value) || 5 : 5;

    const newRoutine = {
      id: editingRoutineId || undefined,
      name: routineName,
      description: description,
      theme: theme,
      restTime: restTime,
      durationText: '',
      steps,
    };
    newRoutine.durationText = calculateDurationText(newRoutine);

    stretches.saveCustomRoutine(newRoutine);
    renderRoutinesList();

    // 重設表單與視窗關閉
    resetCreateModalState();
    modals.create.classList.remove('active');
  });
}

// 開啟並填入編輯視窗資料
function openEditRoutineModal(routine) {
  editingRoutineId = routine.id;

  const modalTitle = document.getElementById('modal-create-title');
  if (modalTitle) modalTitle.textContent = '編輯自訂伸展流程';

  const nameInput = document.getElementById('custom-routine-name');
  if (nameInput) nameInput.value = routine.name;

  const descInput = document.getElementById('custom-routine-desc');
  if (descInput) descInput.value = routine.description || '';

  const list = document.getElementById('builder-stretches-list');
  if (list) {
    list.innerHTML = '';
    routine.steps.forEach((step) => {
      const item = document.createElement('div');
      item.className = 'builder-stretch-item';
      item.innerHTML = `
        <span class="drag-handle"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" style="pointer-events: none;"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></span>
        <div class="form-inputs-container">
          <!-- 第一行：動作名稱 -->
          <div class="form-inputs-row">
            <input type="text" class="input-text-field stretch-name" required placeholder="動作名稱 (如: 轉腰拉伸)" value="${escapeHTML(step.name)}">
          </div>
          <!-- 第二行：秒數、組數、雙側 -->
          <div class="form-inputs-row details-row">
            <div class="input-unit-wrapper">
              <input type="number" class="input-text-field stretch-duration" required placeholder="秒數" min="5" max="300" value="${step.duration}">
              <span class="input-unit-label">秒</span>
            </div>
            <div class="input-unit-wrapper">
              <input type="number" class="input-text-field stretch-repeat" required placeholder="組數" min="1" max="10" value="${step.repeat || 1}">
              <span class="input-unit-label">組</span>
            </div>
            <label class="checkbox-label stretch-bilateral-label">
              <input type="checkbox" class="stretch-bilateral" ${step.bilateral ? 'checked' : ''}> 雙側
            </label>
          </div>
          <!-- 第三行：動作說明 -->
          <div class="form-inputs-row description-row">
            <textarea class="input-textarea-field stretch-desc" placeholder="動作說明 (選填，可分行輸入多個指引)" rows="2">${escapeHTML(step.description || '')}</textarea>
          </div>
        </div>
        <button type="button" class="routine-action-btn remove-step-btn" title="移除動作" style="color: var(--danger-color);"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      `;
      item.querySelector('.remove-step-btn').addEventListener('click', () => item.remove());
      list.appendChild(item);
      makeItemDraggable(item);
    });
  }

  // 設定編輯中的主題顏色選取
  const theme = stretches.getRoutineTheme(routine);
  const themeRadio = document.querySelector(
    `#form-custom-routine input[name="routine-theme"][value="${theme}"]`
  );
  if (themeRadio) {
    themeRadio.checked = true;
  }

  // 設定休息時間
  const restTimeInput = document.getElementById('custom-routine-rest-time');
  if (restTimeInput) restTimeInput.value = routine.restTime !== undefined ? routine.restTime : 5;

  initialFormState = getCurrentFormState();
  modals.create.classList.add('active');
}

// --- 動作流程序列化與 QR 分享 ---

function openShareModal(routine) {
  const urlInput = document.getElementById('share-url-input');
  const qrContainer = document.getElementById('share-qr-container');
  const copyBtn = document.getElementById('btn-copy-share-url');

  if (!urlInput || !qrContainer) return;

  copyBtn.textContent = '複製';
  qrContainer.innerHTML = '<div id="qr-loading">正在產生 QR Code...</div>';

  // 過濾多餘欄位並轉為高密度 Tuple 格式，極致縮減 JSON 長度
  const cleanRoutine = {
    n: routine.name,
    d: routine.description,
    t: stretches.getRoutineTheme(routine),
    rt: routine.restTime !== undefined ? routine.restTime : 5,
    s: routine.steps.map((s) => [
      s.name, // 0
      s.duration, // 1
      s.repeat, // 2
      s.bilateral, // 3
      s.description, // 4
      s.animationType, // 5
      s.instructions, // 6
      s.ttsCues.map((c) => [c.time, c.text]), // 7
    ]),
  };

  // 將 JSON 字串轉換為 LZ-String 壓縮格式，並加上 'lz_' 前綴以供識別
  const jsonString = JSON.stringify(cleanRoutine);
  const compressedData = 'lz_' + LZString.compressToEncodedURIComponent(jsonString);

  // 建立分享連結
  const shareUrl = `${window.location.origin}${window.location.pathname}#share=${compressedData}`;
  urlInput.value = shareUrl;

  modals.share.classList.add('active');

  // 使用開源 API 產生 QR Code 圖片
  const qrImg = new Image();
  qrImg.onload = () => {
    qrContainer.innerHTML = '';
    qrContainer.appendChild(qrImg);
  };
  qrImg.onerror = () => {
    qrContainer.innerHTML = '<div class="error-msg">無法載入 QR Code 圖片。</div>';
  };
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;
  qrImg.alt = '自訂動作同步二維碼';

  // 複製按鈕點擊事件
  copyBtn.onclick = () => {
    urlInput.select();
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        copyBtn.textContent = '已複製！';
        setTimeout(() => (copyBtn.textContent = '複製'), 2000);
      })
      .catch((err) => {
        console.error('複製連結失敗:', err);
      });
  };
}

// 處理 URL 含有 `#share=...` 的自動匯入
function handleSharedUrlImport() {
  if (!window.location.hash.startsWith('#share=')) return;

  const hashData = window.location.hash.split('#share=')[1];

  try {
    if (!hashData.startsWith('lz_')) {
      throw new Error('不支援的網址格式');
    }

    const compressedData = hashData.substring(3);
    const jsonString = LZString.decompressFromEncodedURIComponent(compressedData);

    if (!jsonString) {
      throw new Error('解壓縮失敗');
    }

    const parsed = JSON.parse(jsonString);

    // 必定為高密度 Tuple 格式
    if (!parsed.s) {
      throw new Error('不支援的資料結構');
    }

    const routine = {
      name: parsed.n,
      description: parsed.d || '',
      theme: parsed.t || 'ocean',
      restTime: parsed.rt !== undefined ? parsed.rt : 5,
      steps: parsed.s.map((s) => ({
        name: s[0],
        duration: s[1],
        repeat: s[2],
        bilateral: s[3],
        description: s[4],
        animationType: s[5],
        instructions: s[6],
        ttsCues: s[7] ? s[7].map((c) => ({ time: c[0], text: c[1] })) : [],
      })),
    };

    if (routine && routine.name && routine.steps) {
      const saved = stretches.saveCustomRoutine(routine);

      // 清空 URL Hash 維持網址整潔
      window.history.replaceState(null, null, ' ');

      showToast(`成功匯入分享流程：「${saved.name}」！`);
    }
  } catch (err) {
    console.error('自動解析 URL 雜湊匯入失敗:', err);
  }
}

// --- 通用工具常數 ---

function calculateDurationText(routine) {
  const totalSeconds = routine.steps.reduce(
    (sum, s) => sum + s.duration * (s.repeat || 1) * (s.bilateral ? 2 : 1),
    0
  );
  const totalReps = routine.steps.reduce(
    (sum, s) => sum + (s.repeat || 1) * (s.bilateral ? 2 : 1),
    0
  );
  const totalRestSeconds = totalReps > 1 ? (totalReps - 1) * 8 : 0;
  const finalSeconds = totalSeconds + totalRestSeconds;
  const mins = Math.round((finalSeconds / 60) * 10) / 10;
  return `${mins} 分鐘`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 動態調整手機版操作區塊位置
function setupMobileLayout() {
  const mql = window.matchMedia('(max-width: 600px)');
  const infoPanel = document.querySelector('.info-panel');
  const controls = document.querySelector('.workout-controls');
  const infoCard = document.querySelector('.stretch-info-card');

  if (!infoPanel || !controls || !infoCard) return;

  const handleResize = (e) => {
    if (e.matches) {
      // 在小螢幕下，將操作區塊移到文字區塊前面
      infoPanel.insertBefore(controls, infoCard);
    } else {
      // 在大螢幕下，將操作區塊移到最後
      infoPanel.appendChild(controls);
    }
  };

  // 監聽螢幕寬度變化
  mql.addEventListener('change', handleResize);
  // 初始化時執行一次
  handleResize(mql);
}

// --- Screen Wake Lock 避免螢幕休眠 ---
let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock acquired');
    }
  } catch (err) {
    console.warn('Wake Lock error:', err);
  }
}

function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock
      .release()
      .then(() => {
        wakeLock = null;
        console.log('Screen Wake Lock released');
      })
      .catch((err) => console.warn(err));
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const currentState = engine.getState();
    if (
      currentState &&
      currentState !== engine.States.IDLE &&
      currentState !== engine.States.COMPLETED
    ) {
      requestWakeLock();
    }
  }
});

// --- 拖拉排序邏輯 ---
let draggedItem = null;

function makeItemDraggable(item) {
  const handle = item.querySelector('.drag-handle');
  if (!handle) return;

  handle.addEventListener('mousedown', () => item.setAttribute('draggable', 'true'));
  handle.addEventListener('touchstart', () => item.setAttribute('draggable', 'true'), {
    passive: true,
  });

  item.addEventListener('dragend', () => {
    item.removeAttribute('draggable');
    item.classList.remove('dragging');
    draggedItem = null;
  });

  item.addEventListener('dragstart', (e) => {
    draggedItem = item;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => item.classList.add('dragging'), 0);
  });
}

function setupBuilderDragAndDrop(listId) {
  const list = document.getElementById(listId);
  if (!list) return;

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    // 支援滑鼠與觸控的 Y 座標
    const y = e.clientY || (e.touches && e.touches.length > 0 ? e.touches[0].clientY : 0);
    const afterElement = getDragAfterElement(list, y);
    if (afterElement == null) {
      list.appendChild(draggedItem);
    } else {
      list.insertBefore(draggedItem, afterElement);
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.builder-stretch-item:not(.dragging)')];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}
