import * as THREE from 'three';

export const BLOCK = 40;
export const ROAD_HALF = 7.5;
export const GRID = 10;
export const LIMIT = (GRID * BLOCK) / 2;

export const LOCATIONS = {
  garage: new THREE.Vector3(20, 0, 38),
  docks: new THREE.Vector3(-130, 0, -172),
  harbor: new THREE.Vector3(80, 0, -172),
  mint: new THREE.Vector3(130, 0, 110),
  center: new THREE.Vector3(0, 0, 0),
  drop: new THREE.Vector3(-140, 0, 130)
};

const BUILDING_COLORS = [
  0xd9a276, 0xe5c393, 0xc88d70, 0xbfa78c, 0xd4b0a0,
  0xa7b8b3, 0xc9b79c, 0xe0caa8, 0xb59b82, 0xcf9f86
];

export function box(parent, width, height, depth, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function shadedBox(parent, width, height, depth, color, x, y, z) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const base = new THREE.Color(color);
  const shades = [0.86, 0.72, 1.16, 0.5, 0.95, 0.8];
  const colors = [];
  for (let face = 0; face < 6; face++) {
    for (let corner = 0; corner < 4; corner++) {
      const tone = base.clone().multiplyScalar(shades[face]);
      colors.push(tone.r, tone.g, tone.b);
    }
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ vertexColors: true })
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function makeCar(color = 0xe65348, kind = 'normal') {
  const group = new THREE.Group();
  const paint = new THREE.Color(color);
  const body = shadedBox(group, 2.2, 0.78, 4.5, paint, 0, 0.73, 0);
  const cabinColor = paint.clone().multiplyScalar(0.72);
  shadedBox(group, 1.9, 0.62, 2.25, cabinColor, 0, 1.35, -0.18);
  shadedBox(group, 1.96, 0.08, 2.3, 0x2a3d43, 0, 1.66, -0.18);

  const wheels = [];
  const frontWheels = [];
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.12, 0.42, front * 1.45);
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.24, 10),
        new THREE.MeshLambertMaterial({ color: 0x20272a })
      );
      tire.rotation.z = Math.PI / 2;
      pivot.add(tire);
      group.add(pivot);
      wheels.push(pivot);
      if (front > 0) frontWheels.push(pivot);
    }
  }

  box(group, 0.35, 0.18, 0.1, 0xffe6a8, -0.72, 0.83, 2.27);
  box(group, 0.35, 0.18, 0.1, 0xffe6a8, 0.72, 0.83, 2.27);
  box(group, 0.32, 0.14, 0.08, 0xd94d3b, -0.74, 0.82, -2.27);
  box(group, 0.32, 0.14, 0.08, 0xd94d3b, 0.74, 0.82, -2.27);

  if (kind === 'police') {
    box(group, 1.25, 0.12, 0.34, 0x2444c8, 0, 1.76, -0.15);
    box(group, 0.55, 0.22, 0.34, 0xe6373b, -0.32, 1.84, -0.15);
    box(group, 0.55, 0.22, 0.34, 0x3f6bff, 0.32, 1.84, -0.15);
  }

  return {
    mesh: group,
    body,
    wheels,
    frontWheels,
    hp: 100,
    speed: 0,
    angle: 0,
    steer: 0,
    spin: 0,
    kind,
    color,
    maxSpeed: kind === 'police' ? 34 : 28,
    parked: true,
    hitCooldown: 0,
    ai: null,
    own: false,
    radius: 2.6
  };
}

export function syncCarVisual(car, dt) {
  car.mesh.rotation.y = car.angle;
  for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 0.9;
  for (const wheel of car.frontWheels) wheel.rotation.y = car.steer * 0.42;
}

