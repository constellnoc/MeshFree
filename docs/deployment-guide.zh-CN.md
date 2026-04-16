# MeshFree 部署指南（中文）

## 1. 文档目标

本文档用于将 `MeshFree MVP` 从本地可演示状态部署到一台全新的 `Ubuntu 22.04` 云服务器，并尽量遵循“稳定优先、安全优先、便于新手维护”的原则。

本文档默认基于以下已确认方案：

- 服务器系统：`Ubuntu 22.04`
- 运行环境：`Node.js 20 LTS`
- 进程管理：`PM2`
- 反向代理：`Nginx`
- 数据库：`SQLite`
- 上传文件：服务器本地磁盘
- 项目目录：`/var/www/meshfree`
- 部署用户：`koito`
- SSH 策略：首次允许密码登录，后续建议升级为密钥登录
- Root 策略：禁用 `root` 远程登录，仅通过 `sudo` 提权
- 主域名：`yukiho.site`
- 兼容域名：`www.yukiho.site`
- HTTPS：`Let's Encrypt + Certbot + Nginx`

本文档只覆盖当前 MVP 范围，不包含以下内容：

- Docker
- 对象存储
- CDN
- 多机部署
- 自动化 CI/CD
- 数据库备份方案

## 1.1 阅读方式建议

如果你是第一次搭建网站，建议不要一边跳着看一边操作，而是按下面的顺序整体执行：

1. 先完成服务器初始化和安全加固
2. 再完成域名解析
3. 再安装 Node.js、Nginx、PM2 等运行环境
4. 再拉取代码、安装依赖、配置 `.env`
5. 再执行 Prisma、seed、前后端构建
6. 再启动 PM2 和配置 Nginx
7. 最后申请 HTTPS 并做整站验证

如果你在某一步卡住，不建议继续往后跳。  
对于第一次部署，最稳妥的方式是“前一步确认成功，再做下一步”。

## 2. 部署架构概览

本项目生产环境的部署结构如下：

- 浏览器通过 `https://yukiho.site` 访问网站
- `Nginx` 对外提供 HTTPS 服务
- 前端 `Vite` 构建后的静态文件由 `Nginx` 直接提供
- `/api` 请求由 `Nginx` 反向代理到 Node.js 后端
- `/uploads` 资源通过后端静态服务暴露
- 后端使用 `PM2` 托管
- 数据库使用服务器本地 `SQLite`
- 上传文件保存在服务器本地目录

最终访问入口统一为：

- `https://yukiho.site`

以下入口都应自动跳转到上面的正式地址：

- `http://yukiho.site`
- `http://www.yukiho.site`
- `https://www.yukiho.site`

## 3. 部署前提

开始部署前，请确认你已经具备以下条件：

- 一台全新的 `Ubuntu 22.04` 云服务器
- 服务器具有公网 IP
- 已购买域名 `yukiho.site`
- 服务器可以访问公网
- 云服务器安全组或防火墙允许 `22`、`80`、`443` 端口
- GitHub 仓库为 `public`

如果云平台存在安全组，请先放行：

- `22/tcp`
- `80/tcp`
- `443/tcp`

### 3.1 云平台安全组 / 防火墙如何放行

这一步是在**云服务器提供商控制台**里完成，不是在 Ubuntu 终端里完成。

常见入口名称可能是：

- 安全组
- 防火墙
- 入站规则
- Inbound Rules

如果你是第一次操作，可以按下面的思路去找：

1. 登录云服务器控制台
2. 找到你的这台服务器实例
3. 找到与它绑定的“安全组”或“防火墙规则”
4. 找到“入站规则”或“允许访问规则”
5. 新增以下规则：
   - `22/tcp`
   - `80/tcp`
   - `443/tcp`
6. 来源地址如果你暂时不熟，可以先填写：
   - `0.0.0.0/0`
7. 保存规则后，等待规则生效

说明：

- `22` 用于 SSH 远程登录
- `80` 用于 HTTP 和 `Certbot` 域名验证
- `443` 用于 HTTPS
- 这一步和后面 Ubuntu 里的 `UFW` 不是二选一，而是两层都要配置

## 4. 服务器目录约定

