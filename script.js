/* Pong Relic Run — game state, combat rules and presentation are intentionally separated. */
const $ = (selector) => document.querySelector(selector);
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const menu = $('#menu');
const game = $('#game');
const settingsForm = $('#settings');
const reward = $('#reward');
const pauseModal = $('#pause');
const result = $('#result');
const rhythm = $('#rhythm');

const W = canvas.width;
const H = canvas.height;
const keys = { up: false, down: false };
const player = { x: 24, y: 210, score: 0, hp: 100 };
const enemy = { x: W - 38, y: 210, score: 0, hp: 100 };

let state = 'MENU';
let balls = [];
let particles = [];
let relics = [];
let settings = {};
let totalPoints = 0;
let xp = 0;
let level = 1;
let stage = 1;
let combo = 0;
let shake = 0;
let hitStop = 0;
let audioContext = null;
let musicTimer = null;
let rhythmState = null;
let sessionId = 0;

const enemies = [
  { name: 'Sentinela Neon', hp: 100, pattern: 'track', color: '#22d3ee' },
  { name: 'Gladiador Íon', hp: 125, pattern: 'dash', color: '#f97316' },
  { name: 'Aranha Violeta', hp: 150, pattern: 'wave', color: '#c084fc' },
  { name: 'Orbe Glacial', hp: 175, pattern: 'slow', color: '#93c5fd' },
  { name: 'Mímico Prismático', hp: 200, pattern: 'mirror', color: '#f472b6' },
];
const bosses = [
  { name: 'Titã de Cromo', hp: 230, pattern: 'dash', color: '#facc15' },
  { name: 'Rainha do Veneno', hp: 280, pattern: 'wave', color: '#a3e635' },
  { name: 'Dragão Solar', hp: 340, pattern: 'slow', color: '#fb7185' },
];
const cardPool = [
  ['Dano Brutal', 'Dano das finalizações +30%.', '💥', 'common', () => relics.push('💥 Dano Brutal')],
  ['Ataque Rápido', 'Bolas 18% mais velozes.', '⚡', 'common', () => relics.push('⚡ Ataque Rápido')],
  ['Gêmeas', 'Adiciona uma segunda bola.', '✦', 'rare', () => relics.push('✦ Gêmeas')],
  ['Incendiária', 'Finalizações aplicam queimadura.', '🔥', 'uncommon', () => relics.push('🔥 Incendiária')],
  ['Tóxica', 'A IA perde precisão e velocidade.', '☠', 'uncommon', () => relics.push('☠ Tóxica')],
  ['Sanguessuga', 'Cada finalização recupera 3 de vida.', '♥', 'rare', () => relics.push('♥ Sanguessuga')],
  ['Colosso', 'Aumenta as duas raquetes em 25%.', '◈', 'uncommon', () => { settings.paddle *= 1.25; relics.push('◈ Colosso'); }],
  ['Combo Mestre', 'Aumenta o limite do multiplicador.', '✹', 'rare', () => relics.push('✹ Combo Mestre')],
  ['Escudo', 'Absorve a próxima finalização sofrida.', '⬟', 'rare', () => relics.push('⬟ Escudo')],
  ['Núcleo Incandescente', 'Finalizações perfeitas causam dano crítico.', '◆', 'legendary', () => relics.push('◆ Núcleo Incandescente')],
  ['Eco Temporal', 'A cada 5 rebatidas, acelera a próxima bola.', '◌', 'legendary', () => relics.push('◌ Eco Temporal')],
];

const has = (name) => relics.some((relic) => relic.includes(name));
const currentEnemy = () => (stage % 4 === 0 ? bosses[(stage / 4 - 1) % bosses.length] : enemies[(stage - 1) % enemies.length]);

function readSettings() {
  settings = {
    speed: Number($('#speed').value),
    playerColor: $('#player-color').value,
    enemyColor: $('#enemy-color').value,
    theme: $('#theme').value,
    difficulty: $('#difficulty').value,
    paddle: { small: 76, normal: 100, large: 130 }[$('#paddle-size').value],
    paddleSpeed: 8,
    music: $('#music').checked,
  };
  try { localStorage.setItem('pongSettings', JSON.stringify(settings)); } catch { /* storage opcional */ }
}

