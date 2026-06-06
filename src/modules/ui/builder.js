import * as stretches from '../stretches.js';
import { modalsElements, hideModals } from './modals.js';
import { showConfirmDialog } from './components/dialog.js';
import { showToast } from './components/toast.js';
import { makeItemDraggable, setupBuilderDragAndDrop, calculateDurationText, escapeHTML } from './utils.js';
import { renderRoutinesList } from './home.js';

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

export function resetCreateModalState() {
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

// 開啟並填入編輯視窗資料
export function openEditRoutineModal(routine) {
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
  modalsElements.create.classList.add('active');
}

export function setupRoutineCreator() {
  setupBuilderDragAndDrop('builder-stretches-list');

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

      steps.push({
        id: `step-${index}-${Date.now()}`,
        name,
        duration,
        repeat,
        bilateral,
        description: stepDesc,
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
    renderRoutinesList({ onEdit: openEditRoutineModal });

    // 重設表單與視窗關閉
    resetCreateModalState();
    modalsElements.create.classList.remove('active');
  });
}

export function setupModalsLogic() {
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
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      initialFormState = getCurrentFormState();
      modalsElements.create.classList.add('active');
    });
  }
  if (importBtn) {
    importBtn.addEventListener('click', () => modalsElements.import.classList.add('active'));
  }
  if (createAiBtn) {
    createAiBtn.addEventListener('click', () => {
      document.getElementById('ai-json-input').value = '';
      if (modalsElements.aiImport) modalsElements.aiImport.classList.add('active');
    });
  }

  // 關閉視窗邏輯
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

  if (closeCreateBtn) closeCreateBtn.addEventListener('click', handleCancelCreate);
  if (closeImportBtn) closeImportBtn.addEventListener('click', hideModals);
  if (closeShareBtn) closeShareBtn.addEventListener('click', hideModals);
  if (closeAiBtn) closeAiBtn.addEventListener('click', hideModals);
  if (closePreviewBtn) closePreviewBtn.addEventListener('click', hideModals);

  if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', handleCancelCreate);
  if (cancelImportBtn) cancelImportBtn.addEventListener('click', hideModals);
  if (closeShareBtn2) closeShareBtn2.addEventListener('click', hideModals);
  if (cancelAiBtn) cancelAiBtn.addEventListener('click', hideModals);

  // 處理匯入流程提交
  const submitImportBtn = document.getElementById('btn-submit-import');
  if (submitImportBtn) {
    submitImportBtn.addEventListener('click', () => {
      const importText = document.getElementById('import-text').value.trim();
      const errorEl = document.getElementById('import-error');
      if(errorEl) errorEl.style.display = 'none';

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
        renderRoutinesList({ onEdit: openEditRoutineModal });
        hideModals();
        document.getElementById('import-text').value = '';
      } catch (err) {
        console.error('匯入自訂流程失敗:', err);
        if(errorEl) errorEl.style.display = 'block';
      }
    });
  }

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
