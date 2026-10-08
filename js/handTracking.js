/**
 * handTracking.js - MediaPipe Tasks HandLandmarker Air Drawing Engine
 * Direct implementation of Step 11 JavaScript from Colab reference notebook.
 *
 * Requirements:
 * - MediaPipe tasks-vision 0.10.14 HandLandmarker, GPU with CPU fallback, confidence 0.6
 * - Pinch with hysteresis (gap < 0.30 start, > 0.45 stop) relative to hand size
 * - Debouncing: 2 stable frames to start, 6 to stop; keep line alive up to 8 frames with no hand
 * - Pen position = midpoint of thumb tip and index tip, mirrored
 * - Jump guard: skip points that jump > 120px (up to 5 frames), then start new line
 * - Smoothing: new point = 0.6 * old + 0.4 * new
 * - Open palm (all 4 fingers up) held for 10 frames = clear
 * - Green dot (#00ff66) when drawing, red dot (red) when pen is up
 * - 640x480 transparent ink canvas, lineWidth 18, round caps & joins
 */

class HandTracker {
  constructor({
    videoElement,
    overlayCanvas,
    aiInkCanvas,
    onStatusUpdate,
    onPalmClear,
    onCameraReady,
    onCameraError
  }) {
    this.video = videoElement;
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

    // 1. Hidden 640x480 transparent ink canvas for Predictor
    this.inkCanvas = aiInkCanvas || document.createElement('canvas');
    this.inkCanvas.width = 640;
    this.inkCanvas.height = 480;
    this.inkCtx = this.inkCanvas.getContext('2d');
    this.inkCtx.lineWidth = 18;
    this.inkCtx.lineCap = 'round';
    this.inkCtx.lineJoin = 'round';
    this.inkCtx.strokeStyle = '#38bdf8'; // Electric blue ink with alpha > 0

    // Callbacks
    this.onStatusUpdate = onStatusUpdate || (() => {});
    this.onPalmClear = onPalmClear || (() => {});
    this.onCameraReady = onCameraReady || (() => {});
    this.onCameraError = onCameraError || (() => {});

    // Tracker state (exact Step 11 variables)
    this.hands = null;
    this.running = false;
    this.stream = null;
    this.lastX = null;
    this.lastY = null;
    this.palmFrames = 0;
    this.dirty = false;
    this.pinching = false;
    this.penState = 'up';
    this.candidate = 'up';
    this.candidateFrames = 0;
    this.missingFrames = 0;
    this.jumpFrames = 0;

    // FPS counter
    this.frames = 0;
    this.fps = 0;
    this.fpsTime = performance.now();

    // Game playing gate: only draw ink onto inkCanvas when isPlaying === true
    this.isPlaying = false;

    // Bound loop function for requestAnimationFrame
    this.boundLoop = this.loop.bind(this);

    // Initialize MediaPipe HandLandmarker
    this.initLandmarker();
  }

  // Load MediaPipe tasks-vision 0.10.14
  async initLandmarker() {
    try {
      this.updateStatus('1/3 Loading MediaPipe files...');
      let FilesetResolver = window.FilesetResolver;
      let HandLandmarker = window.HandLandmarker;

      if (!FilesetResolver || !HandLandmarker) {
        const mp = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
        FilesetResolver = mp.FilesetResolver;
        HandLandmarker = mp.HandLandmarker;
        window.FilesetResolver = FilesetResolver;
        window.HandLandmarker = HandLandmarker;
      }

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.updateStatus('2/3 Loading hand model...');
      const makeHands = (delegate) => HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      try {
        this.hands = await makeHands('GPU');
        console.log('✅ HandLandmarker initialized (GPU Delegate)');
      } catch (gpuError) {
        console.warn('GPU Delegate failed, using CPU delegate:', gpuError);
        this.hands = await makeHands('CPU');
        console.log('✅ HandLandmarker initialized (CPU Delegate)');
      }

      this.updateStatus('Hand tracking ready');
    } catch (err) {
      console.error('❌ Failed to initialize MediaPipe HandLandmarker:', err);
      this.updateStatus('❌ Error loading Hand model: ' + err.message);
    }
  }