function persistSession() {
  if (state === 'MENU' || state === 'VICTORY' || state === 'DEFEAT') return;
  try { localStorage.setItem('pongSession', JSON.stringify({ sessionId, state, player, enemy, balls, relics, xp, level, stage, combo, settings })); } catch { /* storage opcional */ }
}
function clearSession() { try { localStorage.removeItem('pongSession'); } catch { /* storage opcional */ } }

function makeBall(direction = Math.random() > 0.5 ? 1 : -1) {
  const speed = settings.speed * (has('Ataque Rápido') ? 1.18 : 1);
  return { x: W / 2, y: H / 2, r: has('Dano Brutal') ? 11 : 9, speed, vx: direction * speed, vy: (Math.random() * 4 - 2) || 1, bounces: 0, trail: [] };
}
function resetBalls(direction = Math.random() > 0.5 ? 1 : -1) {
  balls = [makeBall(direction)];
  if (has('Gêmeas')) balls.push(makeBall(-direction));
}
function clampPaddle(paddle) { paddle.y = Math.max(0, Math.min(H - settings.paddle, paddle.y)); }
function collides(ball, paddle) { return ball.x - ball.r < paddle.x + 14 && ball.x + ball.r > paddle.x && ball.y - ball.r < paddle.y + settings.paddle && ball.y + ball.r > paddle.y; }

function tone(frequency = 440, duration = 0.06) {
  if (!settings.music) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.025;
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch { /* áudio é uma melhoria opcional */ }
}
function startMusic() {
  if (!settings.music || musicTimer) return;
  const notes = [220, 277, 330, 277]; let index = 0;
  musicTimer = setInterval(() => tone(notes[index++ % notes.length], 0.12), 520);
}
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
function burst(x, y, color, amount = 12) {
  if (!settings.music) return;
  for (let i = 0; i < amount; i += 1) particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1, color });
}
function freeze(frames = 4, strength = 3) { hitStop = Math.max(hitStop, frames); shake = Math.max(shake, strength); }

function updateHud() {
  $('#player-score').textContent = player.score;
  $('#enemy-score').textContent = enemy.score;
  $('#enemy-hp').style.width = `${Math.max(0, (enemy.hp / currentEnemy().hp) * 100)}%`;
  $('#xp-bar').style.width = `${xp}%`;
  $('#level').textContent = `NV. ${level}`;
  $('#relics').innerHTML = relics.map((relic) => `<span class="chip">${relic}</span>`).join('');
  $('#wave').textContent = `${stage % 4 === 0 ? 'BOSS' : 'ONDA'} ${stage}`;
}
function showCombo(text) { const element = $('#combo'); element.textContent = text; element.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1)' }, { opacity: 0 }], { duration: 850 }); }
function gainXp(amount) { xp += amount; while (xp >= 100) { xp -= 100; level += 1; showCombo(`NÍVEL ${level}`); burst(W / 2, H / 2, '#a78bfa', 25); } persistSession(); }

/* A raquete apenas rebate. Esta função só é chamada quando a bola ultrapassa a linha de fundo. */
function resolvePoint(scoringSide) {
  totalPoints += 1;
  const scorer = scoringSide === 'player' ? player : enemy;
  scorer.score += 1;
  if (scoringSide === 'player') {
    combo += 1;
    const multiplier = Math.min(has('Combo Mestre') ? 2.3 : 1.7, 1 + combo * 0.06);
    let damage = 14 * multiplier * (has('Dano Brutal') ? 1.3 : 1);
    if (has('Incendiária')) damage += 6;
    enemy.hp -= damage;
    gainXp(8 + Math.min(combo, 6));
    if (has('Sanguessuga')) player.hp = Math.min(100, player.hp + 3);
    burst(enemy.x, enemy.y, '#fbbf24', 20); tone(720); freeze(5, 6);
    if (combo >= 3) showCombo(`COMBO ×${combo}`);
    if (enemy.hp <= 0) defeatEnemy();
  } else {
    combo = 0;
    if (has('Escudo')) relics.splice(relics.findIndex((relic) => relic.includes('Escudo')), 1);
    else player.hp -= 12;
    burst(player.x, player.y, '#ef4444', 18); tone(120); freeze(7, 8);
    navigator.vibrate?.(70);
    if (player.hp <= 0) endRun(false);
  }
  updateHud();
  if (state !== 'PLAYING') return;
  if (totalPoints % 2 === 0) showReward();
  else resetBalls(scoringSide === 'player' ? 1 : -1);
  persistSession();
}
function defeatEnemy() {
  gainXp(stage % 4 === 0 ? 100 : 45);
  if (stage >= 12) { endRun(true); return; }
  stage += 1;
  const target = currentEnemy();
  enemy.hp = target.hp; enemy.score = 0;
  $('#enemy-name').textContent = target.name;
  $('#stage-label').textContent = stage % 4 === 0 ? '⚠ ARENA DE BOSS' : `FASE ${stage} · RIVAL`;
  document.body.classList.toggle('boss', stage % 4 === 0);
  showCombo(stage % 4 === 0 ? 'BOSS INCOMING' : `FASE ${stage}`);
  shake = stage % 4 === 0 ? 22 : 8; tone(stage % 4 === 0 ? 90 : 520, 0.15);
  updateHud();
  if (stage > 1 && stage % 3 === 1) setTimeout(startRhythm, 650);
}

