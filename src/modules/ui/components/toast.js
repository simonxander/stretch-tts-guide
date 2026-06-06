// 顯示 Toast 浮動提示
export function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '2rem';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'var(--accent-primary)';
  toast.style.color = 'white';
  toast.style.padding = '0.75rem 1.5rem';
  toast.style.borderRadius = '9999px';
  toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
  toast.style.zIndex = '9999';
  toast.style.opacity = '0';
  toast.style.fontWeight = 'bold';
  toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  document.body.appendChild(toast);

  // 觸發進場動畫
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
  });

  // 3秒後自動消失
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
