export function initializeUI(canvas) {
  let lastTouchEnd = 0;

  const preventIfCancelable = (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const handleTouchMove = (event) => {
    if (event.touches.length > 1) {
      preventIfCancelable(event);
    }
  };

  const handleTouchStart = (event) => {
    if (event.touches.length > 1) {
      preventIfCancelable(event);
    }
  };

  const handleTouchEnd = (event) => {
    const now = performance.now();
    if (now - lastTouchEnd <= 300) {
      preventIfCancelable(event);
    }
    lastTouchEnd = now;
  };

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  return {
    destroy() {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    },
  };
}
