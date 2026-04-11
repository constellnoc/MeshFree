# MeshFree MVP 业务实现开发清单

## 1. 本文档的定位

本文档基于以下已确认内容编制：

- `docs/session-notes/20260411_1_scaffold-and-connectivity-check.md`
- `docs/session-notes/prompt.md`
- `docs/mvp-spec.zh-CN.md`
- `docs/api-design.zh-CN.md`

本文档不重新讨论需求，只基于当前已确认的 MVP 范围，把"从骨架到可运行产品"的全部工作拆成具体开发清单。

## 2. 当前起点

截至 `20260411_1`，项目已经具备：

- 可运行的后端（Express + TypeScript）
- 可运行的前端（React + TypeScript + Vite）
- 已落地的数据库（Prisma + SQLite，含 `Admin` 和 `Submission` 两张表）
- 已注册的 10 个后端 API 端点（全部返回占位 JSON）
- 已建立的 5 个前端页面路由（全部为占位页面）
- 已配置的 Vite `/api` 代理
- 已验证的前后端联通

当前所有接口和页面都还是空壳，没有真实业务逻辑。

## 3. 开发策略

本清单采用"业务闭环优先"策略。

这意味着：不是先把所有后端写完再做前端，而是一条业务链路从后端到前端做到底，做完一条再做下一条。

这样做的好处是：

- 每完成一条链路，你就能看到一个可演示的成果
- 出了问题更容易定位，因为变动范围小
- 更适合新手理解和验收

## 4. 推荐执行顺序总览

以下是从当前骨架到 MVP 完成的推荐顺序：

1. **准备工作**：Prisma Client 实例、上传目录、静态文件服务、管理员种子脚本
2. **闭环一**：公开模型浏览与下载（后端 + 前端）
3. **闭环二**：游客投稿（后端 + 前端）
4. **闭环三**：管理员登录（后端 + 前端）
5. **闭环四**：管理员审核与管理（后端 + 前端）
6. **收尾**：全流程联调、基础错误处理、演示准备

---

## 5. 准备工作

### 目标

在正式进入业务闭环之前，先把所有闭环都会依赖的公共基础设施准备好。

### 5.1 创建 Prisma Client 单例

**分类**：必做项

**要改的模块**：

- 新建 `server/src/lib/prisma.ts`

**做什么**：

- 创建一个 Prisma Client 实例并导出
- 后续所有路由文件都从这里引入，避免重复创建连接

**完成标准**：

- `server/src/lib/prisma.ts` 存在
- 导出了一个可用的 Prisma Client 实例
- 后端启动时不报错

**验证方法**：

- `npm run build` 通过
- `npm run dev` 正常启动

### 5.2 创建上传目录和静态文件服务

**分类**：必做项

**要改的模块**：

- `server/src/index.ts`
- 新建目录 `server/uploads/covers/`
- 新建目录 `server/uploads/models/`

**做什么**：

- 在 `src/index.ts` 中用 `express.static` 把 `uploads/` 目录暴露为静态文件路径
- 确保前端可以通过 `/uploads/covers/xxx.jpg` 访问封面图
- 确保启动时自动创建 `uploads/covers/` 和 `uploads/models/` 目录（如果不存在）

**完成标准**：

- 手动在 `uploads/covers/` 放一张测试图片
- 通过 `http://localhost:3001/uploads/covers/test.jpg` 能访问到

**验证方法**：

- 浏览器或 curl 直接访问该静态路径，确认返回图片

### 5.3 创建管理员种子脚本

**分类**：必做项

**要改的模块**：

- 新建 `server/prisma/seed.ts`
- 修改 `server/package.json`（添加 seed 脚本配置）

**做什么**：

- 创建一个种子脚本，用 `bcryptjs` 对一个默认密码进行哈希
- 向 `Admin` 表中插入一条管理员记录
- 配置 `npx prisma db seed` 可执行该脚本

**完成标准**：

- 运行 `npx prisma db seed` 后，`Admin` 表中存在一条记录
- `username` 为 `admin`
- `passwordHash` 为 bcrypt 哈希值，不是明文

**验证方法**：

