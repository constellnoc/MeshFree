# MeshFree Deployment Guide (English)

## 1. Document Goal

This document explains how to deploy `MeshFree MVP` from a locally runnable demo project to a fresh `Ubuntu 22.04` cloud server, while following the principles of stability first, security first, and beginner-friendly maintenance.

This document assumes the following confirmed decisions:

- Server OS: `Ubuntu 22.04`
- Runtime: `Node.js 20 LTS`
- Process manager: `PM2`
- Reverse proxy: `Nginx`
- Database: `SQLite`
- Upload storage: local server disk
- Project directory: `/var/www/meshfree`
- Deployment user: `koito`
- SSH strategy: password login for the first version, SSH key login recommended later
- Root policy: disable remote `root` login and use `sudo` for privilege escalation
- Primary domain: `yukiho.site`
- Compatibility domain: `www.yukiho.site`
- HTTPS: `Let's Encrypt + Certbot + Nginx`

This document only covers the current MVP scope and does not include:

- Docker
- Object storage
- CDN
- Multi-server deployment
- Automated CI/CD
- Database backup strategy

## 1.1 Suggested Reading Order

If this is your first time deploying a website, do not jump around while operating. It is safer to follow this order:

1. Finish initial server setup and security hardening
2. Finish domain DNS setup
3. Install Node.js, Nginx, PM2, and other runtime dependencies
4. Clone the code, install dependencies, and configure `.env`
5. Run Prisma, seed the admin account, and build both frontend and backend
6. Start PM2 and configure Nginx
7. Apply HTTPS and perform full verification

If you get stuck at one step, do not skip ahead.  
For a first deployment, the safest approach is to confirm each step works before moving on.

## 2. Deployment Architecture Overview

The production deployment structure of this project is:

- The browser accesses the site through `https://yukiho.site`
- `Nginx` provides public HTTPS access
- The frontend static files built by `Vite` are served directly by `Nginx`
- Requests to `/api` are reverse proxied by `Nginx` to the Node.js backend
- Resources under `/uploads` are exposed through the backend static file service
- The backend process is managed by `PM2`
- The database uses local `SQLite` on the server
- Uploaded files are stored on the local server disk

The final canonical entry point should be:

- `https://yukiho.site`

The following addresses should all redirect to that canonical URL:

- `http://yukiho.site`
- `http://www.yukiho.site`
- `https://www.yukiho.site`

## 3. Prerequisites

Before starting deployment, make sure you already have:

- A fresh `Ubuntu 22.04` cloud server
- A public IP address for the server
- A purchased domain: `yukiho.site`
- Outbound internet access from the server
- Cloud security group or firewall rules allowing `22`, `80`, and `443`
- A `public` GitHub repository

If your cloud provider uses security groups, allow:

- `22/tcp`
- `80/tcp`
- `443/tcp`

## 4. Server Directory Convention

To keep maintenance simple, use the following fixed directory layout:

```text
/var/www/meshfree/
├── client/
├── server/
├── docs/
└── ...
```

Important runtime data in this project includes:

- Backend code directory: `/var/www/meshfree/server`
- Frontend code directory: `/var/www/meshfree/client`
- SQLite database file: determined by `DATABASE_URL`, recommended to remain inside `server`
- Upload directory: `/var/www/meshfree/server/uploads`

Notes:

- Code can be updated with `git pull`
- Frontend build artifacts can be regenerated
- Database files and uploaded files are persistent runtime data and should not be committed to the repository

## 5. Initial Server Setup

### 5.1 Log In As root For The First Time

When a new server is created, you usually log in first with the cloud provider's `root` account and the initial password.

Example:

```bash
ssh root@<your-server-public-ip>
```

If you use `Xshell`, the command itself does not need to change. The only difference is that you create the connection from the Xshell UI instead of typing the SSH command locally:

- Protocol: `SSH`
- Host: your server public IP
- Port: `22`
- Username: `root`
- Authentication method: password login

All later commands in this document are still run directly in the terminal after the Xshell connection is established.  
In other words: **Xshell is only your SSH client. It does not change the Ubuntu commands themselves.**

The first `root` login is only for initializing the server. You should create a normal operations user and disable remote `root` login as soon as possible.