为了便于维护，建议固定使用以下目录约定：

```text
/var/www/meshfree/
├── client/
├── server/
├── docs/
└── ...
```

本项目运行时的重要数据包括：

- 后端代码目录：`/var/www/meshfree/server`
- 前端代码目录：`/var/www/meshfree/client`
- SQLite 数据文件：由 `DATABASE_URL` 指向，建议保留在 `server` 内受控位置
- 上传目录：`/var/www/meshfree/server/uploads`

说明：

- 代码目录可通过 `git pull` 更新
- 前端构建产物可重新生成
- 数据库文件和上传文件属于持久化运行数据，不应提交到仓库

## 5. 首次服务器初始化

### 5.1 使用 root 首次登录

新服务器刚开通时，通常先使用云厂商提供的 `root` 账号和初始密码登录。

示例：

```bash
ssh root@<你的服务器公网IP>
```

如果你使用的是 `Xshell`，本节命令本身**不需要改**，只是连接方式从“命令行发起 SSH”变成“在 Xshell 图形界面新建会话”：

- 协议选择 `SSH`
- 主机填写服务器公网 IP
- 端口填写 `22`
- 用户名填写 `root`
- 身份验证方式选择密码登录

后面文档里所有命令，仍然都是在 Xshell 连接成功后的终端里直接执行。  
也就是说：**Xshell 只是你打开远程终端的工具，不会改变 Ubuntu 里的命令本身。**

首次登录只用于初始化服务器环境。后续应尽快创建普通运维用户并禁用 `root` 远程登录。

### 5.2 更新系统软件包

```bash
apt update && apt upgrade -y
```

### 5.3 创建运维用户 koito

```bash
adduser koito
usermod -aG sudo koito
```

执行 `adduser koito` 时，终端通常会依次询问你：

- 输入新密码
- 再输入一次确认密码
- Full Name 等其他资料

对于后面的姓名、电话、房间号之类字段，如果你不需要，可以直接按回车跳过。

重要说明：

- 输入 Linux 密码时，终端**通常不会显示任何字符，也不会显示星号**
- 这不是卡住了，而是 Linux 的正常安全行为
- 你只需要正常输入，然后按回车即可

这里设置的是：

- `koito` 的 Linux 登录密码

它不是：

- 网站后台管理员 `mano` 的登录密码
- `JWT_SECRET`

如果你后续想重新设置 `koito` 的 Linux 密码，可以执行：

```bash
sudo passwd koito
```

如果你想修改 `root` 的 Linux 密码，可以执行：

```bash
passwd
```

### 5.4 验证 koito 具备 sudo 能力

先切换到新用户：

```bash
su - koito
```

然后执行：

```bash
sudo whoami
```

如果输出是 `root`，说明 `koito` 的 `sudo` 权限已生效。

如果你使用 `Xshell`，建议这里不要直接关闭当前 `root` 会话，而是：

- 保留当前 `root` 会话窗口不动
- 新开一个 Xshell 标签页或新建一个会话
- 用 `koito` 和刚设置的密码重新登录一次
- 在新会话里执行 `sudo whoami`

这样即使新用户登录失败，你也还有一个已登录的 `root` 会话可以修复配置。

### 5.5 限制 SSH 登录策略

编辑 SSH 配置文件：

```bash
sudo nano /etc/ssh/sshd_config
```

建议至少确认或调整以下项：

```text
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
AllowUsers koito
```

说明：

- `PermitRootLogin no`：禁用 `root` 远程登录
- `PasswordAuthentication yes`：第一版保留密码登录，便于你当前阶段操作
- `PubkeyAuthentication yes`：为后续升级到 SSH 密钥登录保留能力
- `AllowUsers koito`：仅允许 `koito` 登录 SSH

修改后重启 SSH 服务：

```bash
sudo systemctl restart ssh
```

重要提醒：

- **先确认 `koito` 能成功 SSH 登录后，再断开 `root` 会话**
- 否则可能把自己锁在服务器外面

### 5.6 从这一步开始默认使用 koito

从完成 SSH 加固开始，除非文档中明确写着 `root`，后续操作默认都使用 `koito` 登录后执行。

换句话说，后面你在 Xshell 里常用的登录方式应变为：

