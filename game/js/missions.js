import * as THREE from 'three';
import { LOCATIONS, makeCar, randomRoadPoint } from './city.js';

const MISSIONS = [
  {
    title: 'First Delivery',
    objective: 'Pick up the package at the Docks',
    reward: 200,
    type: 'goto',
    target: 'docks'
  },
  {
    title: 'Lose Them',
    objective: 'Lose the cops — drop the wanted level to zero',
    reward: 300,
    type: 'survive',
    wanted: 2
  },
  {
    title: 'Borrowed Wheels',
    objective: 'Take the marked red car to the Garage',
    reward: 400,
    type: 'steal_deliver'
  },
  {
    title: 'Hot Run',
    objective: 'Deliver the package across town before time runs out',
    reward: 600,
    type: 'timed',
    target: 'drop',
    wanted: 3,
    time: 90
  },
  {
    title: 'Harbor Heat',
    objective: 'Collect the crew goods at the Mint, then reach the Harbor',
    reward: 800,
    type: 'two_stop',
    from: 'mint',
    to: 'harbor',
    wanted: 3
  },
  {
    title: 'Eyes in the Sky',
    objective: 'Deliver the crew member across Solhaven',
    reward: 900,
    type: 'goto',
    target: 'drop',
    wanted: 4
  },
  {
    title: 'PIT Stop',
    objective: 'Bring the package to the Docks',
    reward: 1000,
    type: 'goto',
    target: 'docks',
    wanted: 4
  },
  {
    title: 'The Big Score',
    objective: 'Move the goods from the Mint to the Harbor',
    reward: 1500,
    type: 'two_stop',
    from: 'mint',
    to: 'harbor',
    wanted: 5
  }
];

