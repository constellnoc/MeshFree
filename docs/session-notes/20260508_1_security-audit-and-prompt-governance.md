# MeshFree 2026.05.08 安全审计与 prompt 治理重构记录

## 1. 本轮主题

- 排查已部署站点与公开仓库的安全风险
- 产出安全修复优先级
- 重构文档体系与 `prompt` 的职责边界
- 纠正“顺手继承旧文案”的工作方式

## 2. 本轮目标

- 确认当前公开面是否存在实质安全问题
- 给出按成本 / 收益排序的修复优先级
- 把 `README.md`、`docs/README.md`、`docs/session-notes/prompt.md` 的定位重新钉死
- 把 agent 的默认工作形态改成“先核验，再写；先报告冲突，再动口径”

## 3. 已做改动

### 3.1 安全检查

- 检查仓库中是否提交敏感信息、密钥、数据库文件、上传文件
- 检查认证、上传、预览转换、下载、部署相关代码
- 实测公开站点、公开 API、下载链路、上传文件直链、端口暴露、响应头、CORS、错误处理
- 生成本地忽略文件：
  - `logs/security-remediation-priority-plan.md`

### 3.2 文档与 prompt

- 重写 `docs/session-notes/prompt.md`
- 调整 `docs/README.md` 为内部文档入口
- 重写 `README.md` 为 GitHub 对外介绍
- 后续又去掉 `README.md` / `docs/README.md` 里未经核准的 `beta2` 当前口径

## 4. 关键结论 / 决策

### 4.1 安全结论

已确认风险：

- 高风险：
  - ZIP 上传链缺少解压规模限制，存在资源耗尽面
  - `OBJ -> GLB` 转换显式 `secure: false`
- 中风险：
  - 管理端 token 存在 `localStorage`
  - 站点缺少基础安全响应头
- 低风险：
  - 公开文档暴露部分运维口径

部署层确认：

- `22/80/443` 可达
- `3001` 不可达
- `21/3306/5432/6379` 不可达
- `25` 可达，若无邮件服务应评估关闭

网站层确认：

- `/uploads` 直链可访问，文件级授权边界失效
- 缺点击劫持防护
- 错误处理与缓存策略需要收口

### 4.2 工作方式结论

本轮暴露的根问题不是“不会写文档”，而是“先查错地方，再顺手续写旧口径”。

确定的新规则：

- `prompt` 管流程、信任顺序、核验顺序、停手机制；不直接当事实来源
- `README.md` = GitHub 对外介绍
- `docs/README.md` = 内部文档入口
- 正式文档 = 稳定规则
- `session-notes` = 变化记录，不是当前真理

内部默认读取顺序：

1. `docs/session-notes/prompt.md`
2. `docs/README.md`
3. 版本 / 发布 / 对外口径任务时加读 `CHANGELOG.md`
4. 相关正式文档
5. 最近相关 `session-notes`
6. 必要时才看根 `README.md`

当前口径规则：

- 旧文案不是事实
- 未核验事实不得写成肯定句
- 冲突先报告，不准顺手统一
- 未知就写未知
- 不准凭旧文案续写当前版本 / 当前 release / 当前状态 / 当前能力

证据摘要模式：

- 从 `always-show` 下调为 `risk-only-show`
- 只在版本 / release / 当前状态 / 当前能力，或发现冲突时显式展示

风格规则：

- `caveman` 不再写入 `prompt`
- 后续以外置 `mycaveman` 使用
- 对外文档不用 `mycaveman`
- `session-note` 可用 `mycaveman`

### 4.3 版本口径纠偏

本轮关键纠偏点：

- 远端确实存在 `v0.3.0-beta.3`
- 但仓库文档层仍大量停在 `beta2`
- 问题不是“版本不存在”，而是“远端 tag 已前进，文档未同步”

以后凡写当前版本，必须先核：

1. 用户口径
2. remote tag / refs / release
3. `CHANGELOG.md`
4. `docs/releases/*`
5. 最近相关 `session-notes`

## 5. 验证情况

已确认：

- 仓库未提交 `.env`、数据库文件、上传目录、明显密钥
- 公开站点与公开 API 可访问
- 端口检查结果稳定：
  - `22/80/443` 可达
  - `3001/21/3306/5432/6379` 不可达
  - `25` 可达
- `git ls-remote --heads --tags origin` 确认远端存在 `v0.3.0-beta.3`
- `docs/releases/` 仅存在 `v0.1.0` 与 `v0.3.0-beta.2` 文档
- `docs/session-notes/prompt.md` 已移除全部 `caveman` 文案，并改成流程真理而非事实来源

## 6. 当前遗留点

- `CHANGELOG.md` 尚未同步到 `beta3`
- `docs/releases/*` 尚未补 `beta3`
- `README.md` / `docs/README.md` 还需继续按新规则长期维护
- 安全高风险项仍未开始修：
  - ZIP 解压防护
  - OBJ 转换安全模式
  - `/uploads` 暴露边界
  - 安全响应头
- `prompt.md` 仍可继续做“只删重复、不动结构”的精修

## 7. 下一步建议

1. 补齐 `beta3` 的发布层文档：
   - `CHANGELOG.md`
   - `docs/releases/v0.3.0-beta.3.zh-CN.md`
   - `docs/releases/v0.3.0-beta.3.en.md`
2. 按安全优先级修高风险项
3. 后续所有“当前口径”先核再写，不再从旧文案倒推当前事实
4. 继续按新结构维护 `session-notes`，不要把变化信息再塞回 `prompt`
