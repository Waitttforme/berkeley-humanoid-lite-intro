import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import URDFLoader from 'urdf-loader'
import {
  Boxes,
  ExternalLink,
  Maximize2,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
} from 'lucide-react'

const MODEL_ROOT = `${import.meta.env.BASE_URL}humanoid`
const MODEL_POSTER_URL = `${import.meta.env.BASE_URL}media/bhl-robot-cutout.png`
const MODEL_MESH_COUNT = 26
const MODEL_LOAD_TIMEOUT = 120_000
const COMPACT_DEVICE_QUERY = '(max-width: 900px), (pointer: coarse)'

const GUIDE_MODULES = [
  {
    id: 'core',
    code: '01',
    label: '核心机身',
    meta: 'BASE + IMU',
    copy: '承载机身骨架与姿态感知语义。N95、CAN 与电池不是当前 URDF 的独立网格，详见下方系统架构。',
    camera: [0.69, -0.69, 0.87],
    target: [-0.002, 0, 0.672],
  },
  {
    id: 'leftArm',
    code: '02',
    label: '左臂',
    meta: '5-DOF + HAND',
    copy: '由肩部三轴与肘部两轴构成，末端手部在官方模型中以固定连接呈现。',
    camera: [0.83, 0.93, 0.79],
    target: [-0.006, 0.217, 0.578],
  },
  {
    id: 'rightArm',
    code: '03',
    label: '右臂',
    meta: '5-DOF + HAND',
    copy: '镜像的五自由度操作链，用于展示招手与双臂遥操作所需的关节组合。',
    camera: [0.83, -0.93, 0.79],
    target: [-0.006, -0.215, 0.577],
  },
  {
    id: 'leftLeg',
    code: '04',
    label: '左腿',
    meta: '6-DOF LEG',
    copy: '髋部三轴、膝部一轴与踝部两轴组成完整双足运动链的一侧。',
    camera: [1.17, 0.73, 0.72],
    target: [0.001, 0.084, 0.307],
  },
  {
    id: 'rightLeg',
    code: '05',
    label: '右腿',
    meta: '6-DOF LEG',
    copy: '与左腿协同承担支撑、摆动和姿态调整；网页动作仅为程序化关节示意。',
    camera: [1.17, -0.73, 0.72],
    target: [0.001, -0.084, 0.307],
  },
]

function getGuideModuleForLink(name = '') {
  if (/^(base|imu_2|imu)$/.test(name)) return 'core'
  if (/^arm_left_/.test(name)) return 'leftArm'
  if (/^arm_right_/.test(name)) return 'rightArm'
  if (/^leg_left_/.test(name)) return 'leftLeg'
  if (/^leg_right_/.test(name)) return 'rightLeg'
  return null
}

const MOTIONS = [
  { id: 'idle', label: '待机', code: 'IDLE' },
  { id: 'wave', label: '招手', code: 'WAVE' },
  { id: 'squat', label: '下蹲', code: 'SQUAT' },
  { id: 'walk', label: '步行', code: 'WALK' },
  { id: 'attention', label: '立正', code: 'RESET' },
]

const BASE_POSE = {
  arm_left_shoulder_pitch_joint: -0.2,
  arm_left_shoulder_roll_joint: 0.22,
  arm_left_shoulder_yaw_joint: 0,
  arm_left_elbow_pitch_joint: 0.34,
  arm_left_elbow_roll_joint: 0,
  arm_right_shoulder_pitch_joint: 0.2,
  arm_right_shoulder_roll_joint: -0.22,
  arm_right_shoulder_yaw_joint: 0,
  arm_right_elbow_pitch_joint: -0.34,
  arm_right_elbow_roll_joint: 0,
  leg_left_hip_roll_joint: 0.04,
  leg_left_hip_yaw_joint: 0,
  leg_left_hip_pitch_joint: 0,
  leg_left_knee_pitch_joint: 0.04,
  leg_left_ankle_pitch_joint: -0.02,
  leg_left_ankle_roll_joint: 0,
  leg_right_hip_roll_joint: -0.04,
  leg_right_hip_yaw_joint: 0,
  leg_right_hip_pitch_joint: 0,
  leg_right_knee_pitch_joint: 0.04,
  leg_right_ankle_pitch_joint: -0.02,
  leg_right_ankle_roll_joint: 0,
}