- 用 Node 读取 SQLite 查看 `Admin` 表内容
- 确认 `passwordHash` 不等于明文密码

---

## 6. 闭环一：公开模型浏览与下载

### 目标

让游客能在首页看到已审核通过的模型列表，能进入详情页，能下载 ZIP 文件。

这是 MVP 中最核心、最直观的链路。

### 6.1 后端：实现 `GET /api/models`

**分类**：必做项

**要改的模块**：

- `server/src/routes/models.ts`

**做什么**：

- 引入 Prisma Client
- 查询 `Submission` 表，只返回 `status === 'approved'` 的记录
- 只返回首页需要的摘要字段：`id`、`title`、`description`、`coverImagePath`、`createdAt`
- 把 `coverImagePath` 转换为前端可访问的 URL 格式（例如 `/uploads/covers/xxx.jpg`）

**完成标准**：

- 请求 `GET /api/models` 返回数组
- 数组中只包含 `approved` 状态的记录
- 返回字段与 `api-design` 文档一致

**验证方法**：

- 先用种子脚本或手动向数据库插入一条 `approved` 和一条 `pending` 的测试数据
- 请求接口，确认只返回 `approved` 那条

### 6.2 后端：实现 `GET /api/models/:id`

**分类**：必做项

**要改的模块**：

- `server/src/routes/models.ts`

**做什么**：

- 根据 `id` 查询 `Submission` 表
- 只返回 `status === 'approved'` 的记录
- 如果不存在或状态不是 `approved`，返回 `404`

**完成标准**：

- 请求存在且 `approved` 的 id，返回详情 JSON
- 请求不存在或非 `approved` 的 id，返回 `404`

**验证方法**：

- 用测试数据分别请求 approved 和 pending 的 id

### 6.3 后端：实现 `GET /api/models/:id/download`

**分类**：必做项

**要改的模块**：

- `server/src/routes/models.ts`

**做什么**：

- 根据 `id` 查询 `Submission` 表
- 只允许 `approved` 状态的记录下载
- 检查 `modelZipPath` 对应的文件是否存在
- 使用 `res.download()` 返回文件流

**完成标准**：

- 请求 approved 记录的下载接口，浏览器开始下载 ZIP
- 请求非 approved 或不存在的记录，返回错误 JSON

**验证方法**：

- 手动放一个测试 ZIP 到 `uploads/models/`
- 在数据库中插入对应记录
- 用浏览器或 curl 请求下载接口

### 6.4 前端：首页接入真实数据

**分类**：必做项

**要改的模块**：

- `client/src/pages/HomePage.tsx`
- `client/src/api/models.ts`
- 可能新建 `client/src/components/ModelCard.tsx`

**做什么**：

- 修改 `api/models.ts`，让 `getModelsPlaceholder` 变成真实请求
- 修改 `HomePage.tsx`，用返回数据渲染模型卡片列表
- 每张卡片展示：封面图、标题、简介摘要
- 点击卡片跳转到 `/models/:id`
- 处理空状态：如果没有任何已审核模型，显示提示

**完成标准**：

- 首页能展示真实数据库中 approved 状态的模型
- 卡片上能看到封面图、标题、简介
- 点击卡片能跳转到详情页

**验证方法**：

- 在数据库中有测试数据的前提下，打开 `http://localhost:5173/`
- 确认看到模型卡片
- 点击卡片确认跳转

### 6.5 前端：详情页接入真实数据

**分类**：必做项

**要改的模块**：

- `client/src/pages/ModelDetailPage.tsx`
- `client/src/api/models.ts`

**做什么**：

- 根据路由参数 `id` 请求 `GET /api/models/:id`
- 展示完整简介、封面图
- 提供下载按钮，点击后触发 `GET /api/models/:id/download`
- 处理 404 情况

**完成标准**：

- 详情页能展示真实数据
- 下载按钮能触发文件下载
- 访问不存在的 id 显示错误提示

**验证方法**：

- 从首页点进详情页，确认数据正确
- 点击下载按钮，确认浏览器开始下载

### 闭环一完成标志

