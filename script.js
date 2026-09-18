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
let balls = [];
let animationFrame;
let paused = false;
let combo = 0;
let shieldCharges = 0;
const relics = [];

const relicPool = [
  { id: 'overdrive', name: 'Sobrecarga', description: 'Aumenta a velocidade de todas as bolas em 22%.', image: 'assets/overdrive.svg', apply: () => relics.push({ name: 'Sobrecarga', icon: '⚡' }) },
  { id: 'colossus', name: 'Colosso', description: 'Sua raquete fica 35% maior, facilitando defesas.', image: 'assets/colossus.svg', apply: () => { paddle.height *= 1.35; relics.push({ name: 'Colosso', icon: '◈' }); } },
  { id: 'twins', name: 'Gêmeas', description: 'Invoca uma segunda bola. Cada uma pode marcar pontos.', image: 'assets/twins.svg', apply: () => { if (balls.length < 2) balls.push(makeBall(-1)); relics.push({ name: 'Gêmeas', icon: '✦' }); } },
  { id: 'aegis', name: 'Égide', description: 'Concede 2 cargas que salvam você de sofrer pontos.', image: 'assets/aegis.svg', apply: () => { shieldCharges += 2; relics.push({ name: 'Égide ×2', icon: '⬟' }); } },
  { id: 'swift', name: 'Reflexos', description: 'A velocidade de movimento da sua raquete aumenta em 45%.', image: 'assets/swift.svg', apply: () => { paddle.speed *= 1.45; relics.push({ name: 'Reflexos', icon: '➤' }); } },
  { id: 'gravity', name: 'Gravidade', description: 'As bolas ficam maiores, com mais chance de acertar o rival.', image: 'assets/gravity.svg', apply: () => { balls.forEach(ball => { ball.radius += 4; }); relics.push({ name: 'Gravidade', icon: '●' }); } },
  { id: 'piercer', name: 'Perfuração', description: 'Cada rebatida aumenta a velocidade da bola em 12%.', image: 'assets/piercer.svg', apply: () => { relics.push({ name: 'Perfuração', icon: '⚔' }); } },
  { id: 'recovery', name: 'Recuperação', description: 'Comece cada nova bola com velocidade 18% menor.', image: 'assets/recovery.svg', apply: () => { relics.push({ name: 'Recuperação', icon: '✚' }); } },
];

