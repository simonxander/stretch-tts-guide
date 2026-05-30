// Main entry point for ZenStretch application
import { initUI } from './modules/ui.js';

// Setup app on page load
document.addEventListener('DOMContentLoaded', () => {
  try {
    initUI();
  } catch (error) {
    console.error('Initialization error during ZenStretch startup:', error);
  }
});

// Register Service Worker for PWA support (offline/installation)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
  });
}