```bash
ssh koito@<你的服务器公网IP>
```

如果你在 Xshell 中操作，则等价于：

- 协议：`SSH`
- 主机：服务器公网 IP
- 端口：`22`
- 用户名：`koito`
- 身份验证：密码

## 6. 防火墙与基础防护

### 6.1 配置 UFW

安装并启用 `UFW`：

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

目标是只开放当前部署所需端口。

这里需要再次强调：

- 云厂商控制台里的安全组放行，是第一层
- Ubuntu 里的 `UFW` 放行，是第二层

只有两边都放通，公网访问才会真正生效。

### 6.2 安装 fail2ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban
```

`fail2ban` 可以在有人反复尝试爆破 SSH 密码时进行临时封禁。

## 7. 安装基础运行环境

### 7.1 安装常用工具

```bash
sudo apt install -y git curl build-essential
```

### 7.2 安装 Node.js 20 LTS

推荐使用 NodeSource：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
```

### 7.3 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### 7.4 安装 PM2

```bash
sudo npm install -g pm2
pm2 -v
```

## 8. 域名解析

你已经购买了域名 `yukiho.site`，但在 HTTPS 生效前，还需要完成 DNS 解析。

至少需要配置：

- `A` 记录：`yukiho.site -> 服务器公网 IPv4`
- `A` 记录：`www.yukiho.site -> 服务器公网 IPv4`

说明：

- 裸域名 `yukiho.site` 是正式主域名
- `www.yukiho.site` 只用于兼容访问，并在 `Nginx` 中跳转到裸域名

可以使用以下命令检查解析是否生效：

```bash
ping yukiho.site
ping www.yukiho.site
```

如果解析刚添加，可能需要等待一段时间才会完全生效。

如果你在域名控制台里还不熟悉记录填写方式，可以这样理解：

- 主机记录填 `@`，表示裸域名 `yukiho.site`
- 主机记录填 `www`，表示 `www.yukiho.site`
- 记录类型选 `A`
- 记录值填写你的服务器公网 IPv4

## 9. 获取项目代码

切换到计划部署目录的父目录：

```bash
cd /var/www
```

如果目录不存在，可以先创建：

```bash
sudo mkdir -p /var/www
sudo chown -R koito:koito /var/www
```

拉取代码：

```bash
git clone <你的仓库地址> meshfree
cd /var/www/meshfree
```

因为仓库是 `public`，所以这里不需要额外配置私库认证。

如果你不确定仓库地址怎么写，GitHub 上常见的 HTTPS 公开仓库地址格式通常是：

```text
https://github.com/<你的用户名>/<你的仓库名>.git
```

## 10. 安装项目依赖

### 10.1 安装后端依赖

```bash
cd /var/www/meshfree/server
npm install
```

### 10.2 安装前端依赖

```bash
cd /var/www/meshfree/client
npm install
```

### 10.3 生成 Prisma Client

由于本项目使用 Prisma，第一次在新服务器部署时，建议显式执行一次：

```bash
cd /var/www/meshfree/server
npx prisma generate
```

这样可以避免后续 `build` 或启动阶段因 Prisma Client 未生成而报错。

## 11. 环境变量配置

后端至少需要以下环境变量：

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `CORS_ALLOWED_ORIGINS`
- `ADMIN_SEED_USERNAME`
- `ADMIN_SEED_PASSWORD`

### 11.1 每个变量的作用

#### `DATABASE_URL`

这是 Prisma 连接数据库时使用的地址。  
当前项目使用 `SQLite`，因此通常会指向一个本地文件。

如果使用下面这条配置：

```env
DATABASE_URL="file:./prisma/prod.db"
```

那么数据库文件最终会位于：

```text
/var/www/meshfree/server/prisma/prod.db
```

这能帮助你明确知道：数据库文件并不在系统其他神秘位置，而是在项目后端目录下的 `prisma` 目录里。

#### `JWT_SECRET`

这是后端用于签发和校验管理员登录令牌的密钥。  
它必须足够长、足够随机，并且只能保存在服务器上。

#### `PORT`

后端 Express 服务监听的端口。  
建议继续使用 `3001`。

