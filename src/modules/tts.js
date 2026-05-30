// Text-to-Speech Controller using the Web Speech API

const STORAGE_KEY = 'zenstretch_tts_settings';

// State variables
let voices = [];
let currentVoice = null;
let currentRate = 1.0;
let currentVolume = 1.0;
let currentPitch = 1.0;
let soundEffectsEnabled = true;

// Active utterance reference
let activeUtterance = null;
let isSpeakingState = false;

// Callbacks
let globalOnStart = null;
let globalOnEnd = null;

// Initialize settings from LocalStorage
function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const config = JSON.parse(saved);
      currentRate = config.rate !== undefined ? config.rate : 1.0;
      currentVolume = config.volume !== undefined ? config.volume : 1.0;
      currentPitch = config.pitch !== undefined ? config.pitch : 1.0;
      soundEffectsEnabled = config.sfx !== undefined ? config.sfx : true;
      return config.voiceURI;
    } catch (e) {
      console.error('Error reading TTS settings:', e);
    }
  }
  return null;
}

export function saveSettings() {
  const config = {
    voiceURI: currentVoice ? currentVoice.voiceURI : '',
    rate: currentRate,
    volume: currentVolume,
    pitch: currentPitch,
    sfx: soundEffectsEnabled,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// Fetch available voices
export function initTTS(onVoicesLoaded) {
  const savedVoiceURI = loadSettings();

  const loadVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    voices = window.speechSynthesis.getVoices();

    // Auto-select preferred voice (e.g. English/Chinese based on browser settings)
    if (voices.length > 0) {
      if (savedVoiceURI) {
        currentVoice = voices.find((v) => v.voiceURI === savedVoiceURI) || null;
      }

      // Fallback: search for Google Chinese (zh-TW) voices first, then any Chinese, then default
      if (!currentVoice) {
        currentVoice =
          voices.find(
            (v) =>
              (v.lang.replace('_', '-').toLowerCase() === 'zh-tw' ||
                v.lang.replace('_', '-').toLowerCase() === 'zh-hk') &&
              v.name.includes('Google')
          ) ||
          voices.find(
            (v) =>
              v.lang.replace('_', '-').toLowerCase() === 'zh-tw' ||
              v.lang.replace('_', '-').toLowerCase() === 'zh-hk'
          ) ||
          voices.find((v) => v.lang.toLowerCase().includes('zh') && v.name.includes('Google')) ||
          voices.find((v) => v.lang.toLowerCase().includes('zh')) ||
          voices.find((v) => v.lang.includes('en') && v.name.includes('Natural')) ||
          voices[0];
      }

      if (onVoicesLoaded) onVoicesLoaded(voices, currentVoice);
    }
  };

  // Chrome loads voices asynchronously
  loadVoices();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export function setTTSCallbacks(onStart, onEnd) {
  globalOnStart = onStart;
  globalOnEnd = onEnd;
}

// Core speak function
export function speak(text, onFinishedCallback = null) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Stop any active speech first
  stopSpeaking();

  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;

  if (currentVoice) {
    utterance.voice = currentVoice;
  }
  utterance.rate = currentRate;
  utterance.volume = currentVolume;
  utterance.pitch = currentPitch;

  utterance.onstart = () => {
    isSpeakingState = true;
    if (globalOnStart) globalOnStart();
  };

  utterance.onend = () => {
    isSpeakingState = false;
    activeUtterance = null;
    if (globalOnEnd) globalOnEnd();
    if (onFinishedCallback) onFinishedCallback();
  };

  utterance.onerror = (e) => {
    // Ignore errors triggered by intentional cancel (stop)
    if (e.error !== 'interrupted') {
      console.warn('Speech synthesis error:', e);
    }
    isSpeakingState = false;
    activeUtterance = null;
    if (globalOnEnd) globalOnEnd();
  };

  window.speechSynthesis.speak(utterance);
}

// Play Sound Effect (Chimes / Beeps) using Web Audio API
export function playChime(frequency = 587.33, type = 'sine', duration = 0.5) {
  // D5 note
  if (!soundEffectsEnabled) return;
  if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Smooth envelope decay to avoid clicks
    gain.gain.setValueAtTime(currentVolume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.error('Error playing sound chime:', err);
  }
}

// Pause voice
export function pauseSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.pause();
  isSpeakingState = false;
  if (globalOnEnd) globalOnEnd(); // Stop visual waveform
}

// Resume voice
export function resumeSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.resume();
  if (activeUtterance) {
    isSpeakingState = true;
    if (globalOnStart) globalOnStart(); // Restart visual waveform
  }
}

// Stop speaking and clear all queues
export function stopSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  isSpeakingState = false;
  activeUtterance = null;
  if (globalOnEnd) globalOnEnd();
}

// Getters and Setters
export function isSpeaking() {
  return isSpeakingState;
}

export function getVoices() {
  return voices;
}

export function getCurrentVoice() {
  return currentVoice;
}

export function setVoice(voiceURI) {
  currentVoice = voices.find((v) => v.voiceURI === voiceURI) || null;
  saveSettings();
}

export function getRate() {
  return currentRate;
}

export function setRate(rate) {
  currentRate = parseFloat(rate);
  saveSettings();
}

export function getVolume() {
  return currentVolume;
}

export function setVolume(volume) {
  currentVolume = parseFloat(volume);
  saveSettings();
}

export function getSoundEffectsEnabled() {
  return soundEffectsEnabled;
}

export function setSoundEffectsEnabled(enabled) {
  soundEffectsEnabled = enabled;
  saveSettings();
}
