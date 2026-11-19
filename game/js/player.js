import * as THREE from 'three';
import {cars,people,makeCar} from './traffic.js';
import {down,takeMouse} from './input.js';
import {crash,punch as punchSound} from './audio.js';
export function createPlayer(scene){const g=new THREE.Group(),coat=new THREE.MeshStandardMaterial({color:'#e8aa69'}),skin=new THREE.MeshStandardMaterial({color:'#9c684e'});let body=new THREE.Mesh(new THREE.CylinderGeometry(.32,.4,1.15,10),coat);body.position.y=.85;g.add(body);let head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),skin);head.position.y=1.62;g.add(head);scene.add(g);
 const p={group:g,position:g.position,yaw:0,health:100,car:null,cash:0,camYaw:0,camPitch:.28,damageFlash:0,missionCar:null};
 for(let i=0;i<5;i++){const c=makeCar(scene,new THREE.Vector3(-30+i*8,0,30),'#cf5447');c.speed=0;c.yaw=0;c.group.rotation.y=0;if(i===0)p.missionCar=c}return p}
export function playerCrime(p,crime){p.onCrime?.(crime)}
export function punchNearby(p,onCrime){let target=null,best=2.8;for(const person of people){if(person.down>0)continue;let d=person.pos.distanceTo(p.position);if(d<best){best=d;target=person}}if(target){target.down=4;target.dir=p.yaw;punchSound();onCrime('assault');return true}return false}
function nearCar(p){let found=null,dist=4.5;for(const c of cars){if(c.player)continue;let d=c.pos.distanceTo(p.position);if(d<dist){found=c;dist=d}}return found}
export function enterOrExit(p,onCrime){if(p.car){p.car.player=false;p.car=null;p.group.visible=true;return}const c=nearCar(p);if(!c)return;p.car=c;c.player=true;p.group.visible=false;if(c!==p.missionCar&&!c.stolen){c.stolen=true;onCrime('vehicle theft')}}
export function damage(p,amount){p.health=Math.max(0,p.health-amount);p.damageFlash=.3}
export function updatePlayer(p,dt,onCrime){const [mx,my]=takeMouse();p.camYaw-=mx*.004;p.camPitch=THREE.MathUtils.clamp(p.camPitch+my*.003,-.15,.85);
 if(p.car){const c=p.car,steer=(down('KeyA','ArrowLeft')?1:0)-(down('KeyD','ArrowRight')?1:0),gas=(down('KeyW','ArrowUp')?1:0)-(down('KeyS','ArrowDown')?1:0);
  c.speed+=gas*(down('Space')?17:10)*dt;c.speed*=Math.pow(down('Space')?.88:.985,dt*60);c.speed=THREE.MathUtils.clamp(c.speed,-9,24);c.yaw+=steer*dt*(.7+Math.abs(c.speed)*.055)*Math.sign(c.speed||1);
  let nx=c.pos.x+Math.sin(c.yaw)*c.speed*dt,nz=c.pos.z+Math.cos(c.yaw)*c.speed*dt;
  // Buildings are solid; reject a move into a facade.
const hit=nx < -105 || nx > 105 || nz < -105 || nz > 105 || (Math.abs(nx % 20) > 4.5 && Math.abs(nz % 20) > 4.5);
  if(hit){if(Math.abs(c.speed)>7){damage(p,Math.min(7,Math.abs(c.speed)*.2));crash()}c.speed=0}else{c.pos.x=nx;c.pos.z=nz}
  c.group.rotation.y=c.yaw;for(const w of c.wheels)w.rotation.x-=c.speed*dt*1.6;p.position.copy(c.pos);p.yaw=c.yaw;
 }else{let f=(down('KeyW','ArrowUp')?1:0)-(down('KeyS','ArrowDown')?1:0),s=(down('KeyD','ArrowRight')?1:0)-(down('KeyA','ArrowLeft')?1:0);let run=down('ShiftLeft','ShiftRight'),spd=run?8:4.5;let fx=Math.sin(p.camYaw),fz=Math.cos(p.camYaw),rx=Math.cos(p.camYaw),rz=-Math.sin(p.camYaw);let vx=(fx*f+rx*s),vz=(fz*f+rz*s),len=Math.hypot(vx,vz);if(len){p.position.x+=vx/len*spd*dt;p.position.z+=vz/len*spd*dt;p.yaw=Math.atan2(vx,vz);p.group.rotation.y=p.yaw}p.position.x=THREE.MathUtils.clamp(p.position.x,-105,105);p.position.z=THREE.MathUtils.clamp(p.position.z,-105,105)}
 p.damageFlash=Math.max(0,p.damageFlash-dt)}
