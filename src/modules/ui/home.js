import * as stretches from '../stretches.js';
import * as engine from '../engine.js';
import { escapeHTML, calculateDurationText } from './utils.js';
import { openPreviewModal, openShareModal } from './modals.js';
import { showConfirmDialog } from './components/dialog.js';
import { showToast } from './components/toast.js';
import LZString from 'lz-string';

// 繪製首頁伸展流程卡片
export function renderRoutinesList(options = {}) {
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
        if (options.onEdit) options.onEdit(routine);
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
          renderRoutinesList(options);
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
      openPreviewModal(routine, {
        onEdit: options.onEdit,
        onDelete: () => renderRoutinesList(options)
      });
    });

    container.appendChild(card);
  });
}

// 處理 URL 含有 `#share=...` 的自動匯入
export function handleSharedUrlImport(options = {}) {
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
      })),
    };

    if (routine && routine.name && routine.steps) {
      const saved = stretches.saveCustomRoutine(routine);

      // 清空 URL Hash 維持網址整潔
      window.history.replaceState(null, null, ' ');

      showToast(`成功匯入分享流程：「${saved.name}」！`);
      if (options.onImportSuccess) {
        options.onImportSuccess();
      }
    }
  } catch (err) {
    console.error('自動解析 URL 雜湊匯入失敗:', err);
  }
}
