const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');
const playerScoreElement = document.querySelector('#player-score');
const computerScoreElement = document.querySelector('#computer-score');
const restartButton = document.querySelector('#restart-button');
const overlay = document.querySelector('#choice-overlay');
const cardsElement = document.querySelector('#cards');
const activeRelicsElement = document.querySelector('#active-relics');
const relicCountElement = document.querySelector('#relic-count');
const comboCountElement = document.querySelector('#combo-count');

const paddle = { width: 14, height: 100, speed: 8 };
const player = { x: 24, y: canvas.height / 2 - paddle.height / 2, score: 0 };
const computer = { x: canvas.width - 38, y: player.y, score: 0 };
const keys = { up: false, down: false };
const shields = { player: 0, computer: 0 };
const relics = [];
let balls = [];
let paused = false;
let totalPoints = 0;
let combo = 0;
let rewardOpen = false;

const hasRelic = (name) => relics.some((relic) => relic.name === name);

const relicPool = [
  { name: 'Sobrecarga', description: 'Aumenta em 22% a velocidade de todas as bolas para os dois lados.', image: 'assets/overdrive.svg', apply: () => relics.push({ name: 'Sobrecarga', icon: '⚡' }) },
  { name: 'Colosso', description: 'Aumenta em 35% o tamanho das duas raquetes.', image: 'assets/colossus.svg', apply: () => { paddle.height *= 1.35; relics.push({ name: 'Colosso', icon: '◈' }); } },
  { name: 'Gêmeas', description: 'Invoca uma segunda bola que pode marcar para qualquer lado.', image: 'assets/twins.svg', apply: () => relics.push({ name: 'Gêmeas', icon: '✦' }) },
  { name: 'Égide', description: 'Concede 2 escudos para cada lado, bloqueando pontos sofridos.', image: 'assets/aegis.svg', apply: () => { shields.player += 2; shields.computer += 2; relics.push({ name: 'Égide ×2', icon: '⬟' }); } },
  { name: 'Reflexos', description: 'Aumenta em 45% a velocidade das duas raquetes.', image: 'assets/swift.svg', apply: () => { paddle.speed *= 1.45; relics.push({ name: 'Reflexos', icon: '➤' }); } },
  { name: 'Gravidade', description: 'Aumenta o tamanho das bolas para os dois lados.', image: 'assets/gravity.svg', apply: () => { balls.forEach((ball) => { ball.radius += 4; }); relics.push({ name: 'Gravidade', icon: '●' }); } },
  { name: 'Perfuração', description: 'Cada rebatida acelera a bola, seja do jogador ou do computador.', image: 'assets/piercer.svg', apply: () => relics.push({ name: 'Perfuração', icon: '⚔' }) },
  { name: 'Recuperação', description: 'Todas as novas bolas começam 18% mais lentas.', image: 'assets/recovery.svg', apply: () => relics.push({ name: 'Recuperação', icon: '✚' }) },
];

function makeBall(direction = Math.random() > 0.5 ? 1 : -1) {
  const speed = 6 * (hasRelic('Recuperação') ? 0.82 : 1) * (hasRelic('Sobrecarga') ? 1.22 : 1);
  return { x: canvas.width / 2, y: canvas.height / 2, radius: hasRelic('Gravidade') ? 13 : 9, speed, velocityX: direction * speed, velocityY: (Math.random() * 4 - 2) || 1 };
}

function resetBalls(direction = Math.random() > 0.5 ? 1 : -1) {
  balls = [makeBall(direction)];
  if (hasRelic('Gêmeas')) balls.push(makeBall(-direction));
}

function clampPaddle(object) { object.y = Math.max(0, Math.min(canvas.height - paddle.height, object.y)); }
function updateScoreboard() { playerScoreElement.textContent = player.score; computerScoreElement.textContent = computer.score; relicCountElement.textContent = relics.length; comboCountElement.textContent = combo; }
function movePlayer() { if (keys.up) player.y -= paddle.speed; if (keys.down) player.y += paddle.speed; clampPaddle(player); }
function moveComputer() { const target = balls[0]?.y - paddle.height / 2; if (target == null) return; const speed = 4.6 * (hasRelic('Reflexos') ? 1.45 : 1); if (computer.y < target) computer.y += speed; if (computer.y > target) computer.y -= speed; clampPaddle(computer); }
function collides(ball, object) { return ball.x - ball.radius < object.x + paddle.width && ball.x + ball.radius > object.x && ball.y - ball.radius < object.y + paddle.height && ball.y + ball.radius > object.y; }

function scorePoint(scoringPlayer) {
  scoringPlayer.score += 1;
  totalPoints += 1;
  if (scoringPlayer === player) combo += 1; else combo = 0;
  updateScoreboard();

  // O contador é global: jogador ou computador pode ativar a carta.
  if (totalPoints % 2 === 0 && !rewardOpen) {
    showChoices();
    return;
  }
  resetBalls(scoringPlayer === player ? 1 : -1);
}

