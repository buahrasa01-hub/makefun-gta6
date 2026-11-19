import * as THREE from 'three';
import {buildCity} from './city.js';
import {initTraffic,updateTraffic,cars} from './traffic.js';
import {createPlayer,updatePlayer,enterOrExit,damage} from './player.js';
import {addCrime,updatePolice,wanted,resetWanted,police} from './police.js';
import {createMissions,updateMission,advanceMission,retryMission} from './missions.js';
import {updateHud,toast} from './hud.js';
import {click,jingle} from './audio.js';
import {down} from './input.js';
const canvas=document.querySelector('#world'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e9aa79');scene.fog=new THREE.Fog('#e9aa79',105,230);const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,500);scene.add(new THREE.HemisphereLight('#ffdfb3','#586f68',2));const sun=new THREE.DirectionalLight('#fff0ce',3);sun.position.set(-45,80,-40);sun.castShadow=true;scene.add(sun);
const places=buildCity(scene);initTraffic(scene);const player=createPlayer(scene),missions=createMissions(scene,places,player);let mode='title',last=performance.now(),saved={cash:0,index:0,best:0};try{saved=JSON.parse(localStorage.getItem('solhaven-save'))||saved}catch{}
const screen=document.querySelector('#screen'),hud=document.querySelector('#hud'),banner=document.querySelector('#banner');
function save(){saved.cash=player.cash;saved.index=missions.index;saved.best=Math.max(saved.best,player.cash);localStorage.setItem('solhaven-save',JSON.stringify(saved))}
function setMode(next){mode=next;hud.classList.toggle('hidden',next==='title');screen.classList.toggle('hidden',next==='play');if(next==='play')screen.innerHTML='';else drawScreen()}
function drawScreen(){if(mode==='title'){screen.innerHTML='<article class="panel"><span class="eyebrow">A COASTAL CITY ORIGINAL</span><div class="best">BEST CASH $'+saved.best.toLocaleString()+'</div><h1>SOLHAVEN<br><em>STREETS</em></h1><p>Kia came to the coast for a clean start. The Harbor Crew has other plans.</p><div class="controls">WASD move · SHIFT run · drag mouse orbit<br>E enter / exit car · click punch · SPACE handbrake<br>ESC pause</div><div class="actions"><button id="start">Start Story</button>'+(saved.index?'<button class="secondary" id="continue">Continue</button>':'')+'</div></article>';document.querySelector('#start').onclick=()=>{click();startGame(false)};document.querySelector('#continue')?.addEventListener('click',()=>{click();startGame(true)});return}
 let title='PAUSED',copy='Take a breath. Solhaven will be here.',buttons='<button id="resume">Back to the Street</button><button class="secondary" id="quit">Title</button>';
 if(mode==='mission-complete'){title='JOB COMPLETE';copy='$'+missions.earned+' added to your pocket. The Harbor Crew has another call.';buttons='<button id="next">Next Mission</button>'}
 if(mode==='mission-failed'){title='DELIVERY MISSED';copy='The window closed. Get back out there and try again.';buttons='<button id="retry">Retry</button>'}
 if(mode==='busted'){title='BUSTED';copy='You went down with $'+player.cash+' in your pocket.';buttons='<button id="retry">Try Again</button>'}
 if(mode==='story-complete'){title='STORY COMPLETE';copy='Solhaven belongs to the Harbor Crew. Total cash: $'+player.cash.toLocaleString();buttons='<button id="again">Play Again</button>'}
 screen.innerHTML='<article class="panel"><span class="eyebrow">SOLHAVEN STREETS</span><h1>'+title+'</h1><p>'+copy+'</p><div class="actions">'+buttons+'</div></article>';
 document.querySelector('#resume')?.addEventListener('click',()=>setMode('play'));document.querySelector('#quit')?.addEventListener('click',()=>setMode('title'));
 document.querySelector('#next')?.addEventListener('click',()=>{advanceMission(missions,scene);save();setMode('play')});
 document.querySelector('#retry')?.addEventListener('click',()=>{player.health=100;resetWanted();retryMission(missions,scene);setMode('play')});
 document.querySelector('#again')?.addEventListener('click',()=>{player.cash=0;missions.index=0;retryMission(missions,scene);resetWanted();setMode('title')});
}
function startGame(continuing){if(!continuing){player.cash=0;missions.index=0;retryMission(missions,scene)}else{player.cash=saved.cash;while(missions.index<saved.index&&missions.index<5)advanceMission(missions,scene)}player.health=100;resetWanted();player.position.set(-12,0,-12);setMode('play')}
drawScreen();
player.onCrime=reason=>{addCrime(reason);toast('WANTED: '+reason.toUpperCase())};
window.addEventListener('keydown',e=>{if((e.code==='Escape'||e.code==='KeyP')&&mode==='play')setMode('paused');else if(e.code==='Escape'&&mode==='paused')setMode('play');if(e.code==='KeyE'&&mode==='play')enterOrExit(player,player.onCrime)});
canvas.addEventListener('click',()=>{if(mode==='play')punchNearby(player,player.onCrime)});
const shot=new URLSearchParams(location.search).get('shot');
if(shot==='play'){player.position.set(-12,0,-12);setMode('play')}
if(shot==='chase'){player.position.set(-18,0,4);player.car=player.missionCar;player.car.player=true;player.car.pos.copy(player.position);missions.index=3;missions.time=90;missions.target=places.mint;missions.marker.position.copy(places.mint);addCrime('screenshot pursuit',3);setMode('play')}
if(shot==='mission'){player.cash=200;missions.earned=200;missions.done=true;missions.index=0;player.position.set(8,0,8);document.querySelector('#cash').textContent='$200';setMode('mission-complete')}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-last)/1000);last=now;if(mode==='play'){updatePlayer(player,dt,player.onCrime);updateTraffic(dt,player,player.onCrime);window.currentWanted=wanted.level;updatePolice(scene,dt,player);updateMission(missions,dt,player,scene,lastFlag=>{save();setMode(lastFlag?'story-complete':'mission-complete')},()=>setMode('mission-failed'));if(player.health<=0)setMode('busted');updateHud(player,missions,wanted,cars,police);if(player.damageFlash)banner.style.opacity=String(Math.random()*.15)}
 const target=player.position,angle=player.camYaw,dist=player.car?10:8;const desired=new THREE.Vector3(target.x+Math.sin(angle)*dist,target.y+4+dist*player.camPitch,target.z+Math.cos(angle)*dist);camera.position.lerp(desired,.1);camera.lookAt(target.x,target.y+1.1,target.z);renderer.render(scene,camera)}
requestAnimationFrame(frame);window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
