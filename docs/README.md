# MeshFree Docs Guide

## 1. 文档角色

本项目默认分三层文档：

1. 正式文档
   - 稳定规则
   - 产品范围
   - API 契约
   - 工作流
   - 部署与维护流程

2. `session-notes/prompt.md`
   - 启动规则
   - 协作规则
   - 读取顺序
   - 稳定边界

3. `session-notes/`
   - 变化信息
   - 每轮推进
   - 临时决策
   - 排障过程
   - 阶段结论

补充：

- `README.md` 是 GitHub 对外首页，应该优先承担“项目介绍”职责
- 本文件是内部文档入口，不是对外介绍页

判断规则：

- 稳定、可复用 -> 正式文档
- 启动、协作、读取顺序 -> `prompt`
- 快速变化、带时间性的上下文 -> `session-notes`

## 2. 建议读取顺序

新任务默认按这个顺序读：

1. `session-notes/prompt.md`
2. 本文件 `docs/README.md`
3. 按任务类型选读正式文档
4. 最后再看最近且最相关的 `session-notes`
5. 只有在需要 GitHub 对外介绍视角时，再读 `../README.md`

初始化开始项目时，`session-notes` 默认参考近期的就够了。

不要默认串读整段历史。只有在需要追溯历史决策、解释文档冲突、或用户明确要求时，才去翻更早记录。

## 3. 正式文档入口

### 产品与接口

- Chinese MVP spec: `mvp-spec.zh-CN.md`
- English MVP spec: `mvp-spec.en.md`
- Chinese API design: `api-design.zh-CN.md`
- English API design: `api-design.en.md`
- Chinese multi-format preview workflow: `multi-format-preview-workflow.zh-CN.md`

### 发布文档

- Release notes live in `releases/`
- Use `../CHANGELOG.md` together with the relevant file under `releases/`
- Do not hardcode a "current version" here unless release docs and changelog were updated in the same round
- Repository changelog: `../CHANGELOG.md`

### 部署与维护

- Chinese full deployment guide: `deployment-guide.zh-CN.md`
- English full deployment guide: `deployment-guide.en.md`
- Chinese short deployment checklist: `deployment-checklist.zh-CN.md`
- Chinese server maintenance guide: `server-maintenance.zh-CN.md`

## 4. `session-notes` 用法

`session-notes` 存放在 `session-notes/`。

使用原则：

- 先看最近且相关的
- 不要默认通读全部历史
- 较早 note 只在需要追溯决策时回查
- 稳定结论要回流到正式文档，不要长期埋在 notes 里

建议命名：

- `YYYYMMDD_n_topic.md`

建议结构：

1. 本轮主题
2. 本轮目标
3. 已做改动
4. 关键结论 / 决策
5. 验证情况
6. 遗留点
7. 下一步建议

## 5. 文档更新纪律

如果文档保留，就要规范维护。

### 5.1 正式文档

当以下内容发生实质变化时，同轮更新对应正式文档：

- 产品范围
- API 行为
- 数据结构
- 上传 / 下载 / 审核 / 预览工作流
- 部署步骤
- 维护步骤

### 5.2 `CHANGELOG.md` 与 release 文档

这两类文件是发布层文档，不是过程日记。

规则：

- 进入明确版本节点、里程碑节点、对外可见范围变化时，同步更新
- 如果本轮声明“当前版本 / 当前发布说明 / 当前变更记录”，就必须同步维护
- 如果没有维护，不要在别处把它们写成当前状态来源

### 5.3 `README.md`

`README.md` 应优先面向 GitHub 访问者：

- 项目介绍
- 能力概览
- 目录入口
- 文档入口

不应长期承担内部项目记忆职责

## 6. 备注

- Keep real secrets out of the repository
- Do not commit `.env`
- Do not commit database files or uploaded files
