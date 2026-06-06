// --- 通用工具常數 ---

export function calculateDurationText(routine) {
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

export function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 動態調整手機版操作區塊位置
export function setupMobileLayout() {
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
export let wakeLock = null;

export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock acquired');
    }
  } catch (err) {
    console.warn('Wake Lock error:', err);
  }
}

export function releaseWakeLock() {
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

// --- 拖拉排序邏輯 ---
let draggedItem = null;

export function makeItemDraggable(item) {
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

export function setupBuilderDragAndDrop(listId) {
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

export function getDragAfterElement(container, y) {
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