const MOTION_POSES = {
  idle: {},
  wave: {
    arm_right_shoulder_pitch_joint: 0.04,
    arm_right_shoulder_roll_joint: -1.18,
    arm_right_shoulder_yaw_joint: 0.68,
    arm_right_elbow_pitch_joint: -1.3,
    arm_right_elbow_roll_joint: 0.08,
  },
  squat: {
    arm_left_shoulder_pitch_joint: -0.5,
    arm_right_shoulder_pitch_joint: 0.5,
    leg_left_hip_pitch_joint: -0.58,
    leg_right_hip_pitch_joint: -0.58,
    leg_left_knee_pitch_joint: 1.08,
    leg_right_knee_pitch_joint: 1.08,
    leg_left_ankle_pitch_joint: -0.5,
    leg_right_ankle_pitch_joint: -0.5,
  },
  attention: {
    arm_left_shoulder_pitch_joint: -0.16,
    arm_left_shoulder_roll_joint: 0.38,
    arm_left_shoulder_yaw_joint: 0,
    arm_left_elbow_pitch_joint: 0.78,
    arm_left_elbow_roll_joint: 0,
    arm_right_shoulder_pitch_joint: 0.16,
    arm_right_shoulder_roll_joint: -0.38,
    arm_right_shoulder_yaw_joint: 0,
    arm_right_elbow_pitch_joint: -0.78,
    arm_right_elbow_roll_joint: 0,
    leg_left_hip_roll_joint: 0.1,
    leg_right_hip_roll_joint: -0.1,
    leg_left_hip_pitch_joint: -0.08,
    leg_right_hip_pitch_joint: -0.08,
    leg_left_knee_pitch_joint: 0.14,
    leg_right_knee_pitch_joint: 0.14,
    leg_left_ankle_pitch_joint: -0.06,
    leg_right_ankle_pitch_joint: -0.06,
  },
  walk: {},
}

function updatePose(robot, motion, time, delta, currentPose) {
  const values = { ...BASE_POSE, ...MOTION_POSES[motion] }
  const phase = time * 2.6

  if (motion === 'idle') {
    const breath = Math.sin(time * 1.2)
    values.arm_left_shoulder_roll_joint += breath * 0.035
    values.arm_right_shoulder_roll_joint -= breath * 0.035
    values.leg_left_hip_roll_joint += breath * 0.008
    values.leg_right_hip_roll_joint -= breath * 0.008
  }

  if (motion === 'wave') {
    const handWave = Math.sin(time * 5.1)
    const followThrough = Math.sin(time * 5.1 - 0.55)
    values.arm_right_elbow_pitch_joint += handWave * 0.2
    values.arm_right_shoulder_yaw_joint += followThrough * 0.075
    values.arm_right_elbow_roll_joint += followThrough * 0.22
    values.arm_right_shoulder_pitch_joint += Math.sin(time * 2.55) * 0.035
  }

  if (motion === 'attention') {
    const breath = Math.sin(time * 1.35)
    values.arm_left_shoulder_roll_joint += breath * 0.018
    values.arm_right_shoulder_roll_joint -= breath * 0.018
    values.arm_left_elbow_pitch_joint += breath * 0.025
    values.arm_right_elbow_pitch_joint -= breath * 0.025
  }

  if (motion === 'walk') {
    const leftStride = Math.sin(phase)
    const rightStride = Math.sin(phase + Math.PI)
    values.leg_left_hip_pitch_joint = leftStride * 0.28
    values.leg_right_hip_pitch_joint = rightStride * 0.28
    values.leg_left_knee_pitch_joint = 0.08 + Math.max(0, -leftStride) * 0.52
    values.leg_right_knee_pitch_joint = 0.08 + Math.max(0, -rightStride) * 0.52
    values.leg_left_ankle_pitch_joint = -leftStride * 0.16
    values.leg_right_ankle_pitch_joint = -rightStride * 0.16
    values.arm_left_shoulder_pitch_joint = rightStride * 0.3
    values.arm_right_shoulder_pitch_joint = -leftStride * 0.3
  }

  Object.entries(values).forEach(([name, target]) => {
    const joint = robot.joints[name]
    if (!joint) return
    currentPose[name] = THREE.MathUtils.damp(currentPose[name] ?? 0, target, 6.8, delta)
    joint.setJointValue(currentPose[name])
  })
}

