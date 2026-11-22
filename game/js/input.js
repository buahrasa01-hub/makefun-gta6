export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.yaw = 0.6;
    this.pitch = 0.42;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.enabled = true;

    const blocked = new Set([
      'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'
    ]);

    window.addEventListener('keydown', (event) => {
      if (blocked.has(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pressed.clear();
      this.dragging = false;
    });

    canvas.addEventListener('pointerdown', (event) => {
      if (!this.enabled || event.button !== 0) return;
      this.pressed.add('Mouse0');
      this.dragging = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastX;
      const dy = event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.yaw -= dx * 0.006;
      if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
      if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
      this.pitch = Math.max(0.12, Math.min(0.95, this.pitch + dy * 0.004));
    });

    const stopDrag = () => { this.dragging = false; };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    window.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  down(code) { return this.keys.has(code); }

  consume(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  endFrame() { this.pressed.clear(); }

  moveAxis() {
    let forward = 0;
    let sideways = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) forward += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) forward -= 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) sideways -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) sideways += 1;
    return { forward, sideways };
  }
}
