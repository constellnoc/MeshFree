# MeshFree 3D 预览器稳定性与动画支持工作文档

最后更新：2026.05.06

## 1. 文档定位

本文档只讨论一个明确范围内的目标：

- 修正前端 `ModelPreviewViewer` 的基础显示稳定性
- 优先解决静态模型与骨骼模型的异常受光问题
- 为带动画的 `glb/gltf` 增加运行时检测
- 在检测基础上补最小可用的动画播放控件

一句话：

- 本轮要把预览器从“能显示大部分模型”推进到“能更稳地显示，并能基础播放已有动画”。

## 2. 当前问题与现状依据

当前预览器集中在：

- `client/src/components/ModelPreviewViewer.tsx`

### 2.1 当前已知问题

这轮确认的核心问题有 3 类：

1. 光影表现不稳定
   - 部分模型看起来发灰
   - 部分模型明暗层次被冲平
   - 某些角度会出现不自然的底部冷光

2. 骨骼 / 蒙皮模型局部异常发黑
   - 某些本身带可动部件的模型，在预览器里局部会明显更黑
   - 这类问题更像查看器渲染和场景克隆策略不稳，而不是上传链路本身错误

3. 当前没有动画能力
   - 查看器不会检测模型是否带 animation clip
   - 查看器没有播放、暂停、重置和 clip 切换入口

### 2.2 当前代码现状

当前场景克隆逻辑是：

```tsx
const clonedScene = useMemo(() => {
  const nextScene = gltf.scene.clone(true);
  prepareSceneColors(nextScene);
  return nextScene;
}, [gltf.scene]);
```

这对普通静态网格通常可用，但对 `SkinnedMesh` / 骨骼模型不够稳。

当前灯光是“强环境光 + 半球光 + 三盏方向光”的组合：

```tsx
<ambientLight intensity={1.35} />
<hemisphereLight groundColor="#111827" intensity={0.92} color="#ffffff" />
<directionalLight color="#f8fafc" intensity={1.25} position={[4, 6, 5]} />
<directionalLight color="#e2e8f0" intensity={0.42} position={[-5, 3, 4]} />
<directionalLight color="#dbeafe" intensity={0.24} position={[0, -2, -4]} />
```

这类配置容易带来：

- 补光过强，明暗关系不清
- 亮背景下整体偏平
- 底部蓝色补光让局部产生不自然色偏

当前材质预处理还会把所有网格统一改为 `DoubleSide`：

```tsx
if (previewMaterial.map) {
  previewMaterial.map.colorSpace = SRGBColorSpace;
}

if (previewMaterial.emissiveMap) {
  previewMaterial.emissiveMap.colorSpace = SRGBColorSpace;
}

previewMaterial.side = DoubleSide;
previewMaterial.needsUpdate = true;
```

这虽然能减少某些薄片模型“背面消失”的情况，但也会带来两个副作用：

- 把原始材质侧面语义全部抹平
- 在部分模型上放大不自然受光和发黑问题

当前渲染器没有动画检测或播放逻辑。代码里没有使用：

- `useAnimations`
- `AnimationMixer`

## 3. 本轮范围与边界

### 3.1 本轮要做

- 修正骨骼模型更稳的场景克隆方式
- 收敛灯光和材质侧面策略
- 运行时检测 `glb/gltf` 是否包含动画
- 对带动画模型提供最小可用播放控件

### 3.2 本轮不做

- 不改后端上传、转换、审核、公开链路
- 不把动画存在性写回数据库
- 不承诺 `OBJ -> GLB` 转换后动画保真
- 不做时间轴拖拽、进度条、倍速、音频、事件脚本、物理模拟
- 不做专业 DCC 级播放器

### 3.3 已写死的产品决策

- 动画支持范围限定为：预览 `glb/gltf` 文件里已经存在的内嵌 animation clip
- 动画检测只在前端运行时完成，不新增数据库字段
- 动画播放控件属于查看器能力，不改变资源审核、公开、预览开关业务规则
- 第一版动画控件默认自动播放第一个 clip，同时提供暂停和重置入口

## 4. 实施总原则

- 先修底层稳定性，再补动画检测，再补播放控件
- 每一步都应可独立回归
- 优先保留模型原始材质意图，不用“粗暴全局兜底”掩盖问题
- 如果某个问题只影响少量模型，优先定向处理，不做新的全局强制策略

## 5. 分步实施方案

### Step 1：修骨骼模型克隆方式

#### 目标

把当前对所有模型统一使用的 `gltf.scene.clone(true)`，切换为对骨骼模型更稳的克隆方式，减少 `SkinnedMesh`、骨骼绑定和局部受光错乱问题。

#### 要做的事