function getPartMaterial(name) {
  let color = '#c8d0d5'
  let metalness = 0.48
  let roughness = 0.3

  if (name.includes('shoulder_roll') || name.includes('hip_roll')) color = '#d5a52c'
  if (name.includes('shoulder_yaw') || name.includes('hip_yaw')) color = '#5ba6cf'
  if (name.includes('elbow_roll') || name.includes('ankle_roll')) color = '#4f74b9'
  if (name.includes('hand_link')) color = '#e2e6e8'
  if (name === 'base') {
    color = '#343d43'
    metalness = 0.68
    roughness = 0.26
  }

  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    envMapIntensity: 1.15,
  })
}

function recolorRobot(robot) {
  robot.traverse((object) => {
    if (!object.isMesh) return
    let ancestor = object.parent
    while (ancestor && !ancestor.isURDFLink) ancestor = ancestor.parent
    const name = ancestor?.name ?? object.name
    const previous = object.material
    object.material = getPartMaterial(name)
    object.castShadow = true
    object.receiveShadow = true
    object.userData.guide = {
      moduleId: getGuideModuleForLink(name),
      color: object.material.color.clone(),
      emissive: object.material.emissive.clone(),
      emissiveIntensity: object.material.emissiveIntensity,
      roughness: object.material.roughness,
      metalness: object.material.metalness,
    }
    if (previous && previous !== object.material) previous.dispose?.()
  })
}

function applyGuideHighlight(robot, moduleId) {
  if (!robot) return
  const highlight = new THREE.Color('#fdb515')
  const dim = new THREE.Color('#11181d')

  robot.traverse((object) => {
    if (!object.isMesh || !object.userData.guide) return
    const base = object.userData.guide
    const material = object.material
    material.color.copy(base.color)
    material.emissive.copy(base.emissive)
    material.emissiveIntensity = base.emissiveIntensity
    material.roughness = base.roughness
    material.metalness = base.metalness

    if (!moduleId) return
    if (base.moduleId === moduleId) {
      material.color.lerp(highlight, 0.35)
      material.emissive.set('#fdb515')
      material.emissiveIntensity = 0.48
      material.roughness = Math.max(0.16, base.roughness - 0.08)
    } else {
      material.color.lerp(dim, 0.55)
      material.emissive.set('#000000')
      material.emissiveIntensity = 0
      material.roughness = Math.min(0.72, base.roughness + 0.14)
    }
  })
}

function prepareExplodedParts(robot) {
  const parts = []
  const center = new THREE.Vector3(0, 0, 0.46)
  robot.updateMatrixWorld(true)

  robot.traverse((object) => {
    if (!object.isMesh || !object.parent) return
    const worldPosition = object.getWorldPosition(new THREE.Vector3())
    const worldDirection = worldPosition.clone().sub(center)
    if (worldDirection.lengthSq() < 0.002) worldDirection.set(0, 0, 1)
    worldDirection.normalize()

    let depth = 0
    let ancestor = object.parent
    while (ancestor && ancestor !== robot) {
      depth += 1
      ancestor = ancestor.parent
    }

    const parentQuaternion = object.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
    const localDirection = worldDirection.applyQuaternion(parentQuaternion).normalize()
    const distance = 0.045 + Math.min(depth, 7) * 0.008

    parts.push({
      mesh: object,
      origin: object.position.clone(),
      offset: localDirection.multiplyScalar(distance),
    })
  })

  return parts
}

function disposeObject(root) {
  root?.traverse((object) => {
    object.geometry?.dispose?.()
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.())
    else object.material?.dispose?.()
  })
}

