# MeshFree 部署启动与文档细化总结

## 1. 本轮主题

本轮工作的重点，已经从“部署准备讨论”正式推进到“真实服务器部署启动与逐步联调”。

截至本轮结束，项目状态进一步从：

- 部署方案与文档已准备

推进到：

- 真实云服务器已开始按文档执行部署
- 部署文档已按第一次独立搭站的新手视角进一步细化

## 2. 本轮已完成内容

### 2.1 服务器初始化与基础环境确认

已完成：

- 云平台控制台已确认放行 `22`、`80`、`443`
- Ubuntu 服务器内已启用 `UFW`
- `UFW` 已确认放行：
  - `22/tcp`
  - `80/tcp`
  - `443/tcp`
- 在升级系统过程中出现的 `needrestart` 交互卡顿问题已处理
- Node.js 运行环境已修正到：
  - `node v20.20.2`
  - `npm 10.8.2`

说明：

- 中途曾出现 Ubuntu 自带旧版 `node` 与 NodeSource 安装包冲突
- 最终已完成版本修复，不再停留在 `node v12`

### 2.2 域名委派与 DNS 解析推进

已完成：

- 域名 `yukiho.site` 已在域名平台中修改 NameServer
- 域名 NS 已验证切换到：
  - `ns1.alidns.com`
  - `ns2.alidns.com`
- 已明确当前项目需要同时解析：
  - 裸域名 `yukiho.site`
  - `www.yukiho.site`

说明：

- 本轮还对 DNS 解析的概念、控制台位置、字段含义、验证方式进行了梳理
- 域名解析文档已进一步细化，适合第一次独立部署时对照执行

### 2.3 部署文档进一步细化

本轮继续补强了部署文档中最容易让新手卡住的部分。

已完成：

- 补充云平台安全组 / 防火墙放行说明
- 补充 Linux 用户密码设置与重置说明
- 补充从 `.env.example` 复制并编辑 `.env` 的完整步骤
- 补充 `nano` 的保存退出与常用快捷键说明
- 补充 `Certbot` 交互中如何识别并选择 `Redirect`
- 补充 Linux 登录密码、后台管理员密码、`JWT_SECRET` 的区别
- 补充域名解析的控制台操作说明、字段解释、验证方式、与 HTTPS 的先后关系

相关文件包括：

- `docs/deployment-guide.zh-CN.md`
- `docs/deployment-guide.en.md`
- `docs/deployment-checklist.zh-CN.md`

### 2.4 项目文档与提示词同步更新

本轮还继续同步了项目文档与启动提示词，避免后续新对话回到过时阶段。

已完成：

- API 文档已同步基础限流行为
- API 文档中管理员登录示例不再写死 `admin`
- MVP 文档已补充公开部署时的基础约束
- `prompt.md` 已更新到“部署准备、服务器联调、真实环境验证”阶段

相关文件包括：

- `docs/api-design.zh-CN.md`
- `docs/api-design.en.md`
- `docs/mvp-spec.zh-CN.md`
- `docs/mvp-spec.en.md`
- `docs/session-notes/prompt.md`

## 3. 本轮验证结果

本轮已验证：

- `server` 的 `npm run build` 通过
- `client` 的 `npm run lint` 通过
- `client` 的 `npm run build` 通过
- 服务器 `UFW` 已启用
- 服务器 `22/80/443` 端口在 `UFW` 中已放行
- 服务器 Node.js 版本已恢复到 `20.x`
- 域名 `yukiho.site` 的 NS 已切换到阿里云 DNS
- 部署文档、部署清单、API 文档、MVP 文档、`prompt.md` 已按当前阶段同步

## 4. 本轮遇到并解决的问题

### 4.1 系统升级交互界面与 Xshell 兼容不佳

在执行系统升级时，`needrestart` 的交互界面在 `Xshell` 中出现乱码并卡住，导致无法正常通过键盘确认。

本轮已处理：

- 通过新开 SSH 会话进入服务器
- 定位并结束 `needrestart` 相关交互进程
- 补做 `dpkg --configure -a`

这样避免了因交互界面卡死而中断整个部署流程。

### 4.2 服务器存在旧版 Node.js 干扰

虽然部署目标已明确为 `Node.js 20 LTS`，但服务器系统中原本仍使用旧版：

- `node v12.22.9`

这导致：

- `npm install` 出现 `EBADENGINE` 警告
- 后续依赖安装和构建存在风险

本轮已处理：

- 重新接入 NodeSource 安装源
- 移除冲突包
- 修复 `libnode-dev` 与新版本 `nodejs` 的包冲突
- 最终确认 Node 与 npm 版本恢复正常

### 4.3 域名已添加记录但未生效的误解

在阿里云侧添加解析记录后，控制台仍提示 DNS 未接入，最初容易误判为解析配置错误。

本轮已确认并解释清楚：

- 问题不在 A 记录本身
- 而在域名 NS 还未完成切换

后续通过：

- 检查 NameServer
- 执行 `nslookup -type=ns yukiho.site`

确认域名委派已完成切换。

## 5. 当前阶段结论

截至 `20260416_1`，项目已经具备：

- 完整的本地 MVP 三条核心闭环
- 更适合第一次独立部署的新手文档体系
- 已开始执行的真实服务器部署流程
- 已修复的服务器 Node.js 版本环境
- 已切换完成的域名 DNS 委派

这意味着：

- 项目已不再停留在“部署准备讨论”阶段
- 当前已进入“真实服务器按文档逐步部署与联调”阶段
- 后续重点将集中在：
  - `.env` 配置
  - Prisma 与管理员初始化
  - 前后端构建
  - PM2 托管
  - Nginx 配置
  - HTTPS 证书申请
  - 真实环境功能验证

## 6. 下一步建议

下一步建议优先按部署清单继续推进：

- 从 `server/.env.example` 复制并填写 `.env`
- 执行 `npx prisma generate`
- 执行 `npx prisma migrate deploy`
- 执行 `npm run db:seed`
- 分别构建 `server` 与 `client`
- 使用 `pm2 start ecosystem.config.cjs` 启动后端
- 配置 `Nginx`
- 使用 `Certbot` 申请 HTTPS
- 最后逐项验证前台、投稿、后台审核与跳转行为

如果继续推进，下一阶段的总结重点就不再是“部署方案设计”，而会更接近“服务器上真实跑通第一版上线流程并完成基础验收”。
