/**
 * game.js - Human vs AI: Who Guesses Faster?
 * Manages game state, 5 rounds, 60s timer, secret word reveal,
 * normalized guess matching with synonyms, and Colab TF.js AI predictions.
 */

class GameManager {
  constructor({ drawingManager, onRoundChange, onAIGuessUpdate }) {
    this.drawingManager = drawingManager;
    this.onRoundChange = onRoundChange || (() => {});
    this.onAIGuessUpdate = onAIGuessUpdate || (() => {});

    // Game Configuration
    this.TOTAL_ROUNDS = 5;
    this.ROUND_TIME_LIMIT = 60; // 60 seconds per round
    this.REVEAL_COUNTDOWN = 3;  // 3 seconds reveal for drawer
    this.AI_PREDICT_INTERVAL = 600; // 600ms per Colab spec

    // The 20 Classes from model/classes.json (Colab Quick, Draw! CNN)
    this.WORD_POOL = [
      "sun", "fish", "house", "star", "umbrella",
      "apple", "tree", "car", "cat", "cloud",
      "eye", "key", "moon", "mushroom", "envelope",
      "lightning", "smiley face", "rainbow", "ladder", "ice cream"
    ];

    // Extra Accepted Answers Dictionary (from GAME_SPEC.md)
    this.SYNONYMS = {
      "smiley face": ["smiley", "smile", "face", "smileyface"],
      "ice cream": ["icecream", "ice", "cream"],
      "house": ["home"],
      "cat": ["kitten", "kitty"],
      "lightning": ["thunder"]
    };

    // State Variables
    this.state = 'HOME'; // 'HOME', 'REVEAL', 'PLAYING', 'ROUND_OVER', 'RESULTS'
    this.currentRound = 1;
    this.humanScore = 0;
    this.aiScore = 0;
    this.roundWords = [];
    this.currentWord = '';

    // Timer Variables
    this.roundStartTime = 0;
    this.roundElapsedTime = 0;
    this.timerInterval = null;
    this.aiGuessInterval = null;
    this.revealTimer = null;

    // Track if drawing changed to optimize AI calls
    this.lastStrokeCount = -1;

    // Player name (1-15 chars, defaults to 'YOU')
    this.playerName = 'YOU';

    // Stats history for current 5-round match
    this.roundHistory = [];

    // Persistent stats from localStorage
    this.loadStats();

    if (window.Predictor && window.Predictor.classes && window.Predictor.classes.length > 0) {
      this.WORD_POOL = [...window.Predictor.classes];
    }
  }

  /**
   * Set word pool from loaded Predictor classes
   */
  setWordPool(classes) {
    if (Array.isArray(classes) && classes.length > 0) {
      this.WORD_POOL = [...classes];
    }
  }

  /**
   * Set player name (1-15 characters)
   */
  setPlayerName(name) {
    if (name && typeof name === 'string') {
      const trimmed = name.trim().slice(0, 15);
      if (trimmed.length > 0) {
        this.playerName = trimmed;
      }
    }
  }

  /**
   * Load lifetime stats & match history from localStorage
   */
  loadStats() {
    try {
      const savedStats = localStorage.getItem('guesswhat_game_stats');
      this.lifetimeStats = savedStats ? JSON.parse(savedStats) : {
        humanWins: 0,
        aiWins: 0,
        ties: 0,
        totalGames: 0
      };

      const savedHistory = localStorage.getItem('guesswhat_match_history');
      this.matchHistory = savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
      this.lifetimeStats = { humanWins: 0, aiWins: 0, ties: 0, totalGames: 0 };
      this.matchHistory = [];
    }
  }

  /**
   * Save stats & match history to localStorage
   */
  saveStats() {
    try {
      localStorage.setItem('guesswhat_game_stats', JSON.stringify(this.lifetimeStats));
      localStorage.setItem('guesswhat_match_history', JSON.stringify(this.matchHistory.slice(-20))); // keep last 20
    } catch (e) {
      console.warn('Could not save stats to localStorage', e);
    }
  }

