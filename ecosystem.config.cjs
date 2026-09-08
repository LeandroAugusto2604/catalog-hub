// PM2 - mantém o site no ar e reinicia sozinho se cair ou após reboot.
// Uso:  pm2 start ecosystem.config.cjs   |   pm2 save
module.exports = {
  apps: [
    {
      name: "tudotop",
      script: ".output/server/index.mjs",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
