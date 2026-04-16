# MeshFree 服务器维护手册（中文）

## 1. 这份文档是干什么的

这份文档不是“首次部署教程”，而是给以后维护线上网站时使用的日常操作手册。

适用场景包括：

- 以后本地代码改完后，如何更新到服务器
- 服务器重启后，如何让网站重新跑起来
- 平时应该检查哪些服务是否正常
- 管理员密码忘了时怎么重置
- 出现常见问题时先看什么

当前项目线上部署方案已经确定并已落地运行：

- 操作系统：`Ubuntu 22.04`
- 反向代理：`Nginx`
- 后端进程管理：`PM2`
- 后端：`Node.js + Express + TypeScript`
- 前端：`React + Vite`
- 数据库：`SQLite`
- 域名：`yukiho.site`

---

## 2. 先记住这几个核心原则

以后维护这个项目，最重要的是记住下面几件事：

- 不要重新发明部署方案，继续沿用现在这套 `Ubuntu + Nginx + PM2 + SQLite`
- 不要把 `.env`、数据库文件、上传文件提交到 Git
- 不要把 `JWT_SECRET`、管理员真实密码发到聊天、截图或仓库里
- 日常管理员维护优先使用专用脚本，不要反复拿 `seed` 当日常命令
- 改完配置后先检查，再重载服务，不要不检查就直接硬上

---

## 3. 服务器上的关键目录

项目在服务器上的推荐目录是：

```text
/var/www/meshfree/
├── client/
├── server/
├── docs/
└── ...
```

你以后最常接触的是这些位置：

- 仓库根目录：`/var/www/meshfree`
- 后端目录：`/var/www/meshfree/server`
- 前端目录：`/var/www/meshfree/client`
- 数据库文件：通常在 `server/prisma/prod.db`
- 上传文件目录：`/var/www/meshfree/server/uploads`

理解这一点很重要：

- 代码可以通过 `git pull` 更新
- 前后端 `dist` 可以重新构建生成
- 数据库和上传文件是运行中的真实数据，不能随便删，不能提交到仓库

---

## 4. 平时应该用哪个账号登录服务器

后续维护时，应该优先使用普通运维用户加 `sudo`，不要长期直接用 `root`。

当前约定是：

- 运维用户：`koito`
- 管理方式：需要提权时使用 `sudo`

也就是说，以后日常上服务器，优先这样理解：

- 登录：用 `koito`
- 管理系统服务：配合 `sudo`
- 不要把长期维护习惯建立在 `root` 直接远程登录上

---

## 5. 每次启动服务器后，要怎么让网站跑起来

### 5.1 理想情况

如果之前已经正确执行过：

```bash
pm2 startup
pm2 save
```

并且 `Nginx` 已经启用系统启动，那么服务器重启后通常应该是：

- `Nginx` 自动启动
- `PM2` 自动恢复 `meshfree-server`
- 网站可以直接访问

所以，服务器重启之后，你第一步不是立刻乱重装或乱启动，而是先检查状态。

### 5.2 重启后先检查

```bash
sudo systemctl status nginx
pm2 status
```

如果两边都正常，再直接访问：

- `https://yukiho.site`

再顺手验证：

- 首页是否能打开
- 管理员后台是否能登录
- 前台接口是否正常
- 投稿是否正常

### 5.3 如果网站没起来，按这个顺序处理

先看 `Nginx`：

```bash
sudo systemctl status nginx
```

如果 `Nginx` 没启动，可以尝试：

```bash
sudo systemctl start nginx
```

再看后端：

```bash
pm2 status
```

如果 `meshfree-server` 没有在线，进入后端目录手动启动：

```bash
cd /var/www/meshfree/server
pm2 start ecosystem.config.cjs
```

启动后再看日志：

```bash
pm2 logs meshfree-server
```

如果你确认当前进程是正确的，并且希望以后重启机器时也自动恢复，再执行：

```bash
pm2 save
```

### 5.4 如果只是后端挂了

这种情况最常见，不一定要整台服务器重启。

直接执行：

```bash
pm2 restart meshfree-server
```

如果还不行，再看日志：

```bash
pm2 logs meshfree-server
```

---

## 6. 每次本地代码更新后，怎么更新到服务器

这是以后最常用的维护流程。

### 6.1 适用前提

前提是：

- 你已经把最新代码提交到了远端仓库
- 服务器上的项目目录已经是现有仓库
- 线上仍沿用当前部署结构

### 6.2 最简更新方式

如果只是非常小的代码改动，且没有新增依赖、没有 Prisma 变更、没有前端构建变化，最简流程是：

```bash
cd /var/www/meshfree
git pull
pm2 restart meshfree-server
```

但是对你来说，更稳妥的做法是优先用下面的“完整更新流程”。

