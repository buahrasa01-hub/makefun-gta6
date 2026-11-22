import * as THREE from 'three';
import { GameAudio } from './audio.js';
import { Input } from './input.js';
import { createCity, makeCar, LOCATIONS } from './city.js';
import { Traffic } from './traffic.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Garage } from './garage.js';
import { Hud } from './hud.js';

const SAVE_KEY = 'solhaven-streets-v2';
const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed7e8);
scene.fog = new THREE.Fog(0xa9d8e6, 230, 640);

const camera = new THREE.PerspectiveCamera(
  62, window.innerWidth / window.innerHeight, 0.1, 1400
);
camera.position.set(20, 16, 90);

const skyLight = new THREE.HemisphereLight(0xdff2ff, 0xa38360, 2.1);
scene.add(skyLight);
const sunLight = new THREE.DirectionalLight(0xfff1cd, 2.2);
sunLight.position.set(180, 280, -160);
scene.add(sunLight);
const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(30, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0xffe5a0, fog: false })
);
sunDisc.position.set(460, 320, -520);
scene.add(sunDisc);

const game = {
  state: 'title',
  time: 0,
  scene,
  camera,
  renderer,
  bestCash: 0,
  save() {},
  onMissionComplete() {},
  onMissionFailed() {},
  onBusted() {},
  onStoryComplete() {}
};

game.input = new Input(canvas);
game.audio = new GameAudio();
game.city = createCity(scene);
game.player = new Player(game);
game.traffic = new Traffic(game);
game.police = new Police(game);
game.missions = new Missions(game);
game.garage = new Garage(game);
game.hud = new Hud(game);

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save() {
  const previous = loadSave();
  game.bestCash = Math.max(
    game.bestCash, previous && previous.bestCash ? previous.bestCash : 0, game.player.cash
  );
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.player.cash,
      missionIndex: game.missions.index,
      bestCash: game.bestCash,
      garage: game.garage.save()
    }));
  } catch {
    /* storage may be unavailable */
  }
}
game.save = save;

function setState(next) {
  game.state = next;
  game.hud.dim(next !== 'play');
}

function unlockAudio() { game.audio.unlock(); }

function resetRun() {
  policeReset();
  playerReset();
}

function policeReset() { game.police.reset(); }

function playerReset() {
  game.player.reset(new THREE.Vector3(20, 0, 60));
  game.input.yaw = 0.6;
  game.input.pitch = 0.42;
  game.camera.position.set(20, 16, 90);
}

function newGame() {
  const previous = loadSave();
  game.bestCash = Math.max(game.bestCash, previous && previous.bestCash ? previous.bestCash : 0);
  game.player.cash = 0;
  game.garage.load([]);
  resetRun();
  game.missions.start(0);
  game.hud.hideScreen();
  setState('play');
  unlockAudio();
}

function continueGame() {
  const data = loadSave();
  if (!data) return newGame();
  resetRun();
  game.player.cash = data.cash || 0;
  game.garage.load(data.garage);
  game.missions.start(Number.isInteger(data.missionIndex) ? data.missionIndex : 0);
  game.hud.hideScreen();
  setState('play');
  unlockAudio();
}

function retryRun() {
  resetRun();
  game.missions.retry();
  game.hud.hideScreen();
  setState('play');
}

function nextMission() {
  game.missions.next();
  if (game.state !== 'story-complete') {
    game.hud.hideScreen();
    setState('play');
  }
}

function toTitle() {
  game.missions.abandon();
  game.police.reset();
  setState('title');
  game.hud.showTitle(game.bestCash, !!loadSave());
}

game.onMissionComplete = (reward) => {
  save();
  setState('mission-complete');
  game.hud.showComplete(reward, game.player.cash, game.missions.data.title);
};

game.onMissionFailed = (reason) => {
  setState('mission-failed');
  game.hud.showFailed(reason);
};

game.onBusted = () => {
  save();
  setState('busted');
  game.hud.showBusted(game.player.cash);
};

game.onStoryComplete = () => {
  save();
  setState('story-complete');
  game.hud.showStoryComplete(game.player.cash);
};

function bindButton(id, action) {
  const button = game.hud.screen.querySelector(id);
  if (button) button.onclick = () => { unlockAudio(); action(); };
}

function bindScreenButtons() {
  bindButton('#btn-start', newGame);
  bindButton('#btn-continue', continueGame);
  bindButton('#btn-resume', () => { game.hud.hideScreen(); setState('play'); });
  bindButton('#btn-retry', retryRun);
  bindButton('#btn-next', nextMission);
  bindButton('#btn-title', toTitle);
  bindButton('#btn-again', newGame);
}

