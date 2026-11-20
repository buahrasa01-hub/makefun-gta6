import * as THREE from 'three';
import {makeCar} from './traffic.js';
const names=['First Delivery','Lose Them','Borrowed Wheels','Hot Run','The Big Score'],rewards=[200,300,400,600,900];
export class Missions {
  constructor(scene,city,traffic,player,police,audio){this.scene=scene;this.city=city;this.traffic=traffic;this.player=player;this.police=police;this.audio=audio;this.index=0;this.step=0;this.time=0;this.done=false;this.onComplete=()=>{};this.onFail=()=>{};this.onStory=()=>{};this.marker=null;this.missionCar=null;this.begin()}
  begin(){this.step=0;this.done=false;this.time=this.index===3?90:0;this.setMarker(this.target());if(this.index===1)this.police.setLevel(2);if(this.index===3)this.police.setLevel(3);if(this.index===4)this.police.setLevel(4)}
  target(){if(this.index===0)return this.city.markers.docks.position;if(this.index===1)return this.player.point;if(this.index===2)return this.step===0?(this.missionCar?.position||new THREE.Vector3(65,0,35)):this.city.markers.garage.position;if(this.index===3)return this.city.markers.harbor.position;if(this.index===4)return this.step===0?this.city.markers.mint.position:this.city.markers.harbor.position;return null}
  setMarker(pos){for(const g of Object.values(this.city.markers))g.visible=false;if(this.index===2&&this.step===0&&this.missionCar){this.marker=this.missionCar.position;return}this.marker=pos;if(pos){const nearest=Object.values(this.city.markers).find(g=>g.position===pos||g.position.distanceTo(pos)<.1);if(nearest)nearest.visible=true}}
  title(){return names[this.index]||'Story Complete'}
  get active(){return !this.done&&this.index<names.length}
  objective(){if(this.index===0)return 'Meet the Harbor Crew and collect the package';if(this.index===1)return this.police.level?'Lose the cops and wait for your wanted level to clear':'The coast is clear';if(this.index===2)return this.step===0?'Steal the marked red car':'Deliver the car to the Garage';if(this.index===3)return 'Make the timed delivery at the Harbor';if(this.index===4)return this.step===0?'Pick up the crew’s goods at the Mint':'Deliver the goods to the Harbor';return 'Solhaven is yours'}
  distance(){return this.marker?this.player.point.distanceTo(this.marker):0}
  update(dt){if(this.done)return;if(this.index===2&&this.step===0&&!this.missionCar){this.missionCar=makeCar(this.scene,new THREE.Vector3(40,0,50),'#d83235');this.missionCar.parked=true;this.missionCar.missionCar=true;this.traffic.cars.push(this.missionCar);this.carPing=new THREE.Mesh(new THREE.TorusGeometry(2,.16,8,24),new THREE.MeshBasicMaterial({color:'#ffdb6b'}));this.carPing.rotation.x=Math.PI/2;this.scene.add(this.carPing);this.setMarker(this.missionCar.position)}
    if(this.index===3){this.time-=dt;if(this.time<=0){this.time=0;this.done=true;this.onFail();return}}
    const d=this.distance();if(this.index===0&&d<4){this.audio?.pickup();this.complete();return}
    if(this.index===1&&this.police.level===0){this.complete();return}
    if(this.index===2){if(this.step===0&&this.player.car===this.missionCar){this.step=1;this.setMarker(this.city.markers.garage.position)}else if(this.step===1&&this.player.car===this.missionCar&&d<7){this.complete();return}}
    if(this.index===3&&d<7){this.complete();return}
    if(this.index===4&&this.step===0&&d<5){this.step=1;this.audio?.pickup();this.setMarker(this.city.markers.harbor.position)}else if(this.index===4&&this.step===1&&d<7){this.complete();return}
    if(this.carPing&&this.missionCar){this.carPing.position.set(this.missionCar.position.x,.2,this.missionCar.position.z);this.carPing.rotation.z+=dt*.5}
  }
  complete(){if(this.done)return;this.done=true;const reward=rewards[this.index];this.player.cash+=reward;this.audio?.mission();this.onComplete({title:this.title(),reward,cash:this.player.cash,index:this.index})}
  next(){if(!this.done)return;if(this.index===4){this.onStory(this.player.cash);return}this.index++;this.done=false;this.begin()}
  retry(){if(this.index!==3)return;this.done=false;this.player.health=100;this.player.pos.set(0,0,4);this.player.cash=Math.max(0,this.player.cash);this.police.setLevel(3);this.begin()}
  timerText(){return this.index===3?Math.ceil(this.time)+'s':''}
  destroy(){if(this.carPing)this.scene.remove(this.carPing)}
}
