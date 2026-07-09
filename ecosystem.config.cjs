// Configurație pm2 pentru rularea în producție pe VPS (Hosterion).
//
// IMPORTANT: instanță unică (fork), NU cluster. Motive:
//  - Socket.io are nevoie de sticky sessions; un singur proces evită problema.
//  - Rate limiter-ul este in-memory (per proces).
// Dacă în viitor se scalează pe mai multe procese, sunt necesare Redis pentru
// rate limiting și un adapter Socket.io (ex. @socket.io/redis-adapter).

module.exports = {
  apps: [
    {
      name: "clinica-plata",
      script: "server.ts",
      // Rulează TypeScript direct prin tsx (fără pas de compilare separat).
      interpreter: "node",
      interpreter_args: "--import tsx",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        // Restul variabilelor vin din fișierul .env (încărcat de Next/Prisma)
        // sau pot fi setate aici / prin `pm2 start ... --env`.
      },
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      time: true,
    },
  ],
};