### 5.2 Update System Packages

```bash
apt update && apt upgrade -y
```

### 5.3 Create The Operations User koito

```bash
adduser koito
usermod -aG sudo koito
```

You will be asked to set a login password for `koito`.

### 5.4 Verify That koito Has sudo Privileges

First switch to the new user:

```bash
su - koito
```

Then run:

```bash
sudo whoami
```

If the output is `root`, it means `koito` has working `sudo` access.

If you use `Xshell`, do not close the current `root` session immediately. Instead:

- Keep the current `root` session window open
- Open a new Xshell tab or create a new session
- Log in again as `koito` using the password you just set
- Run `sudo whoami` in the new session

That way, if the new user login fails, you still have an active `root` session available for recovery.

### 5.5 Restrict SSH Login Policy

Edit the SSH configuration file:

```bash
sudo nano /etc/ssh/sshd_config
```

At minimum, confirm or adjust the following settings:

```text
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
AllowUsers koito
```

Meaning:

- `PermitRootLogin no`: disable remote `root` login
- `PasswordAuthentication yes`: keep password login in the first version for ease of operation
- `PubkeyAuthentication yes`: preserve the ability to upgrade to SSH key login later
- `AllowUsers koito`: only allow `koito` to log in through SSH

After editing, restart the SSH service:

```bash
sudo systemctl restart ssh
```

Important reminders:

- **Confirm that `koito` can log in successfully before closing the `root` session**
- Otherwise you may lock yourself out of the server

### 5.6 Use koito By Default From This Point On

After the SSH hardening step is finished, all later commands should be run as `koito` unless the document explicitly says otherwise.

That means your common login pattern becomes:

```bash
ssh koito@<your-server-public-ip>
```

In Xshell, that corresponds to:

- Protocol: `SSH`
- Host: server public IP
- Port: `22`
- Username: `koito`
- Authentication: password

## 6. Firewall And Basic Protection

### 6.1 Configure UFW

Install and enable `UFW`:

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

The goal is to expose only the ports needed by the current deployment.

### 6.2 Install fail2ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban
```

`fail2ban` can temporarily block repeated SSH password brute-force attempts.

## 7. Install Basic Runtime Dependencies

### 7.1 Install Common Tools

```bash
sudo apt install -y git curl build-essential
```

### 7.2 Install Node.js 20 LTS

Use NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Check versions:

```bash
node -v
npm -v
```

### 7.3 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### 7.4 Install PM2

```bash
sudo npm install -g pm2
pm2 -v
```

## 8. Domain DNS Setup

You have already purchased `yukiho.site`, but before HTTPS can work, you still need to complete DNS setup.

At minimum, create:

- `A` record: `yukiho.site -> server public IPv4`
- `A` record: `www.yukiho.site -> server public IPv4`

Notes:

- The apex domain `yukiho.site` is the canonical domain
- `www.yukiho.site` is only used for compatibility access and will later redirect to the apex domain in `Nginx`

You can check whether DNS has started working with:

```bash
ping yukiho.site
ping www.yukiho.site
```

If you just added the records, propagation may take some time.

If you are not yet familiar with your domain control panel, interpret the fields like this:

- Host record `@` means the apex domain `yukiho.site`
- Host record `www` means `www.yukiho.site`
- Record type should be `A`
- Record value should be your server public IPv4 address

## 9. Get The Project Code

Move to the parent directory of the planned deployment path:

```bash
cd /var/www
```

If the directory does not exist yet, create it first:

```bash
sudo mkdir -p /var/www
sudo chown -R koito:koito /var/www
```

Clone the repository:

```bash
git clone <your-repository-url> meshfree
cd /var/www/meshfree
```

Because the repository is `public`, you do not need extra private-repo authentication here.

If you are not sure what the repository URL should look like, a common public GitHub HTTPS URL format is:

```text
https://github.com/<your-username>/<your-repo-name>.git
```

## 10. Install Project Dependencies

### 10.1 Install Backend Dependencies

```bash
cd /var/www/meshfree/server
npm install
```

### 10.2 Install Frontend Dependencies

```bash
cd /var/www/meshfree/client
npm install
```

### 10.3 Generate Prisma Client

Because this project uses Prisma, it is recommended to explicitly run this once on a fresh server:

```bash
cd /var/www/meshfree/server
npx prisma generate
```

This helps avoid later build or startup failures caused by a missing Prisma Client.

## 11. Environment Variable Configuration

The backend requires at least the following environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `ADMIN_SEED_USERNAME`
- `ADMIN_SEED_PASSWORD`

### 11.1 What Each Variable Does

#### `DATABASE_URL`

This is the database connection URL used by Prisma.  
Because the project uses `SQLite`, it normally points to a local file.

If you use this value:

```env
DATABASE_URL="file:./prisma/prod.db"
```

then the actual database file will be located at:

```text
/var/www/meshfree/server/prisma/prod.db
```

This makes it clear that the database file is not stored in some hidden system location. It lives under the backend `prisma` directory inside the project.

#### `JWT_SECRET`

This is the secret key used by the backend to sign and verify administrator login tokens.  
It must be long, random, and stored only on the server.

#### `PORT`

This is the port used by the Express backend service.  
It is recommended to keep using `3001`.

#### `NODE_ENV`

This identifies the runtime environment.  
For production, use:

```text
production
```

#### `ADMIN_SEED_USERNAME`

This is the admin username used during first deployment initialization.  
The confirmed production admin username for this project is:

```text
mano
```

#### `ADMIN_SEED_PASSWORD`

This is the admin password used during first deployment initialization.  
It is sensitive information and must not be committed to the repository.

### 11.2 How To Generate JWT_SECRET

Do not handwrite a normal sentence, and do not use a short weak string.

Generate it on the server with:

```bash
openssl rand -base64 32
```

or:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 11.3 Create .env

Go to the backend directory:

```bash
cd /var/www/meshfree/server
```

Create the `.env` file:

```bash
nano .env
```

Example template:

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="replace-this-with-a-random-high-entropy-string"
PORT=3001
NODE_ENV="production"
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="replace-this-with-a-strong-password"
```