游客从首页浏览 → 进入详情 → 下载 ZIP，这条主线完全跑通。

---

## 7. 闭环二：游客投稿

### 目标

让游客能通过投稿页面提交标题、简介、联系方式、封面图和 ZIP 文件，提交后数据写入数据库，文件保存到服务器。

### 7.1 后端：配置 Multer 文件上传

**分类**：必做项

**要改的模块**：

- 新建 `server/src/middleware/upload.ts`

**做什么**：

- 配置 Multer
- 设置两个上传字段：`cover`（图片）和 `modelZip`（ZIP）
- 设置存储路径：
  - 封面图存到 `uploads/covers/`
  - ZIP 文件存到 `uploads/models/`
- 设置文件大小限制：封面图 2MB，ZIP 20MB
- 设置文件类型过滤：封面图只允许 jpg/jpeg/png/webp，ZIP 只允许 .zip

**完成标准**：

- Multer 中间件可以正常处理 `multipart/form-data` 请求
- 文件被保存到正确目录
- 不合法文件被拒绝

**验证方法**：

- 后续在 7.2 中一起验证

### 7.2 后端：实现 `POST /api/submissions`

**分类**：必做项

**要改的模块**：

- `server/src/routes/submissions.ts`

**做什么**：

- 使用 Multer 中间件接收上传文件
- 校验必填字段：`title`、`description`、`contact`
- 校验文件是否上传成功
- 将记录写入 `Submission` 表，状态为 `pending`
- 返回 `submissionId` 和成功提示

**完成标准**：

- 使用 curl 或 Postman 发送 `multipart/form-data` 请求
- 数据库中新增一条 `pending` 状态的记录
- 文件已保存到对应目录
- 缺少必填字段时返回错误

**验证方法**：

- 用 curl 发送一个包含全部字段的投稿请求
- 检查数据库和文件系统

### 7.3 前端：投稿页接入真实表单

**分类**：必做项

**要改的模块**：

- `client/src/pages/SubmitPage.tsx`
- 新建 `client/src/api/submissions.ts`

**做什么**：

- 创建真实表单：标题、简介、联系方式、封面图上传、ZIP 上传
- 使用 `FormData` 发送 `multipart/form-data` 请求
- 提交成功后显示明确提示信息
- 提交失败时显示错误信息
- 添加基础前端校验

**完成标准**：

- 用户填写表单并选择文件后，点击提交
- 后端收到数据并写入数据库
- 前端显示成功或失败提示

**验证方法**：

- 在前端页面完成一次完整投稿
- 检查数据库中新增记录
- 检查文件系统中新增文件
- 不填必填项时前端或后端返回错误

### 闭环二完成标志

游客从投稿页填写表单 → 上传文件 → 提交成功 → 数据库和文件系统中都有对应记录。

---

## 8. 闭环三：管理员登录

### 目标

让管理员能通过登录页面输入账号密码，获取 JWT token，后续用于访问受保护的后台接口。

### 8.1 后端：实现真实登录逻辑

**分类**：必做项

**要改的模块**：

- `server/src/routes/admin.ts`

**做什么**：

- 接收 `username` 和 `password`
- 用 Prisma 查询 `Admin` 表
- 用 `bcryptjs` 比对密码哈希
- 验证通过后签发 JWT token
- 验证失败返回 `401`

**完成标准**：

- 使用正确账号密码请求，返回 token
- 使用错误密码请求，返回 `401`
- 返回的 token 可以用于后续 admin 接口

**验证方法**：

- 先确保种子脚本已执行
- 用 curl 发送正确和错误的登录请求
- 用返回的 token 请求一个 admin 接口，确认返回 `200`

### 8.2 前端：登录页接入真实表单

**分类**：必做项

**要改的模块**：

- `client/src/pages/AdminLoginPage.tsx`
- `client/src/api/admin.ts`

**做什么**：

- 创建真实登录表单：用户名、密码
- 提交后调用 `POST /api/admin/login`
- 登录成功后把 token 存入 `localStorage`
- 登录成功后自动跳转到 `/admin/dashboard`
- 登录失败显示错误信息

**完成标准**：