#### `NODE_ENV`

运行环境标识。  
生产环境建议使用：

```text
production
```

#### `CORS_ALLOWED_ORIGINS`

这是生产环境允许访问后端 API 的前端来源列表。  
多个来源之间用英文逗号分隔。

当前项目生产环境建议填写为：

```text
https://yukiho.site,https://www.yukiho.site
```

说明：

- 开发环境下，后端会默认允许本地 `Vite` 地址
- 生产环境下，建议只允许正式站点域名
- 如果不收紧这个值，后端接口会比实际需要暴露得更宽

#### `ADMIN_SEED_USERNAME`

首次部署时用于初始化管理员用户名。  
本项目已确认线上管理员用户名应为：

```text
mano
```

#### `ADMIN_SEED_PASSWORD`

首次部署时用于初始化管理员密码。  
这是敏感信息，不应提交到仓库。

### 11.2 JWT_SECRET 的生成方式

不要手写一句普通英文，更不要使用短字符串。

可以在服务器上生成：

```bash
openssl rand -base64 32
```

或者：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 11.3 三种密码 / 密钥的区别

第一次部署时，很容易把下面三个东西混淆。这里单独区分一下：

#### Linux 登录密码

这是服务器用户登录 Ubuntu 用的密码，例如：

- `root` 登录服务器的密码
- `koito` 登录服务器的密码

它用于：

- `Xshell` SSH 登录服务器
- `sudo` 提权时输入

#### 后台管理员密码

这是网站后台管理员 `mano` 登录管理页面用的密码。

它用于：

- 登录 `/admin` 后台页面

它不是 Linux 用户密码，不能用来 SSH 登录服务器。

#### `JWT_SECRET`

这不是“登录密码”，而是后端用于签发和校验管理员 token 的密钥。

它用于：

- 后端生成 JWT
- 后端验证 JWT

它不应该被任何人拿去手动登录，也不应该暴露在仓库或截图里。

### 11.4 从 .env.example 创建并编辑 .env

进入后端目录：

```bash
cd /var/www/meshfree/server
```

先从模板复制：

```bash
cp .env.example .env
```

再编辑 `.env`：

```bash
nano .env
```

如果你使用的是 `Xshell`，这一步仍然是在远程终端里完成，不是在本地 Windows 文件资源管理器里完成。

