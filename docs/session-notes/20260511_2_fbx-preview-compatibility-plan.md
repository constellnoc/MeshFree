# MeshFree 2026.05.11 FBX 预览兼容方案草案

## 1. 本轮主题

讨论 `FBX` 作为下一种源格式接入服务端预览转换。

一句话：

- 先把 `FBX -> GLB` 最小链路接起来，再用真实样本判断是否需要升级到 Blender 或 FBX SDK 方案。

## 2. 当前上下文

已确认：

- `OBJ` 预览链路已优先收口。
- 多格式预览正式规则仍是：源格式用于上传和下载，在线预览统一使用转换后的 `glb`。
- 上传仍只接受 `ZIP`。
- 转换失败不影响资源上传、审核、公开和下载。
- `FBX / DAE / BLEND` 已能被 ZIP 扫描识别，但还没有真实转换器。
- 当前后端已有统一转换入口：`server/src/lib/previewConversion.ts`。
- 当前 `previewConversionStrategies.fbx` 仍是 pending strategy，只返回“未配置转换器”的失败说明。

相关代码入口：

- `server/src/lib/modelPreview.ts`
- `server/src/lib/previewConversion.ts`
- `server/src/routes/submissions.ts`

## 3. 推荐路线

第一版推荐直接接 `fbx2gltf`，暂不把 `vuer-ai/fbx2glb` 作为生产依赖。

原因：

- 当前后端是 Node，直接接 `fbx2gltf` 改动更小。
- `vuer-ai/fbx2glb` 本质是 Python 包装层，底层仍依赖 `fbx2gltf / Blender / Autodesk FBX SDK`。
- Python 包装层会引入额外部署复杂度。
- 当前目标是先验证 `FBX -> GLB` 最小可用链路，不是一次性追求最高兼容。

`vuer-ai/fbx2glb` 可作为后续实验对照工具，用来比较 `fbx2gltf`、Blender、FBX SDK 的真实样本表现。

## 4. 第一版范围

本轮只做：

- ZIP 内单一 `.fbx` 主模型文件。
- 解压 ZIP 到临时目录。
- 定位 `inspection.candidateEntryName` 对应的 `.fbx`。
- 调用 `fbx2gltf` 输出临时 `.glb`。
- 成功后用 `storePreviewBuffer()` 保存预览文件。
- 写入：
  - `sourceFormat = fbx`
  - `previewConversionStatus = success`
  - `previewConversionMessage`
  - `previewModelPath`
- 失败时写入：
  - `previewConversionStatus = failed`
  - 技术失败说明
  - `previewModelPath = null`
- 保持转换失败不影响上传和下载。

本轮不做：

- FBX 版本升级。
- Blender fallback。
- Autodesk FBX SDK。
- 动画 / 骨骼稳定承诺。
- 多主模型人工选择器。
- 自动材质修复。
- 自动质量评分。

## 5. 实施步骤

### Step 1：增加转换依赖

目标：

- 为后端安装可调用的 `fbx2gltf` 转换工具。

建议：

- 优先评估 npm 包或可执行文件封装是否能稳定在 Windows 本地与 Linux 服务器运行。
- 安装后确认本地和服务器都能执行最小转换命令。

验收：

- 本地能调用 `fbx2gltf`。
- 服务器部署环境能调用 `fbx2gltf`。
- 依赖安装不会破坏现有 `server npm run build`。

### Step 2：新增 `convertFbxPreview()`

目标：

- 在 `server/src/lib/previewConversion.ts` 中新增真实 FBX 转换策略。

核心逻辑：

1. 检查 `inspection.candidateEntryName`。
2. 建立临时解压目录。
3. 调用 `extractZipArchiveToDirectory()`。
4. 用 `resolveExtractedEntryPath()` 定位 `.fbx`。
5. 在临时目录生成目标 `.glb`。
6. 调用转换器。
7. 读取输出 `.glb` buffer。
8. 调用 `storePreviewBuffer()` 保存。
9. 清理临时目录。

失败处理：

- 捕获转换异常。
- 返回 `failed`。
- 保留错误信息给管理员。
- 不抛出业务中断错误，除非 ZIP 本身违反安全限制。

### Step 3：替换 strategy

目标：

- 把 `previewConversionStrategies.fbx` 从 pending 改为真实转换。

改动方向：

- 当前：
  - `fbx: createPendingConverterStrategy("fbx")`