function Viewer({ motion, exploded, interactive, guideModule, setLoaded, setProgress, setError, apiRef }) {
  const hostRef = useRef(null)
  const motionRef = useRef(motion)
  const explodedRef = useRef(exploded)
  const interactiveRef = useRef(interactive)
  const guideModuleRef = useRef(guideModule)

  useEffect(() => { motionRef.current = motion }, [motion])
  useEffect(() => { explodedRef.current = exploded }, [exploded])
  useEffect(() => {
    interactiveRef.current = interactive
    apiRef.current?.setInteraction?.(interactive)
  }, [apiRef, interactive])
  useEffect(() => {
    guideModuleRef.current = guideModule
    apiRef.current?.setGuideModule?.(guideModule)
  }, [apiRef, guideModule])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    let disposed = false
    let frameId = 0
    let robot = null
    let explodedParts = []
    let explodedAmount = 0
    let modelReady = false
    let loadedMeshCount = 0
    let meshLoadFailed = false
    let urdfReady = false
    let userControlledCamera = false
    let isVisible = true
    let loadTimeoutId = 0
    let elapsedTime = 0
    let cameraGoal = null
    let targetGoal = null
    const currentPose = {}
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const compactView = window.matchMedia(COMPACT_DEVICE_QUERY).matches
    const defaultCameraPosition = compactView
      ? new THREE.Vector3(1.25, -1.39, 0.88)
      : new THREE.Vector3(1.08, -1.2, 0.82)
    const defaultCameraTarget = new THREE.Vector3(0, 0, 0.43)

    const reportError = (message) => {
      if (disposed) return
      window.clearTimeout(loadTimeoutId)
      setLoaded(false)
      setProgress(0)
      setError(message)
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(compactView ? 35 : 31, host.clientWidth / host.clientHeight, 0.01, 50)
    camera.position.copy(defaultCameraPosition)
    camera.up.set(0, 0, 1)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch (error) {
      reportError('当前浏览器无法启动 WebGL 3D 渲染。')
      return undefined
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 640 ? 1.2 : 1.6))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.02
    renderer.shadowMap.enabled = window.innerWidth >= 640
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.tabIndex = 0
    renderer.domElement.setAttribute('aria-label', 'Berkeley Humanoid Lite 可旋转三维模型')
    host.appendChild(renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const environmentScene = new RoomEnvironment()
    const environmentTarget = pmrem.fromScene(environmentScene, 0.04)
    environmentScene.dispose()
    scene.environment = environmentTarget.texture

    const hemisphere = new THREE.HemisphereLight('#f1f2ed', '#050707', 0.88)
    scene.add(hemisphere)

    const key = new THREE.DirectionalLight('#f4f1e9', 2.75)
    key.position.set(2.2, -2.2, 3.2)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)

    const rim = new THREE.DirectionalLight('#62bfe3', 1.8)
    rim.position.set(-2.4, 2.5, 1.5)
    scene.add(rim)

    const warm = new THREE.PointLight('#fdb515', 3.4, 3.2, 2)
    warm.position.set(0.15, -0.38, 1.35)
    scene.add(warm)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.46, 96),
      new THREE.MeshBasicMaterial({ color: '#050606' }),
    )
    floor.receiveShadow = true
    floor.position.z = -0.004
    scene.add(floor)

    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = 256
    shadowCanvas.height = 256
    const shadowContext = shadowCanvas.getContext('2d')
    const shadowGradient = shadowContext.createRadialGradient(128, 128, 8, 128, 128, 124)
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.82)')
    shadowGradient.addColorStop(0.42, 'rgba(0, 0, 0, 0.48)')
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    shadowContext.fillStyle = shadowGradient
    shadowContext.fillRect(0, 0, 256, 256)
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.42),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.82 }),
    )
    contactShadow.position.set(0, 0, 0.002)
    scene.add(contactShadow)

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.405, 0.41, 128),
      new THREE.MeshBasicMaterial({ color: '#62bfe3', transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
    )
    halo.position.z = 0.001
    scene.add(halo)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0.43)
    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.enablePan = false
    controls.rotateSpeed = 0.72
    controls.zoomSpeed = 0.82
    controls.minDistance = 0.75
    controls.maxDistance = 2.7
    controls.minPolarAngle = 0.18
    controls.maxPolarAngle = Math.PI * 0.78
    controls.autoRotate = !prefersReducedMotion
    controls.autoRotateSpeed = 0.46

    const setInteraction = (enabled) => {
      controls.enabled = enabled
      renderer.domElement.style.touchAction = enabled ? 'none' : 'pan-y'
    }
    setInteraction(interactiveRef.current)

    const resetCamera = () => {
      cameraGoal = defaultCameraPosition.clone()
      targetGoal = defaultCameraTarget.clone()
      userControlledCamera = false
      controls.autoRotate = !prefersReducedMotion
    }

    const setGuideModule = (moduleId) => {
      applyGuideHighlight(robot, moduleId)
      userControlledCamera = false
      const module = GUIDE_MODULES.find((item) => item.id === moduleId)
      if (!module) {
        cameraGoal = defaultCameraPosition.clone()
        targetGoal = defaultCameraTarget.clone()
        return
      }
      cameraGoal = new THREE.Vector3(...module.camera)
      targetGoal = new THREE.Vector3(...module.target)
    }
    apiRef.current = { resetCamera, setInteraction, setGuideModule }

    const onControlStart = () => {
      userControlledCamera = true
      cameraGoal = null
      targetGoal = null
      controls.autoRotate = false
    }
    controls.addEventListener('start', onControlStart)

    const robotGroup = new THREE.Group()
    scene.add(robotGroup)

    const manager = new THREE.LoadingManager()
    manager.onError = (url) => {
      reportError(`模型零件加载失败：${url.split('/').pop()}`)
    }

    const completeModel = () => {
      if (disposed || modelReady || meshLoadFailed || !urdfReady || !robot) return
      if (loadedMeshCount !== MODEL_MESH_COUNT) return

      updatePose(robot, motionRef.current, 0, 0.5, currentPose)
      recolorRobot(robot)
      robot.updateMatrixWorld(true)
      explodedParts = prepareExplodedParts(robot)
      modelReady = true
      setGuideModule(guideModuleRef.current)
      window.clearTimeout(loadTimeoutId)
      setProgress(100)
      setLoaded(true)
    }

    const loader = new URDFLoader(manager)
    loader.packages = () => MODEL_ROOT
    loader.parseCollision = false
    loader.loadMeshCb = (meshPath, loadingManager, _material, done) => {
      const filename = meshPath.split('/').pop()?.split('\\').pop()
      if (!filename) {
        meshLoadFailed = true
        const error = new Error(`无法解析模型零件路径：${meshPath}`)
        reportError(error.message)
        done(null, error)
        return
      }

      const meshLoader = new STLLoader(loadingManager)
      meshLoader.load(
        `${MODEL_ROOT}/meshes/${filename}`,
        (geometry) => {
          if (disposed) {
            geometry.dispose()
            done(null)
            return
          }

          // Three.js r185 no longer tolerates a null material during an early render frame.
          done(new THREE.Mesh(geometry, _material || new THREE.MeshStandardMaterial()))
          loadedMeshCount += 1
          setProgress(Math.min(99, Math.round((loadedMeshCount / MODEL_MESH_COUNT) * 100)))
          completeModel()
        },
        undefined,
        (error) => {
          meshLoadFailed = true
          reportError(`模型零件加载失败：${filename}`)
          done(null, error)
        },
      )
    }
    loader.load(
      `${MODEL_ROOT}/berkeley_humanoid_lite.urdf`,
      (loadedRobot) => {
        if (disposed) {
          disposeObject(loadedRobot)
          return
        }
        robot = loadedRobot
        robotGroup.add(robot)
        urdfReady = true
        setProgress(Math.max(4, Math.round((loadedMeshCount / MODEL_MESH_COUNT) * 100)))
        completeModel()
      },
      undefined,
      () => {
        reportError('整机 URDF 加载失败，请检查模型资源。')
      },
    )

    loadTimeoutId = window.setTimeout(() => {
      meshLoadFailed = true
      reportError('模型加载超时，请检查网络后重试。')
    }, MODEL_LOAD_TIMEOUT)

    const clock = new THREE.Clock()
    const animate = () => {
      frameId = 0
      if (disposed || !isVisible || document.hidden) return
      const delta = Math.min(clock.getDelta(), 0.04)
      elapsedTime += delta
      const motionTime = prefersReducedMotion ? 0 : elapsedTime

      if (robot && modelReady) {
        updatePose(
          robot,
          explodedRef.current ? 'attention' : motionRef.current,
          motionTime,
          delta,
          currentPose,
        )

        const targetExplosion = explodedRef.current ? 1 : 0
        explodedAmount = THREE.MathUtils.damp(explodedAmount, targetExplosion, 5.6, delta)
        if (Math.abs(explodedAmount - targetExplosion) < 0.0001) explodedAmount = targetExplosion
        const easedExplosion = explodedAmount * explodedAmount * (3 - 2 * explodedAmount)
        explodedParts.forEach(({ mesh, origin, offset }) => {
          mesh.position.copy(origin).addScaledVector(offset, easedExplosion)
        })

        const walkLift = motionRef.current === 'walk' && !explodedRef.current
          ? Math.abs(Math.sin(motionTime * 2.6)) * 0.012
          : 0
        robotGroup.position.z = THREE.MathUtils.damp(robotGroup.position.z, walkLift, 7, delta)
      }

      halo.rotation.z = motionTime * 0.05
      halo.material.opacity = prefersReducedMotion ? 0.22 : 0.22 + Math.sin(motionTime * 1.25) * 0.05
      if (cameraGoal && targetGoal) {
        const alpha = 1 - Math.exp(-5.8 * delta)
        camera.position.lerp(cameraGoal, alpha)
        controls.target.lerp(targetGoal, alpha)
        if (camera.position.distanceToSquared(cameraGoal) < 0.000001
          && controls.target.distanceToSquared(targetGoal) < 0.000001) {
          camera.position.copy(cameraGoal)
          controls.target.copy(targetGoal)
          cameraGoal = null
          targetGoal = null
        }
      }
      controls.autoRotate = !prefersReducedMotion && !userControlledCamera && !cameraGoal
      controls.autoRotateSpeed = explodedRef.current ? 1.0 : 0.46
      controls.update()
      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (disposed || frameId || !isVisible || document.hidden) return
      clock.getDelta()
      frameId = window.requestAnimationFrame(animate)
    }

    const visibilityObserver = new IntersectionObserver((entries) => {
      const nextVisible = entries[0]?.isIntersecting ?? true
      if (nextVisible === isVisible) return
      isVisible = nextVisible
      if (isVisible) startAnimation()
      else {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
    }, { threshold: 0.01 })
    visibilityObserver.observe(host)

    const onDocumentVisibilityChange = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      } else {
        startAnimation()
      }
    }
    document.addEventListener('visibilitychange', onDocumentVisibilityChange)
    startAnimation()

    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return
      camera.aspect = host.clientWidth / host.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(host.clientWidth, host.clientHeight)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)

    const onContextLost = (event) => {
      event.preventDefault()
      reportError('3D 图形上下文已中断，请刷新页面重试。')
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)

    return () => {
      disposed = true
      window.clearTimeout(loadTimeoutId)
      window.cancelAnimationFrame(frameId)
      visibilityObserver.disconnect()
      document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
      resizeObserver.disconnect()
      controls.removeEventListener('start', onControlStart)
      controls.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      disposeObject(robot)
      floor.geometry.dispose()
      floor.material.dispose()
      contactShadow.geometry.dispose()
      contactShadow.material.dispose()
      shadowTexture.dispose()
      halo.geometry.dispose()
      halo.material.dispose()
      environmentTarget.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
      if (apiRef.current?.resetCamera === resetCamera) apiRef.current = null
    }
  }, [apiRef, setError, setLoaded, setProgress])

  return <div className="twin-viewer" ref={hostRef} />
}

