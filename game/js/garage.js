import { makeCar, LOCATIONS } from './city.js';

const CAR_NAMES = [
  'Sunset Coupe', 'Harbor Sedan', 'Cobalt Hatch', 'Cream Cruiser',
  'Palm Runner', 'Dune Wagon', 'Coral GT', 'Slate Compact',
  'Marigold Taxi', 'Mint Rally', 'Azure Pickup', 'Vesper Van'
];

export class Garage {
  constructor(game) {
    this.game = game;
    this.cars = [];
    this.selected = 0;
    this.open = false;
    this.deliveryCooldown = 0;
    this.element = document.getElementById('garage-screen');
  }

  load(entries) {
    if (!Array.isArray(entries)) return;
    this.cars = entries.filter((entry) => entry && typeof entry.color === 'number').slice(0, 12);
  }

  save() { return this.cars.map((entry) => ({ color: entry.color, name: entry.name })); }

  store(car) {
    if (this.cars.length >= 12) {
      this.game.hud.toast('GARAGE FULL');
      return false;
    }
    const name = CAR_NAMES[this.cars.length % CAR_NAMES.length];
    this.cars.push({ color: car.color, name });
    this.selected = this.cars.length - 1;
    this.game.audio.pickup();
    this.game.hud.toast(`${name.toUpperCase()} STORED IN GARAGE`);
    this.game.save();
    return true;
  }

  update(dt) {
    this.deliveryCooldown = Math.max(0, this.deliveryCooldown - dt);
    if (this.open || this.game.missions.index < 3) return;
    const player = this.game.player;
    if (!player.car || player.car.kind === 'police' || this.deliveryCooldown > 0) return;
    const distance = Math.hypot(
      player.position.x - LOCATIONS.garage.x,
      player.position.z - LOCATIONS.garage.z
    );
    if (distance < 8) {
      const car = player.car;
      if (this.store(car)) {
        player.exitCar();
        this.game.traffic.removeCar(car);
        this.deliveryCooldown = 4;
      }
    }
  }

  nearby() {
    const position = this.game.player.position;
    return Math.hypot(
      position.x - LOCATIONS.garage.x,
      position.z - LOCATIONS.garage.z
    ) < 8;
  }

  openPicker() {
    if (this.open) return;
    this.open = true;
    this.selected = Math.min(this.selected, Math.max(0, this.cars.length - 1));
    this.game.state = 'garage';
    this.render();
    this.element.classList.remove('hidden');
    this.game.audio.click();
    this.game.hud.dim(true);
  }

  closePicker() {
    if (!this.open) return;
    this.open = false;
    this.element.classList.add('hidden');
    this.game.state = 'play';
    this.game.hud.dim(false);
    this.game.audio.click();
  }

  moveSelection(delta) {
    if (!this.cars.length) return;
    this.selected = (this.selected + delta + this.cars.length) % this.cars.length;
    this.render();
    this.game.audio.click();
  }

  takeOut() {
    if (!this.cars.length) {
      this.game.hud.toast('NO CARS IN THE GARAGE');
      return;
    }
    const entry = this.cars.splice(this.selected, 1)[0];
    const car = makeCar(entry.color, 'normal');
    car.own = true;
    car.mesh.position.set(LOCATIONS.garage.x, 0, LOCATIONS.garage.z + 14);
    car.angle = Math.PI;
    this.game.scene.add(car.mesh);
    this.game.traffic.cars.push(car);
    this.closePicker();
    this.game.player.enterCar(car, false);
    this.game.hud.toast(`${entry.name.toUpperCase()} DEPLOYED`);
    this.game.save();
  }

  handleKey(code) {
    if (!this.open) return false;
    if (code === 'ArrowUp' || code === 'ArrowLeft' || code === 'KeyW') {
      this.moveSelection(-1);
    } else if (code === 'ArrowDown' || code === 'ArrowRight' || code === 'KeyS') {
      this.moveSelection(1);
    } else if (code === 'Enter' || code === 'Space') {
      this.takeOut();
    } else if (code === 'Escape' || code === 'KeyG') {
      this.closePicker();
    }
    return true;
  }

  render() {
    const rows = this.cars.length
      ? this.cars.map((entry, index) => {
        const chosen = index === this.selected ? ' selected' : '';
        const swatch = `#${entry.color.toString(16).padStart(6, '0')}`;
        return `<li class="${chosen.trim()}"><span style="color:${swatch}">●</span> ${entry.name}</li>`;
      }).join('')
      : '<li class="empty">No cars stored yet.</li>';
    this.element.innerHTML = `
      <div class="panel">
        <div class="eyebrow">HARBOR CREW / VEHICLE STORAGE</div>
        <h2>Garage</h2>
        <p>Pick a ride and head back out onto the streets of Solhaven.</p>
        <ul class="garage-list">${rows}</ul>
        <div class="hint">↑ / ↓ SELECT · ENTER TAKE OUT · ESC / G CLOSE</div>
      </div>`;
  }
}