function makeBall(direction = Math.random() > .5 ? 1 : -1) {
  const speed = 6 * (relics.some(relic => relic.name === 'Recuperação') ? .82 : 1);
  return { x: canvas.width / 2, y: canvas.height / 2, radius: 9, speed, velocityX: direction * speed, velocityY: (Math.random() * 4 - 2) || 1, hits: 0 };
}
function resetBalls(direction) { balls = [makeBall(direction)]; if (relics.some(relic => relic.name === 'Gêmeas')) balls.push(makeBall(-direction)); }
function clampPaddle(object) { object.y = Math.max(0, Math.min(canvas.height - paddle.height, object.y)); }
function updateScoreboard() { playerScoreElement.textContent = player.score; computerScoreElement.textContent = computer.score; relicCountElement.textContent = relics.length; comboCountElement.textContent = combo; }
function movePlayer() { if (keys.up) player.y -= paddle.speed; if (keys.down) player.y += paddle.speed; clampPaddle(player); }
function moveComputer() { const target = balls[0]?.y - paddle.height / 2; if (target == null) return; if (computer.y < target) computer.y += 4.6; if (computer.y > target) computer.y -= 4.6; clampPaddle(computer); }
function collides(ball, object) { return ball.x - ball.radius < object.x + paddle.width && ball.x + ball.radius > object.x && ball.y - ball.radius < object.y + paddle.height && ball.y + ball.radius > object.y; }
function scorePoint(scoringPlayer) { scoringPlayer.score += 1; if (scoringPlayer === player) { combo += 1; if (player.score % 2 === 0) setTimeout(showChoices, 220); } else combo = 0; updateScoreboard(); resetBalls(scoringPlayer === player ? 1 : -1); }
function ballMissed(ball, index) { if (ball.x + ball.radius < 0) { if (shieldCharges > 0) { shieldCharges -= 1; ball.x = canvas.width / 2; ball.velocityX = Math.abs(ball.velocityX); } else { balls.splice(index, 1); scorePoint(computer); } } else if (ball.x - ball.radius > canvas.width) { balls.splice(index, 1); scorePoint(player); } }
function update() { movePlayer(); moveComputer(); balls.forEach((ball, index) => { ball.x += ball.velocityX; ball.y += ball.velocityY; if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) { ball.velocityY *= -1; ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y)); } if (ball.velocityX < 0 && collides(ball, player)) { const impact = (ball.y - (player.y + paddle.height / 2)) / (paddle.height / 2); ball.velocityX = Math.abs(ball.velocityX) + (relics.some(relic => relic.name === 'Perfuração') ? ball.speed * .12 : .25); ball.velocityY = impact * ball.speed; ball.x = player.x + paddle.width + ball.radius; ball.hits += 1; } if (ball.velocityX > 0 && collides(ball, computer)) { const impact = (ball.y - (computer.y + paddle.height / 2)) / (paddle.height / 2); ball.velocityX = -(Math.abs(ball.velocityX) + .25); ball.velocityY = impact * ball.speed; ball.x = computer.x - ball.radius; } ballMissed(ball, index); }); if (!balls.length && !paused) resetBalls(-1); }
function drawRect(x, y, width, height, color) { context.fillStyle = color; context.fillRect(x, y, width, height); }
function draw() { drawRect(0, 0, canvas.width, canvas.height, '#020617'); context.setLineDash([10, 14]); context.strokeStyle = '#334155'; context.lineWidth = 3; context.beginPath(); context.moveTo(canvas.width / 2, 0); context.lineTo(canvas.width / 2, canvas.height); context.stroke(); context.setLineDash([]); drawRect(player.x, player.y, paddle.width, paddle.height, '#67e8f9'); drawRect(computer.x, computer.y, paddle.width, paddle.height, '#f472b6'); balls.forEach(ball => { context.beginPath(); context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); context.fillStyle = '#f8fafc'; context.shadowBlur = 14; context.shadowColor = '#f8fafc'; context.fill(); context.shadowBlur = 0; }); }
function gameLoop() { if (!paused) { update(); draw(); } animationFrame = requestAnimationFrame(gameLoop); }
function setPlayerPositionFromMouse(event) { const bounds = canvas.getBoundingClientRect(); player.y = ((event.clientY - bounds.top) / bounds.height) * canvas.height - paddle.height / 2; clampPaddle(player); }
function shuffledChoices() { return [...relicPool].sort(() => Math.random() - .5).slice(0, 3); }
function showChoices() { paused = true; cardsElement.innerHTML = ''; shuffledChoices().forEach(relic => { const card = document.createElement('article'); card.className = 'card'; card.innerHTML = `<img src="${relic.image}" alt="Ilustração da relíquia ${relic.name}"><div><h3>${relic.name}</h3><p>${relic.description}</p><button class="pick" type="button">Escolher carta</button></div>`; card.querySelector('button').addEventListener('click', () => chooseRelic(relic)); cardsElement.appendChild(card); }); overlay.hidden = false; cardsElement.querySelector('button')?.focus(); }
function chooseRelic(relic) { relic.apply(); updateScoreboard(); activeRelicsElement.innerHTML = relics.map(item => `<span class="relic-chip">${item.icon} ${item.name}</span>`).join(''); overlay.hidden = true; paused = false; resetBalls(1); }
function resetGame() { player.score = 0; computer.score = 0; combo = 0; shieldCharges = 0; relics.length = 0; paddle.height = 100; paddle.speed = 8; player.y = canvas.height / 2 - paddle.height / 2; computer.y = player.y; activeRelicsElement.innerHTML = ''; updateScoreboard(); resetBalls(Math.random() > .5 ? 1 : -1); overlay.hidden = true; paused = false; }
window.addEventListener('keydown', event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault(); if (event.key === 'ArrowUp') keys.up = true; if (event.key === 'ArrowDown') keys.down = true; });
window.addEventListener('keyup', event => { if (event.key === 'ArrowUp') keys.up = false; if (event.key === 'ArrowDown') keys.down = false; });
canvas.addEventListener('mousemove', setPlayerPositionFromMouse); restartButton.addEventListener('click', resetGame); resetGame(); gameLoop();