  updateStatus(text) {
    this.onStatusUpdate(text, this.penState);
  }

  setPlaying(playing) {
    this.isPlaying = !!playing;
    if (!this.isPlaying) {
      this.lastX = null;
      this.lastY = null;
    }
  }

  clearInk() {
    this.inkCtx.clearRect(0, 0, this.inkCanvas.width, this.inkCanvas.height);
    this.dirty = false;
    this.lastX = null;
    this.lastY = null;
    this.renderVisible(null, null, 'none');
  }

  isDirty() {
    return this.dirty;
  }

  setDirty(val) {
    this.dirty = !!val;
  }

  hasDrawing() {
    return this.dirty;
  }

  endStroke() {
    this.lastX = null;
    this.lastY = null;
  }

  dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // A finger is "up" if its tip is farther from the wrist than its middle joint
  fingersUp(lm) {
    const wrist = lm[0];
    return {
      index:  this.dist(lm[8],  wrist) > this.dist(lm[6],  wrist) * 1.1,
      middle: this.dist(lm[12], wrist) > this.dist(lm[10], wrist) * 1.1,
      ring:   this.dist(lm[16], wrist) > this.dist(lm[14], wrist) * 1.1,
      pinky:  this.dist(lm[20], wrist) > this.dist(lm[18], wrist) * 1.1,
    };
  }

  // Pinch detection with hysteresis: gap < 0.30 start, > 0.45 stop
  isPinching(lm) {
    const handSize = this.dist(lm[0], lm[9]); // wrist -> middle finger base
    const gap = this.dist(lm[4], lm[8]) / handSize; // thumb tip <-> index tip
    if (!this.pinching && gap < 0.30) this.pinching = true;
    else if (this.pinching && gap > 0.45) this.pinching = false;
    return this.pinching;
  }

  // Debounce: 2 frames to start drawing, 6 to stop
  confirmGesture(raw) {
    if (raw === this.candidate) this.candidateFrames++;
    else { this.candidate = raw; this.candidateFrames = 1; }
    const needed = (raw === 'draw') ? 2 : 6;
    if (this.candidateFrames >= needed) this.penState = this.candidate;
    return this.penState;
  }

