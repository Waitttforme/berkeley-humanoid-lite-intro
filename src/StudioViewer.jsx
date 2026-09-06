import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import URDFLoader from 'urdf-loader'
import { updatePose } from './classmateMotion.ts'

const root = `${import.meta.env.BASE_URL}humanoid`
export default function StudioViewer({ motion, exploded, paused, reset, onState }) {
 const host=useRef(null), controlsRef=useRef(null), state=useRef({motion,exploded,paused})
 state.current={motion,exploded,paused}
 useEffect(()=>{controlsRef.current?.reset()},[reset])
 useEffect(()=>{
  let renderer
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch{onState({error:'此设备暂不支持 3D，可使用静态视图。'});return}
  const element=host.current, scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(35,1,.01,30), abort=new AbortController()
  let disposed=false,visible=true,frame=0,robot=null,meshCount=0,time=0,last=0,ready=false,standing=0,explosion=0
  camera.up.set(0,0,1);camera.position.set(1.55,-2.1,1.2)
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x10171f,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.6
  renderer.domElement.setAttribute('aria-label','可旋转人形机器人三维模型');renderer.domElement.style.touchAction='pan-y';element.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement)
  renderer.domElement.style.touchAction='pan-y'
  controls.target.set(0,0,.45);controls.minDistance=1;controls.maxDistance=4;controls.enablePan=false;controls.enableDamping=true;controls.enableZoom=false;controls.touches.ONE=null;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;controls.update();controls.saveState();controlsRef.current=controls
  scene.add(new THREE.HemisphereLight(0xeaf6ff,0x6c7486,3))
  const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(2,-3,4);scene.add(key)
  const rim=new THREE.DirectionalLight(0xaacfff,3);rim.position.set(-2,1,2);scene.add(rim)
  const floor=new THREE.Mesh(new THREE.CircleGeometry(.8,64),new THREE.MeshBasicMaterial({color:0x283e50,transparent:true,opacity:.18,side:THREE.DoubleSide}));floor.position.z=-.01;scene.add(floor)
  const materials=[],meshes=[],feet=[],pose={},bounds=new THREE.Box3()
  const footZ=()=>{let min=Infinity;for(const mesh of feet){bounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);min=Math.min(min,bounds.min.z)}return Number.isFinite(min)?min:0}
  const fail=()=>{if(!disposed){onState({error:'模型加载失败，请重试；静态视图仍可查看。'});abort.abort()}}
  const complete=()=>{
   if(!robot||meshCount!==26||ready||disposed)return
   robot.traverse(o=>{if(!o.isMesh)return;let link=o.parent;while(link&&!link.isURDFLink)link=link.parent;const name=link?.name||''
    o.material?.dispose();const material=new THREE.MeshStandardMaterial({color:/base|imu/.test(name)?0x222a32:0xe9ece9,metalness:.35,roughness:.32});materials.push(material);o.material=material;o.geometry.computeBoundingBox();meshes.push({mesh:o,origin:o.position.clone(),offset:new THREE.Vector3()});if(name.includes('ankle_roll'))feet.push(o)
   })
   scene.add(robot);updatePose(robot,'idle',0,1,pose);robot.updateMatrixWorld(true);standing=footZ()
   for(const item of meshes){const world=item.mesh.getWorldPosition(new THREE.Vector3());const direction=world.clone().sub(new THREE.Vector3(0,0,.45)).normalize().multiplyScalar(.22);item.offset.copy(item.mesh.parent.worldToLocal(world.clone().add(direction)).sub(item.origin))}
   ready=true;clearTimeout(timeout);onState({loaded:true,progress:100});element.dataset.loaded='true'
  }
  const loader=new URDFLoader();loader.packages=()=>root;loader.parseCollision=false
  loader.loadMeshCb=(path,manager,done)=>{
   const name=path.replaceAll('\\','/').split('/').pop()
   ;(async()=>{try{let data
    try{const r=await fetch(`${root}/meshes-gzip/${name}.gz`,{signal:abort.signal});if(!r.ok)throw Error('gzip');data=r.headers.get('content-encoding')?.includes('gzip')?await r.arrayBuffer():await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()}
    catch(e){if(abort.signal.aborted)throw e;const r=await fetch(`${root}/meshes/${name}`,{signal:abort.signal});if(!r.ok)throw Error('mesh');data=await r.arrayBuffer()}
    if(disposed)return;const geometry=new STLLoader().parse(data);geometry.computeVertexNormals();done(new THREE.Mesh(geometry));meshCount++;onState({progress:Math.round(meshCount/26*99)});complete()
   }catch(e){if(!disposed){done(null,e);fail()}}})()
  }
  const timeout=setTimeout(fail,120000)
  fetch(`${root}/berkeley_humanoid_lite.urdf`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('urdf');return r.text()}).then(text=>{if(disposed)return;robot=loader.parse(text);complete()}).catch(()=>{if(!disposed)fail()})
  const reduced=matchMedia('(prefers-reduced-motion: reduce)')
  const resize=new ResizeObserver(()=>{const b=element.getBoundingClientRect();renderer.setSize(b.width,b.height);camera.aspect=b.width/b.height;camera.updateProjectionMatrix()});resize.observe(element)
  const animate=now=>{if(disposed)return;frame=0;const delta=Math.min((now-last)/1000||.016,.05);last=now;if(!visible||document.hidden)return;const s=state.current
   if(ready){if(!s.paused&&!reduced.matches)time+=delta;updatePose(robot,s.exploded?'attention':s.motion,reduced.matches?0:time,delta,pose);explosion=THREE.MathUtils.damp(explosion,s.exploded?1:0,7,delta)
    for(const item of meshes)item.mesh.position.copy(item.origin).addScaledVector(item.offset,explosion)
    robot.position.z=0;robot.updateMatrixWorld(true);if(explosion<.001){robot.position.z=standing-footZ();robot.updateMatrixWorld(true)}
    element.dataset.motion=s.motion;element.dataset.exploded=String(s.exploded);element.dataset.footError=String(explosion<.001?Math.abs(footZ()-standing):0)
   }
   controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate)
  }
  const resume=()=>{cancelAnimationFrame(frame);last=performance.now();if(visible&&!document.hidden&&!disposed)frame=requestAnimationFrame(animate)}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume()});observer.observe(element);document.addEventListener('visibilitychange',resume);resume()
  return()=>{disposed=true;clearTimeout(timeout);abort.abort();cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',resume);controls.dispose();controlsRef.current=null;const geometries=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry)});if(robot)robot.traverse(o=>{if(o.geometry)geometries.add(o.geometry)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());floor.material.dispose();renderer.dispose();renderer.domElement.remove()}
 },[onState])
 return <div className="studio-canvas" ref={host}/>
}
