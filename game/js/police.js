import * as THREE from 'three';
import {
  makeCar, syncCarVisual, roadCoordinate, hitsBuilding, makeBarrier, LIMIT
} from './city.js';

export class Police {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.city = game.city;
    this.wanted = 0;
    this.policeCars = [];
    this.helicopter = null;
    this.roadblock = null;
    this.crimeTimer = 0;
    this.pitTimer = 0;
    this.ramTimer = 0;
    this.forceHeli = false;
  }

  get heliUp() { return this.helicopter !== null; }

  setWanted(value) {
    const next = THREE.MathUtils.clamp(Math.round(value), 0, 5);
    if (next > this.wanted) this.crimeTimer = 0;
    this.wanted = next;
    if (next === 0) this.clearWorld();
    this.dispatch();
  }

  addWanted(amount) {
    if (amount <= 0) return;
    const before = this.wanted;
    this.setWanted(before + amount);
    if (this.wanted > before) {
      this.game.hud.toast(`WANTED · ${this.wanted} STAR${this.wanted > 1 ? 'S' : ''}`);
    }
  }

  spawnRoadblock() {
    const player = this.game.player;
    const heading = player.car ? player.car.angle : 0;
    const alongX = Math.abs(Math.sin(heading)) > 0.5;
    const line = alongX
      ? roadCoordinate(player.position.z)
      : roadCoordinate(player.position.x);
    const sign = alongX ? Math.sign(Math.sin(heading)) : Math.sign(Math.cos(heading));
    const forward = (alongX ? player.position.x : player.position.z) + (sign || 1) * 120;
    const ahead = THREE.MathUtils.clamp(roadCoordinate(forward), -LIMIT + 25, LIMIT - 25);
    const centerX = alongX ? ahead : line;
    const centerZ = alongX ? line : ahead;

    const group = new THREE.Group();
    group.position.set(centerX, 0, centerZ);
    const cars = [];
    for (const offset of [-5.5, 5.5]) {
      const car = makeCar(0xf2f2ec, 'police');
      car.mesh.position.set(alongX ? 0 : offset, 0, alongX ? offset : 0);
      car.angle = alongX ? 0 : Math.PI / 2;
      car.speed = 0;
      car.parked = true;
      group.add(car.mesh);
      cars.push(car);
    }
    for (const offset of [-5, 5]) {
      const barrier = makeBarrier();
      barrier.position.set(alongX ? offset : 0, 0, alongX ? 0 : offset);
      barrier.rotation.y = alongX ? Math.PI / 2 : 0;
      group.add(barrier);
    }
    this.scene.add(group);
    this.roadblock = {
      group,
      cars,
      alongX,
      hit: false,
      position: new THREE.Vector3(centerX, 0, centerZ)
    };
    this.game.hud.toast('ROADBLOCK AHEAD');
  }

  updateRoadblock() {
    const playerCar = this.game.player.car;
    if (!playerCar || this.roadblock.hit) return;
    const distance = Math.hypot(
      playerCar.mesh.position.x - this.roadblock.position.x,
      playerCar.mesh.position.z - this.roadblock.position.z
    );
    if (distance < 7 && Math.abs(playerCar.speed) > 8) {
      this.roadblock.hit = true;
      playerCar.hp = Math.max(0, playerCar.hp - 28);
      playerCar.speed *= 0.35;
      this.game.player.damage(8);
      this.game.player.shake = 1;
      this.game.audio.crash();
      this.game.hud.toast('ROADBLOCK HIT · CAR DAMAGED');
    }
  }

  removeRoadblock() {
    if (!this.roadblock) return;
    this.scene.remove(this.roadblock.group);
    this.roadblock = null;
  }

  spawnHelicopter() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 12, 9),
      new THREE.MeshLambertMaterial({ color: 0x263c45 })
    );
    body.scale.set(1.3, 0.7, 2.1);
    group.add(body);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.6, 7),
      new THREE.MeshLambertMaterial({ color: 0x2d4650 })
    );
    tail.position.z = -5.5;
    group.add(tail);
    for (const side of [-1, 1]) {
      const skid = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 5),
        new THREE.MeshLambertMaterial({ color: 0x1d2d33 })
      );
      skid.position.set(side * 1.5, -2.2, 0);
      group.add(skid);
    }

    const rotor = new THREE.Group();
    for (let blade = 0; blade < 4; blade++) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.08, 13),
        new THREE.MeshLambertMaterial({ color: 0x16262b })
      );
      arm.rotation.y = blade * Math.PI / 4;
      rotor.add(arm);
    }
    rotor.position.y = 2.1;
    group.add(rotor);

    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(13, 50, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffefb0, transparent: true, opacity: 0.12,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    beam.rotation.x = Math.PI;
    beam.position.y = -25;
    group.add(beam);

    group.position.set(
      this.game.player.position.x + 38,
      58,
      this.game.player.position.z - 38
    );
    this.scene.add(group);
    this.helicopter = { group, rotor, beam };
    this.game.hud.toast('HELI INBOUND · WANTED 4');
  }

  updateHelicopter(dt, time) {
    const heli = this.helicopter;
    const position = this.game.player.position;
    const target = new THREE.Vector3(
      position.x + Math.cos(time * 0.25) * 34,
      58 + Math.sin(time * 0.6) * 3,
      position.z + Math.sin(time * 0.25) * 34
    );
    heli.group.position.lerp(target, 1 - Math.exp(-dt * 1.4));
    heli.rotor.rotation.y += dt * 24;
    heli.group.rotation.y = Math.atan2(
      position.x - heli.group.position.x,
      position.z - heli.group.position.z
    );
  }

  removeHelicopter() {
    if (!this.helicopter) return;
    this.scene.remove(this.helicopter.group);
    this.helicopter = null;
  }

  updateDecay(dt) {
    if (this.wanted <= 0) return;
    if (this.heliUp) {
      this.crimeTimer = 0;
      return;
    }
    const position = this.game.player.position;
    const policeNearby = this.policeCars.some((car) => (
      Math.hypot(car.mesh.position.x - position.x, car.mesh.position.z - position.z) < 40
    ));
    if (policeNearby) {
      this.crimeTimer = 0;
      return;
    }
    const rate = this.game.player.lookoutTime > 0 ? 2 : 1;
    this.crimeTimer += dt * rate;
    if (this.crimeTimer >= 15) {
      this.setWanted(this.wanted - 1);
      this.crimeTimer = 0;
      this.game.hud.toast(`WANTED DROPPED · ${this.wanted} STAR${this.wanted === 1 ? '' : 'S'}`);
    }
  }

  clearWorld() {
    for (const car of this.policeCars) this.scene.remove(car.mesh);
    this.policeCars.length = 0;
    this.removeRoadblock();
    this.removeHelicopter();
    this.crimeTimer = 0;
  }

  reset() {
    this.wanted = 0;
    this.clearWorld();
  }

  dispatch() {
    const desired = this.wanted >= 1 ? Math.min(4, 1 + this.wanted) : 0;
    while (this.policeCars.length < desired) this.spawnCar();
    if (this.wanted >= 3 && !this.roadblock) this.spawnRoadblock();
    if (this.wanted < 3 && this.roadblock) this.removeRoadblock();
    if (this.wanted >= 4 && !this.helicopter) this.spawnHelicopter();
    if (this.wanted < 4 && this.helicopter && !this.forceHeli) this.removeHelicopter();
  }

  spawnCar() {
    const player = this.game.player;
    const angle = Math.random() * Math.PI * 2;
    const distance = 55 + Math.random() * 35;
    const x = THREE.MathUtils.clamp(
      player.position.x + Math.sin(angle) * distance, -LIMIT + 10, LIMIT - 10
    );
    const z = THREE.MathUtils.clamp(
      player.position.z + Math.cos(angle) * distance, -LIMIT + 10, LIMIT - 10
    );
    const car = makeCar(0xf1f2ed, 'police');
    car.mesh.position.set(x, 0, z);
    car.angle = Math.atan2(player.position.x - x, player.position.z - z);
    car.speed = 0;
    car.parked = false;
    car.ai = { pit: false, sirenPhase: Math.random() * 6 };
    this.scene.add(car.mesh);
    this.policeCars.push(car);
    return car;
  }

  update(dt, time) {
    this.dispatch();
    this.ramTimer = Math.max(0, this.ramTimer - dt);
    this.pitTimer = Math.max(0, this.pitTimer - dt);
    this.updateCars(dt, time);
    if (this.roadblock) this.updateRoadblock(dt);
    if (this.helicopter) this.updateHelicopter(dt, time);
    this.updateDecay(dt);
  }

  updateCars(dt, time) {
    const player = this.game.player;
    const target = player.position;
    const playerCar = player.car;

    for (let index = 0; index < this.policeCars.length; index++) {
      const car = this.policeCars[index];
      let goalX = target.x;
      let goalZ = target.z;

      if (playerCar && this.wanted >= 5 && index === 0) {
        car.ai.pit = true;
      } else {
        car.ai.pit = false;
      }

      if (playerCar && car.ai.pit) {
        const sideX = Math.cos(playerCar.angle);
        const sideZ = -Math.sin(playerCar.angle);
        const rearX = -Math.sin(playerCar.angle) * 3;
        const rearZ = -Math.cos(playerCar.angle) * 3;
        goalX = playerCar.mesh.position.x + sideX * 3.4 + rearX;
        goalZ = playerCar.mesh.position.z + sideZ * 3.4 + rearZ;
      }

      const dx = goalX - car.mesh.position.x;
      const dz = goalZ - car.mesh.position.z;
      const distance = Math.hypot(dx, dz) || 1;
      let desiredAngle = Math.atan2(dx, dz);
      let difference = desiredAngle - car.angle;
      while (difference > Math.PI) difference -= Math.PI * 2;
      while (difference < -Math.PI) difference += Math.PI * 2;
      car.angle += THREE.MathUtils.clamp(difference, -2.2 * dt, 2.2 * dt);
      car.steer = THREE.MathUtils.clamp(difference, -1, 1);

      const topSpeed = playerCar ? 33 : 19;
      const wantedSpeed = distance < 5 ? 9 : topSpeed;
      car.speed += THREE.MathUtils.clamp(wantedSpeed - car.speed, -30 * dt, 22 * dt);

      const nextX = car.mesh.position.x + Math.sin(car.angle) * car.speed * dt;
      const nextZ = car.mesh.position.z + Math.cos(car.angle) * car.speed * dt;
      if (hitsBuilding(this.city, nextX, nextZ, 2.4)) {
        car.speed = 2;
        car.angle += 0.55;
      } else if (Math.abs(nextX) < LIMIT + 30 && Math.abs(nextZ) < LIMIT + 30) {
        car.mesh.position.x = nextX;
        car.mesh.position.z = nextZ;
      }
      syncCarVisual(car, dt);

      if (distance < 5 && this.ramTimer <= 0) {
        this.ramTimer = 1.3;
        if (playerCar) {
          player.damage(4);
          player.shake = Math.max(player.shake, 0.45);
          this.game.audio.crash();
        } else {
          player.damage(9);
          this.game.hud.toast('POLICE ARE ON FOOT · RUN!');
        }
      }

      if (playerCar && car.ai.pit && distance < 5 && this.pitTimer <= 0) {
        this.pitTimer = 1.8;
        playerCar.angle += (Math.random() < 0.5 ? -1 : 1) * 0.35;
        playerCar.speed *= 0.7;
        player.shake = 1;
        this.game.audio.crash();
        this.game.hud.toast('PIT MANEUVER!');
      }
    }
  }
}
