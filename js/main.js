/**
 * main.js - Master Controller for GuessWhat
 * Wires HandLandmarker hand tracking, DrawingManager (Camera & Pen modes),
 * Predictor Colab CNN model, GameManager, and Sketchbook UI.
 */

// ===========================================================================
// Team LinkedIn Links (Defined as constants at top of index.html)
// ===========================================================================
if (typeof RAZAN_LINKEDIN === 'undefined') {
  window.RAZAN_LINKEDIN = '#';
}
if (typeof JOUD_LINKEDIN === 'undefined') {
  window.JOUD_LINKEDIN = '#';
}
if (typeof HAYAT_LINKEDIN === 'undefined') {
  window.HAYAT_LINKEDIN = '#';
}

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------------------
  // DOM Elements: Canvas, Video, Container
  // -------------------------------------------------------------------------
  const webcam = document.getElementById('webcam');
  const overlayCanvas = document.getElementById('overlayCanvas');
  const penCanvas = document.getElementById('penCanvas');
  const aiInkCanvas = document.getElementById('aiInkCanvas');
  const aiVisionCanvas = document.getElementById('aiVisionCanvas');
  const stageContainer = document.getElementById('stageContainer');

  let logicalWidth = 1280;
  let logicalHeight = 720;

  // Initialize Drawing Manager
  const drawing = new DrawingManager(overlayCanvas, aiInkCanvas, penCanvas, stageContainer);

  // -------------------------------------------------------------------------
  // DOM Elements: Screens & Navigation
  // -------------------------------------------------------------------------
  const screenHome = document.getElementById('screenHome');
  const screenGame = document.getElementById('screenGame');
  const screenResults = document.getElementById('screenResults');

  const navBrand = document.getElementById('navBrand');
  const btnNavToggle = document.getElementById('btnNavToggle');
  const navLinksMenu = document.getElementById('navLinksMenu');
  const btnNavHowToPlay = document.getElementById('btnNavHowToPlay');
  const btnNavLeaderboard = document.getElementById('btnNavLeaderboard');
  const btnNavTeam = document.getElementById('btnNavTeam');

  const toastContainer = document.getElementById('toastContainer');

  // -------------------------------------------------------------------------
  // DOM Elements: Game Screen Elements
  // -------------------------------------------------------------------------
  // THE MODEL (AI) Card Elements
  const scoreAi = document.getElementById('scoreAi');
  const aiStatusPill = document.getElementById('aiStatusPill');
  const aiGuessLabel0 = document.getElementById('aiGuessLabel0');
  const aiGuessProb0 = document.getElementById('aiGuessProb0');
  const aiGuessBar0 = document.getElementById('aiGuessBar0');
  const aiGuessLabel1 = document.getElementById('aiGuessLabel1');
  const aiGuessProb1 = document.getElementById('aiGuessProb1');
  const aiGuessBar1 = document.getElementById('aiGuessBar1');
  const aiGuessLabel2 = document.getElementById('aiGuessLabel2');
  const aiGuessProb2 = document.getElementById('aiGuessProb2');
  const aiGuessBar2 = document.getElementById('aiGuessBar2');

  // CENTER CARD: Stage Elements
  const gameRoundBadge = document.getElementById('gameRoundBadge');
  const gameTimerText = document.getElementById('gameTimerText');
  const gameTimerPill = document.getElementById('gameTimerPill');
  const btnModeCamera = document.getElementById('btnModeCamera');
  const btnModePen = document.getElementById('btnModePen');
  const btnClear = document.getElementById('btnClear');

  const hudGesturePill = document.getElementById('hudGesturePill');
  const hudIcon = document.getElementById('hudIcon');
  const hudLabel = document.getElementById('hudLabel');

  const revealOverlay = document.getElementById('revealOverlay');
  const revealWordText = document.getElementById('revealWordText');
  const revealSeconds = document.getElementById('revealSeconds');
  const btnSkipReveal = document.getElementById('btnSkipReveal');

  const roundOverOverlay = document.getElementById('roundOverOverlay');
  const roundWinnerIcon = document.getElementById('roundWinnerIcon');
  const roundWinnerTitle = document.getElementById('roundWinnerTitle');
  const roundWinnerDetail = document.getElementById('roundWinnerDetail');
  const btnNextRound = document.getElementById('btnNextRound');

  const cameraFallback = document.getElementById('cameraFallback');
  const btnRetryCamera = document.getElementById('btnRetryCamera');
  const btnFallbackToPen = document.getElementById('btnFallbackToPen');

  // Letter Hint Elements
  const letterBoxesRow = document.getElementById('letterBoxesRow');
  const letterCountIndicator = document.getElementById('letterCountIndicator');

  // YOU (HUMAN) Card Elements
  const scoreHuman = document.getElementById('scoreHuman');
  const humanGuessInput = document.getElementById('humanGuessInput');
  const guessForm = document.getElementById('guessForm');
  const humanGuessFeedback = document.getElementById('humanGuessFeedback');
  const guessChipsList = document.getElementById('guessChipsList');
  const btnAbandonGame = document.getElementById('btnAbandonGame');
  const btnAbandonGameDesktop = document.getElementById('btnAbandonGameDesktop');

  // Home Screen Elements
  const btnStartGame = document.getElementById('btnStartGame');
  const btnInviteFriends = document.getElementById('btnInviteFriends');
  const homeHumanWins = document.getElementById('homeHumanWins');
  const homeAiWins = document.getElementById('homeAiWins');
  const btnOpenAboutModelModal = document.getElementById('btnOpenAboutModelModal');

  // Results Screen Elements
  const championTrophy = document.getElementById('championTrophy');
  const championTitle = document.getElementById('championTitle');
  const championSub = document.getElementById('championSub');
  const resHumanScore = document.getElementById('resHumanScore');
  const resAiScore = document.getElementById('resAiScore');
  const resHumanAvgTime = document.getElementById('resHumanAvgTime');
  const resAiAvgTime = document.getElementById('resAiAvgTime');
  const recapTableBody = document.getElementById('recapTableBody');
  const lifeHumanWins = document.getElementById('lifeHumanWins');
  const lifeAiWins = document.getElementById('lifeAiWins');
  const lifeTies = document.getElementById('lifeTies');
  const lifeTotalGames = document.getElementById('lifeTotalGames');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnBackHome = document.getElementById('btnBackHome');

  // Modals & Popups
  const modalPlayerName = document.getElementById('modalPlayerName');
  const playerNameInput = document.getElementById('playerNameInput');
  const nameCharCount = document.getElementById('nameCharCount');
  const playerNameError = document.getElementById('playerNameError');
  const btnConfirmStartGame = document.getElementById('btnConfirmStartGame');
  const labelPlayerCardName = document.getElementById('labelPlayerCardName');
  const resHumanLabel = document.getElementById('resHumanLabel');
  const resLeaderboardBanner = document.getElementById('resLeaderboardBanner');
  const resLeaderboardRank = document.getElementById('resLeaderboardRank');

  const modalHowItWorks = document.getElementById('modalHowItWorks');
  const modalControls = document.getElementById('modalControls');
  const modalRules = document.getElementById('modalRules');
  const modalTheWords = document.getElementById('modalTheWords');
  const modalAboutModel = document.getElementById('modalAboutModel');
  const modalLeaderboard = document.getElementById('modalLeaderboard');
  const modalTeam = document.getElementById('modalTeam');

  // Home Tile Buttons
  const btnTileWorks = document.getElementById('btnTileWorks');
  const btnTileControls = document.getElementById('btnTileControls');
  const btnTileRules = document.getElementById('btnTileRules');
  const btnTileWords = document.getElementById('btnTileWords');
  const btnTileModel = document.getElementById('btnTileModel');

  const btnClearLeaderboard = document.getElementById('btnClearLeaderboard');
  const boardHumanWins = document.getElementById('boardHumanWins');
  const boardAiWins = document.getElementById('boardAiWins');
  const boardTies = document.getElementById('boardTies');
  const boardWinRate = document.getElementById('boardWinRate');
  const leaderboardTableBody = document.getElementById('leaderboardTableBody');
  const leaderboardEmptyNote = document.getElementById('leaderboardEmptyNote');
  const leaderboardCurrentPlayerNote = document.getElementById('leaderboardCurrentPlayerNote');

  // Track latest match entry ID for leaderboard highlighting
  let latestLeaderboardEntryId = null;

  // State flags
  let isCameraActive = false;
  let isPointerDown = false;
  let handDetected = false;
  let currentRoundWord = '';

  // -------------------------------------------------------------------------
  // Mobile Nav Toggle Setup
  // -------------------------------------------------------------------------
  if (btnNavToggle && navLinksMenu) {
    btnNavToggle.addEventListener('click', () => {
      const isOpen = navLinksMenu.classList.toggle('open');
      btnNavToggle.setAttribute('aria-expanded', isOpen);
    });

    navLinksMenu.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navLinksMenu.classList.remove('open');
        btnNavToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // -------------------------------------------------------------------------
  // Device Detection & Drawing Mode Management (Camera mode vs Pen mode)
  // -------------------------------------------------------------------------
  function isTouchDevice() {
    return (
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (window.innerWidth <= 768)
    );
  }

  // Specifications:
  // - Phones & tablets (touch devices): start in Pen mode
  // - Desktop: start in Camera mode
  let currentMode = isTouchDevice() ? 'pen' : 'camera';

  function fallbackToPenMode(message) {
    currentMode = 'pen';
    drawing.setMode('pen');
    if (btnModePen) btnModePen.classList.add('active');
    if (btnModeCamera) btnModeCamera.classList.remove('active');
    stopWebcam();
    updateHUD('idle', 'Pen mode active! Draw with mouse, stylus or touch.', '✏️');
    if (message) {
      showToast(message, '✏️');
    }
  }

  async function applyMode(targetMode, isUserAction = false) {
    currentMode = targetMode;
    drawing.setMode(targetMode);

    if (targetMode === 'pen') {
      if (btnModePen) btnModePen.classList.add('active');
      if (btnModeCamera) btnModeCamera.classList.remove('active');
      stopWebcam();
      updateHUD('idle', 'Pen mode active! Draw with mouse, stylus or touch.', '✏️');
      if (isUserAction) {
        showToast('Switched to Pen mode ✏️', '✏️');
      }
    } else {
      if (btnModeCamera) btnModeCamera.classList.add('active');
      if (btnModePen) btnModePen.classList.remove('active');
      updateHUD('idle', 'Starting camera...', '📹');
      const started = await startWebcam();
      if (!started) {
        // Automatically switch to Pen mode if camera unavailable or denied
        fallbackToPenMode('Camera unavailable or permission denied. Switched to Pen mode ✏️');
        return;
      }
      if (isUserAction) {
        showToast('Switched to Camera mode 📹', '📹');
      }
    }
  }

  function setDrawingMode(mode) {
    applyMode(mode, true);
  }

  // -------------------------------------------------------------------------
  // Initialize Hand Tracker (Step 11 Colab implementation)
  // -------------------------------------------------------------------------
  const handTracker = new HandTracker({
    videoElement: webcam,
    overlayCanvas: overlayCanvas,
    aiInkCanvas: aiInkCanvas,
    onStatusUpdate: (text, penState) => {
      if (currentMode === 'camera') {
        updateHUD(penState === 'draw' ? 'drawing' : 'idle', text, penState === 'draw' ? '🤏' : '✋');
      }
    },
    onPalmClear: () => {
      drawing.clear();
      resetAIPanel();
    },
    onCameraReady: () => {
      isCameraActive = true;
    },
    onCameraError: (err) => {
      fallbackToPenMode('Camera unavailable or permission denied. Switched to Pen mode ✏️');
    }
  });

  drawing.setHandTracker(handTracker);

  // -------------------------------------------------------------------------
  // Initialize Game Manager
  // -------------------------------------------------------------------------
  const game = new GameManager({
    drawingManager: drawing,
    onRoundChange: handleRoundChange,
    onAIGuessUpdate: handleAIGuessUpdate
  });

  function updateHomeLifetimeStats() {
    if (game && game.lifetimeStats) {
      if (homeHumanWins) homeHumanWins.textContent = `Human: ${game.lifetimeStats.humanWins}`;
      if (homeAiWins) homeAiWins.textContent = `AI: ${game.lifetimeStats.aiWins}`;
    }
    populateLeaderboardModal();
  }

  // Pre-fill remembered player name from localStorage if present
  try {
    const rememberedPlayer = localStorage.getItem('guesswhat_player_name');
    if (rememberedPlayer) {
      game.setPlayerName(rememberedPlayer);
      if (labelPlayerCardName) labelPlayerCardName.textContent = rememberedPlayer;
      if (resHumanLabel) resHumanLabel.textContent = rememberedPlayer;
    }
  } catch (_) {}

  updateHomeLifetimeStats();

  // -------------------------------------------------------------------------
  // Screen Management (Camera stops whenever player leaves the game screen)
  // -------------------------------------------------------------------------
  function showScreen(screenId) {
    [screenHome, screenGame, screenResults].forEach(s => {
      if (s) s.classList.add('hidden');
    });

    if (screenId === 'home') {
      stopWebcam();
      screenHome.classList.remove('hidden');
      roundOverOverlay.classList.add('hidden');
      revealOverlay.classList.add('hidden');
      updateHomeLifetimeStats();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (screenId === 'game') {
      screenGame.classList.remove('hidden');
      roundOverOverlay.classList.add('hidden');
      revealOverlay.classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      applyMode(currentMode, false);
    } else if (screenId === 'results') {
      stopWebcam();
      screenResults.classList.remove('hidden');
      roundOverOverlay.classList.add('hidden');
      revealOverlay.classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // -------------------------------------------------------------------------
  // Letter Hint Boxes Rendering
  // -------------------------------------------------------------------------
  function renderLetterBoxes(secretWord, isRevealed = false) {
    if (!letterBoxesRow || !secretWord) return;
    letterBoxesRow.innerHTML = '';
    currentRoundWord = secretWord;

    const words = secretWord.trim().split(/\s+/);
    const totalLetters = secretWord.replace(/\s+/g, '').length;

    if (letterCountIndicator) {
      if (words.length > 1) {
        letterCountIndicator.textContent = `${totalLetters} letters (${words.length} words)`;
      } else {
        letterCountIndicator.textContent = `${totalLetters} letters`;
      }
    }

    words.forEach((word, wordIndex) => {
      if (wordIndex > 0) {
        const gap = document.createElement('div');
        gap.className = 'letter-box-gap';
        letterBoxesRow.appendChild(gap);
      }

      for (let i = 0; i < word.length; i++) {
        const char = word[i].toUpperCase();
        const box = document.createElement('div');
        box.className = 'letter-box';
        box.dataset.char = char;

        if (isRevealed) {
          box.textContent = char;
          box.classList.add('revealed');
        } else {
          box.textContent = '';
        }

        letterBoxesRow.appendChild(box);
      }
    });
  }

  function revealLetterBoxes() {
    if (!letterBoxesRow) return;
    const boxes = letterBoxesRow.querySelectorAll('.letter-box');
    boxes.forEach((box, idx) => {
      setTimeout(() => {
        box.textContent = box.dataset.char || '';
        box.classList.add('revealed');
      }, idx * 60);
    });
  }

  // -------------------------------------------------------------------------
  // Handle Round State Events
  // -------------------------------------------------------------------------
  function handleRoundChange(event) {
    switch (event.type) {
      case 'REVEAL_START':
        drawing.setPlaying(false);
        handTracker.setPlaying(false);
        gameRoundBadge.textContent = `Round ${event.round} of ${event.totalRounds}`;
        scoreHuman.textContent = event.humanScore;
        scoreAi.textContent = event.aiScore;

        gameTimerText.textContent = '60s';
        gameTimerPill.style.background = '#fee2e2';

        resetAIPanel();

        humanGuessInput.value = '';
        humanGuessFeedback.textContent = 'Type your guess & hit Enter!';
        humanGuessFeedback.className = 'guess-feedback';
        if (guessChipsList) guessChipsList.innerHTML = '';

        renderLetterBoxes(event.secretWord, false);

        revealWordText.textContent = event.secretWord.toUpperCase();
        revealSeconds.textContent = event.countdown;
        revealOverlay.classList.remove('hidden');
        roundOverOverlay.classList.add('hidden');

        drawing.clear();
        break;

      case 'REVEAL_TICK':
        revealSeconds.textContent = event.countdown;
        break;

      case 'PLAYING_START':
        drawing.setPlaying(true);
        handTracker.setPlaying(true);
        revealOverlay.classList.add('hidden');
        roundOverOverlay.classList.add('hidden');
        humanGuessInput.focus();
        if (currentMode === 'pen') {
          updateHUD('idle', 'Drawing active! Draw on canvas with mouse, stylus or touch.', '✏️');
        } else {
          updateHUD('idle', 'Drawing active! Pinch to draw.', '✏️');
        }
        break;

      case 'TIMER_TICK':
        gameTimerText.textContent = `${event.remainingSeconds}s`;
        if (event.remainingSeconds <= 10) {
          gameTimerPill.style.background = '#fecaca';
        }
        break;

      case 'ROUND_OVER':
        drawing.setPlaying(false);
        handTracker.setPlaying(false);
        scoreHuman.textContent = event.humanScore;
        scoreAi.textContent = event.aiScore;

        revealLetterBoxes();

        if (event.winner === 'HUMAN') {
          roundWinnerIcon.textContent = '🎉';
          roundWinnerTitle.textContent = `${(game.playerName || 'YOU').toUpperCase()} GUESSED IT!`;
          roundWinnerDetail.textContent = `Guessed "${event.word.toUpperCase()}" in ${event.time}s!`;
        } else if (event.winner === 'AI') {
          roundWinnerIcon.textContent = '🤖';
          roundWinnerTitle.textContent = 'THE MODEL WON!';
          roundWinnerDetail.textContent = `The model guessed "${event.word.toUpperCase()}" in ${event.time}s!`;
        } else {
          roundWinnerIcon.textContent = '⏰';
          roundWinnerTitle.textContent = "TIME'S UP!";
          roundWinnerDetail.textContent = `No one guessed it! The word was: ${event.word.toUpperCase()}`;
        }

        btnNextRound.innerHTML = event.isLastRound
          ? '<span>View Match Results ➔</span>'
          : '<span>Next Round ➔</span>';

        roundOverOverlay.classList.remove('hidden');
        break;

      case 'GAME_OVER':
        latestLeaderboardEntryId = event.leaderboardEntry ? event.leaderboardEntry.id : null;
        renderResultsScreen(event);
        showScreen('results');
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Handle AI Live Prediction Updates
  // -------------------------------------------------------------------------
  function handleAIGuessUpdate(topGuesses, confident, input) {
    if (!topGuesses || topGuesses.length === 0) {
      resetAIPanel();
      return;
    }

    const top = topGuesses[0];
    const topProb = Math.round(top.prob * 100);

    if (confident) {
      aiStatusPill.textContent = `CONFIDENT (${topProb}%)`;
      aiStatusPill.className = 'ai-status-pill status-confident';
    } else {
      aiStatusPill.textContent = 'Hmm... not sure';
      aiStatusPill.className = 'ai-status-pill status-unsure';
    }

    if (topGuesses[0]) {
      const p = Math.round(topGuesses[0].prob * 100);
      aiGuessLabel0.textContent = topGuesses[0].label;
      aiGuessProb0.textContent = `${p}%`;
      aiGuessBar0.style.width = `${p}%`;
    }

    if (topGuesses[1]) {
      const p = Math.round(topGuesses[1].prob * 100);
      aiGuessLabel1.textContent = topGuesses[1].label;
      aiGuessProb1.textContent = `${p}%`;
      aiGuessBar1.style.width = `${p}%`;
    }

    if (topGuesses[2]) {
      const p = Math.round(topGuesses[2].prob * 100);
      aiGuessLabel2.textContent = topGuesses[2].label;
      aiGuessProb2.textContent = `${p}%`;
      aiGuessBar2.style.width = `${p}%`;
    }

    if (input && aiVisionCanvas && window.Predictor && typeof window.Predictor.drawPreview === 'function') {
      window.Predictor.drawPreview(input, aiVisionCanvas);
    }
  }

  function resetAIPanel() {
    aiStatusPill.textContent = 'WAITING FOR DRAWING';
    aiStatusPill.className = 'ai-status-pill status-idle';

    aiGuessLabel0.textContent = '—';
    aiGuessProb0.textContent = '0%';
    aiGuessBar0.style.width = '0%';

    aiGuessLabel1.textContent = '—';
    aiGuessProb1.textContent = '0%';
    aiGuessBar1.style.width = '0%';

    aiGuessLabel2.textContent = '—';
    aiGuessProb2.textContent = '0%';
    aiGuessBar2.style.width = '0%';

    if (aiVisionCanvas) {
      const vCtx = aiVisionCanvas.getContext('2d');
      vCtx.clearRect(0, 0, aiVisionCanvas.width, aiVisionCanvas.height);
    }
  }

  // -------------------------------------------------------------------------
  // Contestant Guess Submission
  // -------------------------------------------------------------------------
  guessForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitHumanGuess();
  });

  function submitHumanGuess() {
    const rawGuess = humanGuessInput.value.trim();
    if (!rawGuess) return;

    if (guessChipsList) {
      const chip = document.createElement('span');
      chip.className = 'guess-chip';
      chip.textContent = `#${rawGuess}`;
      guessChipsList.appendChild(chip);
    }

    const result = game.handleHumanGuess(rawGuess);

    if (result.success && result.correct) {
      humanGuessFeedback.textContent = `🎯 Correct! (${result.time}s)`;
      humanGuessFeedback.className = 'guess-feedback correct';
      humanGuessInput.value = '';
    } else if (result.success && !result.correct) {
      humanGuessInput.classList.add('shake');
      setTimeout(() => humanGuessInput.classList.remove('shake'), 350);

      humanGuessFeedback.textContent = '❌ Wrong! Try again';
      humanGuessFeedback.className = 'guess-feedback wrong';
      humanGuessInput.select();

      setTimeout(() => {
        if (humanGuessFeedback.textContent === '❌ Wrong! Try again') {
          humanGuessFeedback.textContent = 'Type your guess & hit Enter!';
          humanGuessFeedback.className = 'guess-feedback';
        }
      }, 1500);
    }
  }

  // -------------------------------------------------------------------------
  // Match Results Screen
  // -------------------------------------------------------------------------
  function renderResultsScreen(data) {
    const playerName = data.playerName || game.playerName || 'YOU';

    if (data.winner === 'HUMAN') {
      championTrophy.textContent = '🏆';
      championTitle.textContent = `${playerName.toUpperCase()} WINS THE MATCH!`;
      championSub.textContent = `Incredible speed, ${playerName}! You out-guessed the AI model.`;
    } else if (data.winner === 'AI') {
      championTrophy.textContent = '🤖';
      championTitle.textContent = 'THE MODEL WINS!';
      championSub.textContent = 'The CNN model had lightning-quick recognition this match!';
    } else {
      championTrophy.textContent = '🤝';
      championTitle.textContent = "IT'S A DRAW!";
      championSub.textContent = 'Both sides tied in points! What a showdown.';
    }

    if (resHumanLabel) resHumanLabel.textContent = playerName;

    // Leaderboard Saved Notification Banner & Rank
    if (resLeaderboardBanner && resLeaderboardRank) {
      if (data.playerRank) {
        const medal = data.playerRank === 1 ? '🥇' : data.playerRank === 2 ? '🥈' : data.playerRank === 3 ? '🥉' : '';
        resLeaderboardRank.textContent = `Rank #${data.playerRank} ${medal}`.trim();
        resLeaderboardBanner.classList.remove('hidden');
      } else {
        resLeaderboardBanner.classList.add('hidden');
      }
    }

    resHumanScore.textContent = data.humanScore;
    resAiScore.textContent = data.aiScore;
    resHumanAvgTime.textContent = data.avgHumanTime !== '—' ? `${data.avgHumanTime}s` : '—';
    resAiAvgTime.textContent = data.avgAiTime !== '—' ? `${data.avgAiTime}s` : '—';

    recapTableBody.innerHTML = '';
    data.roundHistory.forEach(r => {
      const tr = document.createElement('tr');
      let winnerClass = 'winner-tag-none';
      let winnerText = 'Time Out';

      if (r.winner === 'HUMAN') {
        winnerClass = 'winner-tag-human';
        winnerText = `👤 ${playerName}`;
      } else if (r.winner === 'AI') {
        winnerClass = 'winner-tag-model';
        winnerText = '🤖 THE MODEL';
      }

      tr.innerHTML = `
        <td><strong>Round ${r.round}</strong></td>
        <td style="text-transform: capitalize;">${r.word}</td>
        <td class="${winnerClass}">${winnerText}</td>
        <td>${r.time}s</td>
      `;
      recapTableBody.appendChild(tr);
    });

    lifeHumanWins.textContent = data.lifetimeStats.humanWins;
    lifeAiWins.textContent = data.lifetimeStats.aiWins;
    lifeTies.textContent = data.lifetimeStats.ties;
    lifeTotalGames.textContent = data.lifetimeStats.totalGames;
  }

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Webcam Lifecycle & HUD
  // -------------------------------------------------------------------------
  async function startWebcam() {
    try {
      cameraFallback.classList.add('hidden');
      const startPromise = handTracker.startCamera();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Camera start timed out')), 4000)
      );
      await Promise.race([startPromise, timeoutPromise]);
      isCameraActive = true;
      return true;
    } catch (err) {
      console.warn('Camera start error:', err);
      isCameraActive = false;
      return false;
    }
  }

  function stopWebcam() {
    handTracker.stopCamera();
    isCameraActive = false;
  }

  function updateHUD(type, text, icon) {
    if (hudIcon) hudIcon.textContent = icon;
    if (hudLabel) hudLabel.textContent = text;
    hudGesturePill.classList.remove('drawing', 'clearing');
    if (type === 'drawing') hudGesturePill.classList.add('drawing');
    if (type === 'clearing') hudGesturePill.classList.add('clearing');
  }

  // -------------------------------------------------------------------------
  // Buttons & Navigation Event Listeners
  // -------------------------------------------------------------------------
  btnSkipReveal.addEventListener('click', () => game.skipReveal());

  btnNextRound.addEventListener('click', () => {
    roundOverOverlay.classList.add('hidden');
    game.proceedAfterRound();
  });

  // Player Name Modal & Game Start
  function openPlayerNameModal() {
    let savedName = '';
    try {
      savedName = localStorage.getItem('guesswhat_player_name') || '';
    } catch (_) {}
    if (playerNameInput) {
      playerNameInput.value = savedName;
      updateNameCharCount();
    }
    if (playerNameError) playerNameError.classList.add('hidden');
    openModal(modalPlayerName);
    setTimeout(() => {
      if (playerNameInput) {
        playerNameInput.focus();
        if (savedName) playerNameInput.select();
      }
    }, 100);
  }

  function updateNameCharCount() {
    if (!playerNameInput || !nameCharCount) return;
    const len = (playerNameInput.value || '').length;
    nameCharCount.textContent = `${len} / 15`;
  }

  function handleConfirmStart() {
    if (!playerNameInput) return;
    const raw = (playerNameInput.value || '').trim();
    if (!raw || raw.length === 0) {
      if (playerNameError) {
        playerNameError.textContent = '⚠️ Please enter a name (1 to 15 characters).';
        playerNameError.classList.remove('hidden');
      }
      playerNameInput.focus();
      return;
    }

    const validName = raw.slice(0, 15);
    try {
      localStorage.setItem('guesswhat_player_name', validName);
    } catch (_) {}

    game.setPlayerName(validName);
    if (labelPlayerCardName) labelPlayerCardName.textContent = validName;
    if (resHumanLabel) resHumanLabel.textContent = validName;

    closeAllModals();
    showScreen('game');
    game.startNewGame();
  }

  if (playerNameInput) {
    playerNameInput.addEventListener('input', () => {
      updateNameCharCount();
      if (playerNameError) playerNameError.classList.add('hidden');
    });

    playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmStart();
      }
    });
  }

  if (btnConfirmStartGame) {
    btnConfirmStartGame.addEventListener('click', handleConfirmStart);
  }

  // When clicking "Let's play!", open Player Name dialog
  btnStartGame.addEventListener('click', () => {
    if (btnStartGame.disabled) return;
    openPlayerNameModal();
  });

  btnPlayAgain.addEventListener('click', async () => {
    showScreen('game');
    game.startNewGame();
  });

  btnBackHome.addEventListener('click', () => {
    stopWebcam();
    showScreen('home');
  });

  navBrand.addEventListener('click', (e) => {
    e.preventDefault();
    if (game.state === 'PLAYING') {
      if (confirm('Leave current game and return to Home?')) {
        game.cleanupRoundTimers();
        stopWebcam();
        showScreen('home');
      }
    } else {
      stopWebcam();
      showScreen('home');
    }
  });

  function handleAbandon() {
    if (confirm('Abandon the current match and return to Home?')) {
      game.cleanupRoundTimers();
      stopWebcam();
      showScreen('home');
    }
  }

  if (btnAbandonGame) btnAbandonGame.addEventListener('click', handleAbandon);
  if (btnAbandonGameDesktop) btnAbandonGameDesktop.addEventListener('click', handleAbandon);

  btnClear.addEventListener('click', () => {
    drawing.clear();
    resetAIPanel();
  });

  // Mode Toggle Buttons (Switch at any time, even during a round)
  if (btnModeCamera) {
    btnModeCamera.addEventListener('click', () => {
      if (currentMode !== 'camera') {
        applyMode('camera', true);
      }
    });
  }

  if (btnModePen) {
    btnModePen.addEventListener('click', () => {
      if (currentMode !== 'pen') {
        applyMode('pen', true);
      }
    });
  }

  window.addEventListener('resize', () => {
    drawing.onResize();
  });

  // Invite friends (Copy Link to Clipboard)
  btnInviteFriends.addEventListener('click', () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => showToast('Link copied to clipboard! Share it with a friend 📋'))
        .catch(() => fallbackCopy(shareUrl));
    } else {
      fallbackCopy(shareUrl);
    }
  });

  function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard! 📋');
    } catch (_) {
      showToast('Could not copy link. Share this URL: ' + text);
    }
    document.body.removeChild(input);
  }

  // -------------------------------------------------------------------------
  // Modals & Popups Management
  // Only one popup open at a time. Closes on Esc or clicking backdrop.
  // -------------------------------------------------------------------------
  const allModals = [
    modalPlayerName,
    modalHowItWorks,
    modalControls,
    modalRules,
    modalTheWords,
    modalAboutModel,
    modalLeaderboard,
    modalTeam
  ].filter(Boolean);

  function closeAllModals() {
    allModals.forEach(m => m.classList.add('hidden'));
    document.body.style.overflow = '';
  }

  function openModal(modalElement) {
    if (!modalElement) return;
    closeAllModals(); // Enforce: only one popup open at a time
    modalElement.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Home Tile Buttons
  if (btnTileWorks) btnTileWorks.addEventListener('click', () => openModal(modalHowItWorks));
  if (btnTileControls) btnTileControls.addEventListener('click', () => openModal(modalControls));
  if (btnTileRules) btnTileRules.addEventListener('click', () => openModal(modalRules));
  if (btnTileWords) btnTileWords.addEventListener('click', () => openModal(modalTheWords));
  if (btnTileModel) btnTileModel.addEventListener('click', () => openModal(modalAboutModel));

  // Nav Buttons
  // The nav "How to play" button opens the "How it works" popup
  if (btnNavHowToPlay) btnNavHowToPlay.addEventListener('click', () => openModal(modalHowItWorks));

  if (btnNavLeaderboard) {
    btnNavLeaderboard.addEventListener('click', () => {
      populateLeaderboardModal();
      openModal(modalLeaderboard);
    });
  }

  if (btnNavTeam) btnNavTeam.addEventListener('click', () => openModal(modalTeam));

  // Initialize Team LinkedIn URLs from constants
  const linkRazan = document.getElementById('linkRazanLinkedIn');
  const linkJoud = document.getElementById('linkJoudLinkedIn');
  const linkHayat = document.getElementById('linkHayatLinkedIn');
  if (linkRazan && typeof RAZAN_LINKEDIN !== 'undefined') linkRazan.href = RAZAN_LINKEDIN;
  if (linkJoud && typeof JOUD_LINKEDIN !== 'undefined') linkJoud.href = JOUD_LINKEDIN;
  if (linkHayat && typeof HAYAT_LINKEDIN !== 'undefined') linkHayat.href = HAYAT_LINKEDIN;

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Clear Leaderboard Button with Confirmation Step
  if (btnClearLeaderboard) {
    btnClearLeaderboard.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all leaderboard entries? This cannot be undone.')) {
        try {
          localStorage.removeItem('guesswhat_leaderboard');
        } catch (_) {}
        latestLeaderboardEntryId = null;
        populateLeaderboardModal();
        showToast('Leaderboard cleared! 🗑️');
      }
    });
  }

  function populateLeaderboardModal() {
    if (!game) return;
    const stats = game.lifetimeStats;
    if (boardHumanWins) boardHumanWins.textContent = stats.humanWins;
    if (boardAiWins) boardAiWins.textContent = stats.aiWins;
    if (boardTies) boardTies.textContent = stats.ties;

    const rate = stats.totalGames > 0
      ? Math.round((stats.humanWins / stats.totalGames) * 100)
      : 0;
    if (boardWinRate) boardWinRate.textContent = `${rate}%`;

    if (!leaderboardTableBody) return;
    leaderboardTableBody.innerHTML = '';

    let leaderboard = [];
    try {
      const saved = localStorage.getItem('guesswhat_leaderboard');
      if (saved) leaderboard = JSON.parse(saved);
      if (!Array.isArray(leaderboard)) leaderboard = [];
    } catch (_) {
      leaderboard = [];
    }

    if (leaderboard.length === 0) {
      if (leaderboardEmptyNote) leaderboardEmptyNote.classList.remove('hidden');
      if (leaderboardCurrentPlayerNote) leaderboardCurrentPlayerNote.classList.add('hidden');
      return;
    }

    if (leaderboardEmptyNote) leaderboardEmptyNote.classList.add('hidden');

    const top10 = leaderboard.slice(0, 10);
    let isCurrentPlayerInTop10 = false;

    top10.forEach((entry, idx) => {
      const rankNum = idx + 1;
      const isCurrent = (latestLeaderboardEntryId && entry.id === latestLeaderboardEntryId);
      if (isCurrent) isCurrentPlayerInTop10 = true;

      const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : '';
      const tr = document.createElement('tr');
      if (isCurrent) tr.className = 'row-highlight-current';

      const resText = entry.result || 'Tie';
      const resClass = resText.includes('Won') ? 'res-won' : resText.includes('AI') ? 'res-lost' : 'res-tie';

      tr.innerHTML = `
        <td><strong>#${rankNum}</strong> ${medal}</td>
        <td>
          <span class="player-name-cell">${escapeHtml(entry.name || 'Player')}</span>
          ${isCurrent ? '<span class="you-badge">⭐ Current</span>' : ''}
        </td>
        <td><strong class="score-badge">${entry.score}</strong> / 5</td>
        <td><span class="res-tag ${resClass}">${escapeHtml(resText)}</span></td>
        <td>${escapeHtml(entry.avgTime || '—')}</td>
        <td><span class="date-cell">${escapeHtml(entry.date || '—')}</span></td>
      `;
      leaderboardTableBody.appendChild(tr);
    });

    // If current match fell outside the top 10 (e.g. rank #12), show note
    if (latestLeaderboardEntryId && !isCurrentPlayerInTop10 && leaderboardCurrentPlayerNote) {
      const pIdx = leaderboard.findIndex(e => e.id === latestLeaderboardEntryId);
      if (pIdx >= 0) {
        const pEntry = leaderboard[pIdx];
        leaderboardCurrentPlayerNote.innerHTML = `
          <span>⭐ Your Latest Match: <strong>Rank #${pIdx + 1}</strong> (${escapeHtml(pEntry.name)} — ${pEntry.score} / 5, ${escapeHtml(pEntry.result)})</span>
        `;
        leaderboardCurrentPlayerNote.classList.remove('hidden');
      } else {
        leaderboardCurrentPlayerNote.classList.add('hidden');
      }
    } else if (leaderboardCurrentPlayerNote) {
      leaderboardCurrentPlayerNote.classList.add('hidden');
    }
  }

  // Close triggers: any element with data-close="modal"
  document.querySelectorAll('[data-close="modal"]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Close triggers: clicking on backdrop (outside the popup)
  allModals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  // Close triggers: Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Keyboard shortcut: 'C' to clear
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === humanGuessInput) return;
    if (e.key === 'c' || e.key === 'C') {
      drawing.clear();
    }
  });

  // Window resize handler: keeps canvas buffer crisp if window DPI / zoom changes
  window.addEventListener('resize', () => {
    handTracker.syncCanvasSize();
  });

  // -------------------------------------------------------------------------
  // Initialize Real Colab Predictor CNN Model
  // -------------------------------------------------------------------------
  async function initPredictorModel() {
    if (!btnStartGame) return;
    btnStartGame.disabled = true;
    btnStartGame.innerHTML = '<span>Loading the AI... 🧠</span>';

    try {
      if (!window.Predictor || typeof window.Predictor.loadModel !== 'function') {
        throw new Error('Predictor engine is not loaded on window.Predictor');
      }

      const classes = await window.Predictor.loadModel('model');
      console.log('✅ Predictor AI model loaded successfully with 20 classes:', classes);
      game.setWordPool(classes);

      btnStartGame.disabled = false;
      btnStartGame.innerHTML = '<span>Let\'s play! 🎮</span>';
    } catch (err) {
      console.warn('⚠️ Predictor AI model deferred or offline:', err);
      // Fallback: still enable playing with default 20 classes
      btnStartGame.disabled = false;
      btnStartGame.innerHTML = '<span>Let\'s play! 🎮</span>';
      const fallbackClasses = ["sun","fish","house","star","umbrella","apple","tree","car","cat","cloud","eye","key","moon","mushroom","envelope","lightning","smiley face","rainbow","ladder","ice cream"];
      game.setWordPool(fallbackClasses);
    }
  }

  // Load model once on site load
  initPredictorModel();

  // Show Home Screen initially
  showScreen('home');
});
