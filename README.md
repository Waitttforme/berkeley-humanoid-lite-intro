# Berkeley Humanoid Lite 物联网竞赛数字展厅

一个以 Berkeley Humanoid Lite 为真实载体的沉浸式物联网竞赛展示项目。展厅使用官方实机、论文与机器人描述资料，以暗黑工业视觉把关节感知、嵌入式控制、现场总线、机载边缘计算和浏览器数字样机串成一条可观看、可理解、可追溯的技术链路。

本项目定位为**交互式数字展厅与智慧服务演示系统**：适合答辩大屏、展台触控和赛前演示，不是机器人在线控制台。页面可完全在浏览器本地完成 3D 渲染和“感知—诊断—决策—服务—复检”闭环演示；当前未接入实机遥测，不向机器人发送控制指令，也没有使用虚构的云平台或 MQTT 链路冒充在线物联网数据。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:5173/`。

生产构建：

```bash
npm run build
npm run preview
```

桌面与移动端视觉、交互自检：

```bash
npm run qa:visual
```

该命令会构建项目，启动临时预览，并在根目录生成 `preview-*.png`。

## 比赛展演与六分区导览

首页的“观看约 70 秒系统展演”可一键进入九章自动讲解流程，依次展示平台定位、信号链路、智慧服务、数字展品、实机证据、系统解剖、开放软件栈、开放构建路径和官方资料终章；演示过程可暂停、继续、跳到下一章或退出，适合现场答辩和展台自动演示。

页面内容划分为六个主要展区：

1. **项目**：官方实机主视觉、0.8 m / 16 kg / 22 个执行关节等关键规格，以及双足行走、写字、拆包和魔方操作证据。
2. **信号链路**：以五层交互图解释感知、嵌入式控制、现场总线、边缘计算和浏览器展示之间的关系。
3. **智慧服务**：通过常规巡检、关节温升、CAN 波动和姿态偏移四种可复现场景，运行状态感知、透明规则诊断、风险分级、服务决策、本地处置单和复检归档闭环。
4. **数字展品**：由官方 URDF 与 26 个 STL 在浏览器本地组装的交互数字样机，可旋转、缩放、拆解、聚焦部件并播放程序化关节动作。
5. **开放栈**：呈现 CAD/打印、FOC/CAN、Isaac Lab、MuJoCo、ONNX 与实机部署的软件链路。
6. **构建**：以工程账册汇总 BOM、3D 打印、装配、固件刷写和部署的官方入口，并保留电机控制器刷写档案、全宽安全提示和官方来源终章。

展厅支持桌面和移动端响应式布局、键盘交互、复制反馈与 `prefers-reduced-motion`；无需连接机器人即可完成完整导览和智慧服务流程。

## 3S 智慧服务演示

智慧服务台是一个可运行、可重复演示的软件功能，用于呈现人形机器人运维场景中的完整服务链路：

1. 选择常规巡检、关节温升、CAN 波动或姿态偏移场景。
2. 本地确定性数据流持续更新关节温度、驱动电流、CAN 丢包率和 IMU 倾角。
3. 透明规则引擎显示触发指标、演示阈值、健康评分和判定原因。
4. 系统形成分级处置建议，并生成仅存在于当前页面的本地处置记录。
5. 用户确认处置后进入复检，指标恢复并完成服务闭环。

所有数值均为浏览器生成的**场景模拟数据**，所有阈值均为**演示规则**，不代表实机安全限值；处置单不会发送到外部系统，服务建议也不会自动控制机器人。该边界在模块界面中持续可见。

## 真实物联链路与展示边界

页面讲解的是 Berkeley Humanoid Lite 官方硬件与软件资料所对应的本体链路：

```text
关节支路：编码器 / 相电流 → STM32G431 / FOC ↔ 4 × CAN 2.0 ↔ USB-CAN ┐
机身支路：IMU ─────────────────────────────────────────────→ USB ───────┤
                                                                          ↓
                                                     Intel N95 机载边缘计算
                                                                          ↓
                                                       浏览器离线数字展厅
