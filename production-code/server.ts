import express from "express";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import next from "next";
import path from "path";
import { registerSocketHandlers } from "./socket-handlers";

const dev = process.env.NODE_ENV !== "production";
// In a clean Next.js custom server, we initialize the Next.js renderer.
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0";

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);

  // Initialize Socket.io with production-grade configuration:
  // - CORS policies to prevent hijacking
  // - Heartbeat intervals for client state cleanup
  // - Multi-transport fallback (WebSocket first, polling fallback)
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingInterval: 10000, // Check liveness every 10s
    pingTimeout: 5000,    // Acknowledge timeout 5s
    connectTimeout: 10000,
    transports: ["websocket", "polling"]
  });

  // Standard Middlewares
  app.use(express.json());

  // Production health checks and custom routes
  app.get("/api/healthz", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: Date.now() });
  });

  // Attach and bind our real-time business logic handlers to Socket.io
  registerSocketHandlers(io);

  // Fallback default routing to Next.js Client SPA Router
  app.all("*", (req, res) => {
    return nextHandler(req, res);
  });

  // Bind server on port 3000 (mandated for routing container)
  server.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`🚀 PRODUCTION-READY SMART TABLE ORDER SYSTEM RUNNING`);
    console.log(`🔗 Next.js Backend & Realtime Socket.io active`);
    console.log(`📶 Address: http://${HOST}:${PORT}`);
    console.log(`🛠️ Mode: ${dev ? "Development" : "Production"}`);
    console.log(`====================================================`);
  });
}).catch((err) => {
  console.error("❌ Fatal Custom Server Initialization Error:", err);
  process.exit(1);
});
