// Adapted from the user-provided classmate handoff (SHA256 recorded in HANDOFF-INTEGRATION.md).
// Procedural joint animation, not a trained control policy or telemetry.
import * as THREE from 'three'
import type { URDFJoint, URDFRobot } from 'urdf-loader'
type MotionName = 'idle' | 'wave' | 'squat' | 'combat' | 'walk' | 'attention'

export const MOTIONS: { id: MotionName; label: string; code: string }[] = [
  { id: 'idle', label: '待机', code: 'IDLE' },
  { id: 'wave', label: '招手', code: 'WAVE' },
  { id: 'squat', label: '下蹲', code: 'SQUAT' },
  { id: 'combat', label: '姿态展示', code: 'COMBAT' },
  { id: 'walk', label: '步行', code: 'WALK' },
  { id: 'attention', label: '立正', code: 'RESET' },
]

function showcaseMaterial(name: string) {
  let color = '#efefeb'
  if (name.includes('roll')) color = '#e7e8e5'
  if (name.includes('yaw')) color = '#f3f3ef'
  if (name.includes('base') || name.includes('imu')) color = '#101316'
  if (name.includes('hand_link')) color = '#f5f5f1'

  return new THREE.MeshStandardMaterial({
    color,
    metalness: name.includes('base') || name.includes('imu') ? 0.9 : 0.62,
    roughness: name.includes('base') || name.includes('imu') ? 0.18 : 0.21,
    envMapIntensity: 1.35,
  })
}

const BASE_POSE: Record<string, number> = {
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

const MOTION_POSES: Record<MotionName, Partial<Record<string, number>>> = {
  idle: {},
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
  wave: {
    arm_right_shoulder_pitch_joint: 0.04,
    arm_right_shoulder_roll_joint: -1.18,
    arm_right_shoulder_yaw_joint: 0.68,
    arm_right_elbow_pitch_joint: -1.3,
    arm_right_elbow_roll_joint: 0.08,
  },
  squat: {
    arm_left_shoulder_pitch_joint: -0.42,
    arm_right_shoulder_pitch_joint: 0.42,
    arm_left_shoulder_roll_joint: 0.28,
    arm_right_shoulder_roll_joint: -0.28,
    arm_left_elbow_pitch_joint: 0.22,
    arm_right_elbow_pitch_joint: -0.22,
    leg_left_hip_pitch_joint: -0.6,
    leg_right_hip_pitch_joint: -0.6,
    leg_left_knee_pitch_joint: 1.16,
    leg_right_knee_pitch_joint: 1.16,
    leg_left_ankle_pitch_joint: -0.56,
    leg_right_ankle_pitch_joint: -0.56,
    leg_left_hip_roll_joint: 0.1,
    leg_right_hip_roll_joint: -0.1,
  },
  combat: {
    // Low diagonal martial-arts stance from the supplied reference:
    // right side reaches up/left, left side counterbalances down/right.
    arm_left_shoulder_pitch_joint: 0.32,
    arm_right_shoulder_pitch_joint: 0.58,
    arm_left_shoulder_roll_joint: 0.72,
    arm_right_shoulder_roll_joint: -1.27,
    arm_left_shoulder_yaw_joint: 0.16,
    arm_right_shoulder_yaw_joint: 0.52,
    arm_left_elbow_pitch_joint: 0.24,
    arm_right_elbow_pitch_joint: -0.3,
    arm_left_elbow_roll_joint: -0.08,
    arm_right_elbow_roll_joint: 0.08,
    leg_left_hip_roll_joint: 0.32,
    leg_left_hip_yaw_joint: -0.2,
    leg_left_hip_pitch_joint: -0.86,
    leg_left_knee_pitch_joint: 1.76,
    leg_left_ankle_pitch_joint: -0.72,
    leg_left_ankle_roll_joint: -0.15,
    leg_right_hip_roll_joint: -0.88,
    leg_right_hip_yaw_joint: 0.12,
    leg_right_hip_pitch_joint: -0.34,
    leg_right_knee_pitch_joint: 0.2,
    leg_right_ankle_pitch_joint: 0.08,
    leg_right_ankle_roll_joint: 0.15,
  },
  walk: {},
}

export function updatePose(
  robot: URDFRobot,
  motion: MotionName,
  time: number,
  delta: number,
  current: Record<string, number>,
) {
  const values = { ...BASE_POSE, ...MOTION_POSES[motion] } as Record<string, number>
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
    // With no wrist joint, a readable greeting comes from a bent, raised arm
    // and a coordinated forearm arc rather than simply rolling the hand mesh.
    values.arm_right_elbow_pitch_joint += handWave * 0.2
    values.arm_right_shoulder_yaw_joint += followThrough * 0.075
    values.arm_right_elbow_roll_joint += followThrough * 0.22
    values.arm_right_shoulder_pitch_joint += Math.sin(time * 2.55) * 0.035
    values.arm_left_shoulder_roll_joint += Math.sin(time * 1.25) * 0.018
  }

  if (motion === 'attention') {
    const readyBreath = Math.sin(time * 1.35)
    values.arm_left_shoulder_roll_joint += readyBreath * 0.018
    values.arm_right_shoulder_roll_joint -= readyBreath * 0.018
    values.arm_left_elbow_pitch_joint += readyBreath * 0.025
    values.arm_right_elbow_pitch_joint -= readyBreath * 0.025
  }

  if (motion === 'combat') {
    const stanceBreath = Math.sin(time * 1.35)
    const weightShift = Math.sin(time * 1.35 - 0.65)
    values.arm_left_shoulder_roll_joint += stanceBreath * 0.018
    values.arm_right_shoulder_roll_joint -= stanceBreath * 0.018
    values.arm_left_elbow_pitch_joint += weightShift * 0.018
    values.leg_left_knee_pitch_joint += stanceBreath * 0.025
    values.leg_left_ankle_pitch_joint -= stanceBreath * 0.018
    values.leg_right_hip_roll_joint -= weightShift * 0.018
  }

  if (motion === 'walk') {
    const stride = Math.sin(phase)
    const opposite = Math.sin(phase + Math.PI)
    values.leg_left_hip_pitch_joint = stride * 0.28
    values.leg_right_hip_pitch_joint = opposite * 0.28
    values.leg_left_knee_pitch_joint = 0.08 + Math.max(0, -stride) * 0.52
    values.leg_right_knee_pitch_joint = 0.08 + Math.max(0, -opposite) * 0.52
    values.leg_left_ankle_pitch_joint = -stride * 0.16
    values.leg_right_ankle_pitch_joint = -opposite * 0.16
    // Shoulder joint axes are mirrored by the URDF. Use the phase opposite
    // to the former pair so each forward leg is matched by the other arm.
    values.arm_left_shoulder_pitch_joint = opposite * 0.3
    values.arm_right_shoulder_pitch_joint = -stride * 0.3
  }

  Object.entries(values).forEach(([name, target]) => {
    const joint = robot.joints[name] as URDFJoint | undefined
    if (!joint) return
    current[name] = THREE.MathUtils.damp(current[name] ?? 0, target, 6.8, delta)
    joint.setJointValue(current[name])
  })
}


