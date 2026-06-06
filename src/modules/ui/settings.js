import * as tts from '../tts.js';
import { signIn, signOut, onAuthChange, syncFromCloud } from '../firebase.js';
import { renderRoutinesList } from './home.js';
import { openEditRoutineModal } from './builder.js';

export function setupSettingsDrawer() {
  const drawer = document.getElementById('settings-drawer');
  const overlay = document.getElementById('settings-overlay');
  const toggleBtn = document.getElementById('settings-toggle');
  const closeBtn = document.getElementById('btn-close-settings');

  if (!drawer || !toggleBtn) return;

  const openDrawer = () => drawer.classList.add('active');
  const closeDrawer = () => drawer.classList.remove('active');

  toggleBtn.addEventListener('click', openDrawer);
  if(closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if(overlay) overlay.addEventListener('click', closeDrawer);

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
  if (voiceSelect) {
    voiceSelect.addEventListener('change', (e) => {
      tts.setVoice(e.target.value);
    });
  }

  // 更改速度
  const rateSlider = document.getElementById('tts-rate');
  const rateVal = document.getElementById('tts-rate-val');
  if (rateSlider && rateVal) {
    rateSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value).toFixed(1);
      rateVal.textContent = `${val}x`;
      tts.setRate(val);
    });
  }

  // 更改音量
  const volSlider = document.getElementById('tts-volume');
  const volVal = document.getElementById('tts-volume-val');
  if (volSlider && volVal) {
    volSlider.addEventListener('input', (e) => {
      const val = Math.round(e.target.value * 100);
      volVal.textContent = `${val}%`;
      tts.setVolume(e.target.value);
    });
  }

  // 提示音效開關
  const sfxToggle = document.getElementById('sfx-toggle');
  if (sfxToggle) {
    sfxToggle.addEventListener('change', (e) => {
      tts.setSoundEffectsEnabled(e.target.checked);
    });
  }

  // 語音測試按鈕
  const btnTestVoice = document.getElementById('btn-test-voice');
  if (btnTestVoice) {
    btnTestVoice.addEventListener('click', () => {
      tts.speak('這是 ZenStretch 語音引導系統的測試。一切運作正常，準備好開始伸展了嗎？');
    });
  }

  // 預載快取數值至 DOM
  if (rateSlider) rateSlider.value = tts.getRate();
  if (rateVal) rateVal.textContent = `${tts.getRate()}x`;

  if (volSlider) volSlider.value = tts.getVolume();
  if (volVal) volVal.textContent = `${Math.round(tts.getVolume() * 100)}%`;

  if (sfxToggle) sfxToggle.checked = tts.getSoundEffectsEnabled();

  // 綁定 Google 登入/登出按鈕
  const loginBtn = document.getElementById('btn-google-login');
  const logoutBtn = document.getElementById('btn-google-logout');
  const authStatusText = document.getElementById('auth-status-text');

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      try {
        await signIn();
      } catch (e) {
        console.error('Login failed', e);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut();
      } catch (e) {
        console.error('Logout failed', e);
      }
    });
  }

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
      if (authStatusText) authStatusText.textContent = `已登入：${user.email}`;
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';

      // 登入成功後，嘗試從雲端下載最新資料並覆蓋本地
      const hasUpdates = await syncFromCloud();
      if (hasUpdates) {
        // 更新畫面上的狀態
        renderRoutinesList({ onEdit: openEditRoutineModal });

        // 更新 TTS 設定與隱藏預設開關的顯示狀態
        const hidePresetsCheckbox = document.getElementById('toggle-hide-presets');
        if (hidePresetsCheckbox) {
          hidePresetsCheckbox.checked = localStorage.getItem('zenstretch_hide_presets') === 'true';
        }

        if (rateSlider) rateSlider.value = tts.getRate();
        if (rateVal) rateVal.textContent = `${tts.getRate()}x`;
        if (volSlider) volSlider.value = tts.getVolume();
        if (volVal) volVal.textContent = `${Math.round(tts.getVolume() * 100)}%`;
        if (sfxToggle) sfxToggle.checked = tts.getSoundEffectsEnabled();
      }
    } else {
      if (authStatusText) authStatusText.textContent = '尚未登入';
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';

      if (promptPopup && localStorage.getItem('zenstretch_dismissed_login_prompt') !== 'true') {
        setTimeout(() => {
          promptPopup.style.display = 'block';
        }, 1500);
      }
    }
  });
}

export function populateVoiceDropdown(voices, currentVoice) {
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
