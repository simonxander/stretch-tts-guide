import * as history from '../history.js';
import { showScreen, screens } from './screens.js';
import { showConfirmDialog } from './components/dialog.js';
import { escapeHTML } from './utils.js';

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let currentFilterDate = null;

export function setupHistoryUI() {
  const historyToggleBtn = document.getElementById('history-toggle');
  const historyBackBtn = document.getElementById('btn-history-back');

  if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', () => {
      const isHistoryScreen = screens.history && screens.history.classList.contains('active');
      if (isHistoryScreen) {
        showScreen('home');
      } else {
        currentCalYear = new Date().getFullYear();
        currentCalMonth = new Date().getMonth();
        currentFilterDate = null;
        showScreen('history');
        renderCalendar();
        renderHistoryList();
      }
    });
  }

  if (historyBackBtn) {
    historyBackBtn.addEventListener('click', () => {
      showScreen('home');
    });
  }

  const btnPrev = document.getElementById('btn-cal-prev');
  const btnNext = document.getElementById('btn-cal-next');
  const btnClear = document.getElementById('btn-clear-date-filter');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentCalMonth--;
      if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
      }
      renderCalendar();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentCalMonth++;
      if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
      }
      renderCalendar();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      currentFilterDate = null;
      renderCalendar();
      renderHistoryList();
    });
  }
}

export function renderCalendar() {
  const calGrid = document.getElementById('calendar-grid');
  const calHeader = document.getElementById('calendar-month-year');
  if (!calGrid || !calHeader) return;

  const monthNames = [
    '1 月',
    '2 月',
    '3 月',
    '4 月',
    '5 月',
    '6 月',
    '7 月',
    '8 月',
    '9 月',
    '10 月',
    '11 月',
    '12 月',
  ];
  calHeader.textContent = `${currentCalYear} 年 ${monthNames[currentCalMonth]}`;

  const records = history.getAllRecords();
  const daysWithRecords = new Set();
  records.forEach((r) => {
    const d = new Date(r.date);
    const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    daysWithRecords.add(dateStr);
  });

  calGrid.innerHTML = '';

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  dayNames.forEach((day) => {
    const headerCell = document.createElement('div');
    headerCell.className = 'calendar-day-header';
    headerCell.textContent = day;
    calGrid.appendChild(headerCell);
  });

  const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell empty';
    calGrid.appendChild(emptyCell);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const dateStr = `${currentCalYear}-${currentCalMonth}-${d}`;
    const isoDateStr = `${currentCalYear}-${(currentCalMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

    if (
      currentCalYear === today.getFullYear() &&
      currentCalMonth === today.getMonth() &&
      d === today.getDate()
    ) {
      cell.classList.add('today');
    }

    if (currentFilterDate === isoDateStr) {
      cell.classList.add('selected');
    }

    const numSpan = document.createElement('span');
    numSpan.className = 'date-num';
    numSpan.textContent = d;
    cell.appendChild(numSpan);

    if (daysWithRecords.has(dateStr)) {
      const stamp = document.createElement('span');
      stamp.className = 'calendar-stamp';
      stamp.style.display = 'flex';
      stamp.style.alignItems = 'center';
      stamp.style.justifyContent = 'center';
      stamp.style.width = '100%';
      stamp.style.height = '100%';
      stamp.innerHTML =
        '<div style="width: 32px; height: 32px; border: 2px solid var(--accent-primary); border-radius: 50%; opacity: 0.6;"></div>';
      cell.appendChild(stamp);
    }

    cell.addEventListener('click', () => {
      if (currentFilterDate === isoDateStr) {
        currentFilterDate = null;
      } else {
        currentFilterDate = isoDateStr;
      }
      renderCalendar();
      renderHistoryList();
    });

    calGrid.appendChild(cell);
  }
}

export function renderHistoryList() {
  const container = document.getElementById('history-list');
  const title = document.getElementById('history-list-title');
  const clearBtn = document.getElementById('btn-clear-date-filter');
  if (!container) return;

  let records = history.getAllRecords();

  if (currentFilterDate) {
    records = records.filter((r) => {
      const d = new Date(r.date);
      const rDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      return rDateStr === currentFilterDate;
    });
    if (title) title.textContent = `${currentFilterDate} 的紀錄`;
    if (clearBtn) clearBtn.style.display = 'inline-block';
  } else {
    if (title) title.textContent = '所有紀錄';
    if (clearBtn) clearBtn.style.display = 'none';
  }

  container.innerHTML = '';

  if (records.length === 0) {
    container.innerHTML = '<div class="loading-placeholder">暫無運動紀錄</div>';
    return;
  }

  records.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'history-card card fade-in';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between';
    card.style.padding = '0.75rem 1rem';
    card.style.marginBottom = '0.75rem';

    const d = new Date(record.date);
    const dateStr = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const min = Math.floor(record.duration / 60);
    const sec = record.duration % 60;
    const timeStr = `${min} 分 ${sec} 秒`;

    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex: 1; overflow: hidden; padding-right: 0.5rem; gap: 0.5rem;">
        <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1.05rem;" title="${escapeHTML(record.routineName)}">
          ${escapeHTML(record.routineName)}
        </h4>
        <div style="font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap; flex-shrink: 0;">
          <span>${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}</span> • <span>${timeStr}</span>
        </div>
      </div>
      <button class="icon-btn btn-delete-history" aria-label="刪除紀錄" style="color: var(--danger-color); padding: 0.25rem; min-height: auto; flex-shrink: 0;">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    const deleteBtn = card.querySelector('.btn-delete-history');
    deleteBtn.addEventListener('click', () => {
      showConfirmDialog('確定要刪除這筆運動紀錄嗎？', () => {
        history.deleteRecord(record.id);
        renderHistoryList();
      });
    });

    container.appendChild(card);
  });
}