### 6.3 推荐的完整更新流程

```bash
cd /var/www/meshfree
git pull

cd /var/www/meshfree/server
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

cd /var/www/meshfree/client
npm install
npm run build

pm2 restart meshfree-server
sudo nginx -t
sudo systemctl reload nginx
```

### 6.4 这一整套命令分别是在干什么

#### `git pull`

把服务器上的代码更新到最新版本。

#### `server/npm install`

如果你这次更新改了后端依赖，服务器需要同步安装。

#### `npx prisma generate`

重新生成 Prisma Client，避免数据库模型改了但运行代码还是旧的。

#### `npx prisma migrate deploy`

把已经提交到仓库里的生产迁移应用到线上数据库。

注意：

- 只有你这次改了 Prisma schema 并生成了迁移时，这一步才会真正改数据库
- 但作为固定流程保留它，通常更稳妥

#### `server/npm run build`

重新构建后端 `dist`

#### `client/npm install`

如果前端依赖有变，需要同步安装

#### `client/npm run build`

重新生成前端静态文件

#### `pm2 restart meshfree-server`

让后端加载最新代码

#### `sudo nginx -t`

检查 Nginx 配置语法有没有问题

#### `sudo systemctl reload nginx`

平滑重载 Nginx

说明：

- 如果这次根本没有改 Nginx 配置，这一步通常不会产生明显变化
- 但保留检查习惯是好事
- 如果你明确知道没碰 Nginx，`reload` 不是每次都必须

### 6.5 更新完成后要做的验证

每次更新完，不要只看命令没报错，还要做最小验收：

- 打开首页确认站点能访问
- 看一个公开模型详情页
- 测一次下载
- 打开后台确认能登录
- 如本次改到投稿逻辑，补测一次投稿
- 如本次改到审核逻辑，补测一次审核、拒绝、删除

---

## 7. 如果只是改了前端，怎么做

如果你确定这次只改了前端页面，没有改后端依赖、数据库、接口逻辑，可以简化为：

```bash
cd /var/www/meshfree
git pull

cd /var/www/meshfree/client
npm install
npm run build

sudo nginx -t
sudo systemctl reload nginx
```

说明：

- 如果前端是由 `Nginx` 直接托管静态资源，重点是重新构建前端
- 这类情况下通常不需要重启后端
- 但如果你不确定是否涉及接口或共享类型，还是走完整流程更稳

---

## 8. 如果只是改了后端，怎么做

如果你确定这次只改了后端逻辑，可以这样做：

```bash
cd /var/www/meshfree
git pull

cd /var/www/meshfree/server
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

pm2 restart meshfree-server
```

更新后建议仍然做：

```bash
pm2 status
pm2 logs meshfree-server
```

---

## 9. 日常最常用命令

下面这些命令，基本就是你以后最常用的一套。

### 9.1 看 Nginx 状态

```bash
sudo systemctl status nginx
```

### 9.2 检查 Nginx 配置是否正确

```bash
sudo nginx -t
```

### 9.3 重载 Nginx

```bash
sudo systemctl reload nginx
```

### 9.4 看 PM2 状态

```bash
pm2 status
```

### 9.5 看后端日志

```bash
pm2 logs meshfree-server
```

### 9.6 重启后端

```bash
pm2 restart meshfree-server
```

### 9.7 拉取最新代码

```bash
cd /var/www/meshfree
git pull
```

### 9.8 查看防火墙状态

```bash
sudo ufw status
```

### 9.9 查看 fail2ban 状态

```bash
sudo systemctl status fail2ban
```

### 9.10 更新系统包

```bash
sudo apt update && sudo apt upgrade -y
```

说明：

- 这个不需要每天跑
- 但可以定期执行，例如隔一段时间维护一次
- 执行前最好确认当前网站状态稳定，并且自己有时间观察更新后的结果

---

## 10. 环境变量平时怎么维护

后端环境变量文件在：

```text
/var/www/meshfree/server/.env
```