```

- 编码器与相电流构成关节感知入口，STM32G431 在关节侧执行 FOC 和状态处理；机身 IMU 通过独立 USB 支路接入 Intel N95，不经过关节控制器。
- 四条 CAN 2.0 总线经 USB-CAN 接入 Intel N95 机载计算机；关键运动闭环位于机器人本体，不依赖远端云端。
- 最后一层浏览器系统包含结构、动作与数据路径的**离线原理展示**，以及智慧服务的**本地场景模拟**。当前实现不读取 CAN 数据或 N95 实时状态。
- 智慧服务数值来自确定性的本地模拟；其他参数、动作和视觉动效来自项目资料、论文指标或程序化演示，均不应解读为实时遥测；`250 Hz` 与 `25 Hz` 均明确标注为论文报告值。
- 当前项目不包含 MQTT Broker、云数据库、数字孪生同步服务或远程控制接口；除官方资料链接和媒体来源外，不宣称存在任何虚构云链路。

## 离线交互数字样机

数字样机采用 Berkeley Humanoid Lite 官方 `v2025.09.03` 机器人描述资产：完整 URDF 提供关节树、轴心与限位，26 个二进制 STL 提供整机视觉几何。原始 URDF 与网格合计约 43 MB、约 866,000 个三角面，包含 22 个可动关节。

- [官方 v2025.09.03 发布页](https://github.com/HybridRobotics/Berkeley-Humanoid-Lite-Assets/releases/tag/v2025.09.03)
- [官方模型资料 ZIP](https://github.com/HybridRobotics/berkeley-humanoid-lite-assets/releases/download/v2025.09.03/berkeley_humanoid_lite_assets_data.zip)
- [完整 URDF](https://raw.githubusercontent.com/HybridRobotics/berkeley-humanoid-lite-assets/v2025.09.03/data/robots/berkeley_humanoid/berkeley_humanoid_lite/urdf/berkeley_humanoid_lite.urdf)
- [26 个 STL 网格目录](https://github.com/HybridRobotics/Berkeley-Humanoid-Lite-Assets/tree/v2025.09.03/data/robots/berkeley_humanoid/berkeley_humanoid_lite/meshes)

为避免大模型阻塞首屏，桌面端在 3D 展示区接近视口时延迟加载；手机端默认保留轻量预览，仅在用户点击后按需加载模型，以减少流量、内存与 GPU 压力。模型加载完成后，关节动作、拆解位移、材质和灯光均在浏览器本地运行，不需要实机、云服务或持续网络连接。

机器人描述与 3D 模型资产采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 许可，归属 [Berkeley Humanoid Lite Project Developers / HybridRobotics](https://github.com/HybridRobotics/Berkeley-Humanoid-Lite-Assets)。本项目保留官方 URDF 层级与 STL 几何文件不变，只在浏览器运行时增加材质、灯光、程序化关节动作和拆解位移；模型归属及具体适配说明见 `public/humanoid/ATTRIBUTION.md`。若后续分发减面、转格式等派生模型，仍需保留归属、来源、许可链接和修改说明，并按相同许可共享。

## 资料与媒体来源

内容依据以下官方渠道整理：

- [官方文档](https://berkeley-humanoid-lite.gitbook.io/docs)
- [官方项目站](https://lite.berkeley-humanoid.org/)
- [GitHub 主仓库](https://github.com/HybridRobotics/Berkeley-Humanoid-Lite)
- [官方机器人描述资产](https://github.com/HybridRobotics/Berkeley-Humanoid-Lite-Assets)
- [RSS 2025 / arXiv 论文](https://arxiv.org/abs/2504.17249)

页面中的执行器核心照片来自官方文档 `Building the Actuator / Preparing the motor`；可重构形态图、系统组件图与实验图来自 Chi et al., RSS 2025 论文及其公开项目资料。

媒体 © Berkeley Humanoid Lite Project / Chi et al., RSS 2025。主代码采用 MIT License；其他素材和转载权限以各官方来源的许可说明为准。此页面为非官方中文介绍，不代表 UC Berkeley 或项目团队。

Berkeley Humanoid Lite 是高功率研究原型，不是消费级产品。进行采购、刷写、标定或运动测试前，请以官方最新版本文档为准并严格执行安全措施。
