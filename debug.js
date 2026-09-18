(() => {
  const $ = (s) => document.querySelector(s);
  const dev = new URLSearchParams(location.search).get('dev') === '1';
  if (!dev) return;
  const panel = document.createElement('aside'); panel.className = 'test-panel';
  panel.innerHTML = `<h3>DEV TEST MODE</h3><div class="test-status" id="dev-status"></div><label>IA<select id="dev-difficulty"><option value="easy">Fácil</option><option value="normal">Normal</option><option value="hard">Difícil</option></select></label><label class="toggle"><input id="dev-god" type="checkbox"> Invencibilidade</label><div class="test-grid"><button data-a="start">Iniciar</button><button data-a="pause">Pausar</button><button data-a="menu">Menu</button><button data-a="point">Ponto jogador</button><button data-a="enemyPoint">Ponto IA</button><button data-a="reward">Recompensa</button><button data-a="stage">Próxima fase</button><button data-a="boss">Boss fase 4</button><button data-a="rhythm">Minigame</button><button data-a="victory">Vitória</button><button data-a="defeat">Derrota</button><button data-a="clear" class="danger">Limpar saves</button><button data-a="reload">Recarregar</button></div>`;
  document.body.append(panel);
  const status = $('#dev-status'); const difficulty = $('#dev-difficulty');
  const api = () => window.__pongTest || {};
  const run = (name) => { const fn = api()[name]; if (typeof fn !== 'function') status.textContent = `API ausente: ${name}`; else fn(); };
  panel.addEventListener('click', (e) => { const b=e.target.closest('[data-a]'); if(!b)return; const a=b.dataset.a; const actions={start:'start',pause:'pause',menu:'menu',point:'forcePlayerPoint',enemyPoint:'forceEnemyPoint',reward:'openReward',stage:'nextStage',boss:'setBoss',rhythm:'startRhythm',victory:'win',defeat:'lose'}; if(a==='clear'){run('clearSaves');return} if(a==='reload'){location.reload();return} run(actions[a]); });
  difficulty.addEventListener('change', () => api().setDifficulty?.(difficulty.value)); $('#dev-god').addEventListener('change', (e) => api().setInvincible?.(e.target.checked));
  window.addEventListener('keydown', (e) => { const keys={F1:()=>panel.hidden=!panel.hidden,F2:()=>run('forcePlayerPoint'),F3:()=>run('forceEnemyPoint'),F4:()=>run('openReward'),F5:()=>run('nextStage'),F6:()=>run('setBoss'),F7:()=>run('startRhythm'),F8:()=>run('restoreHealth'),F9:()=>run('clearSaves'),F10:()=>{const c=$('#dev-god');c.checked=!c.checked;c.dispatchEvent(new Event('change'));}}; if(keys[e.key]){e.preventDefault();keys[e.key]();} });
  setInterval(() => { const s=api().getDebugState?.()||{}; status.textContent=`estado: ${s.state||'-'}\nfase: ${s.stage||'-'} · IA: ${s.difficulty||'-'}\nplacar: ${s.playerScore||0} : ${s.enemyScore||0}\nvida: ${Math.round(s.playerHp||0)} / ${Math.round(s.enemyHp||0)}\natalhos: F1 painel · F2/F3 ponto · F4 carta · F5 fase · F6 boss · F7 ritmo · F8 cura · F9 limpa · F10 deus`; }, 300);
  window.__pongTest = window.__pongTest || {};
})();
