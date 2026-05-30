// UI 介面控制與事件處理 (繁體中文版)
import * as stretches from './stretches.js';
import * as engine from './engine.js';
import * as tts from './tts.js';
import { getAnimationSVG } from './animations.js';

// DOM 節點選擇器
const screens = {
  home: document.getElementById('screen-home'),
  workout: document.getElementById('screen-workout'),
  summary: document.getElementById('screen-summary'),
};

// 彈出視窗
const modals = {
  create: document.getElementById('modal-create-routine'),
  import: document.getElementById('modal-import-routine'),
  share: document.getElementById('modal-share-routine'),
};

// 圓形計時環常數
const TIMER_RING_DASHARRAY = 282.7; // 2 * Math.PI * 45

// 自訂流程編輯中的 ID
let editingRoutineId = null;

// 初始化 UI
export function initUI() {
  setupThemeToggle();
  setupSettingsDrawer();
  setupWorkoutControls();
  setupModals();
  setupRoutineCreator();

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
      <div class="routine-meta-item">⏱️ ${escapeHTML(routine.durationText || calculateDurationText(routine))}</div>
      <div class="routine-meta-item">🧘 ${routine.steps.reduce((sum, s) => sum + (s.repeat || 1) * (s.bilateral ? 2 : 1), 0)} 個步驟</div>
    `;
    footer.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'routine-actions';

    // 分享按鈕
    const shareBtn = document.createElement('button');
    shareBtn.className = 'routine-action-btn';
    shareBtn.title = '分享此流程';
    shareBtn.innerHTML = '📤';
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
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditRoutineModal(routine);
      });
      actions.appendChild(editBtn);

      // 刪除按鈕
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'routine-action-btn';
      deleteBtn.title = '刪除此流程';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.style.color = 'var(--danger-color)';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${routine.name}」伸展流程嗎？`)) {
          stretches.deleteCustomRoutine(routine.id);
          renderRoutinesList();
        }
      });
      actions.appendChild(deleteBtn);
    }

    const startBtn = document.createElement('div');
    startBtn.className = 'routine-start-btn';
    startBtn.innerHTML = '▶';
    actions.appendChild(startBtn);

    footer.appendChild(actions);
    card.appendChild(footer);

    // 點擊卡片開始運動
    card.addEventListener('click', () => {
      engine.startWorkout(routine);
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
  if (state === engine.States.IDLE) {
    showScreen('home');
    return;
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

  if (details.step && details.step.totalSets > 1) {
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
    if (stretchNameEl) stretchNameEl.textContent = '放鬆休息';
    if (instructionsContainer) {
      if (details.nextStep) {
        instructionsContainer.innerHTML = `
          <p>請放鬆肌肉，稍作休息。</p>
          <p>下一個動作是：<strong>${escapeHTML(details.nextStep.name)}</strong></p>
        `;
      } else {
        instructionsContainer.innerHTML = `<p>做得好！流程即將結束，請稍作休息。</p>`;
      }
    }
    if (animationContainer) {
      animationContainer.innerHTML = getAnimationSVG('default');
    }

    document.getElementById('timer-state-label').textContent = '休息';
  }
}

function handleEngineTick(timeRemaining, percent) {
  if (engine.getState() === engine.States.EXPLANATION) {
    return;
  }
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

function handleEngineComplete(stats) {
  showScreen('summary');

  const minutes = Math.floor(stats.totalTime / 60);
  const seconds = stats.totalTime % 60;
  const timeString = `${minutes} 分 ${seconds < 10 ? '0' : ''}${seconds} 秒`;

  document.getElementById('summary-total-time').textContent = timeString;
  document.getElementById('summary-exercises-count').textContent = stats.stepCount;
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
    if (confirm('確定要放棄並結束這次的伸展運動嗎？')) {
      engine.stopWorkout();
    }
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
  const list = document.getElementById('builder-stretches-list');
  if (list) {
    list.innerHTML = '';
    // 補上一個預設空白動作步驟
    const item = document.createElement('div');
    item.className = 'builder-stretch-item';
    item.innerHTML = `
      <span class="drag-handle">☰</span>
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
      <button type="button" class="routine-action-btn remove-step-btn" title="移除動作" style="color: var(--danger-color);">✖</button>
    `;
    item.querySelector('.remove-step-btn').addEventListener('click', () => item.remove());
    list.appendChild(item);
  }
}

// --- 彈出視窗事件設定 ---

function setupModals() {
  const createBtn = document.getElementById('btn-create-routine');
  const importBtn = document.getElementById('btn-import-routine');

  const closeCreateBtn = document.getElementById('btn-close-create-modal');
  const closeImportBtn = document.getElementById('btn-close-import-modal');
  const closeShareBtn = document.getElementById('btn-close-share-modal');

  const cancelCreateBtn = document.getElementById('btn-cancel-create');
  const cancelImportBtn = document.getElementById('btn-cancel-import');
  const closeShareBtn2 = document.getElementById('btn-close-share');

  // 開啟視窗
  createBtn.addEventListener('click', () => modals.create.classList.add('active'));
  importBtn.addEventListener('click', () => modals.import.classList.add('active'));

  // 關閉視窗
  const hideModals = () => {
    Object.values(modals).forEach((m) => m.classList.remove('active'));
  };

  closeCreateBtn.addEventListener('click', () => {
    resetCreateModalState();
    hideModals();
  });
  closeImportBtn.addEventListener('click', hideModals);
  closeShareBtn.addEventListener('click', hideModals);

  cancelCreateBtn.addEventListener('click', () => {
    resetCreateModalState();
    hideModals();
  });
  cancelImportBtn.addEventListener('click', hideModals);
  closeShareBtn2.addEventListener('click', hideModals);

  // 點擊背景遮罩關閉
  Object.values(modals).forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        if (m === modals.create) {
          resetCreateModalState();
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
      <span class="drag-handle">☰</span>
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
      <button type="button" class="routine-action-btn remove-step-btn" title="移除動作" style="color: var(--danger-color);">✖</button>
    `;

    item.querySelector('.remove-step-btn').addEventListener('click', () => {
      item.remove();
    });

    list.appendChild(item);
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
      alert('請至少新增一個動作步驟。');
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
      instructions.push(
        `保持身體拉伸並維持此動作 ${duration} 秒。`,
        `過程中請維持緩慢、平穩且深沉的吸吐。`,
        `三，二，一，動作結束，請慢慢放鬆身體。`
      );

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

      ttsCues.push({ time: duration, text: '放鬆。' });

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

    const newRoutine = {
      id: editingRoutineId || undefined,
      name: routineName,
      description: description,
      theme: theme,
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
        <span class="drag-handle">☰</span>
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
        <button type="button" class="routine-action-btn remove-step-btn" title="移除動作" style="color: var(--danger-color);">✖</button>
      `;
      item.querySelector('.remove-step-btn').addEventListener('click', () => item.remove());
      list.appendChild(item);
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

  // 過濾多餘欄位，精簡分享內容
  const cleanRoutine = {
    name: routine.name,
    description: routine.description,
    durationText: routine.durationText,
    theme: stretches.getRoutineTheme(routine),
    steps: routine.steps.map((s) => ({
      name: s.name,
      duration: s.duration,
      repeat: s.repeat,
      bilateral: s.bilateral,
      description: s.description,
      animationType: s.animationType,
      instructions: s.instructions,
      ttsCues: s.ttsCues,
    })),
  };

  // 將 JSON 字串轉換為 Base64 格式
  const jsonString = JSON.stringify(cleanRoutine);
  const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

  // 建立分享連結
  const shareUrl = `${window.location.origin}${window.location.pathname}#share=${base64Data}`;
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

  const base64Data = window.location.hash.split('#share=')[1];

  try {
    const jsonString = decodeURIComponent(escape(atob(base64Data)));
    const routine = JSON.parse(jsonString);

    if (routine && routine.name && routine.steps) {
      const saved = stretches.saveCustomRoutine(routine);

      // 清空 URL Hash 維持網址整潔
      window.history.replaceState(null, null, ' ');

      alert(`成功匯入分享流程：「${saved.name}」！`);
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