function shouldAutoLoad() {
  if (typeof window === 'undefined') return false
  const compact = window.matchMedia(COMPACT_DEVICE_QUERY).matches
  const saveData = navigator.connection?.saveData === true
  return !compact && !saveData
}

export default function HumanoidLab({ showcaseMode = false }) {
  const [compact] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(COMPACT_DEVICE_QUERY).matches
  ))
  const [activated, setActivated] = useState(shouldAutoLoad)
  const [interactive, setInteractive] = useState(() => (
    typeof window === 'undefined' || !window.matchMedia(COMPACT_DEVICE_QUERY).matches
  ))
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [motion, setMotion] = useState('idle')
  const [exploded, setExploded] = useState(false)
  const [guideModule, setGuideModule] = useState(null)
  const [guidePlaying, setGuidePlaying] = useState(false)
  const apiRef = useRef(null)
  const stageRef = useRef(null)
  const wasShowcaseRef = useRef(false)

  useEffect(() => {
    if (showcaseMode) {
      wasShowcaseRef.current = true
      setActivated(true)
      if (compact) setInteractive(false)
      setGuideModule('core')
      return
    }
    if (wasShowcaseRef.current) {
      wasShowcaseRef.current = false
      setGuideModule(null)
    }
  }, [compact, showcaseMode])

  useEffect(() => {
    if (!guidePlaying && !showcaseMode) return undefined
    const timer = window.setInterval(() => {
      setGuideModule((current) => {
        const index = GUIDE_MODULES.findIndex((item) => item.id === current)
        if (showcaseMode) return GUIDE_MODULES[Math.min(index + 1, GUIDE_MODULES.length - 1)].id
        return GUIDE_MODULES[(index + 1) % GUIDE_MODULES.length].id
      })
    }, showcaseMode ? 1400 : 2100)
    return () => window.clearInterval(timer)
  }, [guidePlaying, showcaseMode])

  const selectMotion = (nextMotion) => {
    setExploded(false)
    setMotion(nextMotion)
  }

  const toggleExploded = () => {
    setExploded((current) => !current)
    setMotion('attention')
  }

  const selectGuideModule = (moduleId) => {
    setGuidePlaying(false)
    setGuideModule((current) => current === moduleId ? null : moduleId)
  }

  const fullscreenAvailable = typeof document !== 'undefined'
    && document.fullscreenEnabled !== false
    && typeof HTMLElement !== 'undefined'
    && 'requestFullscreen' in HTMLElement.prototype

  const enterFullscreen = async () => {
    try {
      await stageRef.current?.requestFullscreen?.()
    } catch {
      // Fullscreen can be denied by the browser or embedding context.
    }
  }

  const activateModel = () => {
    setActivated(true)
    if (compact) setInteractive(false)
  }

  return (
    <div className="digital-twin-lab" data-model-loaded={loaded ? 'true' : 'false'}>
      <div className="twin-stage" ref={stageRef}>
        <div className="twin-stage__grid" aria-hidden="true" />

        {activated && !error && (
          <Viewer
            motion={motion}
            exploded={exploded}
            interactive={interactive}
            guideModule={guideModule}
            setLoaded={setLoaded}
            setProgress={setProgress}
            setError={setError}
            apiRef={apiRef}
          />
        )}

        {!activated && (
          <div className="twin-gate">
            <img src={MODEL_POSTER_URL} alt="Berkeley Humanoid Lite 交互数字样机加载预览" />
            <div className="twin-gate__shade" />
            <div className="twin-gate__content">
              <span><Boxes size={18} /> OFFICIAL MODEL PACKAGE</span>
              <h3>加载交互数字样机</h3>
              <p>移动端按需加载：官方 URDF + 26 个 STL 网格，共约 43 MB。</p>
              <button type="button" onClick={activateModel}>
                <Play size={16} /> 启动 3D 展示
              </button>
            </div>
          </div>
        )}

        {activated && !loaded && !error && (
          <div className="twin-loader" role="status" aria-live="polite">
            <span className="twin-loader__ring" />
            <strong>{String(progress).padStart(2, '0')}%</strong>
            <small>ASSEMBLING LOCAL DIGITAL MODEL</small>
            <i><span style={{ width: `${progress}%` }} /></i>
          </div>
        )}

        {error && (
          <div className="twin-error" role="alert">
            <ScanLine size={25} />
            <strong>3D 模型暂时不可用</strong>
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>重新加载</button>
          </div>
        )}

        {compact && loaded && (
          <button
            className={`twin-interaction-toggle ${interactive ? 'is-active' : ''}`}
            type="button"
            aria-pressed={interactive}
            onClick={() => setInteractive((current) => !current)}
          >
            <MousePointer2 size={15} /> {interactive ? '退出 3D 交互' : '启用 3D 交互'}
          </button>
        )}

        <div className="twin-stage__head">
          <span><i className={loaded ? 'is-online' : ''} /> INTERACTIVE DIGITAL MODEL</span>
          <small>{exploded ? 'ASSEMBLY / EXPLODED' : `${MOTIONS.find((item) => item.id === motion)?.code} SEQUENCE`}</small>
        </div>

        <div className="twin-toolbar">
          <button type="button" onClick={() => {
            setGuidePlaying(false)
            setGuideModule(null)
            apiRef.current?.resetCamera()
          }} aria-label="重置三维视角" disabled={!loaded}>
            <RotateCcw size={16} /><span>重置视角</span>
          </button>
          <button type="button" onClick={enterFullscreen} aria-label="全屏查看三维模型" disabled={!loaded || !fullscreenAvailable}>
            <Maximize2 size={16} /><span>全屏</span>
          </button>
        </div>

        <div className="twin-axis" aria-hidden="true">
          <span className="twin-axis__z">Z</span>
          <span className="twin-axis__x">X</span>
          <span className="twin-axis__y">Y</span>
          <i />
        </div>

        <div className="twin-hint">
          <MousePointer2 size={17} />
          <span>拖动旋转<br />滚轮 / 双指缩放</span>
        </div>

        <div className="twin-stage__caption">
          <span>MODEL / BERKELEY HUMANOID LITE V1</span>
          <strong>{exploded ? 'EXPLODED ASSEMBLY' : '22-JOINT MODEL LOADED'}</strong>
        </div>
      </div>

      <div className="twin-control-deck">
        <div className="twin-control-deck__head">
          <div><i className={loaded ? 'is-online' : ''} /><span>MOTION PREVIEW / PROGRAMMATIC</span></div>
          <button className={exploded ? 'is-active' : ''} type="button" onClick={toggleExploded} disabled={!loaded}>
            <Boxes size={15} /> {exploded ? '重新组装' : '展开结构'}
          </button>
        </div>
        <div className="motion-list" role="group" aria-label="机器人动作选择">
          {MOTIONS.map((item, index) => (
            <button
              className={!exploded && motion === item.id ? 'is-active' : ''}
              type="button"
              key={item.id}
              onClick={() => selectMotion(item.id)}
              disabled={!loaded}
            >
              <i>{String(index + 1).padStart(2, '0')}</i>
              <span>{item.label}<small>{item.code}</small></span>
            </button>
          ))}
        </div>
      </div>

      <aside className="twin-guide" aria-label="三维结构导览">
        <div className="twin-guide__head">
          <div><small>STRUCTURE GUIDE</small><strong>选择分区聚焦查看</strong></div>
          <button
            className={guidePlaying || showcaseMode ? 'is-active' : ''}
            type="button"
            onClick={() => setGuidePlaying((current) => !current)}
            disabled={!loaded || showcaseMode}
          >
            {guidePlaying || showcaseMode ? <Pause size={13} /> : <Play size={13} />}
            AUTO
          </button>
        </div>
        <div className="twin-guide__list">
          {GUIDE_MODULES.map((module) => (
            <button
              className={guideModule === module.id ? 'is-active' : ''}
              type="button"
              key={module.id}
              onClick={() => selectGuideModule(module.id)}
              aria-pressed={guideModule === module.id}
              disabled={!loaded || showcaseMode}
            >
              <small>{module.code}</small>
              <span>{module.label}</span>
              <em>{module.meta}</em>
            </button>
          ))}
        </div>
        <div className="twin-guide__detail">
          <small>{guideModule ? `FOCUS / ${guideModule.toUpperCase()}` : 'OVERVIEW / ALL PARTS'}</small>
          <strong>{GUIDE_MODULES.find((item) => item.id === guideModule)?.label ?? '整机结构'}</strong>
          <p>{GUIDE_MODULES.find((item) => item.id === guideModule)?.copy ?? '选择一个结构分区，模型将高亮对应的官方网格并移动到讲解视角。'}</p>
        </div>
        <div className="twin-guide__stats">
          <div><strong>22</strong><span>JOINTS</span></div>
          <div><strong>26</strong><span>MESHES</span></div>
          <div><strong>43</strong><span>MB</span></div>
        </div>
      </aside>

      <div className="twin-source">
        <span>LOCAL DISPLAY MODEL / NOT LIVE TELEMETRY · OFFICIAL ASSETS · CC BY-SA 4.0</span>
        <a href="https://github.com/HybridRobotics/Berkeley-Humanoid-Lite-Assets" target="_blank" rel="noreferrer">
          查看模型仓库 <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}
