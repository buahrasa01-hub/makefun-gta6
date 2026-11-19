import * as THREE from 'three';
export const sceneData={markers:[],buildings:[]};
const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.86});
const asphalt=mat('#424c4b'),side=mat('#c4bba3'),sand=mat('#dfb77d'),green=mat('#4b7554');
const roadPaint=mat("#d8c9a2");
const rand=(a,b)=>a+Math.random()*(b-a);
export function isRoad(x,z){return Math.abs((x+100)%20)<4||Math.abs((z+100)%20)<4}
export function randomRoadPoint(){const vertical=Math.random()<.5, lane=Math.floor(rand(-4,5))*20;return new THREE.Vector3(vertical?lane+rand(-2,2):rand(-92,92),0,vertical?rand(-92,92):lane+rand(-2,2))}
function box(parent,x,y,z,w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cylinder(parent,x,y,z,r,h,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r*.8,r,h,8),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
export function makeMarker(pos,color='#ffd16f'){const g=new THREE.Group();g.position.copy(pos);const ring=new THREE.Mesh(new THREE.TorusGeometry(2,.13,8,32),new THREE.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.y=.15;g.add(ring);const beam=new THREE.Mesh(new THREE.CylinderGeometry(.08,.6,5,12,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,side:THREE.DoubleSide}));beam.position.y=2.5;g.add(beam);sceneData.markers.push(g);return g}
export function buildCity(scene){
 const ground=box(scene,0,-.6,0,220,1,220,mat('#91a887'));ground.receiveShadow=true;
 for(let n=-5;n<=5;n++){box(scene,n*20,.01,0,8,.08,210,asphalt);box(scene,0,.01,n*20,210,.08,8,asphalt);
  for(let p=-95;p<100;p+=8){box(scene,n*20-3,.07,p,.12,.025,3,roadPaint);box(scene,p,.07,n*20+3,3,.025,.12,roadPaint)}}
 // sidewalks follow the block edges
 for(let n=-5;n<=5;n++){box(scene,n*20+6,.1,0,3,.2,210,side);box(scene,n*20-6,.1,0,3,.2,210,side);box(scene,0,.1,n*20+6,210,.2,3,side);box(scene,0,.1,n*20-6,210,.2,3,side)}
 const palette=['#d98c61','#d4b985','#839b91','#c87561','#e1c18b','#8eaaa0','#e1a766'];
 for(let gx=-4;gx<=4;gx++)for(let gz=-4;gz<=4;gz++){if(Math.random()<.1)continue;let x=gx*20+rand(-3,3),z=gz*20+rand(-3,3),w=rand(7,11),d=rand(7,11),h=rand(5,22);let b=box(scene,x,h/2+.2,z,w,h,d,mat(palette[Math.floor(Math.random()*palette.length)]));sceneData.buildings.push(b);box(scene,x,h+.3,z,w*.8,.25,d*.8,mat('#e1c590'));if(Math.random()<.55)box(scene,x+1,h+.9,z+1,1,1.3,1,mat('#87918a'));if(Math.random()<.35)cylinder(scene,x-2,h+.45,z-2,.28,.9,green)}
 const pole=mat('#45524c'),leaf=mat('#397451'),trunk=mat('#986744'),line=mat('#ead8a9');
 // Lamps and palms spaced along the promenades.
 for(let p=-90;p<=90;p+=30){for(const q of [-7,7]){let l=cylinder(scene,q,2.2,p,.12,4.2,pole);l.position.y=2.2;box(scene,q,4.2,p,.65,.12,.24,mat('#f3cc79'));}
  let x=104,z=p; cylinder(scene,x,3,z,.45,6,trunk);for(let k=0;k<5;k++){let a=k*Math.PI*2/5;let f=new THREE.Mesh(new THREE.ConeGeometry(.48,5,5),leaf);f.position.set(x+Math.cos(a)*1.4,6.1,z+Math.sin(a)*1.4);f.rotation.z=-Math.cos(a)*.35;f.rotation.x=Math.sin(a)*.35;scene.add(f)}}
 // Coastal strip and harbor piers occupy the east edge.
 box(scene,112,-.05,0,22,.3,220,sand);box(scene,124,-.1,0,18,.3,220,mat('#397d83'));
 for(let z of [-52,-24,8,40,72]){box(scene,106,.15,z,22,.3,7,mat('#805f4a'));for(let x of [98,114])for(let dz of [-2.8,2.8])cylinder(scene,x,-.8,z+dz,.18,2.2,trunk);}
 // A little waterfront warehouse and stacked cargo.
 box(scene,83,4,49,15,8,13,mat('#c9825b'));box(scene,83,8.2,49,15,.35,13,mat('#526259'));
 for(let i=0;i<7;i++){let c=mat(['#bd6652','#e0a14e','#507d7a'][i%3]);box(scene,94+(i%2)*3,.9+Math.floor(i/2)*1.7,42+Math.floor(i/2)*2.4,2.7,1.6,2.2,c)}
 // Roadside parked cars are supplied by traffic; decorative crosswalks.
 for(let n=-4;n<=4;n++)for(let z of [-4,4])for(let k=-2;k<=2;k++)box(scene,n*20+k*.7,.08,z+n*20,.36,.03,1.7,line);
 const sun=new THREE.Mesh(new THREE.SphereGeometry(3,16,12),new THREE.MeshBasicMaterial({color:'#ffdf9d'}));sun.position.set(-70,70,-100);scene.add(sun);
 const dock=new THREE.Vector3(100,0,49),garage=new THREE.Vector3(-40,0,-40),mint=new THREE.Vector3(-60,0,60),harbor=new THREE.Vector3(95,0,-45);
 return {dock,garage,mint,harbor};
}