function targetForAI() {
  const incoming = balls.filter((ball) => ball.vx > 0);
  const candidates = incoming.length ? incoming : balls;
  if (!candidates.length) return H / 2;
  const ball = candidates.reduce((best, candidate) => Math.abs(candidate.x - enemy.x) < Math.abs(best.x - enemy.x) ? candidate : best, candidates[0]);
  if (ball.vx <= 0) return H / 2;
  const time = Math.max(0, (enemy.x - ball.x) / Math.max(0.1, ball.vx));
  const range = H - 2 * ball.r;
  const period = range * 2;
  let predicted = ball.y + ball.vy * time;
  predicted = ((predicted % period) + period) % period;
  return predicted > range ? period - predicted : predicted;
}
function updateEnemy() {
  const data = currentEnemy();
  const base = { easy: 3.0, normal: 4.5, hard: 6.0 }[settings.difficulty];
  const precision = has('Tóxica') ? 0.78 : 1;
  let target = targetForAI();
  if (data.pattern === 'wave') target += Math.sin(performance.now() / 300) * 35;
  if (data.pattern === 'dash' && Math.sin(performance.now() / 650) > 0.75) target += 45;
  if (data.pattern === 'mirror') target = H - target;
  const delta = target - (enemy.y + settings.paddle / 2);
  enemy.y += Math.sign(delta) * Math.min(Math.abs(delta), base * precision);
  clampPaddle(enemy);
}
function update() {
  if (hitStop > 0) { hitStop -= 1; return; }
  if (keys.up) player.y -= settings.paddleSpeed;
  if (keys.down) player.y += settings.paddleSpeed;
  clampPaddle(player); updateEnemy();
  for (let index = balls.length - 1; index >= 0; index -= 1) {
    const ball = balls[index];
    if (settings.music) { ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 10) ball.trail.shift(); }
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.y <= ball.r || ball.y >= H - ball.r) { ball.vy *= -1; ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y)); ball.bounces += 1; tone(240); }
    if (ball.vx < 0 && collides(ball, player)) { ball.vx = Math.abs(ball.vx) + 0.22; ball.vy = (ball.y - player.y - settings.paddle / 2) / (settings.paddle / 2) * ball.speed; ball.x = player.x + 14 + ball.r; ball.bounces += 1; burst(ball.x, ball.y, settings.playerColor); freeze(2, 2); }
    if (ball.vx > 0 && collides(ball, enemy)) { ball.vx = -Math.abs(ball.vx) - 0.22; ball.vy = (ball.y - enemy.y - settings.paddle / 2) / (settings.paddle / 2) * ball.speed; ball.x = enemy.x - ball.r; ball.bounces += 1; burst(ball.x, ball.y, settings.enemyColor); freeze(2, 2); }
    // Só sair pelo lado oposto da arena resolve um ponto/dano. Rebater jamais pontua.
    if (ball.x < -ball.r) { balls.splice(index, 1); resolvePoint('enemy'); }
    else if (ball.x > W + ball.r) { balls.splice(index, 1); resolvePoint('player'); }
  }
  particles.forEach((particle) => { particle.x += particle.vx; particle.y += particle.vy; particle.life -= 0.035; });
  particles = particles.filter((particle) => particle.life > 0);
}

