const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');
const playerScoreElement = document.querySelector('#player-score');
const computerScoreElement = document.querySelector('#computer-score');
const restartButton = document.querySelector('#restart-button');

const paddle = {
  width: 14,
  height: 100,
  speed: 8,
};

const player = { x: 24, y: canvas.height / 2 - paddle.height / 2, score: 0 };
const computer = { x: canvas.width - 24 - paddle.width, y: player.y, score: 0 };
const ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 9, speed: 6, velocityX: 6, velocityY: 3 };
const keys = { up: false, down: false };
let animationFrame;

function resetBall(direction = 1) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = 6;
  ball.velocityX = direction * ball.speed;
  ball.velocityY = (Math.random() * 4 - 2) || 1;
}

function resetGame() {
  player.score = 0;
  computer.score = 0;
  player.y = canvas.height / 2 - paddle.height / 2;
  computer.y = player.y;
  updateScoreboard();
  resetBall(Math.random() > 0.5 ? 1 : -1);
}

function updateScoreboard() {
  playerScoreElement.textContent = player.score;
  computerScoreElement.textContent = computer.score;
}

function clampPaddle(paddleObject) {
  paddleObject.y = Math.max(0, Math.min(canvas.height - paddle.height, paddleObject.y));
}

function movePlayer() {
  if (keys.up) player.y -= paddle.speed;
  if (keys.down) player.y += paddle.speed;
  clampPaddle(player);
}

function moveComputer() {
  const target = ball.y - paddle.height / 2;
  const computerSpeed = 4.6;
  if (computer.y < target) computer.y += computerSpeed;
  if (computer.y > target) computer.y -= computerSpeed;
  clampPaddle(computer);
}

function collides(paddleObject) {
  return (
    ball.x - ball.radius < paddleObject.x + paddle.width &&
    ball.x + ball.radius > paddleObject.x &&
    ball.y - ball.radius < paddleObject.y + paddle.height &&
    ball.y + ball.radius > paddleObject.y
  );
}

function scorePoint(scoringPlayer) {
  scoringPlayer.score += 1;
  updateScoreboard();
  resetBall(scoringPlayer === player ? 1 : -1);
}

function update() {
  movePlayer();
  moveComputer();

  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
    ball.velocityY *= -1;
    ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
  }

  if (ball.velocityX < 0 && collides(player)) {
    const impact = (ball.y - (player.y + paddle.height / 2)) / (paddle.height / 2);
    ball.velocityX = Math.abs(ball.velocityX) + 0.25;
    ball.velocityY = impact * ball.speed;
    ball.x = player.x + paddle.width + ball.radius;
  }

  if (ball.velocityX > 0 && collides(computer)) {
    const impact = (ball.y - (computer.y + paddle.height / 2)) / (paddle.height / 2);
    ball.velocityX = -(Math.abs(ball.velocityX) + 0.25);
    ball.velocityY = impact * ball.speed;
    ball.x = computer.x - ball.radius;
  }

  if (ball.x + ball.radius < 0) scorePoint(computer);
  if (ball.x - ball.radius > canvas.width) scorePoint(player);
}

function drawRect(x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function draw() {
  drawRect(0, 0, canvas.width, canvas.height, '#020617');

  context.setLineDash([10, 14]);
  context.strokeStyle = '#334155';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(canvas.width / 2, 0);
  context.lineTo(canvas.width / 2, canvas.height);
  context.stroke();
  context.setLineDash([]);

  drawRect(player.x, player.y, paddle.width, paddle.height, '#38bdf8');
  drawRect(computer.x, computer.y, paddle.width, paddle.height, '#f472b6');

  context.beginPath();
  context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  context.fillStyle = '#f8fafc';
  context.fill();
}

function gameLoop() {
  update();
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

function setPlayerPositionFromMouse(event) {
  const bounds = canvas.getBoundingClientRect();
  player.y = ((event.clientY - bounds.top) / bounds.height) * canvas.height - paddle.height / 2;
  clampPaddle(player);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault();
  if (event.key === 'ArrowUp') keys.up = true;
  if (event.key === 'ArrowDown') keys.down = true;
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowUp') keys.up = false;
  if (event.key === 'ArrowDown') keys.down = false;
});

canvas.addEventListener('mousemove', setPlayerPositionFromMouse);
restartButton.addEventListener('click', resetGame);

resetGame();
if (animationFrame) cancelAnimationFrame(animationFrame);
gameLoop();
