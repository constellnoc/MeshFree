# MeshFree 今日进展总结

## 1. 今日目标与结论

今天的工作重点是完成 `MeshFree` 项目的前期需求收敛、技术方案确定、文档框架搭建以及项目初始化前的准备工作。

经过讨论，项目方向已经从“模糊想法”收敛为一个明确的 MVP：

- 游客可以浏览并下载已审核通过的 ZIP 模型资源
- 游客可以提交 ZIP 模型和封面图进行投稿
- 投稿默认进入待审核状态
- 只有一个管理员账号可以登录后台审核投稿
- 第一版重点是“能跑起来、能演示、便于答辩”，不追求复杂功能

## 2. 今日确认的项目目标

项目名称：

- `MeshFree`

项目定位：

- 面向国创比赛的轻量模型上传下载网站
- 当前只做 MVP
- 优先保证结构清晰、逻辑完整、可本地运行和可部署

核心业务目标：

- 游客可直接下载已通过审核的资源
- 游客可提交投稿，等待管理员审核
- 管理员登录后台进行通过、拒绝、删除等操作

## 3. 已确定的技术栈

今天已经确认以下技术方案：

- 前端：`React + TypeScript + Vite`
- 后端：`Node.js + Express + TypeScript`
- 数据库：`SQLite`
- ORM：`Prisma`
- 文件存储：服务器本地磁盘
- 封面图存储：本地磁盘
- 部署方式：`Ubuntu + Nginx + Node.js + PM2`
- Docker：第一版暂不使用

补充结论：

- 当前项目不需要单独安装 React，后续会通过前端项目初始化自动安装
- 当前开发环境已确认可用：
  - `node v24.14.1`
  - `npm 11.11.0`
  - `git 2.51.0.windows.1`

## 4. 已确定的 MVP 功能边界

### 4.1 前台功能

- 首页展示已审核通过的模型资源
- 首页卡片仅展示：
  - 封面图
  - 标题
  - 简介摘要
- 模型详情页展示完整简介和下载入口
- 游客无需登录即可下载
- 游客可提交投稿

### 4.2 投稿功能

- 投稿表单包含：
  - 标题
  - 简介
  - 联系方式
  - 封面图
  - ZIP 文件
- 联系方式字段确定为：
  - `Contact info (QQ / WeChat / Email)`
- 投稿成功后前端需要显示明确提示信息
- 投稿成功响应中建议返回 `submissionId`

### 4.3 后台功能

- 仅管理员可以登录后台
- 仅一个管理员账号
- 后台一个页面分区显示全部状态
- 状态包括：
  - `pending`
  - `approved`
  - `rejected`
- 管理员可以：
  - 查看全部投稿
  - 通过投稿
  - 拒绝投稿并填写原因
  - 删除投稿

### 4.4 第一版明确不做

- 普通用户注册
- 普通用户登录
- 搜索
- 分类
- 评论
- 收藏
- 点赞
- 3D 在线预览
- Docker 部署
- 对象存储
- 防盗链
- 大文件断点续传

## 5. 已确定的资源与审核规则

### 5.1 文件规则

- 模型文件仅允许 `.zip`
- ZIP 文件大小上限暂定为 `20MB`
- 封面图为必填
- 封面图支持：
  - `jpg`
  - `jpeg`
  - `png`
  - `webp`
- 封面图大小上限为 `2MB`

### 5.2 审核规则

- 新投稿默认状态为 `pending`
- 审核通过后状态变为 `approved`
- 审核拒绝后状态变为 `rejected`
- 拒绝后保留记录，并填写 `rejectReason`

### 5.3 删除策略

今天已确认采用“第二种删除策略”：

- 删除数据库记录
- 同时删除对应封面图文件
- 同时删除对应 ZIP 文件

该策略用于避免产生无用文件和脏数据。

## 6. 已确定的接口和数据结构方向

### 6.1 数据表方向

当前确定使用两张核心表：

- `Admin`
- `Submission`

`Submission` 表的核心字段方向已经确定，包括：

- `id`
- `title`
- `description`
- `contact`
- `coverImagePath`
- `modelZipPath`
- `status`
- `rejectReason`
- `createdAt`
- `reviewedAt`
- `updatedAt`

### 6.2 接口方向

公开接口方向已确定：

- `GET /api/models`
- `GET /api/models/:id`
- `GET /api/models/:id/download`
- `POST /api/submissions`

管理员接口方向已确定：

- `POST /api/admin/login`
- `GET /api/admin/submissions`
- `GET /api/admin/submissions/:id`
- `PATCH /api/admin/submissions/:id/approve`
- `PATCH /api/admin/submissions/:id/reject`
- `DELETE /api/admin/submissions/:id`

### 6.3 路由风格

已确定采用以下约定：

- 统一使用 `/api` 前缀
- 资源集合使用复数
- 管理员接口使用 `/api/admin/...`
- 特殊动作使用明确后缀，例如 `approve`、`reject`

## 7. 今天已经创建或修改的文件

### 已修改

- `.gitignore`

### 已创建

- `docs/mvp-spec.zh-CN.md`
- `docs/mvp-spec.en.md`
- `docs/api-design.zh-CN.md`
- `docs/api-design.en.md`

这些文件的作用如下：

- `.gitignore`
  - 约束不应提交到仓库的内容
  - 已加入 `server/uploads/`、数据库文件、环境变量、日志等忽略规则
- `docs/mvp-spec.zh-CN.md`
  - 中文版 MVP 需求说明
- `docs/mvp-spec.en.md`
  - 英文版 MVP 需求说明
- `docs/api-design.zh-CN.md`
  - 中文版 API 设计文档
- `docs/api-design.en.md`
  - 英文版 API 设计文档

## 8. 今天的重要协作约束

今天已经进一步明确以下协作规则：

- 和用户解释一律使用中文
- 代码注释使用英文
- 项目文档使用中英双版本
- 讲解方式面向前后端新手，要求详细、不要跳步
- 不擅自扩展功能范围，严格围绕 `MeshFree MVP`
- 长对话后应整理阶段总结，方便后续开启新对话继续开发

## 9. 明天的第一步行动清单

明天建议严格按照以下顺序推进：

1. 检查今天生成的文档内容是否还需要微调
2. 初始化项目根目录结构
3. 初始化 `client`
4. 初始化 `server`
5. 初始化 `Prisma`
6. 生成基础 `schema.prisma`
7. 搭建后端第一个可运行接口

## 10. 明天继续开发时的注意事项

- 当前项目还没有正式初始化 `client` 和 `server`
- 当前文档已具备开工条件，不需要重新讨论需求
- 下一步应以“先搭项目骨架”为目标，而不是继续扩展产品功能
- 后续如果新开对话，应优先让 AI 读取本文件和同目录下的 `prompt.md`

## 11. 当前项目状态结论

截至今天，`MeshFree` 已经完成：

- 产品目标明确化
- 技术栈确定
- MVP 功能边界确定
- 接口方向与数据结构方向确定
- 文档体系初步建立
- Git 忽略规则初步完善
- 本机开发环境确认可用

项目已经具备进入“正式初始化和写代码”的条件。
