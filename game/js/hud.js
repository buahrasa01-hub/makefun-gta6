import { BLOCK, LIMIT, LOCATIONS } from './city.js';

export class Hud {
  constructor(game) {
    this.game = game;
    this.screen = document.getElementById('screen');
    this.hud = document.getElementById('hud');
    this.cash = document.getElementById('cash');
    this.health = document.getElementById('health');
    this.healthBar = document.getElementById('health-bar');
    this.wanted = document.getElementById('wanted');
    this.heli = document.getElementById('heli');
    this.missionTitle = document.getElementById('mission-title');
    this.objective = document.getElementById('objective');
    this.distance = document.getElementById('distance');
    this.timer = document.getElementById('timer');
    this.speed = document.getElementById('speed');
    this.garageCount = document.getElementById('garage-count');
    this.abilities = document.getElementById('abilities');
    this.toastElement = document.getElementById('toast');
    this.flashElement = document.getElementById('damage-flash');
    this.edge = document.getElementById('wanted-edge');
    this.map = document.getElementById('map');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = 0;
    this.buildAbilities();
  }

  buildAbilities() {
    this.abilityNodes = this.game.player.abilityInfo.map((info, index) => {
      const node = document.createElement('div');
      node.className = 'ability';
      node.innerHTML = `<b>${info.icon}</b><small>${index + 1} ${info.person}</small><em>${info.name}</em>`;
      this.abilities.appendChild(node);
      return node;
    });
  }

  dim(value) { this.hud.classList.toggle('dimmed', value); }

  toast(text) {
    this.toastElement.textContent = text;
    this.toastElement.style.opacity = '1';
    this.toastTimer = 2.6;
  }

  setScreen(html) {
    this.screen.innerHTML = html;
    this.screen.classList.remove('hidden');
  }

  hideScreen() {
    this.screen.innerHTML = '';
    this.screen.classList.add('hidden');
  }

  showTitle(best, hasSave) {
    this.setScreen(`
      <div class="panel">
        <div class="eyebrow">MAKE.FUN · GTA6-01 · SOLHAVEN</div>
        <h1>SOLHAVEN<br>STREETS</h1>
        <p>Kia is a courier with a fast car and a new set of friends: the Harbor Crew. Eight jobs, one sun-soaked city, and a lot of police attention.</p>
        <div class="controls">
          WASD MOVE / DRIVE · SHIFT RUN · MOUSE DRAG CAMERA · F PUNCH<br>
          E ENTER OR EXIT CAR · SPACE HANDBRAKE · 1 / 2 / 3 CREW ABILITIES<br>
          G GARAGE (AFTER MISSION 3) · ESC PAUSE
        </div>
        <div class="stats-line"><span>BEST CASH</span><strong>$${best.toLocaleString('en-US')}</strong></div>
        <div class="buttons">
          <button id="btn-start">START NEW GAME</button>
          ${hasSave ? '<button id="btn-continue" class="secondary">CONTINUE</button>' : ''}
        </div>
      </div>`);
  }

  showPause(cash) {
    this.setScreen(`
      <div class="panel">
        <div class="eyebrow">SOLHAVEN / PAUSED</div>
        <h2>Take a breath.</h2>
        <p>The streets will still be here. Current cash: <strong>$${cash.toLocaleString('en-US')}</strong></p>
        <div class="buttons">
          <button id="btn-resume">RESUME</button>
          <button id="btn-title" class="secondary">TITLE SCREEN</button>
        </div>
      </div>`);
  }

  showComplete(reward, cash, title) {
    this.setScreen(`
      <div class="panel">
        <div class="eyebrow">MISSION COMPLETE</div>
        <h2 class="win">${title}</h2>
        <div class="stats-line"><span>CREW PAY</span><strong>$${reward.toLocaleString('en-US')}</strong></div>
        <div class="stats-line"><span>TOTAL CASH</span><strong>$${cash.toLocaleString('en-US')}</strong></div>
        <div class="buttons"><button id="btn-next">NEXT MISSION</button></div>
      </div>`);
  }

  showFailed(reason) {
    this.setScreen(`
      <div class="panel">
        <div class="eyebrow">JOB GONE WRONG</div>
        <h2>Mission Failed</h2>
        <p>${reason}. The crew gives you another shot.</p>
        <div class="buttons">
          <button id="btn-retry">RETRY</button>
          <button id="btn-title" class="secondary">TITLE SCREEN</button>
        </div>
      </div>`);
  }

  showBusted(cash) {
    this.setScreen(`
      <div class="panel">
        <div class="eyebrow">SOLHAVEN POLICE DEPARTMENT</div>
        <h2>BUSTED</h2>
        <p>Kia is back on the street, but the cash is counted: <strong>$${cash.toLocaleString('en-US')}</strong></p>
        <div class="buttons">
          <button id="btn-retry">TRY AGAIN</button>
          <button id="btn-title" class="secondary">TITLE SCREEN</button>
        </div>
      </div>`);
  }

