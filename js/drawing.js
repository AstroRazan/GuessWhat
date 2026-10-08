/**
 * drawing.js - Drawing Manager for GuessWhat
 * Supports Camera Mode (Air drawing via HandTracker) and Pen Mode (Pointer Events)
 *
 * Requirements:
 * - Camera mode: MediaPipe hand tracking air-drawing (pinch to draw, palm to clear)
 * - Pen mode: Pointer Events (pointerdown, pointermove, pointerup) on white canvas
 *   - touch-action: none prevents scrolling while drawing
 *   - Mouse, stylus, touchscreen all supported
 *   - Strokes shown in black (#0f172a) on the white area for player
 *   - ALSO draw same strokes into 640x480 transparent ink canvas (lineWidth 18, round caps and joins)
 *   - Never fill ink canvas white (model reads alpha channel)
 *   - Clear button clears both white area and 640x480 ink canvas
 *   - Stop camera while in Pen mode, restart when switching to Camera
 */

class DrawingManager {
  constructor(overlayCanvas, aiInkCanvas, penCanvas, stageContainer) {
    this.overlayCanvas = overlayCanvas;
    this.aiInkCanvas = aiInkCanvas;
    this.penCanvas = penCanvas;
    this.stageContainer = stageContainer;

    this.penCtx = penCanvas ? penCanvas.getContext('2d') : null;
    this.inkCtx = aiInkCanvas ? aiInkCanvas.getContext('2d') : null;

    this.handTracker = null;
    this.mode = 'camera'; // 'camera' or 'pen'
    this.isPlaying = false;
    this.isPointerDown = false;

    this.lastX = null;
    this.lastY = null;
    this.lastInkX = null;
    this.lastInkY = null;

    this.dirty = false;
    this.hasContent = false;

    this._pointerBound = false;
    if (this.penCanvas) {
      this.setupPointerEvents();
    }
  }

  setHandTracker(tracker) {
    this.handTracker = tracker;
    if (tracker && tracker.inkCanvas) {
      this.aiInkCanvas = tracker.inkCanvas;
      this.inkCtx = this.aiInkCanvas.getContext('2d');
    }
  }

  setPenCanvas(canvas) {
    this.penCanvas = canvas;
    this.penCtx = canvas ? canvas.getContext('2d') : null;
    this.setupPointerEvents();
    this.syncCanvasSize();
  }

  setStageContainer(container) {
    this.stageContainer = container;
  }

  setPlaying(playing) {
    this.isPlaying = !!playing;
    if (this.handTracker) {
      this.handTracker.setPlaying(this.isPlaying);
    }
    if (!this.isPlaying) {
      this.endStroke();
    }
  }

  setupPointerEvents() {
    if (!this.penCanvas || this._pointerBound) return;
    this._pointerBound = true;

    // Prevent touch scrolling on drawing area
    this.penCanvas.style.touchAction = 'none';

    this.penCanvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.penCanvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.penCanvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.penCanvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    this.penCanvas.addEventListener('pointerleave', (e) => this.handlePointerUp(e));
  }

