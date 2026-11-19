import * as THREE from 'three';
import {makeMarker,sceneData} from './city.js';
import {addCrime,resetWanted} from './police.js';
import {jingle,pickup} from './audio.js';
const titles=['First Delivery','Lose Them','Borrowed Wheels','Hot Run','The Big Score'];
const rewards=[200,300,400,600,1200];
export function createMissions(scene,places,p){const m={index:0,stage:0,time:0,marker:null,target:null,places,done:false,earned:0,player:p};activate(m,scene);return m}
function activate(m,scene){m.stage=0;m.time=m.index===3?90:0;m.done=false;let target=[m.places.dock,m.places.dock,m.places.garage,m.places.mint,m.places.mint][m.index];m.target=target;if(m.marker){scene.remove(m.marker);let i=sceneData.markers.indexOf(m.marker);if(i>=0)sceneData.markers.splice(i,1)}m.marker=makeMarker(target,m.index===2?'#f06d54':'#ffd16f');
 if(m.index===1){resetWanted();addCrime('mission pursuit',2)}if(m.index===3){resetWanted();addCrime('hot run',3)}if(m.index===4){resetWanted();addCrime('big score',4)}}
export function advanceMission(m,scene){if(m.index<4){m.index++;activate(m,scene);return true}m.index=5;m.done=true;return false}
export function retryMission(m,scene){m.index=Math.min(m.index,4);activate(m,scene)}
export function currentMission(m){if(m.index>=5)return {title:'Story Complete',objective:'The Harbor Crew knows your name.',distance:0,kicker:'HARBOR CREW • ALL JOBS'};let objective=['Find the glowing drop at the Docks','Lose the cops and let your heat cool','Steal the red crew car and reach the Garage','Deliver the package before the timer runs out','Collect the goods at the Mint'][m.index];if(m.index===4&&m.stage===1)objective='Bring the goods to the Harbor';if(m.index===0&&m.stage===1)objective='Package secured — keep moving';let pos=m.target;return {title:titles[m.index],objective,distance:Math.round(m.player.position.distanceTo(pos)),kicker:`HARBOR CREW • JOB 0${m.index+1}`}}
export function updateMission(m,dt,p,scene,onComplete,onFail){if(m.index>=5||m.done)return;if(m.index===3){m.time-=dt;if(m.time<=0){m.time=0;onFail();return}}
 const near=p.position.distanceTo(m.target);if(m.index===0&&m.stage===0&&near<3){pickup();m.stage=1;m.target=new THREE.Vector3(79,0,49);m.marker.position.copy(m.target);m.marker.children[0].material.color.set('#ffd16f');}
 else if(m.index===0&&m.stage===1&&near<4)finish(m,onComplete);
 else if(m.index===1&&m.stage===0&&m.index===1){if(window.currentWanted===0)finish(m,onComplete)}
 else if(m.index===2&&p.car===p.missionCar&&near<6){pickup();finish(m,onComplete)}
 else if(m.index===3&&near<4)finish(m,onComplete);
 else if(m.index===4&&m.stage===0&&near<4){m.stage=1;m.target=m.places.harbor;m.marker.position.copy(m.target);pickup()}else if(m.index===4&&m.stage===1&&near<5)finish(m,onComplete);
}
function finish(m,cb){m.done=true;m.earned=rewards[m.index];m.player.cash+=m.earned;jingle();cb(m.index===4)}
