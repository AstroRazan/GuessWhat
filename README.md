# ✏️ GuessWhat

**Draw it. Guess it before the AI does.**

A Human vs AI drawing game. One player draws in the air with their hand (webcam) or with a pen on a white page. A human contestant and our CNN model race to guess the drawing. The first correct guess wins the round.

🎮 **Play it live:** [guesswhat-five.vercel.app](https://guesswhat-five.vercel.app/)

📊 **Presentation:** [docs/GuessWhat_Presentation.pdf](docs/GuessWhat_Presentation.pdf)

*Computer Vision Bootcamp by SDA | Final Project*

*Instructor: Asmaa Alzobidi*

---

## How to play

1. Enter your name and press **Let's play!**
2. The drawer sees a secret word for 3 seconds. The contestant looks away.
3. The drawer has 60 seconds to draw it:
   - **Camera mode:** pinch your thumb and index finger to draw, open your palm to clear.
   - **Pen mode:** draw with a mouse, touchscreen or stylus.
4. The contestant types their guess while the AI guesses live.
5. First correct guess wins the round. Faster guesses score more points.
6. After 5 rounds, the final score goes to the leaderboard.

The AI only answers when it's at least **70% sure**. Below that, it says *"Hmm... not sure"*.

## The 20 words

`sun` `fish` `house` `star` `umbrella` `apple` `tree` `car` `cat` `cloud`
`eye` `key` `moon` `mushroom` `envelope` `lightning` `smiley face` `rainbow` `ladder` `ice cream`

---

## How it works

```
Camera → MediaPipe hand tracking → pinch to draw → 640×480 canvas
       → crop, center, resize to 28×28 → CNN → top guesses + confidence
```

Everything runs **in the browser**. The model is loaded with TensorFlow.js, so there's no server, and the webcam video never leaves the player's device.

### The data

- [Google Quick, Draw!](https://quickdraw.withgoogle.com/data) dataset, 28×28 grayscale bitmaps
- 20 classes × 5,000 drawings = **100,000 drawings**
- Split 80 / 10 / 10 (train / validation / test), stratified

### The model

A small CNN built and trained in Google Colab with TensorFlow / Keras:

| Layer | Details |
|---|---|
| Data augmentation | RandomRotation, RandomTranslation, RandomZoom (training only) |
| Conv2D + MaxPooling | 32 filters |
| Conv2D + MaxPooling | 64 filters |
| Conv2D + MaxPooling | 128 filters |
| Flatten + Dropout | 40% |
| Dense | 128, ReLU |
| Dense | 20, Softmax |

- About **243K parameters (~950 KB)**
- Adam optimizer, batch size 128, up to 20 epochs with EarlyStopping (patience 3)
- **Test accuracy: XX.X%** <!-- replace with the Step 7 result from the notebook -->

Augmentation helps because air drawings are shakier and less centered than mouse drawings.

### From Colab to the browser

The browser must prepare each drawing exactly like the training data, or the model's guesses go wrong. `js/predict.js` repeats the notebook's preprocessing: read the alpha channel, crop to the drawing, pad to a centered square with a 10% margin, resize to 28×28, and scale to 0–1.

The official `tensorflowjs` converter failed in Colab, so we exported the weights directly to the TensorFlow.js format ourselves (see the last cell of the notebook).

### Hand tracking

Tuned in Colab, then moved to the website:

- Pinch with hysteresis (start below 0.30, stop above 0.45, relative to hand size) so the line doesn't flicker
- Debouncing: 2 frames to start drawing, 6 to stop
- Pen = midpoint of thumb and index tip, with smoothing and a jump guard
- Stroke width 18px, so lines stay visible after shrinking to 28×28

---

## Project structure

```
├── index.html
├── style.css
├── js/
│   ├── handTracking.js     # MediaPipe hand tracking and gestures
│   ├── predict.js          # preprocessing + model inference
│   └── ...                 # game logic, pen mode, leaderboard
├── model/
│   ├── model.json          # model structure
│   ├── weights.bin         # trained weights
│   └── classes.json        # the 20 labels
├── reference/
│   └── Guss_What_.ipynb    # Colab notebook: data, training, evaluation, export
├── docs/
│   └── GuessWhat_Presentation.pdf
└── GAME_SPEC.md            # game design
```

## Run it locally

The model files must be served over HTTP (opening `index.html` directly won't load them):

```bash
git clone https://github.com/AstroRazan/GuessWhat.git
cd GuessWhat
python -m http.server 8000
```

Then open `http://localhost:8000`. The camera works on `localhost` and on HTTPS.

## Built with

- **Python, TensorFlow / Keras**: training in Google Colab
- **HTML, CSS, JavaScript**: the website
- **TensorFlow.js**: running the model in the browser
- **MediaPipe Hands**: hand tracking
- **Google Antigravity**: development
- **GitHub + Vercel**: code and hosting

---

## Team

| | |
|---|---|
| **Razan Almasoud** | [LinkedIn](https://www.linkedin.com/in/razanalmasoud) |
| **Joud Alaskar** | [LinkedIn](https://www.linkedin.com/in/joudyasser) |
| **Hayat Fageeh** | [LinkedIn](https://www.linkedin.com/in/hayat-fageeh-8a6732325) |

**Instructor:** Asmaa Alzobidi · [LinkedIn](https://www.linkedin.com/in/asma-al-zobidi-9576a5266)
