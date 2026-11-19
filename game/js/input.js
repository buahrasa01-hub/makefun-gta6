const keys=new Set();
export const input={keys,dx:0,dy:0,dragging:false,consume(code){if(keys.has(code)){keys.delete(code);return true}return false}};
window.addEventListener('keydown',e=>{keys.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});
window.addEventListener('keyup',e=>keys.delete(e.code));
const canvas=document.querySelector('#world');
canvas.addEventListener('pointerdown',e=>{if(e.button===0)input.dragging=true;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',()=>input.dragging=false);
canvas.addEventListener('pointercancel',()=>input.dragging=false);
canvas.addEventListener('pointermove',e=>{if(input.dragging){input.dx+=e.movementX;input.dy+=e.movementY}});
export function takeMouse(){const d=[input.dx,input.dy];input.dx=input.dy=0;return d}
export function down(...codes){return codes.some(c=>keys.has(c))}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