- 输入正确账号密码，跳转到后台页面
- 输入错误密码，显示错误提示
- 登录后 `localStorage` 中存有 token

**验证方法**：

- 在前端页面完成一次登录
- 检查跳转和 token 存储

### 闭环三完成标志

管理员从登录页输入账号密码 → 获取 token → 自动跳转到后台。

---

## 9. 闭环四：管理员审核与管理

### 目标

让管理员能在后台页面看到全部投稿，按状态分区查看，能通过、拒绝、删除投稿。

### 9.1 后端：实现 `GET /api/admin/submissions`

**分类**：必做项

**要改的模块**：

- `server/src/routes/admin.ts`

**做什么**：

- 查询全部 `Submission` 记录
- 支持可选 `status` 查询参数过滤
- 按创建时间倒序

**完成标准**：

- 不带参数时返回全部投稿
- 带 `?status=pending` 时只返回 pending 记录

**验证方法**：

- 数据库中有多种状态的记录
- 分别请求带和不带 status 参数的接口

### 9.2 后端：实现 `GET /api/admin/submissions/:id`

**分类**：必做项

**要改的模块**：

- `server/src/routes/admin.ts`

**做什么**：

- 根据 id 查询单条投稿完整信息
- 不存在时返回 `404`

**完成标准**：

- 返回完整字段
- 不存在的 id 返回 `404`

**验证方法**：

- 用 curl 请求已知存在和不存在的 id

### 9.3 后端：实现 `PATCH /api/admin/submissions/:id/approve`

**分类**：必做项

**要改的模块**：

- `server/src/routes/admin.ts`

**做什么**：

- 将 `status` 更新为 `approved`
- 清空 `rejectReason`
- 写入 `reviewedAt`

**完成标准**：

- 请求后数据库中对应记录状态变为 `approved`
- `rejectReason` 为 null
- `reviewedAt` 有值

**验证方法**：

- 对一条 pending 记录执行 approve
- 检查数据库

### 9.4 后端：实现 `PATCH /api/admin/submissions/:id/reject`

**分类**：必做项

**要改的模块**：

- `server/src/routes/admin.ts`

**做什么**：

- 接收请求体中的 `rejectReason`
- 将 `status` 更新为 `rejected`
- 保存 `rejectReason`
- 写入 `reviewedAt`

**完成标准**：

- 请求后数据库中对应记录状态变为 `rejected`
- `rejectReason` 有值

**验证方法**：

- 对一条 pending 记录执行 reject
- 检查数据库

### 9.5 后端：实现 `DELETE /api/admin/submissions/:id`

**分类**：必做项

**要改的模块**：

- `server/src/routes/admin.ts`

**做什么**：

- 查询记录获取文件路径
- 删除数据库记录
- 删除对应的封面图文件
- 删除对应的 ZIP 文件
- 文件不存在时不报错，只跳过

**完成标准**：

- 请求后数据库中无该记录
- 对应文件已被删除

**验证方法**：

- 对一条记录执行 delete
- 检查数据库和文件系统

### 9.6 前端：后台页面接入真实数据与操作

**分类**：必做项

**要改的模块**：

- `client/src/pages/AdminDashboardPage.tsx`
- `client/src/api/admin.ts`

**做什么**：

- 页面加载时请求 `GET /api/admin/submissions`（携带 token）
- 按状态分区或分标签展示投稿列表
- 每条投稿提供操作按钮：
  - pending 状态：显示"通过"和"拒绝"按钮
  - 所有状态：显示"删除"按钮
- 点击"拒绝"时弹出输入框让管理员填写拒绝原因
- 操作后刷新列表
- 处理 token 失效：如果返回 `401`，提示重新登录

**完成标准**：

- 后台页面能展示全部投稿
- 能按状态区分
- 能执行通过、拒绝、删除操作
- 操作后列表即时更新

**验证方法**：

- 登录后进入后台
- 对不同状态的投稿执行审核操作
- 确认操作后前台首页的显示随之变化

### 闭环四完成标志

管理员登录 → 查看投稿列表 → 通过/拒绝/删除 → 前台首页展示相应更新。

