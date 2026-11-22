import * as THREE from 'three';
import {
  makeCar, syncCarVisual, randomRoadPoint, roadCoordinate,
  BLOCK, ROAD_HALF, LIMIT, box
} from './city.js';

const CAR_COLORS = [
  0xd9a24a, 0x5a9fbd, 0xb85c5c, 0xd7d9cf, 0x4f7f6a,
  0x8d6aa8, 0xc77a3d, 0x647b9e, 0xe0c15c, 0x8fa3a0
];

export class Traffic {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.city = game.city;
    this.cars = [];
    this.peds = [];
    const rand = this.city.rand;

    for (let index = 0; index < 14; index++) this.spawnDriver();
    for (let index = 0; index < 12; index++) this.spawnParked();
    for (let index = 0; index < 20; index++) this.spawnPedestrian();
  }

  spawnDriver() {
    const rand = this.city.rand;
    const point = randomRoadPoint(rand);
    const color = CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
    const car = makeCar(color, 'traffic');
    car.mesh.position.set(point.x, 0, point.z);
    car.angle = point.angle;
    car.speed = 9 + rand() * 7;
    car.parked = false;
    car.ai = { cruise: 11 + rand() * 7, turnTimer: rand() * 6 };
    this.scene.add(car.mesh);
    this.cars.push(car);
    return car;
  }

  spawnParked() {
    const rand = this.city.rand;
    const point = randomRoadPoint(rand);
    const color = CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
    const car = makeCar(color, 'parked');
    const side = rand() < 0.5 ? 1 : -1;
    if (Math.abs(Math.sin(point.angle)) > 0.5) {
      car.mesh.position.set(point.x + side * 10.5, 0, point.z);
    } else {
      car.mesh.position.set(point.x, 0, point.z + side * 10.5);
    }
    car.angle = point.angle + (side > 0 ? 0 : Math.PI);
    car.speed = 0;
    car.parked = true;
    this.scene.add(car.mesh);
    this.cars.push(car);
    return car;
  }

  spawnPedestrian() {
    const rand = this.city.rand;
    const ped = new THREE.Group();
    const shirt = [0xd8604d, 0x4b8fa0, 0xe0bd64, 0x777fc0, 0x6da173, 0x9c6b9e][
      Math.floor(rand() * 6)
    ];
    box(ped, 0.72, 1.05, 0.45, shirt, 0, 1.28, 0);
    box(ped, 0.5, 0.5, 0.5, 0xc99a72, 0, 2.03, 0);
    box(ped, 0.24, 0.85, 0.28, 0x334553, -0.22, 0.48, 0);
    box(ped, 0.24, 0.85, 0.28, 0x334553, 0.22, 0.48, 0);
    const arms = [
      box(ped, 0.2, 0.8, 0.22, shirt, -0.48, 1.3, 0),
      box(ped, 0.2, 0.8, 0.22, shirt, 0.48, 1.3, 0)
    ];
    const cell = -LIMIT + BLOCK / 2 + Math.floor(rand() * 10) * BLOCK;
    const offset = rand() < 0.5 ? -12.5 : 12.5;
    if (rand() < 0.5) {
      ped.position.set(cell + offset, 0, cell + (rand() - 0.5) * 18);
    } else {
      ped.position.set(cell + (rand() - 0.5) * 18, 0, cell + offset);
    }
    this.scene.add(ped);
    this.peds.push({
      mesh: ped,
      arms,
      angle: rand() * Math.PI * 2,
      speed: 1.3 + rand() * 0.7,
      wander: rand() * 3,
      down: 0
    });
  }

  update(dt, time) {
    const rand = this.city.rand;
    const playerCar = this.game.player ? this.game.player.car : null;

    for (const car of this.cars) {
      if (car.parked || car === playerCar) continue;
      car.hitCooldown = Math.max(0, car.hitCooldown - dt);
      car.ai.turnTimer -= dt;
      const headingX = Math.sin(car.angle);
      const headingZ = Math.cos(car.angle);
      let blocked = false;

      for (const other of this.cars) {
        if (other === car || other.parked || other === playerCar) continue;
        const dx = other.mesh.position.x - car.mesh.position.x;
        const dz = other.mesh.position.z - car.mesh.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 12 && (dx * headingX + dz * headingZ) / (distance || 1) > 0.6) {
          blocked = true;
        }
      }
      if (playerCar) {
        const dx = playerCar.mesh.position.x - car.mesh.position.x;
        const dz = playerCar.mesh.position.z - car.mesh.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 13 && (dx * headingX + dz * headingZ) / (distance || 1) > 0.6) {
          blocked = true;
        }
      }

      const target = blocked ? 1.5 : car.ai.cruise;
      car.speed += Math.max(-20 * dt, Math.min(10 * dt, target - car.speed));
      const nextX = car.mesh.position.x + headingX * car.speed * dt;
      const nextZ = car.mesh.position.z + headingZ * car.speed * dt;
      if (Math.abs(nextX) > LIMIT - 6 || Math.abs(nextZ) > LIMIT - 6) {
        car.angle += Math.PI;
        car.speed = 2;
      } else {
        car.mesh.position.x = nextX;
        car.mesh.position.z = nextZ;
      }

      if (Math.abs(headingX) > 0.5) {
        const line = roadCoordinate(car.mesh.position.z);
        car.mesh.position.z += (line - car.mesh.position.z) * Math.min(1, dt * 4);
        const crossing = roadCoordinate(car.mesh.position.x);
        if (car.ai.turnTimer <= 0 && Math.abs(car.mesh.position.x - crossing) < 2.5) {
          car.angle = headingX > 0 ? Math.PI / 2 : -Math.PI / 2;
          car.mesh.position.x = crossing;
          car.ai.turnTimer = 5 + rand() * 9;
        }
      } else {
        const line = roadCoordinate(car.mesh.position.x);
        car.mesh.position.x += (line - car.mesh.position.x) * Math.min(1, dt * 4);
        const crossing = roadCoordinate(car.mesh.position.z);
        if (car.ai.turnTimer <= 0 && Math.abs(car.mesh.position.z - crossing) < 2.5) {
          car.angle = headingZ > 0 ? Math.PI : 0;
          car.mesh.position.z = crossing;
          car.ai.turnTimer = 5 + rand() * 9;
        }
      }
      syncCarVisual(car, dt);
    }

    for (const ped of this.peds) {
      if (ped.down > 0) {
        ped.down -= dt;
        if (ped.down <= 0) ped.mesh.rotation.z = 0;
        continue;
      }

      let fleeing = false;
      if (playerCar && Math.abs(playerCar.speed) > 4) {
        const dx = ped.mesh.position.x - playerCar.mesh.position.x;
        const dz = ped.mesh.position.z - playerCar.mesh.position.z;
        if (Math.hypot(dx, dz) < 12) {
          ped.angle = Math.atan2(dx, dz);
          fleeing = true;
        }
      }

      if (!fleeing) {
        ped.wander -= dt;
        if (ped.wander <= 0) {
          ped.angle += (rand() - 0.5) * Math.PI * 1.5;
          ped.wander = 1.5 + rand() * 3;
        }
      }

      const move = (fleeing ? ped.speed * 2.4 : ped.speed) * dt;
      const alongX = Math.abs(ped.mesh.position.x - roadCoordinate(ped.mesh.position.x)) < ROAD_HALF + 4;
      const nextX = ped.mesh.position.x + Math.sin(ped.angle) * (alongX ? move : 0);
      const nextZ = ped.mesh.position.z + Math.cos(ped.angle) * (alongX ? 0 : move);
      if (Math.abs(nextX) < LIMIT - 3 && Math.abs(nextZ) < LIMIT - 3) {
        ped.mesh.position.x = nextX;
        ped.mesh.position.z = nextZ;
      } else {
        ped.angle += Math.PI;
      }
      ped.mesh.rotation.y = ped.angle;
      const swing = Math.sin(time * (fleeing ? 14 : 7) + ped.angle) * 0.45;
      ped.arms[0].rotation.x = swing;
      ped.arms[1].rotation.x = -swing;
    }
  }

  nearestCar(position, radius, includePolice = false) {
    let best = null;
    let bestDistance = radius;
    for (const car of this.cars) {
      if (!includePolice && car.kind === 'police') continue;
      const distance = Math.hypot(
        car.mesh.position.x - position.x,
        car.mesh.position.z - position.z
      );
      if (distance < bestDistance) {
        best = car;
        bestDistance = distance;
      }
    }
    return best;
  }

  nearestPed(position, radius) {
    let best = null;
    let bestDistance = radius;
    for (const ped of this.peds) {
      if (ped.down > 0) continue;
      const distance = Math.hypot(
        ped.mesh.position.x - position.x,
        ped.mesh.position.z - position.z
      );
      if (distance < bestDistance) {
        best = ped;
        bestDistance = distance;
      }
    }
    return best;
  }

  knockDown(ped) {
    ped.down = 7;
    ped.mesh.rotation.z = Math.PI / 2;
  }

  removeCar(car) {
    const index = this.cars.indexOf(car);
    if (index >= 0) this.cars.splice(index, 1);
    this.scene.remove(car.mesh);
  }
}