Important reminders:

- Do not commit `.env` to Git
- Do not put the real `JWT_SECRET` or real admin password in documentation
- The production admin password should be strong and should not be a short password

### 11.4 Restrict .env File Permissions

```bash
chmod 600 /var/www/meshfree/server/.env
```

## 12. Current Code And Admin Initialization Behavior

You have confirmed that production admin initialization should use `ADMIN_SEED_USERNAME` and `ADMIN_SEED_PASSWORD`.

In the current implementation, the admin seed works with these rules:

- The seed script no longer hardcodes the admin username as `admin`
- The seed script reads `ADMIN_SEED_USERNAME`
- The seed script reads `ADMIN_SEED_PASSWORD`

So if the server `.env` correctly contains:

```env
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="your-strong-password"
```

then the first seed execution will initialize the admin account with that username.

## 13. Database Initialization And Admin Seed

### 13.1 Run Prisma Migration

In the backend directory, run:

```bash
cd /var/www/meshfree/server
npx prisma generate
npx prisma migrate deploy
```

### 13.2 Initialize The Admin Account

Run this during first deployment:

```bash
npm run db:seed
```

The purpose of this step is:

- To create the admin account
- Or to update that admin account password during the first initialization phase

Notes:

- In this document, seed is treated as a **first-time initialization tool**
- It is not recommended to use it repeatedly as a day-to-day admin maintenance command

## 14. Build Frontend And Backend

### 14.1 Build The Backend

```bash
cd /var/www/meshfree/server
npm run build
```

### 14.2 Build The Frontend

```bash
cd /var/www/meshfree/client
npm run build
```

Before starting services formally, make sure both builds succeed.

## 15. Run The Backend With PM2

Go to the backend directory:

```bash
cd /var/www/meshfree/server
```

Start the backend:

```bash
pm2 start dist/index.js --name meshfree-server
```

Check status:

```bash
pm2 status
pm2 logs meshfree-server
```

Enable startup on boot:

```bash
pm2 startup
pm2 save
```

Important note:

- After `pm2 startup`, PM2 usually prints an additional command that must be run with `sudo`
- You need to copy and execute that full command exactly as shown
- Then run `pm2 save`

That is the normal process for registering the current PM2 process list as a system startup configuration. It is not an error.

