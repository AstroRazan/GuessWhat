// js/predict.js
// Browser version of preprocess() + guess() from the Colab notebook (Step 11).
// Needs TensorFlow.js loaded before this file:
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"></script>

const Predictor = (() => {
  let model = null;
  let CLASSES = [];
  const THRESHOLD = 0.7;   // same as Colab. Lower to 0.5-0.6 if the AI says "not sure" too often

  // Load the model exported from Colab (Step 12) + the class list
  async function loadModel(base = "model") {
    model = await tf.loadLayersModel(`${base}/model.json`);
    CLASSES = await (await fetch(`${base}/classes.json`)).json();
    tf.tidy(() => model.predict(tf.zeros([1, 28, 28, 1])));   // warm-up so the first guess is fast
    return CLASSES;
  }

  // Same steps as Colab preprocess():
  // alpha channel -> crop to drawing -> centered square -> 10% margin -> area resize to 28x28 -> 0..1
  function preprocess(inkCanvas) {
    const w = inkCanvas.width, h = inkCanvas.height;
    const data = inkCanvas.getContext("2d").getImageData(0, 0, w, h).data;

    // 1. Bounding box of the drawing (alpha > 0)
    let minX = w, minY = h, maxX = -1, maxY = -1, count = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 0) {
          count++;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (count < 20) return null;   // nothing drawn yet

    // 2. Crop, pad to a centered square, add a margin of s/10 on each side
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    const s = Math.max(cw, ch);
    const pad = Math.floor(s / 10);
    const S = s + 2 * pad;
    const sq = new Float32Array(S * S);
    const offX = pad + Math.floor((s - cw) / 2);
    const offY = pad + Math.floor((s - ch) / 2);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        sq[(offY + y) * S + offX + x] = data[((minY + y) * w + minX + x) * 4 + 3];
      }
    }

    // 3. Area resize to 28x28 (like cv2.INTER_AREA): each output pixel = average of the area it covers
    const out = new Float32Array(28 * 28);
    const scale = S / 28;
    for (let oy = 0; oy < 28; oy++) {
      const y0 = oy * scale, y1 = y0 + scale;
      for (let ox = 0; ox < 28; ox++) {
        const x0 = ox * scale, x1 = x0 + scale;
        let sum = 0;
        for (let iy = Math.floor(y0); iy < Math.ceil(y1) && iy < S; iy++) {
          const wy = Math.min(iy + 1, y1) - Math.max(iy, y0);
          for (let ix = Math.floor(x0); ix < Math.ceil(x1) && ix < S; ix++) {
            const wx = Math.min(ix + 1, x1) - Math.max(ix, x0);
            sum += sq[iy * S + ix] * wy * wx;
          }
        }
        out[oy * 28 + ox] = Math.round(sum / (scale * scale)) / 255;   // 0..1, white stroke on black
      }
    }
    return out;
  }

  // Returns null if nothing is drawn, otherwise the top 3 guesses
  function predict(inkCanvas) {
    if (!model) return null;
    const input = preprocess(inkCanvas);
    if (!input) return null;
    const probs = tf.tidy(() =>
      Array.from(model.predict(tf.tensor4d(input, [1, 28, 28, 1])).dataSync()));
    const top = probs
      .map((p, i) => ({ label: CLASSES[i], prob: p }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);
    return { top, confident: top[0].prob >= THRESHOLD, input };
  }

  // Draws the 28x28 "what the model sees" image into a small canvas (e.g. the AI Vision box)
  function drawPreview(input, previewCanvas) {
    const img = new ImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = Math.round(input[i] * 255);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = 28;
    tmp.getContext("2d").putImageData(img, 0, 0);
    const ctx = previewCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;   // keep it pixelated
    ctx.drawImage(tmp, 0, 0, previewCanvas.width, previewCanvas.height);
  }

  return { loadModel, predict, drawPreview, THRESHOLD, get classes() { return CLASSES; } };
})();

window.Predictor = Predictor;