- 在 `client/src/components/ModelPreviewViewer.tsx` 中引入适合骨骼模型的克隆工具
- 用更稳的克隆结果替换当前 `gltf.scene.clone(true)` 结果
- 保持现有相机 framing、控制器和材质预处理流程继续作用在克隆后的场景上
- 保持 `gltf.scene` 作为源场景，供 parser 相关逻辑继续使用

#### 推荐实现

建议优先使用：

- `SkeletonUtils.clone(gltf.scene)`

推荐原因：

- 它对骨骼、蒙皮和骨骼绑定关系更稳
- 它比普通 `clone(true)` 更适合角色类和可动部件模型

推荐修改思路：

1. 保留 `gltf.scene` 作为源场景
2. 生成 `clonedScene` 时改用骨骼友好克隆
3. 继续对 `clonedScene` 执行 `prepareSceneColors`
4. 继续把 `clonedScene` 交给 `<primitive object={clonedScene} />`

#### 注意点

- 当前 `applyLegacySpecGlossMaterials()` 会并行遍历 `sourceScene` 与 `clonedScene`
- 实施时要确认替换克隆方式后，两棵树的遍历顺序仍可稳定对应
- 如果手测发现材质映射错位，再把“按遍历顺序对位”调整成更稳的对象映射方式

#### 本步不做

- 不在这一步顺手改灯光
- 不在这一步引入动画播放
- 不为材质异常额外加新的兜底补丁

#### 验收标准

- 普通静态 GLB 的现有显示能力不被破坏
- 骨骼模型打开时，不再出现明显的局部黑块、姿态错乱或绑定异常
- 模型重置视角、旋转、缩放和平移仍正常工作

### Step 2：收敛灯光与材质侧面策略

#### 目标

让查看器默认打光更自然，同时停止全局强制 `DoubleSide` 对所有材质生效。

#### 要做的事

- 下调环境光和半球光强度
- 精简方向光数量
- 去掉从模型下方打上来的冷色补光
- 把材质侧面策略从“统一 `DoubleSide`”改为“默认尊重原材质 side”

#### 已确认的策略选择

本轮正式采用：

- 保留原材质 `side`
- 不再对所有材质统一强制 `DoubleSide`

不采用：

- “继续全局 `DoubleSide`，只调灯光”

原因：

- 原始材质的单面 / 双面语义本来就是模型资产的一部分
- 全局强制改成 `DoubleSide` 容易掩盖问题，也容易制造新的受光异常
- 预览器第一优先级应是尽量忠实显示，而不是把所有模型都强行修成一个样子

#### 推荐初始灯光方案

建议先把默认灯光收敛到“一主一辅 + 温和环境补光”：

```tsx
<ambientLight intensity={0.55} />
<hemisphereLight color="#ffffff" groundColor="#1f2937" intensity={0.35} />
<directionalLight color="#ffffff" intensity={1.15} position={[5, 6, 7]} />
<directionalLight color="#e5e7eb" intensity={0.28} position={[-4, 2, 4]} />
```

同时建议把渲染曝光从：

- `gl.toneMappingExposure = 1.08`

下调到一个更保守的起点，例如：

- `gl.toneMappingExposure = 0.98`

说明：

- 这里给的是第一轮推荐起点，不是绝对值
- 如果手测发现整体偏暗，可小幅回调，但不要重新加回底部蓝色补光

#### 推荐材质处理方案

`prepareSceneColors()` 本轮保留这些动作：

- 贴图 `map` 设置为 `SRGBColorSpace`
- `emissiveMap` 设置为 `SRGBColorSpace`

本轮删除这个全局动作：

- `previewMaterial.side = DoubleSide`

#### 本步不做

- 不在本步加入环境贴图或 HDRI
- 不做阴影贴图、接触阴影、地面反射
- 不做“自动识别薄片材质再强制双面”的启发式规则

#### 验收标准

- 默认白底或浅底下，模型不再明显发灰、发白或层次过平
- 原先底部异常偏蓝的模型不再出现明显冷色补光感
- 对普通静态模型，去掉全局 `DoubleSide` 后不应出现大面积意外缺面
- 对原本就定义为双面材质的模型，其显示效果仍应正常

### Step 3：补动画存在性检测

#### 目标

让查看器在运行时识别当前 `glb/gltf` 是否包含可播放动画，并形成明确前端状态。

#### 要做的事

- 从 `useGLTF(modelUrl)` 结果中读取 `animations`
- 过滤出可用 clip
- 在组件内形成最小状态：
  - `animationClips`
  - `hasAnimations`
  - `activeAnimationName`

#### 推荐状态定义

建议在 `ModelPreviewViewer` 或其内部子组件中形成这些运行时状态：

- `const animationClips = gltf.animations ?? []`
- `const hasAnimations = animationClips.length > 0`
- `const defaultAnimationName = animationClips[0]?.name ?? null`
- `const [activeAnimationName, setActiveAnimationName] = useState(defaultAnimationName)`

如果存在无名 clip：

