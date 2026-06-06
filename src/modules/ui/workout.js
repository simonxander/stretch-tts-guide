import * as engine from '../engine.js';
import * as history from '../history.js';
import { escapeHTML, requestWakeLock, releaseWakeLock, wakeLock } from './utils.js';
import { showScreen } from './screens.js';
import { applyActiveRoutineTheme } from './themes.js';
import { showConfirmDialog } from './components/dialog.js';

// 圓形計時環常數
const TIMER_RING_DASHARRAY = 282.7; // 2 * Math.PI * 45

export function setupWorkoutControls() {
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

export function handleEngineStateChange(state, details) {
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

  // 取得動作詳細資料
  const stretchNameEl = document.getElementById('current-stretch-name');
  const instructionsContainer = document.getElementById('current-stretch-instructions');

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

    let displaySet = details.step.set;
    // 如果正在休息，且有上一個步驟，維持顯示剛做完的組數
    if (state === engine.States.REST && details.stepIndex > 0) {
      const prevStep = details.routine.steps[details.stepIndex - 1];
      if (prevStep && prevStep.parentId === details.step.parentId) {
        displaySet = prevStep.set;
      }
    }

    if (setCurrent) setCurrent.textContent = displaySet;
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

export function handleEngineTick(timeRemaining, percent) {
  const countdownEl = document.getElementById('timer-countdown');
  if (countdownEl) countdownEl.textContent = timeRemaining;

  const progressBar = document.getElementById('timer-progress-bar');
  if (progressBar) {
    const offset = TIMER_RING_DASHARRAY - (percent / 100) * TIMER_RING_DASHARRAY;
    progressBar.style.strokeDashoffset = offset;
  }
}

export function handleEngineBreathing(breathingState, _progress) {
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

export function handleEngineComplete(stats) {
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
