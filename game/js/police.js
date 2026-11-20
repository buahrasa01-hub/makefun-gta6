import * as THREE from 'three';
import {makeCar} from './traffic.js';
export class Police {
  constructor(scene,city,traffic,player,audio){this.scene=scene;this.city=city;this.traffic=traffic;this.player=player;this.audio=audio;this.level=0;this.units=[];this.sinceCrime=0;this.hitCooldown=0}
  setLevel(n){this.level=THREE.MathUtils.clamp(Math.floor(n),0,5);this.sync()}
  raise(reason='crime',amount=1){this.level=THREE.MathUtils.clamp(this.level+amount,0,5);this.sinceCrime=0;this.lastCrime=reason;this.sync()}
  sync(){const count=this.level?Math.min(4,1+this.level):0;while(this.units.length<count){const p=this.city.randomRoadPoint(),c=makeCar(this.scene,p,'#f1f1ec',true);c.speed=0;c.heading=0;this.units.push({...c,mesh:c.mesh,position:c.position,ram:0})}while(this.units.length>count){const u=this.units.pop();this.scene.remove(u.mesh)}}
  update(dt){if(this.level<=0)return;this.sinceCrime+=dt;this.hitCooldown=Math.max(0,this.hitCooldown-dt);const target=this.player.point;
    for(let i=0;i<this.units.length;i++){const u=this.units[i],dx=target.x-u.position.x,dz=target.z-u.position.z,d=Math.hypot(dx,dz)||1;u.heading=Math.atan2(dx,-dz);u.mesh.rotation.y=u.heading;u.speed=Math.min(12,3+this.level*1.3);if(d>3){u.position.x+=dx/d*u.speed*dt;u.position.z+=dz/d*u.speed*dt}for(const w of u.wheels)w.rotation.x-=u.speed*dt;
      if(d<3.2){u.ram+=dt;if(u.ram>.8){u.ram=0;this.player.damage(this.player.car?5:3);this.audio?.crash()}}if(this.player.car&&d<2.4&&Math.abs(this.player.speed)>6&&this.hitCooldown===0){this.hitCooldown=2;this.raise('rammed police',1)}}
    const nearby=this.units.some(u=>Math.hypot(u.position.x-target.x,u.position.z-target.z)<40);if(this.sinceCrime>15&&!nearby){this.setLevel(this.level-1);this.sinceCrime=0}
  }
  destroy(){for(const p of this.units)this.scene.remove(p.mesh);this.units=[];this.level=0}
}
