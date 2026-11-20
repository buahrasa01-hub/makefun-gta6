import * as THREE from 'three';
export const WORLD=200, BLOCK=20;
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
export class City {
  constructor(scene){this.scene=scene;this.buildings=[];this.markers={};this.roadMat=mat('#343e40');this.facadeTexture=this.makeFacade();this.build()}
  makeFacade(){const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle='#d9c7a7';x.fillRect(0,0,128,128);for(let y=10;y<128;y+=24)for(let a=9;a<128;a+=23){x.fillStyle=(Math.random()<.18?'#b87b4c':'#52747a');x.fillRect(a,y,12,14);x.fillStyle='#eedda9';x.fillRect(a+5,y,2,14)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t}
  box(x,y,z,w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m}
  build(){
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(230,230),mat('#b6aa7e'));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;this.scene.add(ground);
    for(let i=-5;i<=5;i++){const p=i*BLOCK;this.box(p,.005,0,6,.02,220,'#303a3d');this.box(0,.006,p,220,.02,6,'#303a3d');for(const side of [-1,1]){this.box(p+side*4,.02,0,1.2,.08,220,'#c9bd97');this.box(0,.02,p+side*4,220,.08,1.2,'#c9bd97')}
      for(let j=-5;j<5;j++){const q=j*BLOCK+10;this.box(p,.035,q,.12,.025,3,'#e3d9ad');this.box(q,.035,p,3,.025,.12,'#e3d9ad')}}
    for(let x=-90;x<=90;x+=20)for(let z=-90;z<=90;z+=20){const h=7+Math.random()*24,w=8+Math.random()*3,d=8+Math.random()*3,c=['#e8b97d','#cf805d','#aeb69d','#d9d2bc','#bf9e83','#78908a'][Math.floor(Math.random()*6)];const b=this.box(x,h/2,z,w,h,d,c);b.material.map=this.facadeTexture;b.material.needsUpdate=true;this.box(x,h+.3,z,w*.92,.55,d*.92,'#6e7771');if(Math.random()<.42)this.box(x+(Math.random()-.5)*3,h+.9,z,.8,1.2,.8,'#d8ac61');this.buildings.push({x,z,w:w/2,d:d/2})}
    this.props();this.coast();this.placeMarkers()
  }
  props(){
    for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++){const x=i*20+((j%2)*7),z=j*20+7;if(Math.random()<.53)this.palm(x,z);if(Math.random()<.32)this.lamp(x+4,z+4)}
  }
  palm(x,z){this.box(x,2.4,z,.45,4.8,.45,'#80543a');for(let a=0;a<6;a++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.42,4,5),mat('#34775e'));leaf.position.set(x+Math.cos(a)*1.2,4.4,z+Math.sin(a)*1.2);leaf.rotation.z=Math.PI/2.8;leaf.rotation.y=-a*.9;this.scene.add(leaf)}}
  lamp(x,z){this.box(x,3,z,.16,6,.16,'#3d4e4f');const light=new THREE.Mesh(new THREE.SphereGeometry(.34,8,6),mat('#ffe4a1'));light.position.set(x,6,z);this.scene.add(light)}
  coast(){this.box(0,-.08,-113,230,.1,28,'#e2c486');this.box(0,-.12,-133,230,.12,18,'#459ba1');this.box(118,-.08,0,26,.1,230,'#c19a67');this.box(138,-.12,0,18,.12,230,'#347f88');for(let i=-4;i<=4;i++)this.box(111,.25,i*20,12,.5,5,'#99724e')}
  placeMarkers(){this.markers.docks=this.marker(new THREE.Vector3(104,0,-70),'#ffd16a');this.markers.garage=this.marker(new THREE.Vector3(-80,0,80),'#ff6460');this.markers.mint=this.marker(new THREE.Vector3(-80,0,-80),'#ffd16a');this.markers.harbor=this.marker(new THREE.Vector3(105,0,70),'#ffd16a')}
  marker(pos,color){const g=new THREE.Group();g.position.copy(pos);const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.18,8,32),mat(color));ring.rotation.x=Math.PI/2;ring.position.y=.16;g.add(ring);const beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,.45,3,10,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.24,depthWrite:false}));beam.position.y=1.5;g.add(beam);this.scene.add(g);return g}
  isRoad(x,z){const rx=Math.abs(x-Math.round(x/BLOCK)*BLOCK),rz=Math.abs(z-Math.round(z/BLOCK)*BLOCK);return rx<3||rz<3}
  randomRoadPoint(){const horizontal=Math.random()<.5,n=Math.floor(Math.random()*9-4),along=Math.random()*180-90,lane=Math.random()<.5?-1.25:1.25;return horizontal?new THREE.Vector3(along,0,n*BLOCK+lane):new THREE.Vector3(n*BLOCK+lane,0,along)}
  sidewalkPoint(){const horizontal=Math.random()<.5,n=Math.floor(Math.random()*9-4),along=Math.random()*180-90,side=Math.random()<.5?-4.5:4.5;return horizontal?new THREE.Vector3(along,0,n*BLOCK+side):new THREE.Vector3(n*BLOCK+side,0,along)}
  blocked(x,z,r=1){return x<-108||x>108||z<-108||z>108||this.buildings.some(b=>Math.abs(x-b.x)<b.w+r&&Math.abs(z-b.z)<b.d+r)}
  update(dt){for(const g of Object.values(this.markers)){g.rotation.y+=dt*.6;g.children[0].rotation.z+=dt*.45}}
}
