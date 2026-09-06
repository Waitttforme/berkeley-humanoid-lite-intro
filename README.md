# 3S 人形物联网服务系统

面向物联网技术展示与实验室运维场景的交互式网页。首页以 22 关节人形机器人数字模型为核心，把结构、动作、智能关节、端边协同、异常诊断和维护服务组织成一条连续体验路径。

## 核心功能

- 首页 3D 数字机器人：支持拖动旋转、固定观察尺度和视角复位。
- 六组程序化动作：待机、招手、下蹲、战斗、步行与立正。
- 结构展开：主要零件沿三维球面展开，配合自动环绕、粒子、能量环和冲击波；可一键重新组装。
- 5010 / 6512 智能关节：展示两种关节建模及其紧凑执行、高承载、传动、反馈和维护特点。
- 智慧服务演示：覆盖关节温升、通信异常、姿态偏移、任务暂停、维护工单、复检与归档。
- 工程实物证据：按节点、零件、肢体与整机组织制造和集成照片。
- 在线技术报告：可直接打印或保存为 PDF。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 自动检查

```bash
npm test
npm run qa:visual
npm run qa:technical
npm run qa:premium
```

- `npm test`：验证服务状态机、故障复检和归档约束。
- `qa:visual`：验证首屏模型、动作、结构展开、两类关节、服务流程和多尺寸布局。
- `qa:technical`：验证 26 个模型网格、脚底锁定、暂停、重组和移动端交互。
- `qa:premium`：验证字体渲染、文本裁切、响应式排版和动态效果降级。

## 主要目录

```text
src/ModelStudio.jsx       首屏交互与动作控制界面
src/StudioViewer.jsx      URDF/STL 加载、材质、动作和结构展开
src/classmateMotion.ts    六组关节动作编排
src/CompetitionApp.jsx    关节、架构、服务、实物与成果页面
src/serviceEngine.js      智慧服务状态机与诊断规则
public/humanoid/          机器人描述与模型网格
public/media/joints/      5010 / 6512 关节建模图片
public/media/project-evidence/  工程实物照片
scripts/                  自动化浏览器与业务检查
```

模型及第三方素材的归属和许可信息保留在 `public/humanoid/ATTRIBUTION.md`，页面运行不依赖外部视频。