当前最关键的变量包括：

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="replace-this-with-a-random-secret"
PORT=3001
NODE_ENV="production"
CORS_ALLOWED_ORIGINS="https://yukiho.site,https://www.yukiho.site"
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="replace-this-with-a-strong-password"
```

### 10.1 平时要注意什么

- `.env` 只保留在服务器上
- 改完 `.env` 后，后端需要重启才能生效
- 不要把真实密码和密钥写进仓库
- 不要把密码长期暴露在终端截图、聊天记录里

### 10.2 如果改了 `.env`

例如你修改了 `JWT_SECRET`、`CORS_ALLOWED_ORIGINS`、端口或其他后端配置，改完后执行：

```bash
pm2 restart meshfree-server
```

如果还涉及 Nginx 反代配置变化，再额外执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. 管理员密码以后怎么维护

这是一个很重要的点。

### 11.1 不要把 `db:seed` 当日常维护命令

首次部署时，管理员初始化可以用：

```bash
npm run db:seed
```

但是以后日常维护管理员账号时，不建议一直重复执行这个命令。

### 11.2 重置管理员密码，应该用这个命令

```bash
cd /var/www/meshfree/server
ADMIN_MANAGE_USERNAME="mano" ADMIN_MANAGE_PASSWORD="your-new-strong-password" npm run admin:manage
```

这个命令的逻辑是：

- 如果管理员不存在，就创建
- 如果管理员已存在，就更新密码

### 11.3 这个命令什么时候用

适合下面几种情况：

- 忘记管理员密码
- 想主动重置管理员密码
- 想修复管理员账号异常

### 11.4 使用这个命令的注意事项

- 这是一条临时维护命令
- 不建议把新密码长期写进 `.env`
- 执行后要注意不要让密码暴露在共享终端环境里
- 如果担心泄露，可以尽量减少命令暴露范围，并避免截图

---

## 12. 平时最值得做的例行检查

不是每天都要做很多事，但建议养成“轻量巡检”的习惯。

### 12.1 每次上线更新后

至少检查：

- `pm2 status`
- `pm2 logs meshfree-server`
- `sudo nginx -t`
- 首页能否打开
- 管理员能否登录
- 本次修改涉及的业务是否正常

### 12.2 偶尔做的系统检查

可以定期看一下：

- `sudo systemctl status nginx`
- `sudo ufw status`
- `sudo systemctl status fail2ban`

### 12.3 如果网站长期运行

后续还可以慢慢补这些意识：

- 定期更换管理员密码
- 如果怀疑 `JWT_SECRET` 泄露，立即更换并重启部署
- 后续如果项目进入更长期使用阶段，再补数据库备份方案

---

## 13. 常见问题时先查什么

### 13.1 域名打不开

先检查：

- 域名解析是否还指向正确公网 IP
- 云平台安全组是否放行 `80/443`
- `UFW` 是否放行 `80/443`
- `Nginx` 是否在运行

常用命令：

```bash
sudo systemctl status nginx
sudo ufw status
```

### 13.2 首页能打开，但接口失败

先检查：

- `PM2` 中后端是否在线
- 后端是否正常监听 `3001`
- Nginx 的 `/api` 反代是否正确
- 后端日志是否报错

常用命令：

```bash
pm2 status
pm2 logs meshfree-server
```

### 13.3 管理员无法登录

先检查：

- `.env` 里是否有 `JWT_SECRET`
- 管理员账号是否初始化过
- `ADMIN_SEED_USERNAME` 是否与预期一致
- 密码是否正确
- 必要时是否需要用 `npm run admin:manage` 重置密码

### 13.4 投稿上传失败

先检查：

- `server/uploads` 目录权限是否正常
- 文件大小是否超限制
- 文件格式是否符合要求
- 后端日志是否有上传错误

---

## 14. 以后维护时，最推荐的工作习惯

为了减少出错，建议坚持这些习惯：

- 每执行完一段命令，就看一眼输出结果
- 改完配置先检查，再重载
- 不确定当前目录时先执行 `pwd`
- 不确定当前用户时先执行 `whoami`
- 每次上线后至少做一次最小业务验证
- 不要一遇到问题就整套删掉重装，先看日志和状态

---

## 15. 最常用的维护流程速查版

### 15.1 服务器重启后检查网站

```bash
sudo systemctl status nginx
pm2 status
pm2 logs meshfree-server
```

如果后端没起来：

```bash
cd /var/www/meshfree/server
pm2 start ecosystem.config.cjs
pm2 save
```

### 15.2 一次标准代码更新

```bash
cd /var/www/meshfree
git pull

cd /var/www/meshfree/server
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

cd /var/www/meshfree/client
npm install
npm run build

pm2 restart meshfree-server
sudo nginx -t
sudo systemctl reload nginx
```

### 15.3 重置管理员密码

```bash
cd /var/www/meshfree/server
ADMIN_MANAGE_USERNAME="mano" ADMIN_MANAGE_PASSWORD="your-new-strong-password" npm run admin:manage
```

### 15.4 日常查看状态

```bash
sudo systemctl status nginx
pm2 status
pm2 logs meshfree-server
sudo ufw status
sudo systemctl status fail2ban
```

---

## 16. 最后一句话版本

以后你可以把维护工作简单理解成三类：

1. 网站没起来：先看 `Nginx` 和 `PM2`
2. 代码更新上线：`git pull -> install -> prisma -> build -> pm2 restart`
3. 管理员有问题：不要乱跑 seed，优先用 `npm run admin:manage`

只要继续沿用现在这套结构，这个项目后续维护难度是可控的。
