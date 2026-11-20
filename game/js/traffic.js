import * as THREE from 'three';
const paint=c=>new THREE.MeshStandardMaterial({color:c,roughness:.65,metalness:.12});
export function makeCar(scene,pos,color='#d26143',police=false){
  const root=new THREE.Group();root.position.copy(pos);const body=new THREE.Mesh(new THREE.BoxGeometry(2.1,.72,4),paint(police?'#e6e8e4':color));body.position.y=.75;body.castShadow=true;root.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.62,.72,1.8),paint(police?'#304d60':'#9ec1bd'));cabin.position.set(0,1.42,-.1);cabin.castShadow=true;root.add(cabin);
  const wheels=[];for(const x of [-1.04,1.04])for(const z of [-1.28,1.28]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.23,12),paint('#20272a'));w.rotation.z=Math.PI/2;w.position.set(x,.42,z);root.add(w);wheels.push(w)}
  if(police){const bar=new THREE.Mesh(new THREE.BoxGeometry(.8,.2,.3),paint('#dc5150'));bar.position.set(0,1.82,0);root.add(bar)}
  scene.add(root);return {mesh:root,position:root.position,heading:0,speed:0,maxSpeed:police?13:8,wheels,police,parked:false,occupied:false,damage:0,color,stolen:false}
}
export class Traffic {
  constructor(scene,city){this.scene=scene;this.city=city;this.cars=[];this.peds=[];this.player=null;this.spawn()}
  spawn(){for(let i=0;i<14;i++){const axis=Math.random()<.5?'z':'x',dir=Math.random()<.5?1:-1,lane=Math.random()<.5?-1.25:1.25,n=Math.floor(Math.random()*9-4),along=Math.random()*180-90;const p=axis==='z'?new THREE.Vector3(n*20+lane,0,along):new THREE.Vector3(along,0,n*20+lane);const c=makeCar(this.scene,p,['#c9513d','#e4ba5e','#5e9c91','#54728c','#d6d3c5'][i%5]);c.axis=axis;c.dir=dir;c.lane=lane;c.heading=axis==='z'?(dir>0?Math.PI:0):(dir>0?-Math.PI/2:Math.PI/2);c.mesh.rotation.y=c.heading;c.speed=4+Math.random()*4;c.parked=i%7===0;if(c.parked)c.speed=0;c.route=i%4;this.cars.push(c)}
    for(let i=0;i<20;i++){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.82,3,6),paint(['#d0a572','#b87459','#4b6d68','#eee0c6'][i%4]));m.position.copy(this.city.sidewalkPoint());m.position.y=.85;m.castShadow=true;this.scene.add(m);this.peds.push({mesh:m,goal:this.city.sidewalkPoint(),speed:1+Math.random()*.7,down:0,hit:false})}}
  update(dt,player,onPedHit=()=>{}){
    for(const c of this.cars){if(c.parked||c.occupied)continue;let v= c.speed;
      for(const o of this.cars)if(o!==c&&Math.hypot(o.position.x-c.position.x,o.position.z-c.position.z)<5)v=Math.min(v,Math.max(0,o.speed-1));
      if(c.axis==='z'){c.position.z+=c.dir*v*dt;if(Math.abs(c.position.z)>98){c.axis='x';c.dir=Math.random()<.5?1:-1;c.position.z=Math.max(-4,Math.min(4,Math.round(c.position.z/20)))*20+c.lane;c.heading=c.dir>0?-Math.PI/2:Math.PI/2}}
      else{c.position.x+=c.dir*v*dt;if(Math.abs(c.position.x)>98){c.axis='z';c.dir=Math.random()<.5?1:-1;c.position.x=Math.max(-4,Math.min(4,Math.round(c.position.x/20)))*20+c.lane;c.heading=c.dir>0?Math.PI:0}}
      c.mesh.rotation.y=c.heading;for(const w of c.wheels)w.rotation.x-=v*dt*1.6
    }
    for(const p of this.peds){if(p.down>0){p.down-=dt;p.mesh.rotation.z=Math.min(1.3,(1-p.down)*2);continue}p.mesh.rotation.z=0;
      let flee=null;for(const c of this.cars)if(Math.hypot(c.position.x-p.mesh.position.x,c.position.z-p.mesh.position.z)<5){flee=c;break}
      let dx=p.goal.x-p.mesh.position.x,dz=p.goal.z-p.mesh.position.z;if(flee){dx=p.mesh.position.x-flee.position.x;dz=p.mesh.position.z-flee.position.z}
      const len=Math.hypot(dx,dz)||1;p.mesh.position.x+=dx/len*p.speed*dt;p.mesh.position.z+=dz/len*p.speed*dt;p.mesh.rotation.y=Math.atan2(dx,dz);
      if(!flee&&len<1.5)p.goal=this.city.sidewalkPoint();if(player&&Math.hypot(player.x-p.mesh.position.x,player.z-p.mesh.position.z)<1&&player.speed>5&&!p.hit){p.hit=true;p.down=5;onPedHit(p)}if(len>12)p.goal=this.city.sidewalkPoint();if(p.hit&&p.down<=0){p.hit=false;p.mesh.position.copy(this.city.sidewalkPoint());p.mesh.position.y=.85}
    }
  }
  nearestCar(pos,max=4){let found=null,d=max;for(const c of this.cars){const n=Math.hypot(c.position.x-pos.x,c.position.z-pos.z);if(n<d&&!c.occupied){found=c;d=n}}return found}
  destroy(){for(const c of this.cars)this.scene.remove(c.mesh);for(const p of this.peds)this.scene.remove(p.mesh)}
}