export class Missions {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.index = 0;
    this.active = false;
    this.stage = 'pickup';
    this.time = 0;
    this.missionCar = null;
    this.targetPos = new THREE.Vector3();
    this.marker = new THREE.Group();
    this.buildMarker();
    this.scene.add(this.marker);
    this.marker.visible = false;
  }

  get data() { return MISSIONS[this.index]; }
  get total() { return MISSIONS.length; }

  buildMarker() {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 4.4, 0.2, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffc250, transparent: true, opacity: 0.48, depthWrite: false
      })
    );
    ring.position.y = 0.35;
    this.marker.add(ring);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 2.6, 22, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd98a, transparent: true, opacity: 0.2,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    beam.position.y = 11;
    this.marker.add(beam);
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.2),
      new THREE.MeshBasicMaterial({ color: 0xfff0b8 })
    );
    core.position.y = 4.5;
    this.marker.add(core);
    this.markerCore = core;
  }

  setTarget(name) {
    const spot = LOCATIONS[name] || LOCATIONS.center;
    this.targetPos.copy(spot);
    this.marker.position.set(spot.x, 0, spot.z);
    this.marker.visible = true;
  }

  clearMarker() { this.marker.visible = false; }

  spawnMissionCar() {
    const point = randomRoadPoint(this.game.city.rand);
    const car = makeCar(0xd93d35, 'normal');
    car.mesh.position.set(point.x, 0, point.z);
    car.angle = point.angle;
    car.own = true;
    car.mission = true;
    this.scene.add(car.mesh);
    this.missionCar = car;
  }

  start(index = this.index) {
    this.index = THREE.MathUtils.clamp(index, 0, MISSIONS.length - 1);
    this.active = true;
    this.stage = 'pickup';
    this.time = this.data.time || 0;
    this.clearMissionCar();

    const data = this.data;
    if (data.type === 'survive' || data.wanted) {
      this.game.police.setWanted(data.wanted);
    }
    if (data.type === 'steal_deliver') {
      this.spawnMissionCar();
      this.setTarget('garage');
    } else if (data.type === 'two_stop') {
      this.setTarget(data.from);
    } else if (data.type === 'survive') {
      this.clearMarker();
    } else {
      this.setTarget(data.target);
    }

    this.game.hud.toast(`MISSION ${this.index + 1} · ${data.title.toUpperCase()}`);
    this.game.save();
  }

  update(dt, time) {
    if (this.marker.visible) {
      this.markerCore.rotation.y += dt * 2.2;
      this.markerCore.position.y = 4.5 + Math.sin(time * 3) * 0.4;
    }
    if (!this.active) return;

    const player = this.game.player;
    const data = this.data;
    if (this.time > 0) {
      this.time = Math.max(0, this.time - dt);
      if (this.time <= 0) {
        this.fail('TIME EXPIRED');
        return;
      }
    }

    if (data.type === 'survive') {
      if (this.game.police.wanted === 0) this.complete();
      return;
    }

    if (data.type === 'steal_deliver') {
      if (this.stage === 'pickup' && this.missionCar) {
        const spot = this.missionCar.mesh.position;
        this.targetPos.copy(spot);
        this.marker.position.set(spot.x, 0, spot.z);
        if (player.car === this.missionCar) {
          this.stage = 'delivery';
          this.setTarget('garage');
          this.game.hud.toast('RIDE SECURED · DELIVER TO GARAGE');
        }
      } else if (this.stage === 'delivery' && player.car === this.missionCar) {
        const garage = LOCATIONS.garage;
        const distance = Math.hypot(
          player.position.x - garage.x, player.position.z - garage.z
        );
        if (distance < 9) {
          const car = this.missionCar;
          player.exitCar();
          this.missionCar = null;
          this.scene.remove(car.mesh);
          this.game.garage.store(car);
          this.complete();
        }
      }
      return;
    }

    const distance = Math.hypot(
      player.position.x - this.targetPos.x,
      player.position.z - this.targetPos.z
    );
    if (distance > 7) return;

    if (data.type === 'two_stop' && this.stage === 'pickup') {
      this.stage = 'delivery';
      this.setTarget(data.to);
      this.game.hud.toast('GOODS SECURED · HEAD TO THE HARBOR');
      this.game.audio.pickup();
    } else {
      this.complete();
    }
  }

  distanceToTarget() {
    if (!this.active) return 0;
    return Math.max(0, Math.round(
      Math.hypot(
        this.game.player.position.x - this.targetPos.x,
        this.game.player.position.z - this.targetPos.z
      )
    ));
  }

  objectiveText() {
    if (!this.active) return 'Explore Solhaven';
    if (this.data.type === 'steal_deliver' && this.stage === 'delivery') {
      return 'Deliver the red car to the Garage';
    }
    if (this.data.type === 'two_stop' && this.stage === 'delivery') {
      return 'Deliver the goods to the Harbor';
    }
    return this.data.objective;
  }

  clearMissionCar() {
    if (!this.missionCar) return;
    if (this.game.player.car === this.missionCar) this.game.player.exitCar();
    this.scene.remove(this.missionCar.mesh);
    this.missionCar = null;
  }

  complete() {
    if (!this.active) return;
    this.active = false;
    this.clearMissionCar();
    this.clearMarker();
    const reward = this.data.reward;
    this.game.player.cash += reward;
    this.game.audio.mission();
    this.game.save();
    this.game.onMissionComplete(reward);
  }

  fail(reason = 'MISSION FAILED') {
    if (!this.active) return;
    this.active = false;
    this.clearMissionCar();
    this.clearMarker();
    this.game.audio.fail();
    this.game.onMissionFailed(reason);
  }

  retry() { this.start(this.index); }

  next() {
    if (this.index + 1 >= MISSIONS.length) {
      this.game.onStoryComplete();
    } else {
      this.start(this.index + 1);
    }
  }

  abandon() {
    this.active = false;
    this.clearMissionCar();
    this.clearMarker();
  }

  forceIndex(index) {
    this.abandon();
    this.start(index);
    if (this.time > 0) this.time = 90;
  }

  snapshot() { return { index: this.index, time: this.time, active: this.active }; }
}