示例模板如下：

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="请替换为随机生成的高强度字符串"
PORT=3001
NODE_ENV="production"
CORS_ALLOWED_ORIGINS="https://yukiho.site,https://www.yukiho.site"
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="请替换为你的强密码"
```

`nano` 的常用操作：

- `Ctrl + O`：保存文件
- 回车：确认文件名
- `Ctrl + X`：退出编辑器
- `Ctrl + K`：剪切当前行
- `Ctrl + U`：粘贴刚刚剪切的内容

如果你改完 `.env` 后想保存退出，最常见的顺序是：

1. 按 `Ctrl + O`
2. 按回车确认
3. 按 `Ctrl + X`

重要提醒：

- 不要把 `.env` 提交到 Git 仓库
- 不要把真实 `JWT_SECRET` 和管理员密码写进文档
- 正式管理员密码请务必使用强密码，不建议使用短密码

### 11.5 收紧 .env 权限

```bash
chmod 600 /var/www/meshfree/server/.env
```

## 12. 当前代码与管理员初始化说明

你已确认要使用环境变量 `ADMIN_SEED_USERNAME` 和 `ADMIN_SEED_PASSWORD` 来初始化线上管理员。

当前实现中，管理员 seed 已按以下规则工作：

- seed 脚本不再把管理员用户名写死为 `admin`
- seed 脚本会读取 `ADMIN_SEED_USERNAME`
- seed 脚本会读取 `ADMIN_SEED_PASSWORD`

因此，只要服务器 `.env` 中正确设置：

```env
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="你的强密码"
```

首次执行 seed 时，就会按该用户名初始化管理员账号。

## 13. 数据库初始化与管理员 seed

### 13.1 执行 Prisma 迁移

在后端目录中执行：

```bash
cd /var/www/meshfree/server
npx prisma generate
npx prisma migrate deploy
```

### 13.2 初始化管理员账号

首次部署时执行：

```bash
npm run db:seed
```

这一步的职责是：

- 创建管理员账号
- 或在首次初始化阶段更新该管理员账号密码

注意：

- 本文档将 seed 定义为**首次初始化工具**
- 不建议把它当作日常管理员维护命令反复执行
- 如果后续要手动创建管理员或重置管理员密码，优先使用 `npm run admin:manage`

## 14. 构建前后端

### 14.1 构建后端

```bash
cd /var/www/meshfree/server
npm run build
```

### 14.2 构建前端

```bash
cd /var/www/meshfree/client
npm run build
```

建议在正式启动服务前，先确认两边构建都能通过。

## 15. 使用 PM2 托管后端

进入后端目录：

```bash
cd /var/www/meshfree/server
```

启动后端：

```bash
pm2 start ecosystem.config.cjs
```

这样会直接读取仓库中的 PM2 配置文件：

- `server/ecosystem.config.cjs`

查看状态：

```bash
pm2 status
pm2 logs meshfree-server
```

设置开机自启：

```bash
pm2 startup
pm2 save
```

注意：

- `pm2 startup` 执行后，通常会额外输出一条需要 `sudo` 执行的命令
- 你需要把那条输出的完整命令再复制执行一次
- 最后再执行 `pm2 save`

这是 PM2 把当前进程列表注册为系统启动项的正常步骤，不是报错。

说明：

- 后端默认监听 `3001`
- 不建议直接对公网暴露这个端口
- 应由 `Nginx` 统一对外提供服务

## 16. 前端发布思路

本项目的前端是 `React + Vite`。

生产环境中：

- 前端代码在 `client` 目录构建
- 构建产物通常位于 `client/dist`
- `Nginx` 直接提供该目录下的静态文件

由于前端 API 请求使用同域名下的 `/api`，因此生产环境不需要保留本地开发时的 Vite 代理逻辑。

## 17. 配置 Nginx

### 17.1 创建站点配置

建议新建站点配置文件：

```bash
sudo nano /etc/nginx/sites-available/meshfree
```

仓库里已经提供了可参考的 Nginx 模板文件：

- `deploy/nginx/meshfree.conf.example`

第一次部署时，你可以把这个模板作为起点，而不是从文档里手动抄写。

可以先使用 HTTP 版本的基础配置，后续再通过 `Certbot` 自动接入 HTTPS：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yukiho.site www.yukiho.site;
    client_max_body_size 30m;

    root /var/www/meshfree/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

这里的 `client_max_body_size 30m;` 很重要。  
因为当前投稿接口允许上传 ZIP 和封面图，如果不显式调大这个值，Nginx 默认请求体限制可能会直接导致上传返回 `413 Request Entity Too Large`。

### 17.2 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/meshfree /etc/nginx/sites-enabled/meshfree
sudo nginx -t
sudo systemctl reload nginx
```

到这一步之后，建议先在浏览器中访问：

- `http://yukiho.site`
- `http://www.yukiho.site`

确认至少能打开前端页面，再继续申请 HTTPS。  
如果这里就打不开，不要直接继续执行 `Certbot`，应先排查 DNS、Nginx 和前端构建产物。

如果默认站点会冲突，可以删除：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 18. 申请 HTTPS 证书

### 18.1 安装 Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 18.2 申请证书

```bash
sudo certbot --nginx -d yukiho.site -d www.yukiho.site
```

执行过程中，Certbot 会：

- 向 `Let's Encrypt` 申请证书
- 验证域名是否已解析到当前服务器
- 自动尝试修改 Nginx 配置

第一次执行时，如果 Certbot 询问是否将 HTTP 自动跳转到 HTTPS，建议选择“重定向”。

如果你是第一次用 `certbot`，这里很重要：

- 你通常会看到两个选项
- 一个表示“不重定向”
- 一个表示“重定向到 HTTPS”

你应该选择：

- 表示 `Redirect` 的那一项

因为我们当前项目已经明确要求：

- `http://yukiho.site` 自动跳到 `https://yukiho.site`
- `http://www.yukiho.site` 自动跳到 `https://yukiho.site`