  /**
   * Reset lifetime stats
   */
  resetStats() {
    this.lifetimeStats = { humanWins: 0, aiWins: 0, ties: 0, totalGames: 0 };
    this.matchHistory = [];
    this.saveStats();
    try {
      localStorage.removeItem('guesswhat_leaderboard');
    } catch (_) {}
  }

  /**
   * Normalize strings for comparison (case-insensitive, strip whitespace and punctuation)
   */
  normalize(str) {
    if (!str) return '';
    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Check if a guess matches the target word, considering spaces & synonyms
   */
  isGuessMatch(rawGuess, targetWord) {
    if (!rawGuess || !targetWord) return false;

    const normGuess = this.normalize(rawGuess);
    const normTarget = this.normalize(targetWord);

    if (normGuess === normTarget) return true;

    // Check synonyms dictionary
    const targetKey = targetWord.toLowerCase().trim();
    const synList = this.SYNONYMS[targetKey];
    if (synList) {
      for (const syn of synList) {
        if (normGuess === this.normalize(syn)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Start a brand new 5-round match
   */
  startNewGame() {
    this.cleanupRoundTimers();
    this.currentRound = 1;
    this.humanScore = 0;
    this.aiScore = 0;
    this.roundHistory = [];
    this.roundElapsedTime = 0;

    // Pick 5 distinct random words from the 20 classes
    const pool = [...this.WORD_POOL];
    const shuffled = pool.sort(() => 0.5 - Math.random());
    this.roundWords = shuffled.slice(0, this.TOTAL_ROUNDS);

    this.startRound(this.currentRound);
  }

  /**
   * Begin a specific round
   */
  startRound(roundNumber) {
    this.cleanupRoundTimers();
    this.currentRound = roundNumber;
    this.currentWord = this.roundWords[roundNumber - 1];
    this.roundElapsedTime = 0;
    this.lastStrokeCount = -1;
    this.state = 'REVEAL';

    // Clear drawings, AI guesses, and vision preview at the start of every round
    this.drawingManager.clear();
    this.onAIGuessUpdate(null, false, null);

    // Prepare letter hint structure
    const wordsInSecret = this.currentWord.trim().split(/\s+/);
    const letterCount = this.currentWord.replace(/\s+/g, '').length;

    // Trigger reveal callback (shows "Contestant, look away!" for 3s)
    this.onRoundChange({
      type: 'REVEAL_START',
      round: this.currentRound,
      totalRounds: this.TOTAL_ROUNDS,
      secretWord: this.currentWord,
      letterCount,
      wordGroups: wordsInSecret,
      countdown: this.REVEAL_COUNTDOWN,
      humanScore: this.humanScore,
      aiScore: this.aiScore
    });

    let countdownSeconds = this.REVEAL_COUNTDOWN;
    if (this.revealTimer) clearInterval(this.revealTimer);

    this.revealTimer = setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds > 0) {
        this.onRoundChange({
          type: 'REVEAL_TICK',
          countdown: countdownSeconds
        });
      } else {
        clearInterval(this.revealTimer);
        this.revealTimer = null;
        this.beginDrawingPhase();
      }
    }, 1000);
  }

  /**
   * Skip reveal countdown if drawer clicks "I'm Ready"
   */
  skipReveal() {
    if (this.state === 'REVEAL') {
      if (this.revealTimer) clearInterval(this.revealTimer);
      this.revealTimer = null;
      this.beginDrawingPhase();
    }
  }

  /**
   * Transition from Reveal to live drawing & guessing phase
   */
  beginDrawingPhase() {
    this.state = 'PLAYING';
    this.roundStartTime = performance.now();
    this.roundElapsedTime = 0;

    const wordsInSecret = this.currentWord.trim().split(/\s+/);
    const letterCount = this.currentWord.replace(/\s+/g, '').length;

    this.onRoundChange({
      type: 'PLAYING_START',
      round: this.currentRound,
      totalRounds: this.TOTAL_ROUNDS,
      secretWord: this.currentWord,
      letterCount,
      wordGroups: wordsInSecret,
      humanScore: this.humanScore,
      aiScore: this.aiScore
    });

    // 1. Round countdown timer (ticks every 100ms)
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state !== 'PLAYING') return;

      const elapsed = (performance.now() - this.roundStartTime) / 1000;
      this.roundElapsedTime = parseFloat(elapsed.toFixed(1));
      const remaining = Math.max(0, this.ROUND_TIME_LIMIT - this.roundElapsedTime);

      this.onRoundChange({
        type: 'TIMER_TICK',
        remainingSeconds: Math.ceil(remaining),
        elapsedSeconds: this.roundElapsedTime,
        progressPercent: (remaining / this.ROUND_TIME_LIMIT) * 100
      });

      if (remaining <= 0) {
        this.handleRoundTimeout();
      }
    }, 100);

