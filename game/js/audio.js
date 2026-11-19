let ctx, engineOsc, engineGain, sirenOsc, sirenGain;
function audio(){if(!ctx){ctx=new AudioContext();engineOsc=ctx.createOscillator();engineGain=ctx.createGain();engineOsc.type='sawtooth';engineGain.gain.value=0;engineOsc.connect(engineGain).connect(ctx.destination);engineOsc.start();sirenOsc=ctx.createOscillator();sirenGain=ctx.createGain();sirenOsc.type='square';sirenGain.gain.value=0;sirenOsc.connect(sirenGain).connect(ctx.destination);sirenOsc.start()}if(ctx.state==='suspended')ctx.resume();return ctx}
export function engine(speed=0){const c=audio();engineOsc.frequency.setTargetAtTime(48+Math.abs(speed)*3,c.currentTime,.08);engineGain.gain.setTargetAtTime(speed?0.018:0,c.currentTime,.15)}
export function siren(on){const c=audio();sirenGain.gain.setTargetAtTime(on?.018:0,c.currentTime,.12);sirenOsc.frequency.setTargetAtTime(650+Math.sin(performance.now()/180)*300,c.currentTime,.08)}
export function tone(freq,dur=.12,type='sine',vol=.06){const c=audio(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)}
export const pickup=()=>{tone(660,.12);setTimeout(()=>tone(880,.18),90)};
export const crash=()=>tone(75,.28,'sawtooth',.12);
export const punch=()=>tone(105,.1,'triangle',.1);
export const click=()=>tone(420,.06,'sine',.035);
export function jingle(){[523,659,784,1046].forEach((n,i)=>setTimeout(()=>tone(n,.22),i*100))}
document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else ctx.resume()});