function handlePlayKeys() {
  const input = game.input;
  if (input.consume('Escape') || input.consume('KeyP')) {
    game.hud.showPause(game.player.cash);
    setState('pause');
    return;
  }
  if (input.consume('KeyG')) {
    if (game.missions.index >= 3 && game.garage.nearby()) {
      game.garage.openPicker();
    } else if (game.missions.index < 3) {
      game.hud.toast('GARAGE OPENS AFTER MISSION 3');
    } else {
      game.hud.toast('STAND IN THE GOLD GARAGE MARKER');
    }
  }
}

function handleGarageKeys() {
  const codes = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyW', 'KeyS', 'Enter', 'Space', 'Escape', 'KeyG'
  ];
  for (const code of codes) {
    if (game.input.consume(code)) game.garage.handleKey(code);
  }
}

function handleScreenKeys() {
  const input = game.input;
  if (game.state === 'pause') {
    if (input.consume('Escape') || input.consume('KeyP')) {
      game.hud.hideScreen();
      setState('play');
    }
  } else if (game.state === 'mission-complete') {
    if (input.consume('Enter')) nextMission();
  } else if (game.state === 'mission-failed' || game.state === 'busted') {
    if (input.consume('Enter') || input.consume('KeyR')) retryRun();
  }
}

let lastScreenState = '';
let lastFrame = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  game.time += dt;

  if (game.state === 'play') {
    handlePlayKeys();
  } else if (game.state === 'garage') {
    handleGarageKeys();
  } else {
    handleScreenKeys();
  }

  if (game.state === 'play') {
    game.player.update(dt, game.time);
    game.traffic.update(dt, game.time);
    game.police.update(dt, game.time);
    game.missions.update(dt, game.time);
    game.garage.update(dt);
  } else if (game.state === 'garage') {
    game.traffic.update(dt, game.time);
  }

  game.audio.update(dt, {
    driving: game.player.driving && game.state === 'play',
    speed: game.player.speed,
    wanted: game.police.wanted,
    heli: game.police.heliUp
  });
  game.hud.update(dt);
  renderer.render(scene, camera);
  game.input.endFrame();

  if (game.state !== lastScreenState) {
    lastScreenState = game.state;
    bindScreenButtons();
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function shotCar(color) {
  const car = makeCar(color, 'normal');
  car.own = true;
  car.parked = false;
  car.mesh.position.set(LOCATIONS.center.x, 0, LOCATIONS.center.z + 20);
  car.angle = Math.PI / 2;
  car.speed = 21;
  scene.add(car.mesh);
  game.traffic.cars.push(car);
  game.player.enterCar(car, false);
  return car;
}

function shotCamera() {
  const position = game.player.position;
  camera.position.set(position.x - 22, 15, position.z - 28);
  camera.lookAt(position.x, 2, position.z);
}

function setupShot(kind) {
  if (kind === 'mission') {
    game.player.cash = 200;
    game.missions.forceIndex(0);
    game.hud.cash.textContent = '200';
    game.hud.showComplete(200, 200, 'First Delivery');
    setState('mission-complete');
    return;
  }

  if (kind === 'play') {
    game.player.cash = 1850;
    game.missions.start(0);
    game.player.mesh.position.set(20, 0, 60);
    camera.position.set(38, 12, 86);
    camera.lookAt(20, 2, 60);
    game.hud.hideScreen();
    setState('play');
    return;
  }

  if (kind === 'cover' || kind === 'chase') {
    game.player.cash = kind === 'cover' ? 3250 : 2400;
    game.missions.forceIndex(3);
    game.police.setWanted(3);
    shotCar(0xd94a3e);
    const position = game.player.position;
    for (let index = 0; index < 2; index++) {
      const car = game.police.spawnCar();
      car.mesh.position.set(
        position.x + (index ? 12 : -12), 0, position.z - 22 - index * 9
      );
      car.angle = 0;
      car.speed = 19;
    }
    if (kind === 'cover') {
      game.police.forceHeli = true;
      game.police.spawnHelicopter();
      game.police.helicopter.group.position.set(position.x + 30, 52, position.z - 26);
    }
    shotCamera();
    game.hud.hideScreen();
    setState('play');
  }
}

const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) {
  setupShot(shot);
} else {
  const previous = loadSave();
  if (previous && previous.bestCash) game.bestCash = previous.bestCash;
  game.hud.showTitle(game.bestCash, !!previous);
  setState('title');
}

requestAnimationFrame(frame);