---

## 10. 收尾阶段

### 10.1 全流程联调

**分类**：必做项

**做什么**：

走一遍完整主线：

1. 游客打开首页，看到已审核模型（或空状态）
2. 游客进入详情页，点击下载
3. 游客进入投稿页，提交一份新投稿
4. 管理员登录后台
5. 管理员看到新投稿（pending 状态）
6. 管理员通过该投稿
7. 游客回到首页，看到刚通过的投稿出现在列表中

**完成标准**：

- 以上 7 步全部跑通，没有报错

**验证方法**：

- 手动走完全流程

### 10.2 基础错误处理

**分类**：应做项

**做什么**：

- 后端所有接口添加 `try/catch`，出错时返回 `500` 和 `message`
- 前端所有请求添加错误提示，不让页面白屏
- 前端处理 token 过期：返回 `401` 时提示重新登录

**完成标准**：

- 即使后端出错，前端也能显示友好提示
- 不会出现无响应或白屏

### 10.3 空状态处理

**分类**：应做项

**做什么**：

- 首页无模型时显示"暂无已发布的模型资源"
- 后台无投稿时显示"暂无投稿记录"
- 详情页找不到模型时显示"资源不存在"

**完成标准**：

- 在数据库为空的情况下访问各页面，都有友好提示

### 10.4 README 更新

**分类**：应做项

**做什么**：

- 更新项目根目录 `README.md`
- 写清楚：如何安装、如何启动前后端、如何初始化数据库、如何创建管理员账号、默认端口

**完成标准**：

- 一个新人 clone 仓库后，按 README 操作能跑起来

### 10.5 演示数据准备

**分类**：应做项

**做什么**：

- 在种子脚本中加入 2 到 3 条测试投稿数据（含不同状态）
- 准备对应的测试封面图和 ZIP 文件

**完成标准**：

- 运行种子脚本后，首页有内容可展示
- 后台有不同状态的投稿可操作

### 10.6 页面样式优化

**分类**：可延后项

**做什么**：

- 改善首页卡片排版
- 改善投稿表单布局
- 改善后台管理页面可读性

**说明**：

- 这部分不影响 MVP 功能完整性
- 但如果要答辩展示，建议在功能全部跑通后花一些时间做基础美化

### 10.7 部署

**分类**：可延后项

**做什么**：

- 把前后端部署到 Ubuntu 服务器
- 配置 Nginx 反向代理
- 使用 PM2 管理 Node 进程

**说明**：

- 如果只是本地展示或答辩录屏，可以不做
- 如果需要在线访问，则必做

---

## 11. 任务分类汇总

### 必做项（完成 MVP 必需）

1. Prisma Client 单例
2. 上传目录和静态文件服务
3. 管理员种子脚本
4. `GET /api/models` 真实实现
5. `GET /api/models/:id` 真实实现
6. `GET /api/models/:id/download` 真实实现
7. 首页接入真实数据
8. 详情页接入真实数据
9. Multer 文件上传配置
10. `POST /api/submissions` 真实实现
11. 投稿页接入真实表单
12. `POST /api/admin/login` 真实实现
13. 登录页接入真实表单
14. `GET /api/admin/submissions` 真实实现
15. `GET /api/admin/submissions/:id` 真实实现
16. `PATCH /api/admin/submissions/:id/approve` 真实实现
17. `PATCH /api/admin/submissions/:id/reject` 真实实现
18. `DELETE /api/admin/submissions/:id` 真实实现
19. 后台页面接入真实数据与操作
20. 全流程联调

### 应做项（建议尽快补齐）

21. 基础错误处理
22. 空状态处理
23. README 更新
24. 演示数据准备

### 可延后项（不影响 MVP 完成）

25. 页面样式优化
26. 部署

---

## 12. MVP 完成标志

当以下三句话同时成立时，MVP 即视为完成：

- 游客可以浏览已审核模型、查看详情、下载 ZIP
- 游客可以通过投稿页提交作品，数据和文件都成功保存
- 管理员可以登录后台，查看全部投稿，执行通过、拒绝、删除操作，操作结果在前台即时生效
