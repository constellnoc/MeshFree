# MeshFree 启动提示词

## 1. 先看这些文件

高优先级：

- `docs/session-notes/20260426_2_weekly-summary-0420-0426.md`
- `docs/releases/v0.3.0-beta.2.zh-CN.md`
- `docs/releases/v0.3.0-beta.2.en.md`
- `docs/session-notes/20260420_2_navigation-about-and-beta-prep.md`
- `docs/session-notes/20260420_1_tag-governance-and-localization-upgrade.md`
- `docs/session-notes/20260419_1_glb-preview-and-viewer-iteration.md`
- `docs/session-notes/20260418_3_homepage-modal-and-motion-progress.md`
- `docs/session-notes/20260418_2_home-hero-geometry-execution-handoff.md`
- `docs/session-notes/20260418_1_navigation-structure-and-ui-adjustments.md`
- `docs/deployment-guide.zh-CN.md`
- `docs/deployment-checklist.zh-CN.md`
- `docs/mvp-spec.zh-CN.md`
- `docs/api-design.zh-CN.md`

次级：

- `docs/product-backlog.zh-CN.md`
- `docs/README.md`

## 2. 说话规则

- 和我解释一律中文。
- 代码注释用英文。
- 说明先讲“是什么”，再讲“为什么”，再讲“怎么做”。
- 我是前后端新手。默认不要跳步。
- 开始编码前，先说本轮要做什么、为什么这样做。
- 准备改文件前，先说会改什么。
- 准备跑长命令前，先说目的。
- 如果上下文变长或进入新阶段，主动建议写新的 `session-notes`。

## 3. 行为规则

- 不要擅自扩范围。
- 除非我明确要求，不要提交 git commit。
- 如果适合给 commit message，只给建议，不要代提交。
- commit message 风格默认用 `caveman`。
- 不要把敏感信息写进仓库。

## 4. 技术栈

- 前端：`React + TypeScript + Vite`
- 后端：`Node.js + Express + TypeScript`
- 数据库：`SQLite`
- ORM：`Prisma`
- 部署：`Ubuntu + Nginx + Node.js + PM2`

## 5. 当前项目状态

项目已完成：

- `client` / `server` 初始化
- `Prisma + SQLite` 初始化
- 游客浏览已审核模型
- 游客下载 ZIP
- 游客投稿
- 单管理员登录、审核、拒绝、删除
- 真实服务器部署
- 基础限流
- GLB 预览第一版
- 独立 `About` 页面第一版
- 顶部导航高亮第一版重构
- 模型 ZIP 上传上限已调到 `50MB`
- 首页标签筛选支持多选
- 中文术语与中文显示已做一轮统一优化
- 管理员现在可以直接处理私有自定义标签：
  - 绑定到已有公开标签
  - 创建新的公开标签
  - 忽略

当前重点：

- 继续验证真实环境
- 做小修复
- 做结构整理
- 不做大范围失控扩展

## 6. 当前标签系统结论

已确认：

- 模型只绑定规范标签
- 用户自定义输入不是公开标签
- 用户可提交私有建议标签
- 管理员现在已能：
  - 绑定已有规范标签
  - 新建公开标签
  - 忽略私有自定义标签
- 后续仍计划补：
  - 转别名的完整治理链路
- 标签已开始支持：
  - `Tag`
  - `TagTranslation`
  - `TagAlias`
  - `SubmissionRawTag`
- 代码里已有预设规范标签
- 运行时会同步预设标签到数据库
- 标签颜色深浅表达范围：
  - `broad`
  - `medium`
  - `specific`

当前还没完全做完：

- 管理员把私有自定义标签转成“别名”的完整 UI
- 正式中英文切换 UI

## 7. 范围边界

当前范围内：

- 游客浏览
- 游客下载
- 游客投稿
- 管理员审核
- 已有标签搜索 / 标签筛选 / 标签治理结构
- 第一版 3D 预览

默认不优先：

- 普通用户系统
- 评论 / 收藏 / 点赞
- 对象存储
- Docker
- 大型平台化改造

## 8. 部署相关规则

如果任务涉及：

- 服务器联调
- 域名
- HTTPS
- Nginx
- PM2
- 环境变量
- 生产数据库

则优先沿用现有部署文档，不要另起一套。

如果改部署文档，先检查：

- `docs/deployment-guide.zh-CN.md`
- `docs/deployment-guide.en.md`
- `docs/deployment-checklist.zh-CN.md`
- `docs/README.md`

## 9. 敏感内容

不要提交：

- `.env`
- 管理员真实密码
- JWT 密钥
- 数据库文件
- 上传文件

## 10. 每轮开始时默认输出

新一轮开始时，先短答这 3 件事：

1. 当前项目阶段
2. 已完成到哪里
3. 本轮准备做什么
