import * as THREE from 'three';
import {randomRoadPoint} from './city.js';
export const cars=[],people=[];
const colors=['#e16d4e','#5a9b9a','#d2b367','#738b9b','#d9d2bc','#7d6caa','#4f665a'];
const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.65});
export function makeCar(scene,pos=new THREE.Vector3(),color=colors[Math.floor(Math.random()*colors.length)],police=false){
 const g=new THREE.Group(),paint=material(police?'#263e55':color),glass=material('#8ec5c3'),rubber=material('#252a29');
 const body=new THREE.Mesh(new THREE.BoxGeometry(2.1,.8,4),paint);body.position.y=.85;body.castShadow=true;g.add(body);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.6,.75,1.9),glass);cabin.position.set(0,1.52,-.15);cabin.castShadow=true;g.add(cabin);
 const wheels=[];for(const x of [-1.08,1.08])for(const z of [-1.35,1.35]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.22,12),rubber);w.rotation.z=Math.PI/2;w.position.set(x,.43,z);g.add(w);wheels.push(w)}
 if(police){for(const x of [-.5,.5]){let l=new THREE.Mesh(new THREE.BoxGeometry(.4,.18,.35),material(x<0?'#e64a42':'#4b9ef4'));l.position.set(x,2,.1);g.add(l)}}
 g.position.copy(pos);scene.add(g);const c={group:g,pos:g.position,yaw:0,speed:0,wheels,police,player:false,stolen:false,health:100,route:Math.random()*400};cars.push(c);return c;
}
function makePerson(scene,pos){const g=new THREE.Group(),skin=material('#bd8768'),cloth=material(colors[Math.floor(Math.random()*colors.length)]);let torso=new THREE.Mesh(new THREE.CylinderGeometry(.26,.34,.9,8),cloth);torso.position.y=.85;g.add(torso);let head=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),skin);head.position.y=1.5;g.add(head);let legs=[];for(let x of [-.14,.14]){let leg=new THREE.Mesh(new THREE.BoxGeometry(.18,.65,.22),material('#4a514d'));leg.position.set(x,.32,0);g.add(leg);legs.push(leg)}g.position.copy(pos);scene.add(g);let p={group:g,pos:g.position,dir:Math.random()*6.28,speed:1+Math.random(),down:0,legs};people.push(p);return p}
export function initTraffic(scene){for(let i=0;i<14;i++){const c=makeCar(scene,randomRoadPoint());c.yaw=Math.random()<.5?0:Math.PI/2;c.group.rotation.y=c.yaw;c.speed=3+Math.random()*3}for(let i=0;i<6;i++){const parked=makeCar(scene,new THREE.Vector3(-88+i*34,0,-8),colors[(i+2)%colors.length]);parked.speed=0;parked.yaw=0;parked.group.rotation.y=0}for(let i=0;i<20;i++)makePerson(scene,new THREE.Vector3((Math.random()-.5)*170,0,(Math.random()-.5)*170))}
export function updateTraffic(dt,player,onCrime){
 for(const c of cars){if(c.player)continue;c.route+=dt;let x=c.pos.x,z=c.pos.z;
  if(Math.abs(x)>94||Math.abs(z)>94){c.yaw+=Math.PI; c.group.rotation.y=c.yaw}
  // Traffic cruises on avenue axes and occasionally turns at an intersection.
  if(c.route>18){c.route=0;if(Math.random()<.35)c.yaw+=Math.PI/2*(Math.random()<.5?-1:1);c.group.rotation.y=c.yaw}
  c.pos.x+=Math.sin(c.yaw)*c.speed*dt;c.pos.z+=Math.cos(c.yaw)*c.speed*dt;
  for(const w of c.wheels)w.rotation.x-=dt*c.speed*1.8;
 }
 for(const p of people){if(p.down>0){p.down-=dt;p.group.rotation.x=Math.min(1.3,(1-p.down)*1.5);continue}p.group.rotation.x=0;
  let threat=player.position.distanceTo(p.pos)<5;for(const c of cars)if(!c.player&&c.pos.distanceTo(p.pos)<3)threat=true;
  if(threat){p.dir=Math.atan2(p.pos.x-player.position.x,p.pos.z-player.position.z);p.speed=3.5}
  else if(Math.random()<dt*.12)p.dir+=Math.random()-.5;
  p.pos.x+=Math.sin(p.dir)*p.speed*dt;p.pos.z+=Math.cos(p.dir)*p.speed*dt;
  if(Math.abs(p.pos.x)>96||Math.abs(p.pos.z)>96)p.dir+=Math.PI;
  p.group.rotation.y=p.dir;for(const l of p.legs)l.rotation.x=Math.sin(performance.now()*.008+p.pos.x)*.45;
  const driven=player.car;if(driven&&driven.pos.distanceTo(p.pos)<1.8&&Math.abs(driven.speed)>5){p.down=4;p.speed=0;onCrime('pedestrian struck');}
 }
}
export function trafficCounts(){return {cars:cars.length,pedestrians:people.length}}
