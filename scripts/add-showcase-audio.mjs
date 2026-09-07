import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'video-output')
const picture = path.join(outputDir, '3S人形机器人_比赛展示视频_实机影像完整版_无音轨.mp4')
const output = path.join(outputDir, '3S人形机器人_比赛展示视频_实机影像完整版.mp4')
const duration = Number(spawnSync(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', picture], { encoding: 'utf8', windowsHide: true }).stdout.trim())
if (!Number.isFinite(duration) || duration <= 0) throw new Error('Unable to read full showcase duration')
const fadeOut = Math.max(0, duration - 4)
const inputs = [
  [`sine=frequency=55:duration=${duration}:sample_rate=48000`],
  [`sine=frequency=82.41:duration=${duration}:sample_rate=48000`],
  [`anoisesrc=color=pink:amplitude=0.12:duration=${duration}:sample_rate=48000`],
  ...[0, 15, 34, 47, 70, 83].map((_, index) => [`sine=frequency=${[330, 392, 440, 349, 494, 523][index]}:duration=1.8:sample_rate=48000`]),
]
const args = ['-y', '-i', picture]
for (const [source] of inputs) args.push('-f', 'lavfi', '-i', source)
const delays = [0, 8000, 110000, 128000, 141000, Math.max(0, Math.round((duration - 10) * 1000))]
const filters = [
  '[1:a]volume=0.055,tremolo=f=0.10:d=0.32,lowpass=f=260[a0]',
  '[2:a]volume=0.032,tremolo=f=0.11:d=0.26,lowpass=f=420[a1]',
  '[3:a]volume=0.020,highpass=f=180,lowpass=f=2800[a2]',
  ...delays.map((delay, index) => `[${index + 4}:a]volume=0.055,afade=t=in:st=0:d=0.12,afade=t=out:st=0.35:d=1.4,adelay=${delay}|${delay}[c${index}]`),
  `[a0][a1][a2]${delays.map((_, index) => `[c${index}]`).join('')}amix=inputs=9:normalize=0,afade=t=in:st=0:d=2.5,afade=t=out:st=${fadeOut}:d=4,loudnorm=I=-24:TP=-2:LRA=7,pan=stereo|c0=c0|c1=c0[aout]`,
]
args.push('-filter_complex', filters.join(';'), '-map', '0:v:0', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(duration), '-movflags', '+faststart', output)

await new Promise((resolve, reject) => {
  const child = spawn(ffmpegPath, args, { cwd: root, stdio: 'inherit', windowsHide: true })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))
})
console.log(`Created: ${output}`)
