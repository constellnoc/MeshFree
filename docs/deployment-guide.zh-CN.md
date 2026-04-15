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

执行后需要为 `koito` 设置登录密码。

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

## 11. 环境变量配置

后端至少需要以下环境变量：

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `ADMIN_SEED_USERNAME`
- `ADMIN_SEED_PASSWORD`

### 11.1 每个变量的作用

#### `DATABASE_URL`

这是 Prisma 连接数据库时使用的地址。  
当前项目使用 `SQLite`，因此通常会指向一个本地文件。

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

### 11.3 创建 .env

进入后端目录：

```bash
cd /var/www/meshfree/server
```

创建 `.env` 文件：

```bash
nano .env
```

示例模板如下：

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="请替换为随机生成的高强度字符串"
PORT=3001
NODE_ENV="production"
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="请替换为你的强密码"
```

重要提醒：

- 不要把 `.env` 提交到 Git 仓库
- 不要把真实 `JWT_SECRET` 和管理员密码写进文档
- 正式管理员密码请务必使用强密码，不建议使用短密码

### 11.4 收紧 .env 权限

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
pm2 start dist/index.js --name meshfree-server
```

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

可以先使用 HTTP 版本的基础配置，后续再通过 `Certbot` 自动接入 HTTPS：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yukiho.site www.yukiho.site;

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

### 17.2 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/meshfree /etc/nginx/sites-enabled/meshfree
sudo nginx -t
sudo systemctl reload nginx
```

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

如果成功，后续应实现以下规则：

- `http://yukiho.site` 跳转到 `https://yukiho.site`
- `http://www.yukiho.site` 跳转到 `https://yukiho.site`
- `https://www.yukiho.site` 跳转到 `https://yukiho.site`

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

后续建议：

- 将 SSH 登录从“密码登录”升级为“仅密钥登录”
- 定期更换管理员密码
- 不要在聊天、截图或仓库中暴露 `JWT_SECRET`
- 如果怀疑 `JWT_SECRET` 泄露，应立即更换并重新部署
- 不要把数据库文件和上传文件提交到 Git
- 后续如果进入更长期使用阶段，再补数据库备份与恢复方案

## 附录 A：后端环境变量模板

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="replace-this-with-a-random-secret"
PORT=3001
NODE_ENV="production"
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