    // 2. AI Guess Loop: runs every 600ms (per GAME_SPEC.md)
    if (this.aiGuessInterval) clearInterval(this.aiGuessInterval);
    this.aiGuessInterval = setInterval(() => {
      if (this.state === 'PLAYING') {
        this.executeAIGuess();
      }
    }, this.AI_PREDICT_INTERVAL);
  }

  /**
   * Execute one AI prediction step via Predictor and evaluate if AI wins
   */
  executeAIGuess() {
    if (this.state !== 'PLAYING') return;

    // Only call predict if the drawing changed!
    if (!this.drawingManager.isDirty()) {
      return;
    }

    // Call real Predictor from predict.js
    if (!window.Predictor || typeof window.Predictor.predict !== 'function') {
      return;
    }

    this.drawingManager.setDirty(false);

    try {
      const res = window.Predictor.predict(this.drawingManager.aiInkCanvas);
      if (!res || !res.top || res.top.length === 0) {
        return;
      }

      const top = res.top; // [{ label, prob }, ...]
      const confident = res.confident; // top[0].prob >= 0.70
      const input = res.input;

      this.onAIGuessUpdate(top, confident, input);

      // SPEC RULE: AI wins if top[0].label === the secret word AND result.confident is true
      const topGuess = top[0];
      if (confident && topGuess && this.isGuessMatch(topGuess.label, this.currentWord)) {
        this.handleRoundWin('AI', this.roundElapsedTime, topGuess.prob);
      }
    } catch (err) {
      console.warn('AI prediction error:', err);
    }
  }

  /**
   * Process guess from human contestant
   */
  handleHumanGuess(rawGuess) {
    if (this.state !== 'PLAYING') {
      return { success: false, reason: 'NOT_ACTIVE' };
    }

    if (!rawGuess || !rawGuess.trim()) {
      return { success: false, reason: 'EMPTY' };
    }

    // Check if human guess is correct
    if (this.isGuessMatch(rawGuess, this.currentWord)) {
      this.handleRoundWin('HUMAN', this.roundElapsedTime);
      return { success: true, correct: true, time: this.roundElapsedTime, word: this.currentWord };
    }

    return { success: true, correct: false, guess: rawGuess.trim() };
  }

  /**
   * Round won by Human or AI
   */
  handleRoundWin(winner, time, confidence = null) {
    if (this.state !== 'PLAYING') return;
    this.cleanupRoundTimers();
    this.state = 'ROUND_OVER';

    if (winner === 'HUMAN') {
      this.humanScore++;
    } else if (winner === 'AI') {
      this.aiScore++;
    }

    const roundResult = {
      round: this.currentRound,
      word: this.currentWord,
      winner,
      time: parseFloat(time.toFixed(1)),
      confidence
    };
    this.roundHistory.push(roundResult);

    this.onRoundChange({
      type: 'ROUND_OVER',
      winner,
      time: roundResult.time,
      word: this.currentWord,
      humanScore: this.humanScore,
      aiScore: this.aiScore,
      isLastRound: this.currentRound >= this.TOTAL_ROUNDS
    });
  }

  /**
   * Round timed out (no winner)
   */
  handleRoundTimeout() {
    if (this.state !== 'PLAYING') return;
    this.cleanupRoundTimers();
    this.state = 'ROUND_OVER';

    const roundResult = {
      round: this.currentRound,
      word: this.currentWord,
      winner: 'NONE',
      time: this.ROUND_TIME_LIMIT
    };
    this.roundHistory.push(roundResult);

    this.onRoundChange({
      type: 'ROUND_OVER',
      winner: 'NONE',
      time: this.ROUND_TIME_LIMIT,
      word: this.currentWord,
      humanScore: this.humanScore,
      aiScore: this.aiScore,
      isLastRound: this.currentRound >= this.TOTAL_ROUNDS
    });
  }

  /**
   * Proceed to next round or finish game
   */
  proceedAfterRound() {
    if (this.currentRound < this.TOTAL_ROUNDS) {
      this.startRound(this.currentRound + 1);
    } else {
      this.finishGame();
    }
  }

  /**
   * Finish match and compute overall stats
   */
  finishGame() {
    this.state = 'RESULTS';
    this.cleanupRoundTimers();

    let matchWinner = 'DRAW';
    if (this.humanScore > this.aiScore) {
      matchWinner = 'HUMAN';
      this.lifetimeStats.humanWins++;
    } else if (this.aiScore > this.humanScore) {
      matchWinner = 'AI';
      this.lifetimeStats.aiWins++;
    } else {
      this.lifetimeStats.ties++;
    }
    this.lifetimeStats.totalGames++;

    // Calculate average guess times
    const humanWins = this.roundHistory.filter(r => r.winner === 'HUMAN');
    const aiWins = this.roundHistory.filter(r => r.winner === 'AI');

    const avgHumanTime = humanWins.length > 0
      ? (humanWins.reduce((acc, r) => acc + r.time, 0) / humanWins.length).toFixed(1)
      : '—';

    const avgAiTime = aiWins.length > 0
      ? (aiWins.reduce((acc, r) => acc + r.time, 0) / aiWins.length).toFixed(1)
      : '—';

    // Record match to history
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    this.matchHistory.unshift({
      date: dateFormatted,
      humanScore: this.humanScore,
      aiScore: this.aiScore,
      winner: matchWinner,
      playerName: this.playerName,
      rounds: this.roundHistory
    });

    this.saveStats();

    // -----------------------------------------------------------------------
    // Save to Leaderboard (name, total score, result, avg guess time, date)
    // -----------------------------------------------------------------------
    const entryId = 'lb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const resultLabel = matchWinner === 'HUMAN' ? 'Human Won' : matchWinner === 'AI' ? 'AI Won' : 'Tie';
    const entry = {
      id: entryId,
      name: this.playerName,
      score: this.humanScore,
      result: resultLabel,
      avgTime: avgHumanTime !== '—' ? `${avgHumanTime}s` : '—',
      date: dateFormatted
    };

    let leaderboard = [];
    try {
      const savedLb = localStorage.getItem('guesswhat_leaderboard');
      if (savedLb) leaderboard = JSON.parse(savedLb);
      if (!Array.isArray(leaderboard)) leaderboard = [];
    } catch (_) {
      leaderboard = [];
    }

    leaderboard.push(entry);

    // Sort by score descending (higher score first), then lower average time, then newer
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const tA = parseFloat(a.avgTime) || 999;
      const tB = parseFloat(b.avgTime) || 999;
      if (tA !== tB) return tA - tB;
      return b.id.localeCompare(a.id);
    });

    try {
      localStorage.setItem('guesswhat_leaderboard', JSON.stringify(leaderboard));
    } catch (_) {}

    const playerRank = leaderboard.findIndex(e => e.id === entryId) + 1;

    this.onRoundChange({
      type: 'GAME_OVER',
      winner: matchWinner,
      playerName: this.playerName,
      humanScore: this.humanScore,
      aiScore: this.aiScore,
      avgHumanTime,
      avgAiTime,
      roundHistory: this.roundHistory,
      lifetimeStats: this.lifetimeStats,
      leaderboardEntry: entry,
      playerRank: playerRank,
      totalLeaderboardCount: leaderboard.length
    });
  }

  /**
   * Helper to clean up all active timers
   */
  cleanupRoundTimers() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.aiGuessInterval) clearInterval(this.aiGuessInterval);
    if (this.revealTimer) clearInterval(this.revealTimer);
    this.timerInterval = null;
    this.aiGuessInterval = null;
    this.revealTimer = null;
  }
}

window.GameManager = GameManager;