function drawEnemyTexture(data) {
  const x = enemy.x - 20; const y = enemy.y + settings.paddle / 2; const pulse = 1 + Math.sin(performance.now() / 220) * 0.08;
  ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse); ctx.globalAlpha = 0.28; ctx.fillStyle = data.color;
  if (data.pattern === 'wave') { ctx.beginPath(); for (let i = -2; i <= 2; i++) ctx.arc(i * 8, i * 5, 13, 0, Math.PI * 2); ctx.fill(); }
  else if (data.pattern === 'mirror') { ctx.rotate(Math.PI / 4); ctx.fillRect(-20, -20, 40, 40); }
  else if (data.pattern === 'slow') { ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = data.color; ctx.lineWidth = 3; ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(0, -25); ctx.lineTo(24, 0); ctx.lineTo(0, 25); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function draw() {
  const themes = { neon: ['#050816', '#334155'], matrix: ['#020b08', '#14532d'], sunset: ['#180b19', '#9a3412'], ice: ['#06121c', '#155e75'] };
  const colors = themes[settings.theme] || themes.neon;
  ctx.save(); if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .88; }
  ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = colors[1]; ctx.globalAlpha = .35;
  for (let y = 25; y < H; y += 38) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.setLineDash([10, 14]); ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
  particles.forEach((particle) => { ctx.globalAlpha = particle.life; ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 4, 4); }); ctx.globalAlpha = 1;
  const paddle = (object, color) => { ctx.shadowBlur = settings.music ? 22 : 0; ctx.shadowColor = color; const gradient = ctx.createLinearGradient(object.x, 0, object.x + 14, 0); gradient.addColorStop(0, '#fff'); gradient.addColorStop(.2, color); gradient.addColorStop(1, '#111827'); ctx.fillStyle = gradient; ctx.fillRect(object.x, object.y, 14, settings.paddle); ctx.shadowBlur = 0; };
  paddle(player, settings.playerColor); paddle(enemy, settings.enemyColor); drawEnemyTexture(currentEnemy());
  balls.forEach((ball) => { ball.trail.forEach((trail, index) => { ctx.globalAlpha = index / ball.trail.length * .3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(trail.x, trail.y, ball.r * .7, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; ctx.shadowBlur = settings.music ? 24 : 0; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }); ctx.restore();
}

function showReward() { state = 'REWARD'; reward.hidden = false; $('#cards').innerHTML = ''; [...cardPool].sort(() => Math.random() - .5).slice(0, 3).forEach((card) => { const element = document.createElement('article'); element.className = `card ${card[3]}`; element.innerHTML = `<h3>${card[2]} ${card[0]}</h3><p>${card[1]}</p><button class="pick" type="button">ESCOLHER</button>`; element.querySelector('button').onclick = () => { card[4](); reward.hidden = true; state = 'PLAYING'; resetBalls(1); updateHud(); persistSession(); }; $('#cards').append(element); }); $('#cards .pick')?.focus(); }
function showRhythm() { state = 'MINIGAME'; rhythm.hidden = false; const lanes = $('#lanes'); lanes.innerHTML = ''; rhythmState = { score: 0, notes: [] }; $('#rhythm-score').textContent = '0 / 6'; for (let i = 0; i < 4; i += 1) { const lane = document.createElement('div'); lane.className = 'lane'; lane.dataset.key = 'ASDF'[i]; lane.innerHTML = '<div class="target"></div>'; lanes.append(lane); } for (let i = 0; i < 6; i += 1) setTimeout(() => { if (state !== 'MINIGAME') return; const lane = lanes.children[Math.floor(Math.random() * 4)]; const note = document.createElement('div'); note.className = 'note'; note.dataset.key = lane.dataset.key; lane.append(note); rhythmState.notes.push(note); setTimeout(() => note.remove(), 2500); }, i * 450); }
function rhythmInput(event) { if (state !== 'MINIGAME') return; const note = rhythmState.notes.find((item) => item.isConnected && item.dataset.key === event.key.toUpperCase()); if (!note) return; const a = note.getBoundingClientRect(); const target = note.parentElement.querySelector('.target').getBoundingClientRect(); if (Math.abs(a.top - target.top) < 55) { note.remove(); rhythmState.score += 1; $('#rhythm-score').textContent = `${rhythmState.score} / 6`; tone(850); if (rhythmState.score >= 6) { rhythm.hidden = true; state = 'PLAYING'; gainXp(20); player.hp = Math.min(100, player.hp + 10); showCombo('BÔNUS + XP'); } } }
function endRun(won) { state = won ? 'VICTORY' : 'DEFEAT'; clearSession(); $('#result-label').textContent = won ? 'EXPEDIÇÃO CONCLUÍDA' : 'EXPEDIÇÃO ENCERRADA'; $('#result-title').textContent = won ? 'Vitória!' : 'Você foi derrotado'; $('#result-text').textContent = `Fase ${stage} · Nível ${level} · ${Math.floor(xp)} XP`; result.hidden = false; }
function reset() { player.score = enemy.score = 0; player.hp = 100; enemy.hp = currentEnemy().hp; totalPoints = xp = 0; level = stage = 1; combo = 0; relics = []; state = 'PLAYING'; rewardOpen = false; reward.hidden = pauseModal.hidden = result.hidden = rhythm.hidden = true; document.body.classList.remove('boss'); player.y = enemy.y = H / 2 - settings.paddle / 2; $('#enemy-name').textContent = currentEnemy().name; $('#stage-label').textContent = 'FASE 1 · RIVAL'; resetBalls(); updateHud(); }
function goMenu() { state = 'MENU'; stopMusic(); reward.hidden = pauseModal.hidden = result.hidden = rhythm.hidden = true; game.hidden = true; menu.hidden = false; }
function togglePause(force) { if (state === 'REWARD' || state === 'MINIGAME' || state === 'VICTORY' || state === 'DEFEAT') return; if (force === false || state === 'PAUSED') { state = 'PLAYING'; pauseModal.hidden = true; } else { state = 'PAUSED'; pauseModal.hidden = false; } }
settingsForm.addEventListener('submit', (event) => { event.preventDefault(); readSettings(); reset(); menu.hidden = true; game.hidden = false; canvas.focus(); startMusic(); tone(440); persistSession(); });
$('#speed').addEventListener('input', (event) => { $('#speed-value').textContent = event.target.value; }); $('#pause-button').onclick = () => togglePause(); $('#resume').onclick = () => togglePause(false); $('#menu-button').onclick = goMenu; $('#pause-menu').onclick = goMenu; $('#new-run').onclick = () => { result.hidden = true; reset(); };
$('#skip-rhythm').onclick = () => { rhythm.hidden = true; rhythmState = null; state = 'PLAYING'; };
window.addEventListener('keydown', (event) => { if (['ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault(); if (event.key === 'ArrowUp') keys.up = true; if (event.key === 'ArrowDown') keys.down = true; if (event.key === ' ') togglePause(); if ('asdfASDF'.includes(event.key)) rhythmInput(event); });
window.addEventListener('keyup', (event) => { if (event.key === 'ArrowUp') keys.up = false; if (event.key === 'ArrowDown') keys.down = false; });
canvas.addEventListener('mousemove', (event) => { if (state !== 'PLAYING') return; const bounds = canvas.getBoundingClientRect(); player.y = ((event.clientY - bounds.top) / bounds.height) * H - settings.paddle / 2; clampPaddle(player); });
try { const saved = JSON.parse(localStorage.getItem('pongSettings')); if (saved) { Object.entries({ speed: 'speed', playerColor: 'player-color', enemyColor: 'enemy-color', theme: 'theme', difficulty: 'difficulty', music: 'music' }).forEach(([key, id]) => { if (saved[key] !== undefined) $(`#${id}`).value = saved[key]; }); $('#music').checked = saved.music !== false; } } catch { /* configurações padrão */ }
$('#speed').dispatchEvent(new Event('input')); readSettings(); reset(); game.hidden = true;
function loop() { if (state === 'PLAYING' || state === 'REWARD' || state === 'PAUSED') { update(); draw(); } requestAnimationFrame(loop); }
loop();
