import * as THREE from 'three';
import { box, hitsBuilding, syncCarVisual, LIMIT } from './city.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.city = game.city;
    this.input = game.input;
    this.car = null;
    this.health = 100;
    this.cash = 0;
    this.damageFlash = 0;
    this.shake = 0;
    this.punchTime = 0;
    this.boostTime = 0;
    this.lookoutTime = 0;
    this.cooldowns = [0, 0, 0];
    this.particles = [];
    this.stepTimer = 0;

    this.mesh = new THREE.Group();
    box(this.mesh, 0.85, 1.15, 0.5, 0x2b6d85, 0, 1.3, 0);
    box(this.mesh, 0.52, 0.52, 0.52, 0xc99a72, 0, 2.12, 0);
    box(this.mesh, 0.24, 0.9, 0.3, 0x253b4a, -0.22, 0.48, 0);
    box(this.mesh, 0.24, 0.9, 0.3, 0x253b4a, 0.22, 0.48, 0);
    this.arms = [
      box(this.mesh, 0.22, 0.85, 0.24, 0x2b6d85, -0.53, 1.35, 0),
      box(this.mesh, 0.22, 0.85, 0.24, 0x2b6d85, 0.53, 1.35, 0)
    ];
    this.mesh.position.set(20, 0, 60);
    this.scene.add(this.mesh);
  }

  get position() {
    return this.car ? this.car.mesh.position : this.mesh.position;
  }

  get speed() {
    return this.car ? this.car.speed : 0;
  }

  get driving() { return this.car !== null; }

  update(dt, time) {
    this.updateAbilities(dt);
    if (this.car) this.drive(dt);
    else this.walk(dt, time);
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.punchTime = Math.max(0, this.punchTime - dt);
  }

  walk(dt, time) {
    const axis = this.input.moveAxis();
    const yaw = this.input.yaw;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    let moveX = forwardX * axis.forward + rightX * axis.sideways;
    let moveZ = forwardZ * axis.forward + rightZ * axis.sideways;
    const length = Math.hypot(moveX, moveZ);
    if (length > 0.01) {
      moveX /= length;
      moveZ /= length;
      const running = this.input.down('ShiftLeft') || this.input.down('ShiftRight');
      const boost = this.boostTime > 0 ? 1.75 : 1;
      const pace = (running ? 9.5 : 5.6) * boost;
      const nextX = this.mesh.position.x + moveX * pace * dt;
      const nextZ = this.mesh.position.z + moveZ * pace * dt;
      if (!hitsBuilding(this.city, nextX, nextZ, 0.8)) {
        this.mesh.position.x = nextX;
        this.mesh.position.z = nextZ;
      } else if (!hitsBuilding(this.city, nextX, this.mesh.position.z, 0.8)) {
        this.mesh.position.x = nextX;
      } else if (!hitsBuilding(this.city, this.mesh.position.x, nextZ, 0.8)) {
        this.mesh.position.z = nextZ;
      }
      this.mesh.rotation.y = Math.atan2(moveX, moveZ);
      this.stepTimer += dt * pace;
      const swing = Math.sin(this.stepTimer * 1.7) * 0.5;
      this.arms[0].rotation.x = swing;
      this.arms[1].rotation.x = -swing;
    } else {
      this.arms[0].rotation.x *= 0.85;
      this.arms[1].rotation.x *= 0.85;
    }
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -LIMIT - 45, LIMIT + 45);
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -LIMIT - 45, LIMIT + 45);

    if (this.input.consume('KeyF') || this.input.consume('Mouse0')) this.punch();
    if (this.input.consume('KeyE')) this.tryEnterCar();
  }

  updateCamera(dt) {
    const camera = this.game.camera;
    const position = this.position;
    const yaw = this.input.yaw;
    const pitch = this.input.pitch;
    const distance = this.car ? 13.5 : 8.5;
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      2.2 + Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance
    );
    const target = new THREE.Vector3(position.x, position.y + (this.car ? 2 : 2.1), position.z);
    const desired = target.clone().add(offset);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 7));
    if (this.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * this.shake * 1.4;
      camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    camera.lookAt(target);
  }

  drive(dt) {
    const car = this.car;
    const input = this.input;
    if (input.consume('KeyE')) {
      this.exitCar();
      return;
    }

    const throttle = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0)
      - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
    const steer = (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0)
      - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
    const boost = this.boostTime > 0 ? 1.6 : 1;
    const maxSpeed = car.maxSpeed * boost;

    if (throttle > 0) car.speed += 24 * dt;
    else if (throttle < 0) car.speed -= 30 * dt;
    else car.speed *= Math.exp(-dt * 0.85);

    if (input.down('Space')) {
      car.speed *= Math.exp(-dt * 3.1);
      if (Math.abs(car.speed) > 8) {
        this.spawnParticle(
          car.mesh.position.x - Math.sin(car.angle) * 1.5,
          0.12,
          car.mesh.position.z - Math.cos(car.angle) * 1.5,
          0x24292b, 0.9, 0.5, 0.1
        );
      }
    }

    car.speed = THREE.MathUtils.clamp(car.speed, -maxSpeed * 0.45, maxSpeed);
    car.steer = steer;
    const direction = car.speed < 0 ? -1 : 1;
    car.angle += steer * direction * (0.9 + Math.abs(car.speed) * 0.022) * dt;

    const headingX = Math.sin(car.angle);
    const headingZ = Math.cos(car.angle);
    const nextX = car.mesh.position.x + headingX * car.speed * dt;
    const nextZ = car.mesh.position.z + headingZ * car.speed * dt;
    const impact = Math.abs(car.speed);

    if (Math.abs(nextX) > LIMIT + 35 || Math.abs(nextZ) > LIMIT + 35) {
      car.speed = 0;
    } else if (hitsBuilding(this.city, nextX, nextZ, 2.3)) {
      this.crash(car, impact);
    } else {
      car.mesh.position.x = nextX;
      car.mesh.position.z = nextZ;
    }

    car.hitCooldown = Math.max(0, car.hitCooldown - dt);
    if (car.hitCooldown <= 0 && impact > 5) {
      for (const other of this.game.police.policeCars) {
        const distance = Math.hypot(
          other.mesh.position.x - car.mesh.position.x,
          other.mesh.position.z - car.mesh.position.z
        );
        if (distance < 4.4) {
          car.hitCooldown = 1.2;
          this.addCrime(1);
          this.damage(7);
          this.game.audio.crash();
          this.shake = 0.7;
          break;
        }
      }
    }

    if (impact > 5) {
      const victim = this.game.traffic.nearestPed(car.mesh.position, 3);
      if (victim) {
        this.game.traffic.knockDown(victim);
        this.addCrime(1);
        this.game.hud.toast('PEDESTRIAN HIT · WANTED +1');
      }
    }

    this.stepTimer += dt;
    if (Math.abs(car.speed) > 3 && this.stepTimer > 0.13) {
      this.stepTimer = 0;
      this.spawnParticle(
        car.mesh.position.x - headingX * 2.2,
        0.7,
        car.mesh.position.z - headingZ * 2.2,
        0xaeb8b8, 0.6, 0.25, 1.2
      );
    }
    syncCarVisual(car, dt);
  }

  crash(car, impact) {
    car.speed = -Math.min(5, impact * 0.16);
    const hurt = Math.min(24, 4 + impact * 0.42);
    this.damage(hurt);
    this.game.audio.crash();
    this.shake = Math.min(1.2, 0.35 + impact * 0.03);
    for (let index = 0; index < 5; index++) {
      this.spawnParticle(
        car.mesh.position.x + (Math.random() - 0.5) * 2,
        1 + Math.random(),
        car.mesh.position.z + (Math.random() - 0.5) * 2,
        index % 2 ? 0xffd27d : 0x9aa4a2, 0.5, 0.35, 1.6
      );
    }
  }

  spawnParticle(x, y, z, color, life = 0.6, size = 0.3, rise = 1) {
    if (this.particles.length > 80) {
      const old = this.particles.shift();
      this.scene.remove(old.mesh);
    }
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 6, 5),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.particles.push({ mesh, life, maxLife: life, rise });
  }

  updateParticles(dt) {
    for (let index = this.particles.length - 1; index >= 0; index--) {
      const particle = this.particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        this.particles.splice(index, 1);
        continue;
      }
      const ratio = particle.life / particle.maxLife;
      particle.mesh.material.opacity = ratio * 0.7;
      particle.mesh.position.y += particle.rise * dt;
      particle.mesh.scale.setScalar(1 + (1 - ratio) * 1.5);
    }
  }

  abilityInfo = [
    { name: 'NITRO', person: 'REX', icon: '»' },
    { name: 'LOOKOUT', person: 'MARA', icon: '◉' },
    { name: 'FIXER', person: 'OTIS', icon: '+' }
  ];

  tryEnterCar() {
    const car = this.game.traffic.nearestCar(this.mesh.position, 4.5, true);
    if (!car) {
      this.game.hud.toast('NO CAR NEARBY');
      return;
    }
    this.enterCar(car, !car.own);
  }

  enterCar(car, stolen = false) {
    if (this.car) return;
    this.car = car;
    car.speed = 0;
    car.parked = false;
    car.hitCooldown = 0;
    this.mesh.visible = false;
    this.game.audio.click();
    if (stolen) {
      this.addCrime(1);
      this.game.hud.toast('CAR STOLEN · WANTED +1');
    } else {
      this.game.hud.toast('CREW RIDE · NO HEAT');
    }
  }

  exitCar() {
    const car = this.car;
    if (!car) return;
    const sideX = Math.cos(car.angle) * 3.6;
    const sideZ = -Math.sin(car.angle) * 3.6;
    const x = car.mesh.position.x + sideX;
    const z = car.mesh.position.z + sideZ;
    if (!hitsBuilding(this.city, x, z, 1)) {
      this.mesh.position.set(x, 0, z);
    } else {
      this.mesh.position.set(car.mesh.position.x, 0, car.mesh.position.z + 3.8);
    }
    this.mesh.visible = true;
    car.speed = 0;
    car.parked = true;
    this.car = null;
    this.game.audio.click();
  }

  punch() {
    if (this.punchTime > 0 || this.car) return;
    this.punchTime = 0.4;
    this.arms[1].rotation.x = -1.5;
    this.game.audio.punch();
    const victim = this.game.traffic.nearestPed(this.mesh.position, 3.6);
    if (victim) {
      this.game.traffic.knockDown(victim);
      this.addCrime(1);
      this.game.hud.toast('PUNCH · WANTED +1');
    }
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.damageFlash = 1;
    if (this.health <= 0 && this.game.onBusted) this.game.onBusted();
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  addCrime(amount) {
    if (this.game.police) this.game.police.addWanted(amount);
  }

  updateAbilities(dt) {
    const durations = [20, 30, 45];
    for (let index = 0; index < 3; index++) {
      this.cooldowns[index] = Math.max(0, this.cooldowns[index] - dt);
    }
    if (this.input.consume('Digit1')) this.useAbility(0, durations);
    if (this.input.consume('Digit2')) this.useAbility(1, durations);
    if (this.input.consume('Digit3')) this.useAbility(2, durations);
  }

  useAbility(index, durations = [20, 30, 45]) {
    if (this.cooldowns[index] > 0) {
      this.game.hud.toast(`${this.abilityInfo[index].name} READY IN ${Math.ceil(this.cooldowns[index])}S`);
      return;
    }
    this.cooldowns[index] = durations[index];
    this.game.audio.ability();
    if (index === 0) {
      this.boostTime = 5;
      this.game.hud.toast('NITRO · REX BOOST');
    } else if (index === 1) {
      this.lookoutTime = 15;
      this.game.hud.toast('LOOKOUT · POLICE TRACKED');
    } else {
      if (this.car) this.car.hp = 100;
      this.heal(25);
      this.game.hud.toast('FIXER · REPAIRED +25 HP');
    }
  }

  reset(position) {
    if (this.car) this.exitCar();
    this.health = 100;
    this.boostTime = 0;
    this.lookoutTime = 0;
    this.cooldowns = [0, 0, 0];
    this.mesh.position.copy(position);
    this.mesh.visible = true;
  }
}
