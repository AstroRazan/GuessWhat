# Game Spec — Human vs AI: Who Guesses Faster?

## Idea
A race between a human contestant and our AI model.
One player draws, either in the air with their hand (webcam) or with a pen/mouse/finger on a white page. A human contestant and the AI model both try to guess the drawing. Whoever guesses correctly first wins the round.

## Players
- Drawer: draws in the air using hand tracking (Camera mode) or on a white page (Pen mode).
- Human contestant: guesses by typing the answer.
- AI model: guesses live from the drawing canvas.

## Drawing Modes (Drawer)
The game screen has a toggle: CAMERA / PEN.

Camera mode (default):
- Pinch = draw
- Open palm (held) = clear

Pen mode:
- Draw with mouse, touchscreen, or stylus on a white page (Pointer Events).
- CLEAR button to erase.
- Used automatically if the webcam is not available or permission is denied.

## Round Flow
1. A secret word is shown to the drawer only (shown for 3 seconds with "Contestant, look away!", then hidden).
2. Timer starts (60 seconds).
3. Drawer draws (in the air or on the white page).
4. AI guesses every 600ms (only when the drawing changed). The AI's current top guess and confidence are shown live on screen.
5. AI wins the round if its top guess matches the word with confidence of at least 0.7 (same threshold as in Colab).
6. Human wins the round if they type the correct word before the AI.
7. If the timer ends with no correct guess: no one scores.
8. Show who won the round and how fast (e.g. "AI guessed in 4.2s").

## Game
- 5 rounds per game.
- Scoreboard: Human vs AI.
- Final screen: winner, total score, average guess time for each side, "Play again" button.

## Scores
- Saved in localStorage: game history (Human wins vs AI wins).

## Screens
- Home (Start, How to play, About the model)
- Game
- Results
- About the model: training & test accuracy, accuracy/loss charts, confusion matrix (images exported from Colab)

## AI Model
- CNN built and trained in Google Colab on Google Quick, Draw! data (notebook: reference/Guss_What_.ipynb).
- 20 classes, 5,000 drawings each: sun, fish, house, star, umbrella, apple, tree, car, cat, cloud, eye, key, moon, mushroom, envelope, lightning, smiley face, rainbow, ladder, ice cream.
- Exported to TensorFlow.js in model/ (model.json, weights.bin, classes.json).
- js/predict.js is the real model code: same preprocessing as Colab (alpha channel, crop, centered square, 10% margin, 28x28, 0-1). Do not rewrite it.
- Confidence threshold: 0.7. Below it, the AI shows "HMM... NOT SURE".
- The game's word list = the model's classes (model/classes.json).

## Drawing
- Hand tracking + drawing logic comes from Step 11 of the Colab notebook (pinch to draw, open palm held to clear).
- The AI ink canvas is always 640x480, transparent, lineWidth 18, round caps. The model reads its alpha channel.
- Both modes draw into the same ink canvas, so prediction works the same way.
- Pen mode: the white page is only for display. Strokes are shown in black on screen and also drawn (scaled to 640x480) into the transparent ink canvas. Never fill the ink canvas white.

## Design
- Sketchbook style, English UI (left-to-right). Matches the reference image.
- Grid notebook paper background, cards with thick dark borders and offset solid shadows, yellow tape strips on the main card, yellow highlight behind the title.
- Brand name "GuessWhat" with a pencil icon. Yellow buttons, blue = Human ("YOU"), orange-red = AI ("THE MODEL").
- Home: title "Draw it. Guess it before the AI does.", buttons "Let's play!" and "Invite friends" (copies the site link, no online multiplayer).
- Nav: How to play, Leaderboard (top scores from localStorage), Team (our names).
- Game screen: center card = camera/drawing area + round and timer. Right card = human score + guess input. Left card = AI score + top guesses with confidence bars.
- Hint under the drawing: blank boxes for the word's letters and "X letters".

## Guess Matching
- The human types the guess in English. Compare case-insensitive, trimmed, ignoring spaces (so "icecream" = "ice cream").
- Extra accepted answers: smiley face → "smiley", "smile", "face"; ice cream → "icecream"; house → "home"; cat → "kitten"; lightning → "thunder".
