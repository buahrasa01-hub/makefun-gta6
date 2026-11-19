import * as THREE from 'three';
import {cars,makeCar} from './traffic.js';
import {siren,crash} from './audio.js';
import {damage} from './player.js';
export const police=[];
export const wanted={level:0,cooldown:0};
export function addCrime(reason='crime',amount=1){wanted.level=Math.min(5,wanted.level+amount);wanted.cooldown=15;return reason}
export function resetWanted(){wanted.level=0;wanted.cooldown=0;for(const c of police){c.group.parent?.remove(c.group);let i=cars.indexOf(c);if(i>=0)cars.splice(i,1)}police.length=0;siren(false)}
export function updatePolice(scene,dt,p){
 wanted.cooldown=Math.max(0,wanted.cooldown-dt);const target= p.car?p.car.pos:p.position;
 while(police.length<Math.min(wanted.level+1,4)){let pos=target.clone().add(new THREE.Vector3(12+Math.random()*10,0,12+Math.random()*8));let c=makeCar(scene,pos,'#263e55',true);c.player=true;c.police=true;c.speed=0;police.push(c)}
 while(police.length>wanted.level){let c=police.pop();c.group.parent?.remove(c.group);let i=cars.indexOf(c);if(i>=0)cars.splice(i,1)}
 let closest=Infinity;for(const c of police){let dx=target.x-c.pos.x,dz=target.z-c.pos.z,d=Math.hypot(dx,dz);closest=Math.min(closest,d);let desired=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(desired-c.yaw),Math.cos(desired-c.yaw));c.yaw+=THREE.MathUtils.clamp(delta,-dt*1.35,dt*1.35);c.speed=Math.min(13,c.speed+dt*5);c.pos.x+=Math.sin(c.yaw)*c.speed*dt;c.pos.z+=Math.cos(c.yaw)*c.speed*dt;c.group.rotation.y=c.yaw;
  if(d<3.5){if(p.car){p.car.speed*=.45;damage(p,dt*9);if(Math.random()<dt*.4)crash()}else{damage(p,dt*3);p.position.x+=(p.position.x-c.pos.x)*dt*.2;p.position.z+=(p.position.z-c.pos.z)*dt*.2}}
 }
 if(wanted.level&&wanted.cooldown<=0&&closest>40){wanted.level--;wanted.cooldown=15}if(wanted.level)siren(true);else siren(false);
}