function handleMiss(ball, index) {
  if (ball.x + ball.radius < 0) {
    if (shields.player > 0) { shields.player -= 1; ball.x = canvas.width / 2; ball.velocityX = Math.abs(ball.velocityX); }
    else { balls.splice(index, 1); scorePoint(computer); }
  } else if (ball.x - ball.radius > canvas.width) {
    if (shields.computer > 0) { shields.computer -= 1; ball.x = canvas.width / 2; ball.velocityX = -Math.abs(ball.velocityX); }
    else { balls.splice(index, 1); scorePoint(player); }
  }
}

function update() {
  movePlayer(); moveComputer();
  for (let index = balls.length - 1; index >= 0; index -= 1) {
    const ball = balls[index];
    ball.x += ball.velocityX; ball.y += ball.velocityY;
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) { ball.velocityY *= -1; ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y)); }
    if (ball.velocityX < 0 && collides(ball, player)) {
      const impact = (ball.y - (player.y + paddle.height / 2)) / (paddle.height / 2);
      ball.velocityX = Math.abs(ball.velocityX) + (hasRelic('Perfuração') ? ball.speed * 0.12 : 0.25);
      ball.velocityY = impact * ball.speed; ball.x = player.x + paddle.width + ball.radius;
    }
    if (ball.velocityX > 0 && collides(ball, computer)) {
      const impact = (ball.y - (computer.y + paddle.height / 2)) / (paddle.height / 2);
      ball.velocityX = -(Math.abs(ball.velocityX) + (hasRelic('Perfuração') ? ball.speed * 0.12 : 0.25));
      ball.velocityY = impact * ball.speed; ball.x = computer.x - ball.radius;
    }
    handleMiss(ball, index);
    if (paused) break;
  }
  if (!balls.length && !paused) resetBalls(-1);
}

function draw() {
  context.fillStyle = '#020617'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.setLineDash([10, 14]); context.strokeStyle = '#334155'; context.lineWidth = 3; context.beginPath(); context.moveTo(canvas.width / 2, 0); context.lineTo(canvas.width / 2, canvas.height); context.stroke(); context.setLineDash([]);
  context.fillStyle = '#67e8f9'; context.fillRect(player.x, player.y, paddle.width, paddle.height);
  context.fillStyle = '#f472b6'; context.fillRect(computer.x, computer.y, paddle.width, paddle.height);
  balls.forEach((ball) => { context.beginPath(); context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); context.fillStyle = '#f8fafc'; context.shadowBlur = 14; context.shadowColor = '#f8fafc'; context.fill(); context.shadowBlur = 0; });
}

function gameLoop() { if (!paused) { update(); draw(); } requestAnimationFrame(gameLoop); }
function setPlayerPositionFromMouse(event) { const bounds = canvas.getBoundingClientRect(); player.y = ((event.clientY - bounds.top) / bounds.height) * canvas.height - paddle.height / 2; clampPaddle(player); }
function shuffledChoices() { return [...relicPool].sort(() => Math.random() - 0.5).slice(0, 3); }

function showChoices() {
  rewardOpen = true;
  paused = true;
  cardsElement.innerHTML = '';
  shuffledChoices().forEach((relic) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `<img src="${relic.image}" alt="Ilustração da relíquia ${relic.name}"><div><h3>${relic.name}</h3><p>${relic.description}</p><button class="pick" type="button">Escolher carta</button></div>`;
    card.querySelector('.pick').addEventListener('click', () => chooseRelic(relic));
    cardsElement.appendChild(card);
  });
  // Remove o atributo em vez de apenas alterar a propriedade, garantindo visibilidade.
  overlay.removeAttribute('hidden');
  requestAnimationFrame(() => cardsElement.querySelector('.pick')?.focus());
}

function chooseRelic(relic) {
  relic.apply();
  updateScoreboard();
  activeRelicsElement.innerHTML = relics.map((item) => `<span class="relic-chip">${item.icon} ${item.name}</span>`).join('');
  rewardOpen = false;
  overlay.setAttribute('hidden', '');
  paused = false;
  resetBalls(1);
}

function resetGame() {
  player.score = 0; computer.score = 0; totalPoints = 0; combo = 0; shields.player = 0; shields.computer = 0; relics.length = 0; paddle.height = 100; paddle.speed = 8; player.y = canvas.height / 2 - paddle.height / 2; computer.y = player.y; activeRelicsElement.innerHTML = ''; rewardOpen = false; paused = false; overlay.setAttribute('hidden', ''); updateScoreboard(); resetBalls();
}

window.addEventListener('keydown', (event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault(); if (event.key === 'ArrowUp') keys.up = true; if (event.key === 'ArrowDown') keys.down = true; });
window.addEventListener('keyup', (event) => { if (event.key === 'ArrowUp') keys.up = false; if (event.key === 'ArrowDown') keys.down = false; });
canvas.addEventListener('mousemove', setPlayerPositionFromMouse);
restartButton.addEventListener('click', resetGame);
resetGame();
gameLoop();