如果界面是编号选择，不同环境编号可能略有不同。  
你不需要死记编号，只要认准含义是：

- **把 HTTP 重定向到 HTTPS**

如果你看不懂英文提示，就重点找带有 `Redirect` 这个单词的选项。

如果成功，后续应实现以下规则：

- `http://yukiho.site` 跳转到 `https://yukiho.site`
- `http://www.yukiho.site` 跳转到 `https://yukiho.site`
- `https://www.yukiho.site` 跳转到 `https://yukiho.site`

注意：

- Certbot 很擅长帮你接入 HTTPS
- 但它**不一定会完全按你想要的主域名策略自动整理配置**
- 因此申请成功后，仍要手动验证 `www` 是否真的跳到了裸域名

如果你发现：

- `https://www.yukiho.site` 没有跳到 `https://yukiho.site`
- 或者 `www` 和裸域名都各自能打开页面

那么就说明还需要手动调整 Nginx，把 `www` 服务器块改成专门的跳转入口。

### 18.3 为什么 www 也要申请证书

因为浏览器访问 `https://www.yukiho.site` 时，会先建立 HTTPS 连接，再收到跳转。  
如果 `www` 不在证书中，用户会先看到证书错误，而不是正常跳转。

### 18.4 验证自动续期

```bash
sudo certbot renew --dry-run
```

## 19. 上传目录与权限检查

后端启动时会自动创建以下目录：

- `server/uploads`
- `server/uploads/covers`
- `server/uploads/models`

你需要确保运行 Node.js 进程的用户对这些目录拥有读写权限。

可以检查：

```bash
ls -la /var/www/meshfree/server
ls -la /var/www/meshfree/server/uploads
```

如果权限异常，可能导致：

- 投稿上传失败
- 后台删除文件失败
- 下载接口异常

## 20. 首次部署完成后的验证清单

请至少完成以下验证：

建议验证时不要只“打开看一眼”，而是每项都明确判断“成功”还是“失败”，这样后面排错更容易。

### 20.1 基础服务验证

- `pm2 status` 显示后端进程在线
- `sudo systemctl status nginx` 显示 Nginx 正常运行
- `https://yukiho.site` 能正常打开

### 20.2 域名与跳转验证

- 访问 `http://yukiho.site` 会跳到 `https://yukiho.site`
- 访问 `http://www.yukiho.site` 会跳到 `https://yukiho.site`
- 访问 `https://www.yukiho.site` 会跳到 `https://yukiho.site`

### 20.3 业务功能验证

- 首页模型列表正常显示
- 模型详情页可打开
- 模型 ZIP 下载可用
- 投稿表单可提交
- 管理员可使用 `mano` 登录后台
- 后台可查看投稿
- 后台可批准投稿
- 后台可拒绝投稿
- 后台可删除投稿

### 20.4 上传资源验证

- 投稿成功后封面图能访问
- 上传后的 ZIP 能被后端正确处理
- 删除投稿后，数据库记录和文件能一起删除

## 21. 常用运维命令

### 21.1 更新代码

```bash
cd /var/www/meshfree
git pull
```

如果本次更新包含后端依赖、Prisma 变更或前端资源变更，通常完整更新流程应是：