  async startCamera() {
    if (this.running) return;

    try {
      this.updateStatus('Starting camera...');
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        this.video.srcObject = this.stream;
        await this.video.play();
      }

      this.running = true;
      this.onCameraReady();
      this.syncCanvasSize();
      requestAnimationFrame(this.boundLoop);
    } catch (err) {
      console.error('Camera access failed:', err);
      this.updateStatus('Camera error: ' + err.message);
      if (typeof this.onCameraError === 'function') {
        this.onCameraError(err);
      }
      throw err;
    }
  }

  stopCamera() {
    this.running = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
      this.video.srcObject = null;
    }
    this.lastX = null;
    this.lastY = null;
    this.penState = 'up';
    this.candidate = 'up';
    this.missingFrames = 0;
    this.jumpFrames = 0;
    if (this.overlayCtx && this.overlayCanvas) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  syncCanvasSize() {
    if (!this.overlayCanvas) return;
    const rect = this.overlayCanvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.overlayCanvas.width = rect.width;
      this.overlayCanvas.height = rect.height;
    }
  }

  loop() {
    if (!this.running) return;

    this.frames++;
    if (performance.now() - this.fpsTime > 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.fpsTime = performance.now();
    }

    if (!this.hands || this.video.readyState < 2) {
      requestAnimationFrame(this.boundLoop);
      return;
    }

    const result = this.hands.detectForVideo(this.video, performance.now());

    if (result.landmarks && result.landmarks.length > 0) {
      this.missingFrames = 0;
      const lm = result.landmarks[0];
      const up = this.fingersUp(lm);

      const pinch = this.isPinching(lm);
      let raw = 'up';
      if (pinch) raw = 'draw';
      else if (up.index && up.middle && up.ring && up.pinky) raw = 'palm';
      const state = this.confirmGesture(raw);

      // Pen position = midpoint between thumb tip and index tip (mirrored)
      let x = (1 - (lm[4].x + lm[8].x) / 2) * 640;
      let y = ((lm[4].y + lm[8].y) / 2) * 480;

      // Jump guard: skip points that jump more than 120px (up to 5 frames), then start new line
      if (state === 'draw' && this.lastX !== null && Math.hypot(x - this.lastX, y - this.lastY) > 120) {
        this.jumpFrames++;
        if (this.jumpFrames <= 5) {
          this.renderVisible(null, null, state);
          requestAnimationFrame(this.boundLoop);
          return;
        }
        this.lastX = null; // start a new line here
      }
      this.jumpFrames = 0;

      if (state === 'palm') {
        this.palmFrames++;
        this.updateStatus(`🖐️ Hold to clear... | ${this.fps} FPS`);
        if (this.palmFrames > 10) {
          this.clearInk();
          this.updateStatus('Cleared!');
          this.onPalmClear();
        }
        this.lastX = null;
      } else if (state === 'draw') {
        this.palmFrames = 0;
        if (this.isPlaying) {
          if (this.lastX !== null) {
            x = 0.6 * this.lastX + 0.4 * x; // smoothing
            y = 0.6 * this.lastY + 0.4 * y;
            this.inkCtx.beginPath();
            this.inkCtx.moveTo(this.lastX, this.lastY);
            this.inkCtx.lineTo(x, y);
            this.inkCtx.stroke();
            this.dirty = true;
          }
          this.lastX = x;
          this.lastY = y;
          this.updateStatus(`🤏 Drawing | ${this.fps} FPS`);
        } else {
          this.lastX = null;
          this.updateStatus(`✋ Round not active | ${this.fps} FPS`);
        }
      } else {
        this.palmFrames = 0;
        this.lastX = null;
        this.updateStatus(`✋ Pen up (pinch to draw) | ${this.fps} FPS`);
      }

      this.renderVisible(x, y, state);
    } else {
      // Hand lost: keep line alive for up to 8 frames before lifting pen
      this.missingFrames++;
      if (this.missingFrames > 8) {
        this.lastX = null;
        this.penState = 'up';
        this.candidate = 'up';
      }
      this.palmFrames = 0;
      this.updateStatus(`No hand | ${this.fps} FPS`);
      this.renderVisible(null, null, 'none');
    }

    requestAnimationFrame(this.boundLoop);
  }

  renderVisible(x, y, state) {
    if (!this.overlayCtx || !this.overlayCanvas) return;

    if (this.overlayCanvas.clientWidth && this.overlayCanvas.width !== this.overlayCanvas.clientWidth) {
      this.overlayCanvas.width = this.overlayCanvas.clientWidth;
      this.overlayCanvas.height = this.overlayCanvas.clientHeight;
    }

    const w = this.overlayCanvas.width;
    const h = this.overlayCanvas.height;

    this.overlayCtx.clearRect(0, 0, w, h);

    // Scale 640x480 ink canvas to visible overlay canvas
    this.overlayCtx.drawImage(this.inkCanvas, 0, 0, w, h);

    // Keep the green dot when drawing and the red dot when the pen is up
    if (x !== null && y !== null && state !== 'none') {
      const dotX = (x / 640) * w;
      const dotY = (y / 480) * h;

      this.overlayCtx.beginPath();
      this.overlayCtx.arc(dotX, dotY, 10, 0, 2 * Math.PI);
      this.overlayCtx.fillStyle = (state === 'draw') ? '#00ff66' : 'red';
      this.overlayCtx.fill();
    }
  }
}

window.HandTracker = HandTracker;