Notes:

- The backend listens on `3001` by default
- It should not be exposed directly to the public internet
- `Nginx` should be the public entry point

## 16. Frontend Publishing Strategy

The frontend uses `React + Vite`.

In production:

- The frontend is built under the `client` directory
- The output is usually located at `client/dist`
- `Nginx` serves those static files directly

Because frontend API requests use `/api` under the same domain, the development-time Vite proxy is not needed in production.

## 17. Configure Nginx

### 17.1 Create The Site Configuration

Create a site config file:

```bash
sudo nano /etc/nginx/sites-available/meshfree
```

You can start with a plain HTTP version first, then let `Certbot` attach HTTPS automatically later:

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

### 17.2 Enable The Site

```bash
sudo ln -s /etc/nginx/sites-available/meshfree /etc/nginx/sites-enabled/meshfree
sudo nginx -t
sudo systemctl reload nginx
```

At this point, first try opening these URLs in a browser:

- `http://yukiho.site`
- `http://www.yukiho.site`

Make sure the frontend page can be reached before continuing to HTTPS.  
If it cannot be opened here, do not continue directly with `Certbot`. First check DNS, Nginx, and the frontend build output.

If the default site conflicts, remove it:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 18. Apply HTTPS Certificates

### 18.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 18.2 Request The Certificate

```bash
sudo certbot --nginx -d yukiho.site -d www.yukiho.site
```

During execution, Certbot will:

- Request a certificate from `Let's Encrypt`
- Verify that the domain resolves to the current server
- Attempt to modify the Nginx configuration automatically

If Certbot asks whether HTTP should automatically redirect to HTTPS, choose the redirect option.

If successful, the final behavior should be:

- `http://yukiho.site` redirects to `https://yukiho.site`
- `http://www.yukiho.site` redirects to `https://yukiho.site`
- `https://www.yukiho.site` redirects to `https://yukiho.site`

Important notes:

- Certbot is very good at attaching HTTPS
- But it **does not always fully enforce your preferred canonical domain strategy**
- So after success, you still need to manually verify whether `www` actually redirects to the apex domain

If you find that:

- `https://www.yukiho.site` does not redirect to `https://yukiho.site`
- Or both `www` and the apex domain open the site independently

then you still need to manually adjust the Nginx configuration and make the `www` server block a dedicated redirect entry.

### 18.3 Why www Also Needs A Certificate

When a browser visits `https://www.yukiho.site`, it must first establish the HTTPS connection before receiving the redirect.  
If `www` is not included in the certificate, the user will see a certificate error before any redirect happens.

### 18.4 Verify Automatic Renewal

```bash
sudo certbot renew --dry-run
```

## 19. Upload Directory And Permission Check

When the backend starts, it automatically creates:

- `server/uploads`
- `server/uploads/covers`
- `server/uploads/models`

You must ensure that the user running the Node.js process has read and write access to these directories.

Check with:

```bash
ls -la /var/www/meshfree/server
ls -la /var/www/meshfree/server/uploads
```

If permissions are incorrect, you may see:

- Public submission upload failures
- Admin deletion failing to remove files
- Download endpoint problems

## 20. Post-Deployment Verification Checklist

At minimum, complete the following checks:

Do not just "open it once and glance at it". For each item, explicitly judge whether it succeeded or failed. That makes troubleshooting much easier later.

### 20.1 Basic Service Checks

- `pm2 status` shows the backend process online
- `sudo systemctl status nginx` shows Nginx running normally
- `https://yukiho.site` opens successfully

### 20.2 Domain And Redirect Checks

- Visiting `http://yukiho.site` redirects to `https://yukiho.site`
- Visiting `http://www.yukiho.site` redirects to `https://yukiho.site`
- Visiting `https://www.yukiho.site` redirects to `https://yukiho.site`

### 20.3 Business Function Checks

- The home page model list is displayed correctly
- The model detail page opens correctly
- Model ZIP download works
- The submission form can be submitted
- The admin can log in with `mano`
- The admin dashboard can view submissions
- The admin can approve submissions
- The admin can reject submissions
- The admin can delete submissions

### 20.4 Uploaded Resource Checks