  handlePointerDown(e) {
    if (this.mode !== 'pen' || !this.isPlaying) return;
    e.preventDefault();

    this.isPointerDown = true;
    try {
      this.penCanvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    const rect = this.penCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale to 640x480 transparent AI ink canvas
    const inkX = rect.width > 0 ? (x / rect.width) * 640 : 0;
    const inkY = rect.height > 0 ? (y / rect.height) * 480 : 0;

    this.lastX = x;
    this.lastY = y;
    this.lastInkX = inkX;
    this.lastInkY = inkY;

    // Draw initial dot on player canvas (black)
    if (this.penCtx) {
      this.penCtx.fillStyle = '#0f172a';
      this.penCtx.beginPath();
      this.penCtx.arc(x, y, 2.5, 0, Math.PI * 2);
      this.penCtx.fill();
    }

    // Draw initial dot on transparent 640x480 ink canvas (lineWidth 18)
    if (this.inkCtx) {
      this.inkCtx.fillStyle = '#000000';
      this.inkCtx.beginPath();
      this.inkCtx.arc(inkX, inkY, 9, 0, Math.PI * 2);
      this.inkCtx.fill();
    }

    this.setDirty(true);
    this.hasContent = true;
  }

  handlePointerMove(e) {
    if (this.mode !== 'pen' || !this.isPointerDown || !this.isPlaying) return;
    e.preventDefault();

    const rect = this.penCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const inkX = rect.width > 0 ? (x / rect.width) * 640 : 0;
    const inkY = rect.height > 0 ? (y / rect.height) * 480 : 0;

    if (this.lastX !== null && this.lastY !== null) {
      // 1. Draw black stroke on white area for player
      if (this.penCtx) {
        this.penCtx.strokeStyle = '#0f172a';
        this.penCtx.lineWidth = 5;
        this.penCtx.lineCap = 'round';
        this.penCtx.lineJoin = 'round';
        this.penCtx.beginPath();
        this.penCtx.moveTo(this.lastX, this.lastY);
        this.penCtx.lineTo(x, y);
        this.penCtx.stroke();
      }

      // 2. ALSO draw same stroke into 640x480 transparent ink canvas
      // Specification: lineWidth 18, round caps and joins, scaled from display to 640x480
      if (this.inkCtx) {
        this.inkCtx.strokeStyle = '#000000';
        this.inkCtx.lineWidth = 18;
        this.inkCtx.lineCap = 'round';
        this.inkCtx.lineJoin = 'round';
        this.inkCtx.beginPath();
        this.inkCtx.moveTo(this.lastInkX, this.lastInkY);
        this.inkCtx.lineTo(inkX, inkY);
        this.inkCtx.stroke();
      }

      this.setDirty(true);
      this.hasContent = true;
    }

    this.lastX = x;
    this.lastY = y;
    this.lastInkX = inkX;
    this.lastInkY = inkY;
  }

  handlePointerUp(e) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    try {
      if (this.penCanvas && this.penCanvas.hasPointerCapture && this.penCanvas.hasPointerCapture(e.pointerId)) {
        this.penCanvas.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    this.endStroke();
  }

  endStroke() {
    this.lastX = null;
    this.lastY = null;
    this.lastInkX = null;
    this.lastInkY = null;
    if (this.handTracker) {
      this.handTracker.endStroke();
    }
  }

  clear() {
    // 1. Clear white pen canvas
    if (this.penCtx && this.penCanvas) {
      this.penCtx.clearRect(0, 0, this.penCanvas.width, this.penCanvas.height);
    }

    // 2. Clear 640x480 transparent ink canvas
    if (this.handTracker) {
      this.handTracker.clearInk();
    } else if (this.aiInkCanvas && this.inkCtx) {
      this.inkCtx.clearRect(0, 0, this.aiInkCanvas.width, this.aiInkCanvas.height);
    }

    this.dirty = false;
    this.hasContent = false;
    this.endStroke();
  }

  isDirty() {
    if (this.dirty) return true;
    if (this.handTracker && this.handTracker.isDirty()) return true;
    return false;
  }

  setDirty(val) {
    this.dirty = !!val;
    if (this.handTracker) {
      this.handTracker.setDirty(val);
    }
  }

  hasDrawing() {
    return this.hasContent || (this.handTracker ? this.handTracker.hasDrawing() : false);
  }

  getMode() {
    return this.mode;
  }

  setMode(newMode) {
    if (newMode !== 'camera' && newMode !== 'pen') return;
    this.mode = newMode;

    if (this.mode === 'pen') {
      // PEN MODE:
      if (this.stageContainer) {
        this.stageContainer.classList.add('mode-pen-active');
      }
      if (this.handTracker) {
        this.handTracker.stopCamera();
      }
      this.syncCanvasSize();

      // If ink canvas already has strokes, render them onto pen canvas
      if (this.penCtx && this.penCanvas && this.aiInkCanvas && this.hasDrawing()) {
        this.penCtx.clearRect(0, 0, this.penCanvas.width, this.penCanvas.height);
        this.penCtx.drawImage(this.aiInkCanvas, 0, 0, this.penCanvas.width, this.penCanvas.height);
      }
    } else {
      // CAMERA MODE:
      if (this.stageContainer) {
        this.stageContainer.classList.remove('mode-pen-active');
      }
      this.syncCanvasSize();
      if (this.handTracker) {
        this.handTracker.startCamera().catch(err => {
          console.warn('Could not auto-start camera when switching mode:', err);
        });
      }
    }
  }

  syncCanvasSize() {
    if (this.penCanvas) {
      const rect = this.penCanvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (this.penCanvas.width !== w || this.penCanvas.height !== h) {
          // Preserve drawing across resize if present
          const hasDrawn = this.hasDrawing();
          this.penCanvas.width = w;
          this.penCanvas.height = h;

          if (hasDrawn && this.aiInkCanvas) {
            this.penCtx.drawImage(this.aiInkCanvas, 0, 0, w, h);
          }
        }
      }
    }

    if (this.handTracker) {
      this.handTracker.syncCanvasSize();
    }
  }

  onResize() {
    this.syncCanvasSize();
  }

  render() {}
}

window.DrawingManager = DrawingManager;
