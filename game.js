(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#stadium');
  const ctx = canvas.getContext('2d');
  const ui = {
    menu: $('#menu-screen'), scoreboard: $('#scoreboard'), context: $('#match-context'),
    panel: $('#control-panel'), shootControls: $('#shoot-controls'), keeperControls: $('#keeper-controls'),
    result: $('#result-card'), final: $('#final-card'), hint: $('#bottom-hint'),
    playerNameInput: $('#player-name'),
    status: $('#match-status'), round: $('#round-label'), playerName: $('#player-name-score'),
    opponentName: $('#opponent-name-score'), playerCrest: $('#player-crest'), opponentCrest: $('#opponent-crest'),
    playerPoints: $('#player-points'), opponentPoints: $('#opponent-points'),
    playerGoals: $('#player-goals'), opponentGoals: $('#opponent-goals'),
    playerSaves: $('#player-saves'), opponentSaves: $('#opponent-saves'),
    contextKicker: $('#context-kicker'), contextTitle: $('#context-title'), contextIcon: $('#context-icon'),
    controlLabel: $('#control-label'), controlHint: $('#control-hint'), shoot: $('#shoot-button'),
    dive: $('#dive-button'), resultKicker: $('#result-kicker'), resultTitle: $('#result-title'),
    resultDescription: $('#result-description'), continue: $('#continue-button'),
    finalTitle: $('#final-title'), finalDescription: $('#final-description'),
    finalStats: $('#final-stats'), toast: $('#toast'), sound: $('#sound-toggle')
  };

  const zones = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
  const zonePoints = {
    'top-left': [.28, .36], 'top-center': [.5, .35], 'top-right': [.72, .36],
    'bottom-left': [.28, .68], 'bottom-center': [.5, .69], 'bottom-right': [.72, .68]
  };
  const opponentTeams = [
    { name: 'Lions FC', color: '#d5a33c' },
    { name: 'Falcons FC', color: '#74b7e8' },
    { name: 'Sharks FC', color: '#47d1c0' },
    { name: 'Wolves FC', color: '#c66b68' },
    { name: 'Rovers FC', color: '#9dbb69' }
  ];
  const teamColors = Object.fromEntries(opponentTeams.map(team => [team.name, team.color]));
  const game = {
    active: false, state: 'menu', round: 1, suddenDeath: false,
    player: { team: '', points: 0, goals: 0, saves: 0 },
    opponent: { team: '', points: 0, goals: 0, saves: 0 },
    selectedZone: null, diveDirection: 'center', diveHeight: 'high',
    lastOutcome: null, action: null, audio: null, muted: false, toastTimer: null,
    crowd: [], lights: []
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeCrowd();
  }

  function makeCrowd() {
    game.crowd = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    const count = Math.min(500, Math.round(width * .5));
    for (let i = 0; i < count; i++) {
      game.crowd.push({
        x: Math.random() * width, y: height * (.12 + Math.random() * .24),
        size: .6 + Math.random() * 1.9, shade: Math.random(),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawCrowd(time) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const grad = ctx.createLinearGradient(0, h * .12, 0, h * .43);
    grad.addColorStop(0, '#16201e');
    grad.addColorStop(1, '#202724');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, h * .13);
    ctx.lineTo(w, h * .13);
    ctx.lineTo(w, h * .4);
    ctx.lineTo(0, h * .4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(205,220,204,.12)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 5; row++) {
      const y = h * (.17 + row * .045);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const colors = ['#d9ad7b', '#6a8c78', '#a96f67', '#91a6b0', '#d3d5bd', '#596c80'];
    for (const person of game.crowd) {
      const flicker = Math.sin(time * .0015 + person.phase);
      ctx.fillStyle = colors[Math.floor((person.shade + Math.abs(flicker) * .1) * colors.length) % colors.length];
      ctx.globalAlpha = .28 + (person.shade * .3);
      ctx.beginPath();
      ctx.arc(person.x, person.y + flicker, person.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const roof = ctx.createLinearGradient(0, 0, 0, h * .15);
    roof.addColorStop(0, 'rgba(3,7,7,.95)');
    roof.addColorStop(1, 'rgba(6,13,12,0)');
    ctx.fillStyle = roof;
    ctx.fillRect(0, 0, w, h * .16);

    for (const x of [w * .12, w * .88]) {
      const glow = ctx.createRadialGradient(x, h * .15, 2, x, h * .15, h * .22);
      glow.addColorStop(0, 'rgba(255,249,219,.26)');
      glow.addColorStop(1, 'rgba(255,249,219,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - h * .22, 0, h * .44, h * .45);
      ctx.fillStyle = '#f7f2d8';
      for (let i = -2; i <= 2; i++) {
        ctx.globalAlpha = .65 + .15 * Math.sin(time * .001 + i);
        ctx.fillRect(x + i * 8, h * .14, 3, 4);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawPitch() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const horizon = h * .38;
    const floor = ctx.createLinearGradient(0, horizon, 0, h);
    floor.addColorStop(0, '#27422d');
    floor.addColorStop(.5, '#1d4029');
    floor.addColorStop(1, '#10281d');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.moveTo(w * .25, horizon);
    ctx.lineTo(w * .75, horizon);
    ctx.lineTo(w * 1.16, h);
    ctx.lineTo(w * -.16, h);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const x1 = w * (.25 + i * .0625);
      const x2 = w * (.75 + (i - 8) * .0625);
      ctx.fillStyle = i % 2 ? 'rgba(195,226,154,.025)' : 'rgba(0,0,0,.045)';
      ctx.beginPath();
      ctx.moveTo(x1, horizon);
      ctx.lineTo(x2, horizon);
      ctx.lineTo(w * (.75 + (i - 8) * .115), h);
      ctx.lineTo(w * (.25 + i * .115), h);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(230,239,216,.47)';
    ctx.lineWidth = Math.max(1, w * .0011);
    ctx.beginPath();
    ctx.moveTo(w * .35, h * .42);
    ctx.lineTo(w * .65, h * .42);
    ctx.lineTo(w * .78, h * .76);
    ctx.lineTo(w * .22, h * .76);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * .41, h * .42);
    ctx.lineTo(w * .59, h * .42);
    ctx.lineTo(w * .67, h * .61);
    ctx.lineTo(w * .33, h * .61);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(w * .5, h * .61, w * .07, h * .05, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,244,222,.75)';
    ctx.beginPath();
    ctx.arc(w * .5, h * .72, Math.max(1.5, w * .0022), 0, Math.PI * 2);
    ctx.fill();

    const goal = { x: w * .5, y: h * .39, width: Math.min(w * .34, h * .48), height: Math.min(h * .215, w * .095) };
    drawGoal(goal);
    return goal;
  }

  function drawGoal(goal) {
    const { x, y, width, height } = goal;
    const left = x - width / 2;
    const right = x + width / 2;
    const bottom = y + height;
    ctx.fillStyle = 'rgba(3,8,6,.26)';
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.lineTo(right + width * .06, bottom + height * .36);
    ctx.lineTo(left - width * .06, bottom + height * .36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(238,241,226,.5)';
    ctx.lineWidth = Math.max(1, width * .004);
    for (let i = 0; i <= 10; i++) {
      const gx = left + width * i / 10;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, bottom); ctx.stroke();
    }
    for (let j = 0; j <= 5; j++) {
      const gy = y + height * j / 5;
      ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(right, gy); ctx.stroke();
    }
    ctx.strokeStyle = '#f4f2e8';
    ctx.lineWidth = Math.max(3, width * .017);
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(left, y);
    ctx.lineTo(right, y);
    ctx.lineTo(right, bottom);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawPerson(x, y, scale, kit, pose = {}) {
    const dive = pose.dive || 0;
    const run = pose.run || 0;
    const kick = pose.kick || 0;
    const lying = pose.lying || 0;
    const dir = pose.direction || 1;
    const shoulderY = y - scale * .47;
    const headY = y - scale * .76;
    ctx.save();
    ctx.translate(x, y);
    if (dive) {
      ctx.rotate(dive * dir * -.83);
      ctx.scale(1 + Math.abs(dive) * .22, 1 - Math.abs(dive) * .17);
    }
    if (lying) {
      ctx.rotate(lying * dir);
      ctx.scale(1.18, .78);
    }
    const limb = (ax, ay, bx, by, width, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    };
    const legSwing = Math.sin(run * 9) * scale * .095;
    const kickSwing = kick * scale * .32;
    limb(-scale * .065, -scale * .15, -scale * .09 + legSwing, -scale * .02, scale * .085, '#272923');
    limb(-scale * .09 + legSwing, -scale * .02, -scale * .13 - legSwing, scale * .01, scale * .075, '#e5dfcb');
    limb(scale * .065, -scale * .15, scale * .1 - kickSwing, -scale * .03, scale * .085, '#272923');
    limb(scale * .1 - kickSwing, -scale * .03, scale * .16 + kickSwing, -scale * .045, scale * .07, '#f2ece0');
    ctx.fillStyle = kit;
    ctx.beginPath();
    ctx.moveTo(-scale * .13, -scale * .58);
    ctx.quadraticCurveTo(0, -scale * .64, scale * .13, -scale * .58);
    ctx.lineTo(scale * .17, -scale * .25);
    ctx.quadraticCurveTo(0, -scale * .19, -scale * .17, -scale * .25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.23)';
    ctx.fillRect(-scale * .022, -scale * .57, scale * .044, scale * .30);
    limb(-scale * .12, -scale * .53, -scale * .22 - run * scale * .02, -scale * .35, scale * .065, '#c58d68');
    limb(-scale * .22 - run * scale * .02, -scale * .35, -scale * .17, -scale * .27, scale * .052, '#d9a27d');
    limb(scale * .12, -scale * .53, scale * .21 + run * scale * .02, -scale * .36, scale * .065, '#c58d68');
    limb(scale * .21 + run * scale * .02, -scale * .36, scale * .17, -scale * .29, scale * .052, '#d9a27d');
    ctx.fillStyle = '#bc8869';
    ctx.beginPath(); ctx.ellipse(0, headY - y, scale * .105, scale * .12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#292a26';
    ctx.beginPath(); ctx.ellipse(0, headY - y - scale * .065, scale * .108, scale * .072, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();
    return { shoulderY, headY };
  }

  function teamColor(teamName) {
    return teamColors[teamName] || '#a8c976';
  }

  function drawGoalkeeper(goal, time) {
    const { x, y, height } = goal;
    const keeperX = x + (game.action?.keeperX || 0) * goal.width;
    const dive = game.action?.keeperDive || 0;
    const diveDir = game.action?.keeperDirection || 1;
    const saved = game.action?.result === 'saved';
    const scale = Math.min(window.innerWidth * .085, window.innerHeight * .18);
    const bounce = game.state === 'idle' ? Math.sin(time * .0018) * 1.8 : 0;
    drawPerson(keeperX, y + height * .82 + bounce, scale, '#d4df55', {
      dive, direction: diveDir, lying: saved ? Math.max(0, dive) : 0
    });
    const glovesY = y + height * .82 - scale * .36;
    ctx.fillStyle = '#ece8d6';
    ctx.beginPath(); ctx.arc(keeperX - scale * (.27 + Math.abs(dive) * .14), glovesY, scale * .055, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(keeperX + scale * (.27 + Math.abs(dive) * .14), glovesY, scale * .055, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlayerAndStriker(goal, time) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const shooting = game.state === 'playerAnimating';
    const opponentShot = game.state === 'opponentAnimating';
    const ballStartX = w * .5;
    const ballStartY = h * .745;
    const run = shooting ? Math.max(0, 1 - game.action.progress) : 0;

    if (game.active) {
      if (opponentShot) {
        drawPerson(w * .5, h * .64 + (1 - game.action.progress) * 36, Math.min(w * .07, h * .15), teamColor(game.opponent.team), { run: 1 - game.action.progress, kick: game.action.progress > .65 ? 1 : 0 });
      } else if (game.state === 'opponentReady' || (shooting && game.state === 'playerAnimating')) {
        drawPerson(w * .5, h * .64, Math.min(w * .065, h * .14), teamColor(game.opponent.team));
      }
      if (game.state === 'playerReady' || game.state === 'playerAnimating') {
        drawPerson(ballStartX - Math.min(35, w * .035) + run * 12, ballStartY + run * 24, Math.min(w * .068, h * .14), teamColor(game.player.team), { run, kick: shooting && game.action.progress > .64 ? Math.min(1, (game.action.progress - .64) * 3) : 0 });
      }
    }
    drawGoalkeeper(goal, time);

    let bx = ballStartX;
    let by = ballStartY;
    let ballScale = Math.max(5, Math.min(11, w * .009));
    if (game.action && (game.state === 'playerAnimating' || game.state === 'opponentAnimating')) {
      const p = Math.max(0, Math.min(1, (game.action.progress - .23) / .77));
      const eased = p * p * (3 - 2 * p);
      const point = game.action.target || [.5, .5];
      bx += (goal.x + (point[0] - .5) * goal.width * .83 - bx) * eased;
      by += (goal.y + (point[1] - .5) * goal.height * 1.45 - by) * eased;
      by -= Math.sin(Math.PI * p) * goal.height * .08;
      ballScale *= 1 - eased * .55;
    } else if (game.action?.savedBall) {
      bx = game.action.savedBall.x;
      by = game.action.savedBall.y;
    }
    drawBall(bx, by, ballScale, game.action && game.action.progress > .25);
  }

  function drawBall(x, y, size, spinning) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.36)';
    ctx.beginPath(); ctx.ellipse(x + size * .5, y + size * .8, size * .85, size * .26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y);
    if (spinning) ctx.rotate(performance.now() * .018);
    ctx.fillStyle = '#f2f1e8';
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#686c63'; ctx.lineWidth = Math.max(.7, size * .065);
    ctx.beginPath(); ctx.arc(0, 0, size * .76, .2, 2.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, size * .44, 2.7, 5.4); ctx.stroke();
    ctx.fillStyle = '#51554e';
    ctx.beginPath(); ctx.moveTo(-size * .25, -size * .3); ctx.lineTo(size * .12, -size * .4); ctx.lineTo(size * .35, -size * .08); ctx.lineTo(size * .04, size * .18); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawScene(time) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawCrowd(time);
    const goal = drawPitch();
    drawPlayerAndStriker(goal, time);
  }

  let previousFrame = 0;
  function render(time) {
    const delta = Math.min(50, time - (previousFrame || time));
    previousFrame = time;
    if (game.action && (game.state === 'playerAnimating' || game.state === 'opponentAnimating')) {
      game.action.progress += delta / 1450;
      const p = Math.min(game.action.progress, 1);
      game.action.keeperDive = Math.max(0, Math.min(1, (p - .3) / .42));
      if (p >= 1) finishAnimation();
    }
    drawScene(time);
    requestAnimationFrame(render);
  }

  function setGameState(state) {
    game.state = state;
    ui.panel.hidden = true;
    ui.result.hidden = true;
    ui.final.hidden = true;
    ui.context.hidden = !game.active;
    ui.hint.hidden = !game.active;
    if (!game.active) return;
    ui.contextIcon.textContent = String(game.round).padStart(2, '0');
    ui.round.textContent = game.suddenDeath ? `SUDDEN DEATH · ${game.round - 5}` : `ROUND ${String(game.round).padStart(2, '0')} / 05`;
    if (state === 'playerReady') {
      ui.panel.hidden = false;
      ui.shootControls.hidden = false;
      ui.keeperControls.hidden = true;
      ui.contextKicker.textContent = 'YOUR TURN · PENALTY';
      ui.contextTitle.textContent = 'Pick your spot.';
      ui.controlLabel.textContent = 'AIM YOUR SHOT';
      ui.controlHint.textContent = 'Pick a corner, then take your shot.';
      ui.shoot.disabled = !game.selectedZone;
    } else if (state === 'opponentReady') {
      ui.panel.hidden = false;
      ui.shootControls.hidden = true;
      ui.keeperControls.hidden = false;
      ui.contextKicker.textContent = 'YOUR TURN · IN GOAL';
      ui.contextTitle.textContent = 'Read the shooter.';
      ui.controlLabel.textContent = 'CHOOSE YOUR DIVE';
      ui.controlHint.textContent = 'Direction and height both matter.';
    }
  }

  function updateScoreboard() {
    ui.playerName.textContent = game.player.team.toUpperCase();
    ui.opponentName.textContent = game.opponent.team.toUpperCase();
    ui.playerCrest.textContent = game.player.team.slice(0, 1);
    ui.opponentCrest.textContent = game.opponent.team.slice(0, 1);
    ui.playerCrest.style.borderColor = teamColor(game.player.team);
    ui.playerCrest.style.color = teamColor(game.player.team);
    ui.opponentCrest.style.borderColor = teamColor(game.opponent.team);
    ui.opponentCrest.style.color = teamColor(game.opponent.team);
    ui.playerPoints.textContent = game.player.points;
    ui.opponentPoints.textContent = game.opponent.points;
    ui.playerGoals.textContent = game.player.goals;
    ui.opponentGoals.textContent = game.opponent.goals;
    ui.playerSaves.textContent = game.player.saves;
    ui.opponentSaves.textContent = game.opponent.saves;
  }

  function startMatch() {
    const enteredName = ui.playerNameInput.value.trim().replace(/\s+/g, ' ');
    const teamName = enteredName.replace(/\s+FC$/i, '').trim();
    if (!teamName) {
      showToast('Enter your name to create your team.');
      ui.playerNameInput.focus();
      return;
    }
    game.player = { team: `${teamName} FC`, points: 0, goals: 0, saves: 0 };
    const eligibleOpponents = opponentTeams.filter(team => team.name.toLowerCase() !== game.player.team.toLowerCase());
    const opponent = eligibleOpponents[Math.floor(Math.random() * eligibleOpponents.length)];
    game.opponent = { team: opponent.name, points: 0, goals: 0, saves: 0 };
    game.active = true;
    game.round = 1;
    game.suddenDeath = false;
    game.selectedZone = null;
    game.lastOutcome = null;
    game.action = null;
    ui.menu.hidden = true;
    ui.scoreboard.hidden = false;
    ui.status.textContent = 'PENALTY SHOOTOUT';
    updateScoreboard();
    setGameState('playerReady');
    startAudio();
  }

  function aiKeeperPrediction() {
    const accurateChance = .42 + Math.random() * .12;
    if (Math.random() < accurateChance) return game.selectedZone;
    const alternatives = zones.filter(zone => zone !== game.selectedZone);
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  function shoot() {
    if (game.state !== 'playerReady' || !game.selectedZone) return;
    const prediction = aiKeeperPrediction();
    const target = zonePoints[game.selectedZone];
    const height = game.selectedZone.startsWith('top') ? 'high' : 'low';
    const predictedHeight = prediction.startsWith('top') ? 'high' : 'low';
    const matches = prediction === game.selectedZone;
    const missed = Math.random() < .055;
    const saveChance = matches ? (height === 'high' ? .31 : .48) : (prediction.split('-')[1] === game.selectedZone.split('-')[1] ? .12 : .035);
    const saved = !missed && Math.random() < saveChance;
    if (missed) {
      game.lastOutcome = { kind: 'miss', actor: 'player', text: 'The pressure gets to you. It drifts wide.' };
    } else if (saved) {
      game.opponent.saves++;
      game.opponent.points++;
      game.lastOutcome = { kind: 'saved', actor: 'player', text: 'The keeper reads it and gets a strong hand to the ball.' };
    } else {
      game.player.goals++;
      game.player.points += 3;
      game.lastOutcome = { kind: 'goal', actor: 'player', text: 'A clean strike. The net ripples.' };
    }
    game.action = {
      progress: 0, target: missed ? [.84, .52] : target,
      keeperDirection: prediction.includes('left') ? -1 : prediction.includes('right') ? 1 : (Math.random() < .5 ? -1 : 1),
      keeperDive: 0, result: saved ? 'saved' : null, height, prediction, missed
    };
    game.action.keeperDive = prediction === game.selectedZone ? .9 : .58;
    game.action.result = saved ? 'saved' : null;
    setGameState('playerAnimating');
    playSound('kick');
    if (saved) playSound('save');
    else if (!missed) playSound('cheer');
    updateScoreboard();
  }

  function chooseAIShot() {
    const roll = Math.random();
    const candidates = zones.filter(zone => zone !== 'bottom-center');
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const direction = target.includes('left') ? 'left' : target.includes('right') ? 'right' : 'center';
    const height = target.startsWith('top') ? 'high' : 'low';
    const directionMatches = direction === game.diveDirection;
    const heightMatches = height === game.diveHeight;
    let chance = directionMatches && heightMatches ? .68 : directionMatches ? .26 : .07;
    if (direction === 'center' && game.diveDirection === 'center') chance = heightMatches ? .66 : .25;
    const missed = roll < .045;
    const saved = !missed && Math.random() < chance;
    if (missed) {
      game.lastOutcome = { kind: 'miss', actor: 'opponent', text: 'A rare mistake under pressure. It misses the frame.' };
    } else if (saved) {
      game.player.saves++;
      game.player.points++;
      game.lastOutcome = { kind: 'saved', actor: 'opponent', text: 'What a stop! You picked the right side and kept it out.' };
    } else {
      game.opponent.goals++;
      game.opponent.points += 3;
      game.lastOutcome = { kind: 'goal', actor: 'opponent', text: 'The opponent finds the corner and scores.' };
    }
    return { target: zonePoints[target], direction, height, saved, missed };
  }

  function commitDive() {
    if (game.state !== 'opponentReady') return;
    const shot = chooseAIShot();
    game.action = {
      progress: 0, target: shot.missed ? [.16, .5] : shot.target,
      keeperDirection: game.diveDirection === 'left' ? -1 : game.diveDirection === 'right' ? 1 : 0,
      keeperDive: 0, result: shot.saved ? 'saved' : null, shot
    };
    setGameState('opponentAnimating');
    playSound('kick');
    if (shot.saved) playSound('save');
    else if (!shot.missed) playSound('cheer');
    updateScoreboard();
  }

  function finishAnimation() {
    if (game.state === 'playerAnimating') {
      game.action = null;
      setGameState('playerResult');
      showResult(game.lastOutcome, false);
    } else if (game.state === 'opponentAnimating') {
      game.action = null;
      setGameState('opponentResult');
      showResult(game.lastOutcome, true);
    }
  }

  function showResult(outcome, canEndRound) {
    ui.panel.hidden = true;
    ui.context.hidden = true;
    ui.result.hidden = false;
    ui.resultKicker.textContent = outcome.actor === 'player' ? 'YOUR PENALTY' : `${game.opponent.team.toUpperCase()} · PENALTY`;
    ui.resultTitle.textContent = outcome.kind === 'goal' ? 'GOAL!' : outcome.kind === 'saved' ? 'SAVED!' : 'WIDE!';
    ui.resultTitle.style.color = outcome.kind === 'goal' ? 'var(--lime)' : outcome.kind === 'saved' ? '#ffce6c' : '#e5e9e4';
    ui.resultDescription.textContent = outcome.text;
    ui.continue.querySelector('span').textContent = canEndRound ? 'NEXT ROUND' : 'YOUR TURN IN GOAL';
    updateScoreboard();
  }

  function continueMatch() {
    if (game.state === 'playerResult') {
      game.diveDirection = 'center';
      game.diveHeight = 'high';
      document.querySelectorAll('.dive-button').forEach(button => button.classList.toggle('selected', button.dataset.dive === 'center'));
      document.querySelectorAll('.height-button').forEach(button => button.classList.toggle('selected', button.dataset.height === 'high'));
      setGameState('opponentReady');
    } else if (game.state === 'opponentResult') {
      if (game.round >= 5 && game.player.points !== game.opponent.points) {
        finishMatch();
      } else {
        if (game.round >= 5) game.suddenDeath = true;
        game.round++;
        game.selectedZone = null;
        document.querySelectorAll('.direction-button').forEach(button => button.classList.remove('selected'));
        setGameState('playerReady');
      }
    }
  }

  function finishMatch() {
    game.active = false;
    game.state = 'final';
    ui.result.hidden = true;
    ui.panel.hidden = true;
    ui.context.hidden = true;
    ui.hint.hidden = true;
    ui.final.hidden = false;
    ui.status.textContent = 'MATCH COMPLETE';
    const won = game.player.points > game.opponent.points;
    const tied = game.player.points === game.opponent.points;
    ui.finalTitle.textContent = won ? 'YOU WIN.' : tied ? 'IT’S A DRAW.' : 'DEFEAT.';
    ui.finalTitle.style.color = won ? 'var(--lime)' : tied ? '#e8e9df' : '#ffce6c';
    ui.finalDescription.textContent = won
      ? `${game.player.team} take the shootout. Ice in your veins.`
      : tied ? 'An unforgettable shootout. Neither side could be separated.'
        : `${game.opponent.team} edge the shootout. Time to run it back.`;
    ui.finalStats.innerHTML = `
      <div><b>${game.player.goals} – ${game.opponent.goals}</b><span>GOALS</span></div>
      <div><b>${game.player.saves} – ${game.opponent.saves}</b><span>SAVES</span></div>
      <div><b>${game.player.points} – ${game.opponent.points}</b><span>TOTAL POINTS</span></div>
      <div><b>${game.round > 5 ? `${game.round - 5} SUDDEN DEATH` : '5 ROUNDS'}</b><span>SHOOTOUT LENGTH</span></div>`;
  }

  function resetToMenu() {
    game.active = false;
    game.state = 'menu';
    game.action = null;
    ui.final.hidden = true;
    ui.scoreboard.hidden = true;
    ui.menu.hidden = false;
    ui.status.textContent = 'EXHIBITION MATCH';
    stopAudio();
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('visible');
    clearTimeout(game.toastTimer);
    game.toastTimer = setTimeout(() => ui.toast.classList.remove('visible'), 1900);
  }

  function startAudio() {
    if (game.muted || game.audio) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    game.audio = new AudioContext();
    game.ambience = setInterval(() => {
      if (!game.audio || game.muted || game.state === 'menu') return;
      const buffer = game.audio.createBuffer(1, game.audio.sampleRate * .65, game.audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .08;
      const source = game.audio.createBufferSource();
      const filter = game.audio.createBiquadFilter();
      const gain = game.audio.createGain();
      filter.type = 'lowpass'; filter.frequency.value = 490;
      gain.gain.setValueAtTime(.0001, game.audio.currentTime);
      gain.gain.linearRampToValueAtTime(.045, game.audio.currentTime + .18);
      gain.gain.linearRampToValueAtTime(.0001, game.audio.currentTime + .65);
      source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(game.audio.destination);
      source.start();
    }, 1800);
  }

  function stopAudio() {
    if (game.ambience) clearInterval(game.ambience);
    game.ambience = null;
    if (game.audio) {
      game.audio.close();
      game.audio = null;
    }
  }

  function playSound(kind) {
    if (game.muted) return;
    startAudio();
    if (!game.audio) return;
    if (game.audio.state === 'suspended') game.audio.resume();
    const audio = game.audio;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.connect(gain); gain.connect(audio.destination);
    if (kind === 'kick') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(105, now);
      oscillator.frequency.exponentialRampToValueAtTime(42, now + .12);
      gain.gain.setValueAtTime(.16, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + .14);
      oscillator.start(now); oscillator.stop(now + .15);
    } else if (kind === 'save') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(450, now);
      oscillator.frequency.exponentialRampToValueAtTime(125, now + .18);
      gain.gain.setValueAtTime(.12, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + .2);
      oscillator.start(now); oscillator.stop(now + .21);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(130, now);
      oscillator.frequency.exponentialRampToValueAtTime(210, now + .35);
      gain.gain.setValueAtTime(.035, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + .4);
      oscillator.start(now); oscillator.stop(now + .41);
    }
  }

  function setSelection(buttons, selected) {
    buttons.forEach(button => button.classList.toggle('selected', button === selected));
  }

  $('#play-button').addEventListener('click', startMatch);
  ui.shoot.addEventListener('click', shoot);
  ui.dive.addEventListener('click', commitDive);
  ui.continue.addEventListener('click', continueMatch);
  $('#play-again-button').addEventListener('click', startMatch);
  $('#menu-button').addEventListener('click', resetToMenu);
  document.querySelectorAll('.direction-button').forEach(button => button.addEventListener('click', () => {
    if (game.state !== 'playerReady') return;
    game.selectedZone = button.dataset.zone;
    setSelection([...document.querySelectorAll('.direction-button')], button);
    ui.shoot.disabled = false;
  }));
  document.querySelectorAll('.dive-button').forEach(button => button.addEventListener('click', () => {
    if (game.state !== 'opponentReady') return;
    game.diveDirection = button.dataset.dive;
    setSelection([...document.querySelectorAll('.dive-button')], button);
  }));
  document.querySelectorAll('.height-button').forEach(button => button.addEventListener('click', () => {
    if (game.state !== 'opponentReady') return;
    game.diveHeight = button.dataset.height;
    setSelection([...document.querySelectorAll('.height-button')], button);
  }));
  ui.sound.addEventListener('click', () => {
    game.muted = !game.muted;
    ui.sound.querySelector('span').textContent = game.muted ? 'SOUND OFF' : 'SOUND ON';
    ui.sound.setAttribute('aria-label', game.muted ? 'Turn sound on' : 'Turn sound off');
    if (game.muted) stopAudio();
    else startAudio();
  });

  document.addEventListener('keydown', event => {
    if (!game.active || event.repeat) return;
    if (game.state === 'playerReady') {
      const columns = { ArrowLeft: -1, ArrowRight: 1 };
      const rows = { ArrowUp: -1, ArrowDown: 1 };
      const current = game.selectedZone ? zonePoints[game.selectedZone] : [.5, .5];
      const col = current[0] < .4 ? 0 : current[0] > .6 ? 2 : 1;
      const row = current[1] < .5 ? 0 : 1;
      let nextCol = col;
      let nextRow = row;
      if (columns[event.key]) nextCol = Math.max(0, Math.min(2, col + columns[event.key]));
      else if (rows[event.key]) nextRow = Math.max(0, Math.min(1, row + rows[event.key]));
      else if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault(); shoot(); return;
      } else return;
      event.preventDefault();
      const next = document.querySelector(`.direction-button[data-zone="${zones[nextRow * 3 + nextCol]}"]`);
      next.click();
    } else if (game.state === 'opponentReady') {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        const direction = event.key === 'ArrowLeft' ? 'left' : event.key === 'ArrowRight' ? 'right' : 'center';
        const button = document.querySelector(`.dive-button[data-dive="${direction}"]`);
        button.click();
      } else if (event.key.toLowerCase() === 'w' || event.key.toLowerCase() === 's') {
        const height = event.key.toLowerCase() === 'w' ? 'high' : 'low';
        document.querySelector(`.height-button[data-height="${height}"]`).click();
      } else if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault(); commitDive();
      }
    } else if (game.state === 'playerResult' || game.state === 'opponentResult') {
      if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault(); continueMatch();
      }
    }
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(render);
})();