export function createCity(scene) {
  let seed = 20261122;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const city = {
    group: new THREE.Group(),
    colliders: [],
    buildings: [],
    lamps: [],
    palms: [],
    garageMarker: null,
    roadblock: null,
    rand
  };
  scene.add(city.group);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshLambertMaterial({ color: 0xcdb98c })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  city.group.add(ground);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 500),
    new THREE.MeshLambertMaterial({ color: 0x2e9bb0, transparent: true, opacity: 0.94 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.05, -LIMIT - 250);
  city.group.add(sea);

  const beach = box(city.group, 1800, 0.14, 52, 0xe8d2a0, 0, 0.02, -LIMIT - 27);
  beach.receiveShadow = true;

  for (let index = 0; index <= GRID; index++) {
    const coordinate = -LIMIT + index * BLOCK;
    box(city.group, 15.4, 0.1, LIMIT * 2 + 44, 0x454d50, coordinate, 0.01, 0);
    box(city.group, LIMIT * 2 + 44, 0.1, 15.4, 0x454d50, 0, 0.011, coordinate);
    for (let along = -LIMIT - 10; along < LIMIT + 10; along += 14) {
      box(city.group, 0.28, 0.02, 6, 0xf1dba1, coordinate, 0.075, along);
      box(city.group, 6, 0.02, 0.28, 0xf1dba1, along, 0.076, coordinate);
    }
  }

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const x = -LIMIT + BLOCK / 2 + col * BLOCK;
      const z = -LIMIT + BLOCK / 2 + row * BLOCK;
      box(city.group, 25, 0.28, 25, 0xd2c7ac, x, 0.14, z);
    }
  }

  const protectedSpots = Object.values(LOCATIONS);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const x = -LIMIT + BLOCK / 2 + col * BLOCK;
      const z = -LIMIT + BLOCK / 2 + row * BLOCK;
      if (Math.hypot(x - LOCATIONS.garage.x, z - LOCATIONS.garage.z) < 25) continue;
      if (protectedSpots.some((spot) => Math.hypot(x - spot.x, z - spot.z) < 35)) continue;
      if (rand() < 0.12) continue;

      const width = 14 + rand() * 8;
      const depth = 14 + rand() * 8;
      const centerBias = 1 - Math.min(1, Math.hypot(x, z) / 280);
      const height = 8 + rand() * 20 + centerBias * rand() * 26;
      const color = BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)];
      const building = shadedBox(city.group, width, height, depth, color, x, height / 2 + 0.28, z);
      const collider = {
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
        mesh: building
      };
      city.colliders.push(collider);
      city.buildings.push(building);

      if (rand() < 0.45) {
        const propHeight = 1 + rand() * 2.5;
        box(
          city.group,
          3 + rand() * 4,
          propHeight,
          3 + rand() * 3,
          0x9a9d96,
          x + (rand() - 0.5) * 5,
          height + 0.28 + propHeight / 2,
          z + (rand() - 0.5) * 5
        );
      }
    }
  }

  for (let index = 0; index <= GRID; index += 2) {
    const coordinate = -LIMIT + index * BLOCK;
    for (const offset of [10, -10]) {
      const x = coordinate + offset;
      const z = coordinate + offset;
      if (Math.abs(x) > LIMIT || Math.abs(z) > LIMIT) continue;
      box(city.group, 0.3, 7, 0.3, 0x5b6360, x, 3.6, z);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe6a6 })
      );
      lamp.position.set(x, 7.2, z);
      city.group.add(lamp);
      city.lamps.push(lamp);
    }
  }

  for (let x = -190; x <= 190; x += 34) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.55, 8, 7),
      new THREE.MeshLambertMaterial({ color: 0x8b6a45 })
    );
    trunk.position.y = 4;
    palm.add(trunk);
    for (let frond = 0; frond < 6; frond++) {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 5.5, 4),
        new THREE.MeshLambertMaterial({ color: frond % 2 ? 0x3f8a5b : 0x51a568 })
      );
      leaf.position.set(Math.cos(frond) * 2, 8.2, Math.sin(frond) * 2);
      leaf.rotation.z = Math.cos(frond) * 1.15;
      leaf.rotation.x = Math.sin(frond) * 1.15;
      palm.add(leaf);
    }
    palm.position.set(x, 0, -LIMIT - 12);
    city.group.add(palm);
    city.palms.push(palm);
  }

  for (const dockX of [-130, 80]) {
    box(city.group, 24, 0.6, 62, 0x9a7d59, dockX, 0.45, -LIMIT - 30);
    for (let pile = 0; pile < 5; pile++) {
      box(city.group, 0.7, 4, 0.7, 0x725c43, dockX - 10 + pile * 5, -1, -LIMIT - 56);
    }
    for (let stack = 0; stack < 3; stack++) {
      const colors = [0xc4553f, 0x3f7796, 0xd8a547];
      box(
        city.group, 5.5, 2.6, 2.6, colors[stack],
        dockX - 7 + stack * 6, 2.1 + (stack % 2) * 2.6, -LIMIT - 24
      );
    }
  }

  const garage = shadedBox(city.group, 30, 14, 24, 0x57747a, 20, 7.28, 16);
  city.buildings.push(garage);
  city.colliders.push({
    minX: 5, maxX: 35, minZ: 4, maxZ: 28, mesh: garage
  });
  box(city.group, 32, 0.5, 26, 0x3f575c, 20, 14.6, 16);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 96;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#17343a';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#f4bb62';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HARBOR CREW GARAGE', 256, 62);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 4.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
  );
  sign.position.set(20, 11, 28.25);
  city.group.add(sign);

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.2, 0.12, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2bb58, transparent: true, opacity: 0.5 })
  );
  marker.position.set(20, 0.25, 38);
  city.group.add(marker);
  city.garageMarker = marker;

  return city;
}

export function roadCoordinate(value) {
  return Math.round(value / BLOCK) * BLOCK;
}

export function isRoad(x, z) {
  return Math.abs(x - roadCoordinate(x)) <= ROAD_HALF
    || Math.abs(z - roadCoordinate(z)) <= ROAD_HALF;
}

export function roadAxis(x, z) {
  return Math.abs(x - roadCoordinate(x)) <= ROAD_HALF ? 'z' : 'x';
}

export function randomRoadPoint(rand = Math.random) {
  const alongX = rand() < 0.5;
  const line = -LIMIT + Math.floor(rand() * (GRID + 1)) * BLOCK;
  const along = (rand() - 0.5) * (LIMIT * 2 - 20);
  const sign = rand() < 0.5 ? 1 : -1;
  return alongX
    ? { x: along, z: line, angle: sign * Math.PI / 2 }
    : { x: line, z: along, angle: sign > 0 ? 0 : Math.PI };
}

export function hitsBuilding(city, x, z, radius = 1.5) {
  return city.colliders.some((wall) => (
    x > wall.minX - radius && x < wall.maxX + radius
    && z > wall.minZ - radius && z < wall.maxZ + radius
  ));
}

export function makeBarrier() {
  const group = new THREE.Group();
  box(group, 5.4, 1.1, 0.6, 0xf4c04e, 0, 0.85, 0);
  for (let stripe = -2; stripe <= 2; stripe++) {
    box(group, 0.6, 1.12, 0.64, 0x2a3438, stripe * 1.1, 0.85, 0.01);
  }
  box(group, 0.35, 1.6, 0.35, 0x59615e, -2.3, 0.8, 0);
  box(group, 0.35, 1.6, 0.35, 0x59615e, 2.3, 0.8, 0);
  return group;
}
