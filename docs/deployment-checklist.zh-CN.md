# MeshFree 最短部署执行清单（中文）

这份文档是 `docs/deployment-guide.zh-CN.md` 的极简执行版。  
适合你第一次真正上服务器时边做边勾选。

## 1. 服务器初始化

- [ ] 用 `root` 通过 `Xshell` 登录新服务器
- [ ] 执行 `apt update && apt upgrade -y`
- [ ] 创建 `koito` 并加入 `sudo` 组
- [ ] 在 `adduser koito` 过程中完成 Linux 登录密码设置
- [ ] 新开一个 `Xshell` 会话，用 `koito` 登录测试成功
- [ ] 修改 `/etc/ssh/sshd_config`，禁用 `root` 远程登录
- [ ] 重启 SSH 服务，并再次确认 `koito` 能登录

## 2. 安全与运行环境

- [ ] 在云服务器控制台安全组 / 防火墙里放行 `22/80/443`
- [ ] 配置 `UFW`，放行 `22/80/443`
- [ ] 安装并启动 `fail2ban`
- [ ] 安装 `git`、`curl`、`build-essential`
- [ ] 安装 `Node.js 20 LTS`
- [ ] 安装 `Nginx`
- [ ] 安装 `PM2`

## 3. 域名解析

- [ ] 登录域名平台控制台，打开 `yukiho.site` 的 DNS / 域名解析页面
- [ ] 添加 `A` 记录：`@ -> 服务器公网 IP`
- [ ] 添加 `A` 记录：`www -> 服务器公网 IP`
- [ ] 等待 DNS 生效
- [ ] 用 `ping` 或 `nslookup` 确认 `yukiho.site` 和 `www.yukiho.site` 已解析到服务器
- [ ] 确认两个域名都指向同一台服务器，再继续后面的 Nginx 和 HTTPS 步骤

## 4. 拉代码与安装依赖

- [ ] 以 `koito` 登录后进入 `/var/www`
- [ ] `git clone` 仓库到 `/var/www/meshfree`
- [ ] 在 `server` 执行 `npm install`
- [ ] 在 `client` 执行 `npm install`
- [ ] 在 `server` 执行 `npx prisma generate`

## 5. 配置环境变量

- [ ] 在 `server` 目录执行 `cp .env.example .env`
- [ ] 使用 `nano .env` 打开环境变量文件
- [ ] 配置 `DATABASE_URL`
- [ ] 生成并填写 `JWT_SECRET`
- [ ] 填写 `PORT=3001`
- [ ] 填写 `NODE_ENV=production`
- [ ] 填写 `CORS_ALLOWED_ORIGINS=https://yukiho.site,https://www.yukiho.site`
- [ ] 填写 `ADMIN_SEED_USERNAME=mano`
- [ ] 填写 `ADMIN_SEED_PASSWORD=<强密码>`
- [ ] 用 `Ctrl + O` 保存，再用 `Ctrl + X` 退出 `nano`
- [ ] 执行 `chmod 600 .env`

## 6. 初始化数据库与管理员

- [ ] 在 `server` 执行 `npx prisma migrate deploy`
- [ ] 执行 `npm run db:seed`
- [ ] 确认管理员账号按 `mano` 初始化

## 7. 构建与启动

- [ ] 在 `server` 执行 `npm run build`
- [ ] 在 `client` 执行 `npm run build`
- [ ] 在 `server` 执行 `pm2 start ecosystem.config.cjs`
- [ ] 执行 `pm2 startup`
- [ ] 按 PM2 输出复制执行那条 `sudo` 命令
- [ ] 执行 `pm2 save`

## 8. 配置 Nginx

- [ ] 参考 `deploy/nginx/meshfree.conf.example` 创建 `/etc/nginx/sites-available/meshfree`
- [ ] 如果你不想手抄，可以从仓库模板复制内容到该文件
- [ ] 确认配置中包含 `client_max_body_size 30m;`
- [ ] 启用站点配置
- [ ] 执行 `sudo nginx -t`
- [ ] 执行 `sudo systemctl reload nginx`
- [ ] 先确认 `http://yukiho.site` 可以打开

## 9. 申请 HTTPS

- [ ] 安装 `certbot` 和 `python3-certbot-nginx`
- [ ] 执行 `sudo certbot --nginx -d yukiho.site -d www.yukiho.site`
- [ ] 如果被问到是否重定向 HTTP 到 HTTPS，选择带 `Redirect` 的那一项
- [ ] 执行 `sudo certbot renew --dry-run`

## 10. 最终验收

- [ ] `https://yukiho.site` 正常打开
- [ ] `http://yukiho.site` 跳转到 `https://yukiho.site`
- [ ] `http://www.yukiho.site` 跳转到 `https://yukiho.site`
- [ ] `https://www.yukiho.site` 跳转到 `https://yukiho.site`
- [ ] 首页、详情、下载功能正常
- [ ] 投稿功能正常
- [ ] 管理员 `mano` 可登录
- [ ] 审核、拒绝、删除功能正常

## 出问题时先看

- 完整部署说明：`docs/deployment-guide.zh-CN.md`
- Nginx 模板：`deploy/nginx/meshfree.conf.example`
- 环境变量模板：`server/.env.example`
- 文档索引：`docs/README.md`
