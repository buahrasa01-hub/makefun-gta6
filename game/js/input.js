export class Input {
  constructor(el){this.keys=Object.create(null);this.drag=false;this.dx=0;this.dy=0;this.punch=false;this.el=el;this.bind()}
  bind(){window.addEventListener('keydown',e=>{this.keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});window.addEventListener('keyup',e=>{this.keys[e.code]=false});this.el.addEventListener('pointerdown',e=>{if(e.button===0){this.drag=true;this.punch=true;this.x=e.clientX;this.y=e.clientY;this.el.setPointerCapture(e.pointerId)}});this.el.addEventListener('pointermove',e=>{if(!this.drag)return;this.dx+=(e.clientX-this.x);this.dy+=(e.clientY-this.y);this.x=e.clientX;this.y=e.clientY});this.el.addEventListener('pointerup',()=>this.drag=false);window.addEventListener('blur',()=>{this.keys=Object.create(null);this.drag=false})}
  down(code){return !!this.keys[code]}
  axis(positive,negative){return (this.down(positive)?1:0)-(this.down(negative)?1:0)}
  consumePunch(){const p=this.punch;this.punch=false;return p}
  clear(){this.keys=Object.create(null);this.punch=false}
  takeLook(){const v={x:this.dx,y:this.dy};this.dx=this.dy=0;return v}
}
