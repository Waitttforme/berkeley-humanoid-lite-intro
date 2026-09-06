import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import URDFLoader from 'urdf-loader'
import { updatePose } from './classmateMotion.ts'

const modelRoot = `${import.meta.env.BASE_URL}humanoid`

function materialFor(name) {
  const dark = /base|imu/.test(name)
  return new THREE.MeshStandardMaterial({
    color: dark ? 0x101316 : /roll/.test(name) ? 0xe7e8e5 : 0xf2f2ee,
    metalness: dark ? .9 : .68,
    roughness: dark ? .17 : .2,
    envMapIntensity: dark ? 1.55 : 1.42,
  })
}

export default function StudioViewer({ motion, exploded, paused, reset, onState }) {
  const hostRef = useRef(null)
  const controlsRef = useRef(null)
  const live = useRef({ motion, exploded, paused })
  live.current = { motion, exploded, paused }

  useEffect(() => { controlsRef.current?.reset() }, [reset])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    } catch {
      onState({ error: '此设备暂不支持 3D，可继续查看关节建模与实物资料。' })
      return undefined
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, .01, 50)
    const abort = new AbortController()
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    const normalPixelRatio = Math.min(devicePixelRatio, 1.15)
    const explosionPixelRatio = Math.max(.65, Math.min(devicePixelRatio, 1) * .72)
    let disposed = false
    let visible = true
    let animationFrame = 0
    let robot = null
    let meshCount = 0
    let ready = false
    let time = 0
    let motionTime = 0
    let last = performance.now()
    let standingFootMinZ = 0
    let rootHeightOffset = 0
    let explosionAmount = 0
    let explosionStartedAt = -10
    let wasExploded = false
    let explosionPrepared = false
    let explosionPerformanceMode = false
    let userControlledCamera = false
    const pose = {}
    const meshes = []
    const feet = []
    const materials = []
    const bounds = new THREE.Box3()
    const explodedParts = []

    camera.up.set(0, 0, 1)
    camera.position.set(1.51, -1.7, .97)
    renderer.setPixelRatio(normalPixelRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.setAttribute('aria-label', '可旋转的人形机器人三维模型')
    renderer.domElement.style.touchAction = 'pan-y'
    renderer.domElement.tabIndex = 0
    host.appendChild(renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture
    const key = new THREE.DirectionalLight(0xdcecff, 2)
    key.position.set(2.3, -2, 3.1)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x4c8dff, 2.6)
    rim.position.set(-2.2, 2.6, 1.4)
    scene.add(rim)
    const warm = new THREE.PointLight(0xf3b959, 7, 4, 2)
    warm.position.set(.2, -.4, 1.45)
    scene.add(warm)

    const floorMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `precision highp float;varying vec2 vUv;uniform float uTime;uniform float uEnergy;
        void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float t=uTime*(.72+uEnergy*1.35);
        float b=pow(max(0.,sin(r*33.-t*4.2+a*5.)),9.);float o=pow(max(0.,sin(r*27.+t*3.5-a*4.+1.8)),11.);
        float grid=pow(max(0.,sin(r*48.-t*1.25)),24.);float rim=smoothstep(.88,.99,r)*(1.-smoothstep(.99,1.015,r));
        vec3 c=vec3(.004,.014,.027)+vec3(.025,.38,.92)*b*(.25+uEnergy*.36)+vec3(1.,.31,.025)*o*(.22+uEnergy*.42)+vec3(.025,.38,.92)*grid*.13+mix(vec3(.12,.72,1.),vec3(1.,.68,.12),.5+.5*sin(a*3.-t))*rim*(.65+uEnergy*.65);
        c*=smoothstep(1.04,.08,r);gl_FragColor=vec4(c,1.);}`,
      side: THREE.DoubleSide,
    })
    const floor = new THREE.Mesh(new THREE.CircleGeometry(.76, 96), floorMaterial)
    floor.position.z = -.003
    scene.add(floor)
    const haloMaterial = new THREE.MeshBasicMaterial({ color: 0x4385eb, transparent: true, opacity: .42, side: THREE.DoubleSide })
    const halo = new THREE.Mesh(new THREE.RingGeometry(.606, .618, 96), haloMaterial)
    halo.position.z = .001
    scene.add(halo)
    const polarGrid = new THREE.PolarGridHelper(.73, 20, 6, 72, 0x2e73ad, 0x16324b)
    polarGrid.rotation.x = Math.PI / 2
    polarGrid.position.z = .0025
    polarGrid.material.transparent = true
    polarGrid.material.opacity = .2
    polarGrid.material.blending = THREE.AdditiveBlending
    scene.add(polarGrid)

    const effectCenter = new THREE.Vector3(0, 0, .46)
    const particleCount = 96
    const particlePositions = new Float32Array(particleCount * 3)
    const particleDirections = new Float32Array(particleCount * 3)
    const particlePhases = new Float32Array(particleCount)
    const particleColors = new Float32Array(particleCount * 3)
    const blue = new THREE.Color(0x58b7ff)
    const gold = new THREE.Color(0xf1b84e)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < particleCount; i += 1) {
      const z = 1 - 2 * ((i + .5) / particleCount)
      const radial = Math.sqrt(Math.max(0, 1 - z * z))
      particleDirections.set([Math.cos(i * goldenAngle) * radial, Math.sin(i * goldenAngle) * radial, z], i * 3)
      particlePhases[i] = ((i * 37) % particleCount) / particleCount
      particlePositions.set([effectCenter.x, effectCenter.y, effectCenter.z], i * 3)
      const color = i % 5 === 0 ? gold : blue
      particleColors.set([color.r, color.g, color.b], i * 3)
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))
    const particleMaterial = new THREE.PointsMaterial({ size: .012, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    particles.visible = false
    scene.add(particles)

    const shellMaterial = new THREE.MeshBasicMaterial({ color: 0x4ca9ff, wireframe: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    const shell = new THREE.Mesh(new THREE.SphereGeometry(.47, 14, 10), shellMaterial)
    shell.position.copy(effectCenter)
    shell.visible = false
    scene.add(shell)
    const rings = [0, 1, 2].map((index) => {
      const material = new THREE.MeshBasicMaterial({ color: index === 1 ? 0xe7ad49 : 0x5cb7ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.34 + index * .018, .003, 6, 72), material)
      ring.position.copy(effectCenter)
      if (index === 1) ring.rotation.x = Math.PI / 2
      if (index === 2) ring.rotation.y = Math.PI / 2
      ring.visible = false
      scene.add(ring)
      return ring
    })
    const shockMaterial = new THREE.MeshBasicMaterial({ color: 0xa8ddff, wireframe: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    const shock = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), shockMaterial)
    shock.position.copy(effectCenter)
    shock.visible = false
    scene.add(shock)
    const explosionLight = new THREE.PointLight(0x55adff, 0, 2.4, 2)
    explosionLight.position.copy(effectCenter)
    scene.add(explosionLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, .43)
    controls.enableDamping = true
    controls.dampingFactor = .055
    controls.enableZoom = false
    controls.enablePan = false
    controls.rotateSpeed = .72
    controls.minPolarAngle = .2
    controls.maxPolarAngle = Math.PI * .78
    controls.touches.ONE = THREE.TOUCH.ROTATE
    controls.touches.TWO = THREE.TOUCH.ROTATE
    controls.update()
    controls.saveState()
    renderer.domElement.style.touchAction = 'pan-y'
    controls.addEventListener('start', () => { userControlledCamera = true; controls.autoRotate = false })
    controlsRef.current = controls

    const footZ = () => {
      if (!robot || !feet.length) return standingFootMinZ
      robot.updateMatrixWorld(true)
      let minimum = Infinity
      feet.forEach(mesh => {
        mesh.geometry.computeBoundingBox()
        if (mesh.geometry.boundingBox) minimum = Math.min(minimum, bounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld).min.z)
      })
      return Number.isFinite(minimum) ? minimum : standingFootMinZ
    }
    const linkName = mesh => {
      let parent = mesh.parent
      while (parent && !parent.isURDFLink) parent = parent.parent
      return parent?.name || ''
    }
    const prepareExplosion = () => {
      if (!robot || explosionPrepared) return
      robot.updateMatrixWorld(true)
      const center = effectCenter.clone()
      const major = meshes.filter(({ mesh }) => {
        mesh.geometry.computeBoundingBox()
        return (mesh.geometry.boundingBox?.getSize(new THREE.Vector3()).length() || 0) >= .06
      })
      let slot = 0
      meshes.forEach(({ mesh, origin }) => {
        const name = linkName(mesh)
        const isFoot = name.includes('ankle_roll')
        mesh.geometry.computeBoundingBox()
        mesh.geometry.computeBoundingSphere()
        const size = mesh.geometry.boundingBox?.getSize(new THREE.Vector3()) || new THREE.Vector3()
        const suppressed = size.length() < .06
        const index = suppressed ? 0 : slot++
        const normalized = major.length > 1 ? index / (major.length - 1) : .5
        const vertical = THREE.MathUtils.lerp(-.58, .88, normalized)
        const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical))
        const direction = new THREE.Vector3(Math.cos(index * goldenAngle) * horizontal, Math.sin(index * goldenAngle) * horizontal, vertical).normalize()
        const side = name.includes('_left_') ? 1 : name.includes('_right_') ? -1 : 0
        if (isFoot) direction.set(0, side * Math.sqrt(.75), -.5)
        const world = mesh.getWorldPosition(new THREE.Vector3())
        let targetWorld = center.clone().addScaledVector(direction, .48)
        const worldScale = mesh.getWorldScale(new THREE.Vector3())
        const safetyRadius = (mesh.geometry.boundingSphere?.radius || size.length() * .5) * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z))
        targetWorld.z = Math.max(targetWorld.z, .018 + safetyRadius)
        if (suppressed) targetWorld = world.clone()
        mesh.parent.updateWorldMatrix(true, false)
        const target = mesh.parent.worldToLocal(targetWorld.clone())
        const originRotation = mesh.quaternion.clone()
        const axis = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 0, 1))
        if (axis.lengthSq() < .001) axis.set(1, 0, 0)
        axis.normalize()
        const turn = new THREE.Quaternion().setFromAxisAngle(axis, isFoot ? 0 : (index % 2 ? -.28 : .28))
        explodedParts.push({ mesh, origin, target, originRotation, targetRotation: suppressed ? originRotation.clone() : originRotation.clone().multiply(turn), originScale: mesh.scale.clone(), suppressed, delay: suppressed ? 0 : name === 'base' ? .16 : /shoulder|hip/.test(name) ? .1 : /elbow|knee/.test(name) ? .055 : .018 })
      })
      explosionPrepared = true
    }

    const fail = () => {
      if (!disposed) onState({ error: '模型加载失败，请刷新后重试；关节建模和页面内容仍可查看。' })
    }
    const complete = () => {
      if (!robot || meshCount !== 26 || ready || disposed) return
      scene.add(robot)
      updatePose(robot, 'idle', 0, 1, pose)
      robot.updateMatrixWorld(true)
      standingFootMinZ = footZ()
      ready = true
      clearTimeout(timeout)
      onState({ loaded: true, progress: 100 })
      host.dataset.loaded = 'true'
    }
    const loader = new URDFLoader()
    loader.packages = () => modelRoot
    loader.parseCollision = false
    loader.loadMeshCb = (path, manager, done) => {
      const name = path.replaceAll('\\', '/').split('/').pop()
      ;(async () => {
        try {
          let data
          try {
            const response = await fetch(`${modelRoot}/meshes-gzip/${name}.gz`, { signal: abort.signal })
            if (!response.ok) throw new Error('gzip')
            data = response.headers.get('content-encoding')?.includes('gzip') ? await response.arrayBuffer() : await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
          } catch (error) {
            if (abort.signal.aborted) throw error
            const response = await fetch(`${modelRoot}/meshes/${name}`, { signal: abort.signal })
            if (!response.ok) throw new Error('mesh')
            data = await response.arrayBuffer()
          }
          if (disposed) return
          const geometry = new STLLoader().parse(data)
          geometry.computeVertexNormals()
          geometry.computeBoundingBox()
          const material = materialFor(name)
          const mesh = new THREE.Mesh(geometry, material)
          mesh.castShadow = true
          mesh.receiveShadow = true
          materials.push(material)
          done(mesh)
          meshCount += 1
          const nameHint = name.replace('_visual.stl', '')
          meshes.push({ mesh, origin: mesh.position.clone(), name: nameHint })
          if (name.includes('ankle_roll')) feet.push(mesh)
          onState({ progress: Math.round(meshCount / 26 * 99) })
          complete()
        } catch (error) {
          if (!disposed) { done(null, error); fail() }
        }
      })()
    }
    const timeout = setTimeout(fail, 120000)
    fetch(`${modelRoot}/berkeley_humanoid_lite.urdf`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error('urdf'); return response.text() })
      .then(text => { if (!disposed) { robot = loader.parse(text); complete() } })
      .catch(() => { if (!disposed) fail() })

    const resize = new ResizeObserver(() => {
      const box = host.getBoundingClientRect()
      renderer.setPixelRatio(explosionPerformanceMode ? explosionPixelRatio : normalPixelRatio)
      renderer.setSize(box.width, box.height, false)
      camera.aspect = box.width / Math.max(1, box.height)
      camera.updateProjectionMatrix()
    })
    resize.observe(host)
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: .01 })
    visibility.observe(host)

    const animate = now => {
      if (disposed) return
      animationFrame = requestAnimationFrame(animate)
      const delta = Math.min((now - last) / 1000 || .016, .04)
      last = now
      if (!visible || document.hidden) return
      const state = live.current
      time += delta
      if (!state.paused && !reducedMotion.matches) motionTime += delta
      const isExploded = state.exploded
      if (isExploded && !wasExploded) explosionStartedAt = time
      wasExploded = isExploded
      const impactAge = time - explosionStartedAt
      const target = isExploded ? (reducedMotion.matches ? 1 : THREE.MathUtils.smoothstep(impactAge, .08, .7)) : 0
      if (isExploded) prepareExplosion()
      explosionAmount = reducedMotion.matches ? target : THREE.MathUtils.damp(explosionAmount, target, isExploded ? 8.5 : 5.2, delta)

      if (ready) {
        if (!isExploded && explosionAmount < .008) {
          updatePose(robot, state.motion, reducedMotion.matches ? 0 : motionTime, delta, pose)
          if (state.motion === 'squat' && feet.length) {
            rootHeightOffset = THREE.MathUtils.clamp(rootHeightOffset + standingFootMinZ - footZ(), -.45, .04)
            robot.position.z = rootHeightOffset
            robot.updateMatrixWorld(true)
            rootHeightOffset = THREE.MathUtils.clamp(rootHeightOffset + standingFootMinZ - footZ(), -.45, .04)
          } else rootHeightOffset = THREE.MathUtils.damp(rootHeightOffset, 0, 7.2, delta)
          robot.position.z = rootHeightOffset
          robot.updateMatrixWorld(true)
          const currentFoot = footZ()
          if (state.motion === 'idle' && Math.abs(rootHeightOffset) < .002) standingFootMinZ = currentFoot
          host.dataset.footBaseline = standingFootMinZ.toFixed(6)
          host.dataset.footCurrent = currentFoot.toFixed(6)
          host.dataset.footError = (currentFoot - standingFootMinZ).toFixed(6)
        }
        explodedParts.forEach(part => {
          const progress = THREE.MathUtils.clamp((explosionAmount - part.delay) / (1 - part.delay), 0, 1)
          const eased = progress * progress * (3 - 2 * progress)
          const launch = isExploded && !part.suppressed ? Math.min(1.065, 1 - Math.pow(1 - progress, 4.6) + Math.sin(progress * Math.PI) * .055) : eased
          part.mesh.position.lerpVectors(part.origin, part.target, launch)
          part.mesh.quaternion.slerpQuaternions(part.originRotation, part.targetRotation, THREE.MathUtils.smoothstep(eased, .24, 1))
          part.mesh.scale.copy(part.originScale).multiplyScalar(part.suppressed ? 1 - THREE.MathUtils.smoothstep(explosionAmount, .03, .3) : 1 + (isExploded ? Math.sin(progress * Math.PI) * .16 : 0))
          if (!part.suppressed) part.mesh.material.emissiveIntensity = isExploded ? Math.sin(Math.min(1, progress * 1.5) * Math.PI) * .68 : Math.max(0, part.mesh.material.emissiveIntensity - delta * 2.8)
        })
        host.dataset.explosionSpread = explodedParts.length
          ? Math.max(...explodedParts.filter(part => !part.suppressed).map(part => part.mesh.position.distanceTo(part.origin))).toFixed(6)
          : '0.000000'
        if (!isExploded && explosionAmount < .002 && explosionPrepared) {
          explodedParts.forEach(part => { part.mesh.position.copy(part.origin); part.mesh.quaternion.copy(part.originRotation); part.mesh.scale.copy(part.originScale); part.mesh.material.emissiveIntensity = 0 })
          explodedParts.length = 0
          explosionPrepared = false
          host.dataset.explosionSpread = '0.000000'
        }
      }

      const effect = THREE.MathUtils.smoothstep(explosionAmount, .04, .78)
      const shockProgress = THREE.MathUtils.clamp(Math.max(0, impactAge - .08) / .72, 0, 1)
      const shockStrength = isExploded && shockProgress < 1 ? Math.pow(1 - shockProgress, 1.8) : 0
      const pulse = .5 + Math.sin(time * 5.4) * .5
      particles.visible = effect > .01
      shell.visible = effect > .01
      particleMaterial.opacity = effect * (.48 + pulse * .3)
      shellMaterial.opacity = effect * (.035 + pulse * .025)
      const positions = particleGeometry.getAttribute('position')
      if (effect > .01) {
        for (let i = 0; i < particleCount; i += 1) {
          const phase = particlePhases[i]
          const stream = (time * .24 + phase) % 1
          const radius = .1 + effect * (.2 + phase * .24) + stream * .055
          const swirl = time * (.18 + phase * .12)
          const x = particleDirections[i * 3]
          const y = particleDirections[i * 3 + 1]
          const z = particleDirections[i * 3 + 2]
          positions.array[i * 3] = effectCenter.x + (x * Math.cos(swirl) - y * Math.sin(swirl)) * radius
          positions.array[i * 3 + 1] = effectCenter.y + (x * Math.sin(swirl) + y * Math.cos(swirl)) * radius
          positions.array[i * 3 + 2] = Math.max(.03, effectCenter.z + z * radius)
        }
        positions.needsUpdate = true
      }
      shell.scale.setScalar(.78 + effect * .34 + pulse * .018)
      shell.rotation.set(time * .08, time * .11, time * .045)
      rings.forEach((ring, index) => {
        const phase = (time * .42 + index / rings.length) % 1
        ring.visible = effect > .01
        ring.scale.setScalar(.72 + phase * .78)
        ring.material.opacity = effect * (1 - phase) * .38 + shockStrength * .32
        ring.rotation.z += delta * (index % 2 ? -.12 : .16)
      })
      shock.visible = shockStrength > .005
      shockMaterial.opacity = shockStrength * .82
      shock.scale.setScalar(.55 + shockProgress * 4.35)
      shock.rotation.set(time * .8, time * 1.1, 0)
      explosionLight.intensity = effect * (3.4 + pulse * 2.8) + shockStrength * 12
      floorMaterial.uniforms.uTime.value = time
      floorMaterial.uniforms.uEnergy.value = effect
      haloMaterial.opacity = .3 + Math.sin(time * 1.25) * .08
      halo.rotation.z = time * .04
      polarGrid.material.opacity = .16 + effect * .24 + pulse * .03
      polarGrid.rotation.z = time * (.025 + effect * .12)

      const explosionOrbit = isExploded || explosionAmount > .04
      if (explosionOrbit !== explosionPerformanceMode) {
        explosionPerformanceMode = explosionOrbit
        renderer.setPixelRatio(explosionOrbit ? explosionPixelRatio : normalPixelRatio)
        const box = host.getBoundingClientRect()
        renderer.setSize(box.width, box.height, false)
        key.castShadow = !explosionOrbit
      }
      controls.autoRotate = !reducedMotion.matches && (explosionOrbit || (!userControlledCamera && time < 4.5))
      controls.autoRotateSpeed = explosionOrbit ? .65 : .22
      controls.update()
      host.dataset.motion = state.motion
      host.dataset.exploded = String(isExploded)
      host.dataset.cameraDistance = camera.position.distanceTo(controls.target).toFixed(6)

      const stablePosition = camera.position.clone()
      if (!reducedMotion.matches && isExploded && impactAge > .09 && impactAge < .77) {
        const age = impactAge - .09
        const decay = Math.exp(-age * 6.2)
        camera.position.x += Math.sin(age * 78) * decay * .003
        camera.position.y += Math.cos(age * 93) * decay * .002
        camera.position.z += Math.sin(age * 67) * decay * .001
      }
      renderer.render(scene, camera)
      camera.position.copy(stablePosition)
    }
    animationFrame = requestAnimationFrame(animate)

    return () => {
      disposed = true
      clearTimeout(timeout)
      abort.abort()
      cancelAnimationFrame(animationFrame)
      resize.disconnect()
      visibility.disconnect()
      controls.dispose()
      controlsRef.current = null
      pmrem.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      shell.geometry.dispose()
      shellMaterial.dispose()
      shock.geometry.dispose()
      shockMaterial.dispose()
      rings.forEach(ring => { ring.geometry.dispose(); ring.material.dispose() })
      floor.geometry.dispose()
      floorMaterial.dispose()
      halo.geometry.dispose()
      haloMaterial.dispose()
      materials.forEach(material => material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onState])

  return <div className="studio-canvas" ref={hostRef}/>
}
