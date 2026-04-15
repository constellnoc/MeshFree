module.exports = {
  apps: [
    {
      name: "meshfree-server",
      cwd: __dirname,
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