- The uploaded cover image can be accessed after submission
- The uploaded ZIP is correctly handled by the backend
- After deleting a submission, both the database record and files are removed

## 21. Routine Operations

### 21.1 Update Code

```bash
cd /var/www/meshfree
git pull
```

If the update includes backend dependencies, Prisma changes, or frontend asset changes, a full update flow is usually:

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

### 21.2 Reinstall Dependencies

```bash
cd /var/www/meshfree/server && npm install
cd /var/www/meshfree/client && npm install
```

### 21.3 Rebuild

```bash
cd /var/www/meshfree/server && npm run build
cd /var/www/meshfree/client && npm run build
```

### 21.4 Restart The Backend

```bash
pm2 restart meshfree-server
```

### 21.5 View PM2 Logs

```bash
pm2 logs meshfree-server
```

### 21.6 Test And Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 22. Common Troubleshooting

### 22.1 Domain Does Not Open

Check first:

- Whether DNS resolves to the correct public IP
- Whether the cloud security group allows `80/443`
- Whether `UFW` allows `80/443`
- Whether `Nginx` is running normally

### 22.2 HTTPS Certificate Request Fails

Check first:

- Whether DNS has propagated
- Whether port `80` is reachable
- Whether the HTTP Nginx configuration responds correctly

### 22.3 Admin Cannot Log In

Check first:

- Whether `.env` contains `JWT_SECRET`
- Whether the seed step was executed
- Whether the seed used the correct `ADMIN_SEED_USERNAME`
- Whether the admin password is correct
- Whether the environment variables seen by the seed execution match the current `.env`

### 22.4 Frontend Opens But API Fails

Check first:

- Whether the backend is online in `PM2`
- Whether the backend is listening on `3001`
- Whether the `/api` reverse proxy in `Nginx` is correct
- Whether there are backend errors in the logs

### 22.5 Submission Upload Fails

Check first:

- Whether the upload directory permissions are correct
- Whether the file size exceeds the limit
- Whether the file type matches the allowed rules
- Whether there are upload-related backend errors in the logs

## 23. Security Notes And Future Hardening

The current deployment is already more secure than allowing long-term remote password login directly as `root`, but there is still room for stronger hardening.

Suggested future improvements:

- Upgrade SSH login from password-based login to key-only login
- Rotate the admin password regularly
- Never expose `JWT_SECRET` in chats, screenshots, or the repository
- If `JWT_SECRET` may have leaked, replace it immediately and redeploy
- Never commit the database file or uploaded files to Git
- If this project enters a longer-lived stage later, add database backup and recovery planning

## 24. Extra Advice For First-Time Website Deployment

If this is your first time deploying a website, the following small habits will noticeably reduce errors:

- After each command block, look at the terminal output before moving on
- After editing any config file, run the related validation command first, such as `sudo nginx -t`
- If you are not sure which directory you are in, run `pwd`
- If you are not sure which user is executing commands, run `whoami`
- After each important configuration change, do a small verification immediately instead of waiting until everything is finished
- For a first deployment, keeping one known-good old session window open is usually safer than closing everything and reconnecting

## Appendix A: Backend Environment Variable Template

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="replace-this-with-a-random-secret"
PORT=3001
NODE_ENV="production"
ADMIN_SEED_USERNAME="mano"
ADMIN_SEED_PASSWORD="replace-this-with-a-strong-password"
```

## Appendix B: Recommended Server Directory Layout

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

## Appendix C: Quick Post-Launch Checklist

- Can SSH into `koito`
- `root` can no longer log in remotely through SSH
- `UFW` is enabled
- `fail2ban` is running
- `Nginx` is running
- `PM2` is running
- `https://yukiho.site` opens correctly
- `www` redirects correctly
- The admin can log in
- Submission, review, and deletion flows work

## Appendix D: Command Quick Reference

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check firewall
sudo ufw status

# Check fail2ban
sudo systemctl status fail2ban

# Check nginx status
sudo systemctl status nginx

# Test nginx configuration
sudo nginx -t

# Check pm2 status
pm2 status

# View pm2 logs
pm2 logs meshfree-server

# Restart backend
pm2 restart meshfree-server

# Pull latest code
cd /var/www/meshfree && git pull
```
