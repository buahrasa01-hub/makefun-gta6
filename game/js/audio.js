export class AudioFX {
  constructor(){this.ctx=null;this.master=null;this.engine=null;this.engineGain=null;this.siren=null;this.sirenGain=null;this.sirenTimer=0;this.enabled=true}
  start(){if(!this.enabled)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;if(!this.ctx){this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.22;this.master.connect(this.ctx.destination);this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineGain).connect(this.master);this.engine.start()}if(this.ctx.state==='suspended')this.ctx.resume()}
  tone(freq=440,duration=.12,type='sine',vol=.2){if(!this.ctx)this.start();if(!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration)}
  update(speed=0,chased=false){if(!this.ctx)return;const t=this.ctx.currentTime;this.engine.frequency.setTargetAtTime(55+Math.abs(speed)*2.8,t,.08);this.engineGain.gain.setTargetAtTime(Math.min(.12,Math.abs(speed)*.0018),t,.12);if(chased){this.sirenTimer+=.016;if(this.sirenTimer>.32){this.sirenTimer=0;this.tone(620,.27,'sawtooth',.055);setTimeout(()=>this.tone(470,.27,'sawtooth',.055),260)}}else this.sirenTimer=0}
  pickup(){this.tone(600,.08,'sine',.16);setTimeout(()=>this.tone(880,.18,'sine',.13),90)}
  crash(){this.tone(95,.3,'triangle',.22);this.tone(52,.24,'sawtooth',.11)}
  punch(){this.tone(120,.1,'square',.16);this.tone(250,.08,'triangle',.1)}
  click(){this.tone(480,.045,'sine',.07)}
  mission(){[523,659,784,1047].forEach((n,i)=>setTimeout(()=>this.tone(n,.25,'triangle',.13),i*110))}
  stop(){if(this.engineGain&&this.ctx)this.engineGain.gain.setTargetAtTime(0,this.ctx.currentTime,.1)}
  setEnabled(value){this.enabled=!!value;if(this.enabled)this.start();else this.stop()}
}