- 目标：
  - `fbx: convertFbxPreview`

验收：

- `.fbx` 单候选 ZIP 会进入真实转换。
- `.dae / .blend` 仍保持 pending。
- `.obj / .glb` 现有逻辑不受影响。

### Step 4：补最小验证脚本或手测流程

目标：

- 不先大规模自动化，先用真实样本判断工具质量。

建议先手测：

1. 静态 FBX，无外部贴图。
2. 静态 FBX，贴图与 FBX 同目录。
3. 静态 FBX，贴图在子目录。
4. 带骨骼 / 动画 FBX，仅观察，不作为第一版通过条件。
5. 多候选主模型 ZIP，确认仍走 warning，不自动转换。
6. 转换失败样本，确认仍能上传和下载。

验收重点：

- 转换成功后详情页能打开在线预览。
- 转换失败后投稿仍能保存。
- 管理端能看到失败原因。
- 访客侧不显示技术失败原因。

## 6. 升级判断

如果 `fbx2gltf` 表现可接受：

- 保留直接 `fbx2gltf` 方案。
- 只记录已知限制。
- 暂不引入 Blender 或 FBX SDK。

如果只出现少量材质 / 贴图问题：

- 优先在转换参数、路径处理、错误信息上做局部修正。
- 不立即升级架构。

如果大量真实 FBX 转换失败：

- 再评估 Blender CLI。
- 可用 `vuer-ai/fbx2glb` 作为实验工具，对比不同后端：
  - `--method fbx2gltf`
  - `--method blender`
  - `--method fbx-sdk`

如果老版本 FBX 大量失败：

- 再评估 Autodesk FBX SDK 或支持 FBX upgrading 的方案。

## 7. 主要风险

### 7.1 依赖运行环境风险

`fbx2gltf` 可能涉及平台二进制文件。

需要确认：

- Windows 本地可用。
- Ubuntu 服务器可用。
- PM2 运行环境能找到可执行文件。

### 7.2 Node 版本风险

服务器当前 Node 是 `20.20.2`，部分依赖已提示需要 Node 22。

短期：

- 只要 build 与运行通过，可以先不阻塞 FBX 最小验证。

中期：

- 建议安排 Node 22 升级，避免后续依赖兼容问题扩大。

### 7.3 转换质量风险

FBX 格式复杂，转换失败或材质偏差属于预期风险。

第一版口径：

- 优先支持静态模型基础预览。
- 动画 / 骨骼只做兼容尝试，不承诺稳定。

### 7.4 资源占用风险

FBX 转换可能比 OBJ 更耗时、更耗内存。

需要保留：

- ZIP 安全限制。
- 临时目录清理。
- 转换失败不影响主流程。

后续如果转换明显变慢，再考虑：

- 转换超时。
- 异步任务。
- 队列。

当前阶段不先引入复杂异步系统。

## 8. 建议审查点

请重点审查：

1. 是否接受第一版只用 `fbx2gltf`。
2. 是否接受暂不引入 `vuer-ai/fbx2glb` 到生产。
3. 是否接受动画 / 骨骼不作为第一版验收标准。
4. 是否需要先做“重建预览”后台工具，再接 FBX。
5. 是否需要把 Node 22 升级放到 FBX 之前。

## 9. 下一步建议

建议下一轮按这个顺序推进：

1. 本地安装并验证 `fbx2gltf`。
2. 写 `convertFbxPreview()`。
3. 用 2-3 个真实 FBX 包手测。
4. 根据结果决定是否继续优化，或升级到 Blender 方案。

## 10. 执行记录

本轮已开始实施第一版 `FBX -> GLB` 最小链路。

已完成：

- 后端新增依赖：`fbx2gltf`。
- 已确认本地 `FBX2glTF` 二进制可执行，并能输出 help 信息。
- `server/src/lib/previewConversion.ts` 新增 `convertFbxPreview()`。
- `previewConversionStrategies.fbx` 已从 pending strategy 切换为真实转换策略。
- `server npm run build` 通过。
- `server npm run verify:zip-safety` 通过。

尚未完成：

- 还没有真实 FBX 资源包手动上传验证。
- 还没有确认 Linux 服务器上的 `FBX2glTF` 二进制执行情况。
- 还没有评估 FBX 材质、贴图、骨骼、动画的真实表现。

当前判断：

- 代码层最小链路已接通。
- 是否进入进一步优化，要等真实 FBX 样本验证结果。