```bash
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

### 21.2 重装依赖

```bash
cd /var/www/meshfree/server && npm install
cd /var/www/meshfree/client && npm install
```

### 21.3 重新构建

```bash
cd /var/www/meshfree/server && npm run build
cd /var/www/meshfree/client && npm run build
```

### 21.4 重启后端

```bash
pm2 restart meshfree-server
```

### 21.5 查看 PM2 日志

```bash
pm2 logs meshfree-server
```

### 21.6 检查 Nginx 配置并重载

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 21.7 手动创建或重置管理员账号

如果后续需要手动创建管理员，或者重置 `mano` 的密码，建议使用专用脚本，而不是重复执行 seed：

```bash
cd /var/www/meshfree/server
ADMIN_MANAGE_USERNAME="mano" ADMIN_MANAGE_PASSWORD="your-new-strong-password" npm run admin:manage
```

这个脚本的行为是：

- 如果该用户名不存在，则创建管理员账号
- 如果该用户名已存在，则只更新密码哈希

说明：

- 这是一个一次性维护命令，不建议把密码长期写进 `.env`
- 更适合在需要修复账号、重置密码时临时执行
- 执行完成后，建议清理终端历史或避免在共享环境中暴露命令内容

## 22. 常见故障排查

### 22.1 域名打不开

优先检查：

- DNS 是否已解析到正确公网 IP
- 安全组是否放行 `80/443`
- `UFW` 是否放行 `80/443`
- `Nginx` 是否正常运行

### 22.2 HTTPS 申请失败

优先检查：

- 域名解析是否已生效
- `80` 端口是否可访问
- Nginx HTTP 配置是否可正常响应

### 22.3 管理员无法登录

优先检查：

- `.env` 中 `JWT_SECRET` 是否存在
- seed 是否已执行
- seed 是否使用了正确的 `ADMIN_SEED_USERNAME`
- 管理员密码是否正确
- seed 执行时读取到的环境变量是否与当前 `.env` 一致

### 22.4 前台打开了，但 API 失败

优先检查：

- `PM2` 中后端是否在线
- 后端是否监听 `3001`
- `Nginx` 的 `/api` 反代是否正确
- 后端日志中是否有报错

### 22.5 投稿上传失败

优先检查：

- 上传目录权限是否正确
- 文件大小是否超过限制
- 文件类型是否符合要求
- 后端日志中是否有上传错误

## 23. 安全提醒与后续加固建议

当前方案已经比“直接让 root 使用密码长期远程登录”更安全，但仍有进一步加强空间。

当前后端还包含两处基础限流：

- 管理员登录接口有限流
- 公开投稿接口有限流

后续建议：

- 将 SSH 登录从“密码登录”升级为“仅密钥登录”
- 定期更换管理员密码
- 不要在聊天、截图或仓库中暴露 `JWT_SECRET`
- 如果怀疑 `JWT_SECRET` 泄露，应立即更换并重新部署
- 不要把数据库文件和上传文件提交到 Git
- 后续如果进入更长期使用阶段，再补数据库备份与恢复方案

## 24. 给第一次搭站者的额外提醒

如果你是第一次搭建网站，下面这些“看起来很小”的习惯会明显减少出错概率：

- 每执行完一段命令，就看一眼终端输出，不要连续粘贴十几条命令后才统一检查
- 每次改完配置文件，都先执行对应的检查命令，例如 `sudo nginx -t`
- 不确定当前在哪个目录时，先执行 `pwd`
- 不确定当前是谁在执行命令时，先执行 `whoami`
- 每改完一个重要配置，就先做一次小验证，不要等全部做完才检查
- 对第一次部署来说，保留一个可用的旧连接窗口，通常比“全关了重新连”更安全

## 附录 A：后端环境变量模板

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="replace-this-with-a-random-secret"
PORT=3001
NODE_ENV="production"
CORS_ALLOWED_ORIGINS="https://yukiho.site,https://www.yukiho.site"
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="replace-this-with-a-strong-password"
```

## 附录 B：推荐服务器目录结构

```text
/var/www/meshfree/
├── client/
│   ├── dist/
│   └── ...
├── server/
│   ├── dist/
│   ├── prisma/
│   ├── uploads/
│   │   ├── covers/
│   │   └── models/
│   ├── .env
│   └── ...
└── docs/
```

## 附录 C：上线后自检速查

- 能 SSH 登录 `koito`
- `root` 无法远程 SSH 登录
- `UFW` 已启用
- `fail2ban` 正常运行
- `Nginx` 正常运行
- `PM2` 正常运行
- `https://yukiho.site` 正常访问
- `www` 能正确跳转
- 后台管理员可登录
- 投稿、审核、删除流程可用

## 附录 D：命令速查表

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 查看防火墙
sudo ufw status

# 查看 fail2ban
sudo systemctl status fail2ban

# 查看 nginx 状态
sudo systemctl status nginx

# 检查 nginx 配置
sudo nginx -t

# 查看 pm2 状态
pm2 status

# 查看 pm2 日志
pm2 logs meshfree-server

# 重启后端
pm2 restart meshfree-server

# 拉取最新代码
cd /var/www/meshfree && git pull
```
