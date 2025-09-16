export function createRenderer(canvas, context) {
  let pixelRatio = 1;

  function getViewportSize() {
    const viewport = window.visualViewport;

    if (viewport) {
      return {
        width: Math.max(Math.round(viewport.width), 1),
        height: Math.max(Math.round(viewport.height), 1),
      };
    }

    const root = document.documentElement;
    const width = root.clientWidth || window.innerWidth || canvas.clientWidth || 1;
    const height = root.clientHeight || window.innerHeight || canvas.clientHeight || 1;

    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    };
  }

  function resize() {
    pixelRatio = Math.max(window.devicePixelRatio || 1, 1);

    const { width, height } = getViewportSize();
    const displayWidth = Math.max(Math.floor(width * pixelRatio), 1);
    const displayHeight = Math.max(Math.floor(height * pixelRatio), 1);

    if (canvas.width !== displayWidth) {
      canvas.width = displayWidth;
    }

    if (canvas.height !== displayHeight) {
      canvas.height = displayHeight;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function render(state) {
    const logicalWidth = canvas.width / pixelRatio;
    const logicalHeight = canvas.height / pixelRatio;

    context.save();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.fillStyle = '#05070f';
    context.fillRect(0, 0, logicalWidth, logicalHeight);

    const fontSize = Math.max(24, Math.round(Math.min(logicalWidth, logicalHeight) * 0.08));
    context.fillStyle = '#f5f7ff';
    context.font = `600 ${fontSize}px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(state.message, logicalWidth / 2, logicalHeight / 2);

    context.restore();
  }

  return {
    resize,
    render,
    get pixelRatio() {
      return pixelRatio;
    },
  };
}