- 前端展示层统一兜底命名，例如 `Animation 1`、`Animation 2`

#### UI 行为

- 无动画模型：
  - 不显示动画控制区
- 有动画模型：
  - 显示“检测到动画”的查看器控制区
  - 如果只有一个 clip，可只显示当前状态和播放按钮
  - 如果有多个 clip，显示切换入口

#### 文案文件

本步需要同步补到：

- `client/src/lib/i18n.ts`

建议新增文案类型：

- 已检测到动画
- 播放
- 暂停
- 重置动画
- 切换动画
- 当前动画名称

#### 本步不做

- 不改接口返回结构
- 不把动画数量写回服务端
- 不做动画时长统计和进度条

#### 验收标准

- 带动画的 GLB 能被稳定识别
- 无动画的 GLB 不会误显示控制区
- 多个 clip 的模型能在 UI 中区分当前选中的动画

### Step 4：补 GLB 动画播放控件 MVP

#### 目标

在已完成动画检测的基础上，让带动画模型能在查看器中完成最小可用播放。

#### 要做的事

- 引入动画播放所需的查看器逻辑
- 自动播放第一个 clip
- 提供播放 / 暂停按钮
- 提供重置按钮
- 对多个 clip 提供切换入口
- 在切换 clip 时正确停止旧动作并启动新动作

#### 推荐实现

优先使用：

- `useAnimations(animationClips, clonedScene)`

推荐原因：

- 它与当前 `@react-three/drei` 技术栈一致
- 能减少手写 `AnimationMixer` 管理负担

推荐控制逻辑：

1. 查看器加载完成后，若 `hasAnimations === true`
   - 默认选中第一个 clip
   - 默认自动播放
2. 点击暂停
   - 暂停当前 action
3. 点击播放
   - 继续当前 action
4. 点击重置
   - 当前 action 回到 0 秒并重新播放
5. 切换 clip
   - 先停止旧 action
   - 再重置并播放新 action

#### 推荐 UI 最小集合

- 一个播放 / 暂停按钮
- 一个重置按钮
- 一个当前动画名称显示区
- 当 clip 数量大于 1 时显示一个下拉选择器

#### 样式范围

样式优先补在：

- `client/src/index.css`

要求：

- 控件应放在查看器工具栏或查看器底部控制区
- 不压住主要 3D 画面中心
- 在移动端和窄屏下仍能点击

#### 本步不做

- 不做进度条拖拽
- 不做倍速切换
- 不做循环开关
- 不做逐帧控制
- 不做自动隐藏高级面板

#### 验收标准

- 单 clip 模型打开后能自动播放
- 用户可以暂停、继续和重置
- 多 clip 模型可以切换并稳定播放目标 clip
- 关闭查看器或切换模型后，不应残留旧动画状态

## 6. 预计涉及文件

核心文件：

- `client/src/components/ModelPreviewViewer.tsx`
- `client/src/lib/i18n.ts`
- `client/src/index.css`

说明：

- 本轮不应扩到后端文件
- 如果实现中发现必须调整公共类型，也应先确认是否真的必要

## 7. 手动测试优先顺序

后续实现时，优先按这些样例回归：

1. 一个普通静态 `glb`
   - 检查默认光照、背景切换、相机 framing

2. 一个带薄片或透明材质的 `glb`
   - 检查去掉全局 `DoubleSide` 后是否出现意外缺面

3. 一个 `SkinnedMesh` 角色模型
   - 检查脸部、头发、衣摆、手臂、腿部是否仍局部发黑

4. 一个只有单个 animation clip 的 `glb`
   - 检查是否自动播放，暂停和重置是否生效

5. 一个有多个 animation clip 的 `glb`
   - 检查 clip 切换是否稳定

6. 一个没有动画但层级复杂的 `glb`
   - 检查是否误报动画

7. 同一个带动画模型在白底、黑底、浅底之间切换
   - 检查不同背景下是否仍出现明显异常受光

## 8. 验收清单

本轮完成后，应该满足：

- 静态模型默认观感明显比当前更自然
- 骨骼模型不再因为克隆策略问题出现显著局部黑块
- 全局 `DoubleSide` 已移除，且没有导致大面积回归
- 带动画模型可以被识别，并显示最小控制区
- 第一版动画播放可用，且不会污染无动画模型体验

## 9. 当前阶段不继续扩的点

即使本轮顺利完成，也先不继续做：

- 动画进度条
- 倍速
- 循环模式切换
- 动画事件面板
- HDRI 环境光照系统
- 模型质量自动评分
- 服务端记录动画元信息

## 10. 当前阶段结论

这轮任务的本质不是“把查看器做得很炫”，而是：

- 先把基础显示修稳
- 先把骨骼模型的底层兼容性补到可用
- 再把已有动画资源的最小播放能力接起来

一句话：

- 先让模型看得对，再让会动的模型动起来。
