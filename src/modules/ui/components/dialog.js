// --- Custom Confirm Dialog ---
export function showConfirmDialog(message, onConfirm) {
  const modal = document.getElementById('modal-confirm');
  const msgEl = document.getElementById('modal-confirm-message');
  const btnOk = document.getElementById('btn-confirm-ok');
  const btnCancel = document.getElementById('btn-confirm-cancel');

  if (!modal || !msgEl || !btnOk || !btnCancel) return;

  msgEl.textContent = message;
  modal.classList.add('active');

  // Clean up previous listeners by cloning
  const newBtnOk = btnOk.cloneNode(true);
  const newBtnCancel = btnCancel.cloneNode(true);
  btnOk.parentNode.replaceChild(newBtnOk, btnOk);
  btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

  newBtnCancel.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  newBtnOk.addEventListener('click', () => {
    modal.classList.remove('active');
    if (onConfirm) onConfirm();
  });
}
