// UI 介面控制與事件處理 (繁體中文版) - Refactored Facade
import * as engine from './engine.js';
import * as tts from './tts.js';

import { setupThemeToggle } from './ui/themes.js';
import { setupSettingsDrawer, populateVoiceDropdown } from './ui/settings.js';
import { setupWorkoutControls, handleEngineStateChange, handleEngineTick, handleEngineBreathing, handleEngineComplete } from './ui/workout.js';
import { setupHistoryUI } from './ui/historyUI.js';
import { setupModalScrollLock, setupModalOverlayClicks } from './ui/modals.js';
import { setupModalsLogic, setupRoutineCreator, openEditRoutineModal } from './ui/builder.js';
import { setupMobileLayout } from './ui/utils.js';
import { renderRoutinesList, handleSharedUrlImport } from './ui/home.js';

// 初始化 UI
export function initUI() {
  setupThemeToggle();
  setupSettingsDrawer();
  setupWorkoutControls();
  setupHistoryUI();
  setupModalScrollLock();
  setupModalOverlayClicks();

  // 註冊 Engine 回呼
  engine.registerCallbacks({
    onStateChange: handleEngineStateChange,
    onTick: handleEngineTick,
    onBreathing: handleEngineBreathing,
    onComplete: handleEngineComplete,
  });

  setupModalsLogic();
  setupRoutineCreator();
  setupMobileLayout();

  // 初始化語音選擇器
  tts.initTTS(populateVoiceDropdown);

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
  handleSharedUrlImport({ onImportSuccess: () => renderRoutinesList({ onEdit: openEditRoutineModal }) });

  // 綁定「隱藏內建流程」切換開關
  const hidePresetsCheckbox = document.getElementById('toggle-hide-presets');
  if (hidePresetsCheckbox) {
    const savedHidePresets = localStorage.getItem('zenstretch_hide_presets') === 'true';
    hidePresetsCheckbox.checked = savedHidePresets;
    hidePresetsCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('zenstretch_hide_presets', e.target.checked);
      renderRoutinesList({ onEdit: openEditRoutineModal });

      // 動態載入並觸發同步
      import('./firebase.js').then((module) => {
        module.syncToCloud();
      });
    });
  }

  // 繪製流程列表
  renderRoutinesList({ onEdit: openEditRoutineModal });
}
