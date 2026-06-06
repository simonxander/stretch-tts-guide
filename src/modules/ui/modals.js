import { escapeHTML, calculateDurationText } from './utils.js';
import * as stretches from '../stretches.js';
import * as engine from '../engine.js';
import { showConfirmDialog } from './components/dialog.js';
import LZString from 'lz-string';

export const modalsElements = {
  create: document.getElementById('modal-create-routine'),
  import: document.getElementById('modal-import-routine'),
  share: document.getElementById('modal-share-routine'),
  aiImport: document.getElementById('modal-ai-import'),
  preview: document.getElementById('modal-preview-routine'),
};

export function setupModalScrollLock() {
  const observer = new MutationObserver(() => {
    const hasActive = document.querySelector('.modal-overlay.active, .drawer.active') !== null;
    document.body.style.overflow = hasActive ? 'hidden' : '';
  });

  const config = { attributes: true, attributeFilter: ['class'] };
  document
    .querySelectorAll('.modal-overlay, .drawer')
    .forEach((el) => observer.observe(el, config));
}

export function hideModals() {
  Object.values(modalsElements).forEach((m) => {
    if (m) m.classList.remove('active');
  });
}

// 點擊背景遮罩關閉
export function setupModalOverlayClicks() {
  Object.values(modalsElements).forEach((m) => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        // 編輯時點擊外部不自動關閉，避免誤觸遺失資料
        if (m === modalsElements.create) {
          return;
        }
        hideModals();
      }
    });
  });
}

// 開啟預覽視窗
export function openPreviewModal(routine, options = {}) {
  const titleEl = document.getElementById('preview-routine-title');
  const metaEl = document.getElementById('preview-routine-meta');
  const stepsEl = document.getElementById('preview-routine-steps');
  const actionsLeftEl = document.getElementById('preview-routine-actions-left');
  const startBtn = document.getElementById('btn-start-preview');

  if (!titleEl || !metaEl || !stepsEl || !actionsLeftEl || !startBtn || !modalsElements.preview) return;

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
    modalsElements.preview.classList.remove('active');
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
      modalsElements.preview.classList.remove('active');
      if (options.onEdit) options.onEdit(routine);
    });
    actionsLeftEl.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.title = '刪除此流程';
    deleteBtn.style.color = 'var(--danger-color)';
    deleteBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
    deleteBtn.addEventListener('click', () => {
      modalsElements.preview.classList.remove('active');
      showConfirmDialog(`確定要刪除「${routine.name}」伸展流程嗎？`, () => {
        stretches.deleteCustomRoutine(routine.id);
        if (options.onDelete) options.onDelete();
      });
    });
    actionsLeftEl.appendChild(deleteBtn);
  }

  // 綁定開始運動
  startBtn.onclick = () => {
    modalsElements.preview.classList.remove('active');
    engine.startWorkout(routine);
  };

  modalsElements.preview.classList.add('active');
}

// --- 動作流程序列化與 QR 分享 ---
export function openShareModal(routine) {
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
    ]),
  };

  // 將 JSON 字串轉換為 LZ-String 壓縮格式，並加上 'lz_' 前綴以供識別
  const jsonString = JSON.stringify(cleanRoutine);
  const compressedData = 'lz_' + LZString.compressToEncodedURIComponent(jsonString);

  // 建立分享連結
  const shareUrl = `${window.location.origin}${window.location.pathname}#share=${compressedData}`;
  urlInput.value = shareUrl;

  modalsElements.share.classList.add('active');

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
