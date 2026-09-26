const http = require("http");
const { io: ClientIO } = require("socket.io-client");

async function check() {
  console.log("1. Checking HTTP GET /api/socketio to ensure handler is called...");
  const res = await new Promise((resolve) => {
    http.get("http://localhost:3000/api/socketio", (r) => {
      resolve({ status: r.statusCode });
    });
  });
  console.log("   Result:", res);

  console.log("2. Attempting Socket.IO connection with polling first...");
  const socket = ClientIO("http://localhost:3000", {
    path: "/api/socketio",
    auth: { token: "usr_demo_saifan" },
    transports: ["polling", "websocket"],
    reconnection: false,
    timeout: 4000,
  });

  socket.on("connect", () => {
    console.log("   Socket connected successfully! id:", socket.id, "transport:", socket.io.engine.transport.name);
    socket.disconnect();
    process.exit(0);
  });

  socket.on("connect_error", (err) => {
    console.error("   Socket connect_error:", err.message, err);
    process.exit(1);
  });
}

check().catch(console.error);
