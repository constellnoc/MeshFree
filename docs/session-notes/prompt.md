# MeshFree 下次启动提示词

请继续当前项目上下文，并优先参考以下文件：

- `docs/session-notes/20260418_3_homepage-modal-and-motion-progress.md`
- `docs/session-notes/20260418_2_home-hero-geometry-execution-handoff.md`
- `docs/session-notes/20260418_1_navigation-structure-and-ui-adjustments.md`
- `docs/session-notes/20260416_2_deployment-successfully-completed.md`
- `docs/session-notes/20260416_1_deployment-started-and-docs-refined.md`
- `docs/session-notes/20260415_1_three-core-loops-completed.md`
- `docs/session-notes/20260415_2_deployment-discussion-summary.md`
- `docs/deployment-guide.zh-CN.md`
- `docs/deployment-checklist.zh-CN.md`
- `docs/README.md`
- `docs/mvp-spec.zh-CN.md`
- `docs/api-design.zh-CN.md`

请保持以下规则：

- 和我解释一律中文。
- 代码注释用英文。
- 项目文档输出中英双版本。
- 我是前后端新手，请按非常详细、不要跳步的方式讲。
- 先不要擅自扩展功能范围，严格按 `MeshFree MVP` 来做。
- 在开始编码前，先说明本轮要做什么、为什么这样做。
- 优先沿用已经确认的技术栈，不要随意替换为其他框架或数据库。
- 所有解释尽量按“这个东西是什么、为什么需要、在项目里做什么”的顺序来讲。
- 如果准备修改文件，先告诉我即将修改哪些内容。
- 如果准备执行较长命令或安装依赖，先简要说明目的。
- 如果上下文过长或进入新阶段，主动建议生成新的阶段总结文档。
- 除非我明确要求，否则不要擅自提交 git commit。
- 每一步都告诉我git commit评论，除非在讨论阶段。git commit评论参照cameman-commit插件。
- 不要把敏感信息写进仓库。
- 如果生成项目文档，默认同时维护中文和英文版本；若只是和我解释，则只用中文。
- 在正式开始新一轮开发前，先简要复述当前项目阶段、已完成内容和本轮计划。
- 如果当前任务与部署、服务器联调、域名、HTTPS、Nginx、PM2、环境变量有关，优先沿用现有部署文档和模板，不要重新发明一套新方案。
- 如果准备修改部署相关文档，先检查以下文件是否需要同步更新：
  - `docs/deployment-guide.zh-CN.md`
  - `docs/deployment-guide.en.md`
  - `docs/deployment-checklist.zh-CN.md`
  - `docs/README.md`
- 如果本轮结束时适合给出 commit message，请给出建议的 commit message，但不要擅自提交。

当前已确认技术栈：

- 前端：`React + TypeScript + Vite`
- 后端：`Node.js + Express + TypeScript`
- 数据库：`SQLite`
- ORM：`Prisma`
- 部署：`Ubuntu + Nginx + Node.js + PM2`

当前 MVP 范围包括：

- 游客浏览已审核模型
- 游客下载已审核 ZIP
- 游客提交投稿
- 单管理员登录后台审核

当前 MVP 明确不包括：

- 普通用户注册与登录
- 搜索和分类
- 评论、收藏、点赞
- 3D 在线预览
- Docker
- 对象存储

不要提交到仓库的敏感内容包括：

- `.env`
- 管理员真实密码
- JWT 密钥
- 数据库文件
- 上传文件

本项目当前阶段说明：

- 需求、技术栈、API 方向已经确认
- 中英双语需求文档、API 文档、部署文档已经创建
- `client` 和 `server` 初始化已完成
- `Prisma + SQLite` 已完成初始化并生成数据库
- `MeshFree MVP` 三条核心业务闭环已经本地打通
- 公开模型浏览与下载已接入真实数据
- 公开投稿已接入真实上传和数据库写入
- 管理员登录、审核、拒绝、删除已接入真实逻辑
- 管理员 seed 用户名已支持环境变量 `ADMIN_SEED_USERNAME`
- 已补 `server/.env.example`
- 已补 `server/ecosystem.config.cjs`
- 已补 `deploy/nginx/meshfree.conf.example`
- 已补管理员维护脚本 `npm run admin:manage`
- 生产环境 `CORS` 已收紧
- 管理员登录和公开投稿已加入基础限流
- 真实云服务器部署已完成
- 服务器 `UFW` 已启用并放行 `22/80/443`
- 域名 `yukiho.site` 的 NS 已切换到阿里云 DNS
- 服务器 Node.js 环境已修正到 `20.x`
- 当前基础测试未发现明显问题
- 当前重点已从“逐步部署”转向“继续验证、记录经验、按需小修复”

本项目的首要目标是：

- 先把 MVP 跑起来
- 保持结构清晰
- 便于我理解和继续维护
- 已在服务器上按现有文档完成部署
- 让部署经验、验收记录与实际运行状态保持同步
- 在真实环境继续验证并维持稳定运行
