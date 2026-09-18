/* Development-only browser harness. Activate with ?dev=1. It never runs in normal play. */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('dev') !== '1') return;

  const panel = document.createElement('aside');
  panel.className = 'test-panel';
  panel.innerHTML = `<h3>DEV TEST MODE</h3><div class="test-status" id="dev-status">Inicializando...</div>
    <label>IA <select id="dev-difficulty"><option value="easy">Fácil</option><option value="normal">Normal</option><option value="hard">Difícil</option></select></label>
    <div class="test-grid">
      <button data-action="start">Iniciar</button><button data-action="pause">Pausar</button>
      <button data-action="menu">Menu</button><button data-action="reward">Recompensa</button>
      <button data-action="stage">Próxima fase</button><button data-action="boss">Boss (fase 4)</button>
      <button data-action="rhythm">Minigame</button><button data-action="result">Tela final</button>
      <button data-action="clear" class="danger">Limpar saves</button><button data-action="reload">Recarregar</button>
    </div>`;
  document.body.append(panel);
  const status = panel.querySelector('#dev-status');
  const difficulty = panel.querySelector('#dev-difficulty');
  const click = (selector) => document.querySelector(selector)?.click();
  const setDifficulty = () => { const select = document.querySelector('#difficulty'); if (select) { select.value = difficulty.value; select.dispatchEvent(new Event('change', { bubbles: true })); } };
  const action = (name) => {
    setDifficulty();
    if (name === 'start') click('#settings button[type="submit"]');
    if (name === 'pause') click('#pause-button');
    if (name === 'menu') click('#menu-button');
    if (name === 'reward') { window.__pongTest?.openReward?.(); if (!window.__pongTest?.openReward) status.textContent = 'Recompensa: use F4 após iniciar (API será exposta pela versão de teste).'; }
    if (name === 'stage') window.__pongTest?.nextStage?.();
    if (name === 'boss') window.__pongTest?.setStage?.(4);
    if (name === 'rhythm') window.__pongTest?.startRhythm?.();
    if (name === 'result') window.__pongTest?.endRun?.(true);
    if (name === 'clear') { localStorage.removeItem('pongSession'); localStorage.removeItem('pongSettings'); status.textContent = 'Saves removidos. Recarregue para aplicar.'; }
    if (name === 'reload') location.reload();
  };
  panel.addEventListener('click', (event) => { const button = event.target.closest('[data-action]'); if (button) action(button.dataset.action); });
  window.addEventListener('keydown', (event) => {
    if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== 'd') return;
    panel.hidden = !panel.hidden;
  });
  const update = () => {
    const gameVisible = !document.querySelector('#game')?.hidden;
    status.textContent = `arena: ${gameVisible ? 'ativa' : 'menu'}\nscore: ${document.querySelector('#player-score')?.textContent || '-'} : ${document.querySelector('#enemy-score')?.textContent || '-'}\nfase: ${document.querySelector('#wave')?.textContent || '-'}\nDica: F2/F3/F4/F5/F6/F7/F8/F9/F10 são atalhos de teste.`;
  };
  setInterval(update, 500);
  window.__pongTest = window.__pongTest || {};
  window.__pongTest.clearSession = () => { localStorage.removeItem('pongSession'); };
  window.__pongTest.start = () => click('#settings button[type="submit"]');
  window.__pongTest.pause = () => click('#pause-button');
  window.__pongTest.menu = () => click('#menu-button');
  window.__pongTest.setDifficulty = (value) => { difficulty.value = value; setDifficulty(); };
  // Safe UI shortcuts that do not invent gameplay data.
  const keys = { F1: () => { panel.hidden = !panel.hidden; }, F9: () => { localStorage.removeItem('pongSession'); }, F10: () => { document.body.classList.toggle('dev-invincible'); } };
  window.addEventListener('keydown', (event) => { if (keys[event.key]) { event.preventDefault(); keys[event.key](); } });
})();