  showStoryComplete(cash) {
    this.setScreen(`
      <div class="panel">
        <div class="eyebrow">THE HARBOR CREW SALUTES YOU</div>
        <h2 class="win">STORY COMPLETE</h2>
        <p>Eight jobs, one city, and a trunk full of cash. Solhaven knows Kia's name now.</p>
        <div class="stats-line"><span>TOTAL CASH</span><strong>$${cash.toLocaleString('en-US')}</strong></div>
        <div class="buttons"><button id="btn-again">PLAY AGAIN</button></div>
      </div>`);
  }

  update(dt) {
    const { player, police, missions, garage } = this.game;
    this.cash.textContent = player.cash.toLocaleString('en-US');
    this.health.textContent = String(Math.ceil(player.health));
    this.healthBar.style.width = `${player.health}%`;
    this.healthBar.style.background = player.health < 30
      ? '#e0645d' : player.health < 60 ? '#e7b95c' : '#8bd39b';
    this.wanted.textContent = '★'.repeat(police.wanted) + '☆'.repeat(5 - police.wanted);
    this.heli.classList.toggle('hidden', !police.heliUp);

    this.missionTitle.textContent = missions.active
      ? `${missions.data.title} (${missions.index + 1}/${missions.total})`
      : 'Free Roam';
    this.objective.textContent = missions.objectiveText();
    this.distance.textContent = missions.active ? `DIST ${missions.distanceToTarget()} M` : '';
    this.timer.textContent = missions.time > 0
      ? `TIME ${Math.floor(missions.time / 60)}:${String(Math.floor(missions.time % 60)).padStart(2, '0')}`
      : '';

    this.speed.classList.toggle('hidden', !player.driving);
    if (player.driving) {
      this.speed.innerHTML = `${Math.round(Math.abs(player.speed) * 3.6)} <small>KM/H</small>`;
    }
    this.garageCount.textContent = `GARAGE · ${garage.cars.length} STORED`;

    player.cooldowns.forEach((cooldown, index) => {
      const node = this.abilityNodes[index];
      node.querySelector('em').textContent = cooldown > 0 ? `${Math.ceil(cooldown)}S` : 'READY';
      node.classList.toggle('ready', cooldown <= 0);
    });

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastElement.style.opacity = '0';
    }
    this.flashElement.style.opacity = String(player.damageFlash * 0.9);
    this.edge.classList.toggle('alert', police.wanted >= 3);
    this.drawMap();
  }

  drawMap() {
    const ctx = this.mapCtx;
    const size = this.map.width;
    const center = size / 2;
    const scale = (center - 8) / LIMIT;
    const px = (x) => center + x * scale;
    const py = (z) => center + z * scale;
    const { player, police, missions, traffic } = this.game;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#204047';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#2d7f96';
    ctx.fillRect(0, 0, size, py(-LIMIT + 12));

    ctx.strokeStyle = '#647472';
    ctx.lineWidth = 3;
    for (let coordinate = -LIMIT; coordinate <= LIMIT; coordinate += BLOCK) {
      ctx.beginPath();
      ctx.moveTo(px(coordinate), 0);
      ctx.lineTo(px(coordinate), size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, py(coordinate));
      ctx.lineTo(size, py(coordinate));
      ctx.stroke();
    }

    ctx.fillStyle = '#5fd28a';
    ctx.beginPath();
    ctx.arc(px(LOCATIONS.garage.x), py(LOCATIONS.garage.z), 5, 0, Math.PI * 2);
    ctx.fill();

    if (missions.active) {
      const markerX = px(missions.targetPos.x);
      const markerY = py(missions.targetPos.z);
      ctx.fillStyle = '#ffd05f';
      ctx.beginPath();
      ctx.moveTo(markerX, markerY - 6);
      ctx.lineTo(markerX + 6, markerY);
      ctx.lineTo(markerX, markerY + 6);
      ctx.lineTo(markerX - 6, markerY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#c0c7c4';
    for (const car of traffic.cars) {
      ctx.fillRect(px(car.mesh.position.x) - 1.5, py(car.mesh.position.z) - 1.5, 3, 3);
    }

    const tracked = player.lookoutTime > 0;
    for (const car of police.policeCars) {
      ctx.globalAlpha = tracked ? 1 : 0.72;
      ctx.fillStyle = '#ff5750';
      ctx.beginPath();
      ctx.arc(px(car.mesh.position.x), py(car.mesh.position.z), tracked ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (police.heliUp) {
      ctx.fillStyle = '#ffa64d';
      ctx.beginPath();
      ctx.arc(px(police.helicopter.group.position.x), py(police.helicopter.group.position.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const heading = player.driving ? player.car.angle : player.mesh.rotation.y;
    ctx.save();
    ctx.translate(px(player.position.x), py(player.position.z));
    ctx.rotate(Math.PI - heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();

    ctx.strokeStyle = '#ffe4ad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
