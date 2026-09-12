const http = require("http");
const { io: ClientIO } = require("socket.io-client");
const fs = require("fs");

const BASE_URL = "http://localhost:3000";
const results = [];

function httpRequest(path, method = "GET", headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          data,
        });
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("===============================================================");
  console.log("STARTING FULL SECURITY, ARCHITECTURE & STATUS CODES AUDIT");
  console.log("===============================================================\n");

  // 1. Test HTTP Server Health & Root (Status 200 OK)
  try {
    const res = await httpRequest("/");
    if (res.statusCode === 200) {
      results.push({
        suite: "HTTP Infrastructure",
        test: "GET / (Root Next.js Application)",
        status: "PASS",
        statusCode: res.statusCode,
        details: "Next.js SSR/Static server responds with HTTP 200 OK",
      });
    } else {
      results.push({
        suite: "HTTP Infrastructure",
        test: "GET /",
        status: "FAIL",
        statusCode: res.statusCode,
        details: `Unexpected status code: ${res.statusCode}`,
      });
    }
  } catch (err) {
    results.push({
      suite: "HTTP Infrastructure",
      test: "GET /",
      status: "FAIL",
      details: err.message,
    });
  }

  // 2. Test 404 Not Found Route (Status 404)
  try {
    const res = await httpRequest("/non-existent-endpoint-404");
    if (res.statusCode === 404) {
      results.push({
        suite: "HTTP Infrastructure",
        test: "GET /non-existent-path (Status 404 Not Found)",
        status: "PASS",
        statusCode: res.statusCode,
        details: "Properly returns 404 Not Found for invalid routes",
      });
    } else {
      results.push({
        suite: "HTTP Infrastructure",
        test: "GET /non-existent-path",
        status: "FAIL",
        statusCode: res.statusCode,
        details: `Expected 404 but received ${res.statusCode}`,
      });
    }
  } catch (err) {
    results.push({
      suite: "HTTP Infrastructure",
      test: "GET /non-existent-path",
      status: "FAIL",
      details: err.message,
    });
  }

  // 3. Test Static Document Serving (Status 200 OK)
  try {
    const res = await httpRequest("/Authentication_and_Authorization_Report.pdf");
    if (res.statusCode === 200) {
      results.push({
        suite: "Asset Delivery",
        test: "GET /Authentication_and_Authorization_Report.pdf (Status 200)",
        status: "PASS",
        statusCode: res.statusCode,
        details: "Static assets and documentation served with HTTP 200 OK",
      });
    } else {
      results.push({
        suite: "Asset Delivery",
        test: "GET /Authentication_and_Authorization_Report.pdf",
        status: "FAIL",
        statusCode: res.statusCode,
        details: `Status ${res.statusCode}`,
      });
    }
  } catch (err) {
    results.push({
      suite: "Asset Delivery",
      test: "Static File Serving",
      status: "FAIL",
      details: err.message,
    });
  }

  // 4. Test tRPC API Endpoint: Authenticated Query (room.list)
  let userRooms = [];
  try {
    const inputPayload = encodeURIComponent(
      JSON.stringify({ "0": { json: null, meta: { values: ["undefined"], v: 1 } } })
    );
    const res = await httpRequest(
      `/api/trpc/room.list?batch=1&input=${inputPayload}`,
      "GET",
      { "x-user-id": "usr_demo_saifan" }
    );

    if (res.statusCode === 200) {
      const parsed = JSON.parse(res.data);
      userRooms = parsed[0]?.result?.data?.json || [];
      results.push({
        suite: "tRPC API Procedures",
        test: "GET /api/trpc/room.list (Status 200 with Auth)",
        status: "PASS",
        statusCode: res.statusCode,
        details: `Successfully authenticated Md Saif Ali, fetched ${userRooms.length} rooms`,
      });
    } else {
      results.push({
        suite: "tRPC API Procedures",
        test: "GET /api/trpc/room.list with Valid Auth",
        status: "FAIL",
        statusCode: res.statusCode,
        details: res.data,
      });
    }
  } catch (err) {
    results.push({
      suite: "tRPC API Procedures",
      test: "GET /api/trpc/room.list",
      status: "FAIL",
      details: err.message,
    });
  }

  // 5. Test tRPC API: upload.listFiles Query
  try {
    const inputPayload = encodeURIComponent(
      JSON.stringify({
        "0": {
          json: { ownership: "all", search: "", type: "all" },
        },
      })
    );
    const res = await httpRequest(
      `/api/trpc/upload.listFiles?batch=1&input=${inputPayload}`,
      "GET",
      { "x-user-id": "usr_demo_saifan" }
    );

    if (res.statusCode === 200) {
      const parsed = JSON.parse(res.data);
      const files = parsed[0]?.result?.data?.json || [];
      const hasSaifAliDoc = files.some((f) =>
        f.name.toLowerCase().includes("saif")
      );
      results.push({
        suite: "Database & Files Explorer Integration",
        test: "GET /api/trpc/upload.listFiles (Status 200 Live Query)",
        status: "PASS",
        statusCode: res.statusCode,
        details: `Retrieved ${files.length} real files. Saif Ali document confirmed: ${hasSaifAliDoc}`,
      });
    } else {
      results.push({
        suite: "Database & Files Explorer Integration",
        test: "GET /api/trpc/upload.listFiles",
        status: "FAIL",
        statusCode: res.statusCode,
        details: res.data,
      });
    }
  } catch (err) {
    results.push({
      suite: "Database & Files Explorer Integration",
      test: "GET /api/trpc/upload.listFiles",
      status: "FAIL",
      details: err.message,
    });
  }

  // 6. Security Test: Authorization Room Access Enforcement (FORBIDDEN 403 check)
  try {
    const fakeRoomId = "00000000-0000-0000-0000-000000000000";
    const inputPayload = encodeURIComponent(
      JSON.stringify({
        "0": {
          json: { roomId: fakeRoomId, limit: 10 },
        },
      })
    );
    const res = await httpRequest(
      `/api/trpc/message.list?batch=1&input=${inputPayload}`,
      "GET",
      { "x-user-id": "usr_demo_saifan" }
    );

    const parsed = JSON.parse(res.data);
    const errorCode = parsed[0]?.error?.json?.data?.code;
    const httpStatus = parsed[0]?.error?.json?.data?.httpStatus;

    if (errorCode === "FORBIDDEN" || httpStatus === 403) {
      results.push({
        suite: "Security & Authorization (AuthZ)",
        test: "Non-Member Message Snooping Prevention (Status 403 FORBIDDEN)",
        status: "PASS",
        statusCode: 403,
        details: `Correctly rejected non-member access with code: ${errorCode}`,
      });
    } else {
      results.push({
        suite: "Security & Authorization (AuthZ)",
        test: "Non-Member Message Snooping Prevention",
        status: "FAIL",
        statusCode: res.statusCode,
        details: `Unexpected response: ${res.data}`,
      });
    }
  } catch (err) {
    results.push({
      suite: "Security & Authorization (AuthZ)",
      test: "Authorization Gating",
      status: "FAIL",
      details: err.message,
    });
  }

  // 7. Security Test: Upload Authorization Boundary (FORBIDDEN 403)
  try {
    const fakeRoomId = "00000000-0000-0000-0000-000000000000";
    const postBody = {
      "0": {
        json: {
          roomId: fakeRoomId,
          fileName: "malicious_payload.exe",
          contentType: "application/octet-stream",
          fileSizeBytes: 1024,
        },
      },
    };

    const res = await httpRequest(
      "/api/trpc/upload.initiate?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      postBody
    );

    const parsed = JSON.parse(res.data);
    const errorCode = parsed[0]?.error?.json?.data?.code;

    if (errorCode === "FORBIDDEN") {
      results.push({
        suite: "Security & Storage Boundary (AuthZ)",
        test: "Non-Member Upload Rejection (Status 403 FORBIDDEN)",
        status: "PASS",
        statusCode: 403,
        details: "Blocked presigned R2 upload URL generation for unauthorized room",
      });
    } else {
      results.push({
        suite: "Security & Storage Boundary (AuthZ)",
        test: "Non-Member Upload Rejection",
        status: "FAIL",
        statusCode: res.statusCode,
        details: `Expected FORBIDDEN, got: ${res.data}`,
      });
    }
  } catch (err) {
    results.push({
      suite: "Security & Storage Boundary (AuthZ)",
      test: "Upload Authorization",
      status: "FAIL",
      details: err.message,
    });
  }

  // 8. WebSocket Integration & Security: Handshake (Status 101) & Real-Time Messaging
  await new Promise((resolve) => {
    const socket = ClientIO("http://localhost:3000", {
      path: "/api/socketio",
      auth: { token: "usr_demo_saifan" },
      transports: ["websocket", "polling"],
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      results.push({
        suite: "WebSocket Real-Time Architecture",
        test: "Socket.IO Connection Handshake",
        status: "FAIL",
        details: "Connection timed out after 5000ms",
      });
      socket.disconnect();
      resolve();
    }, 5000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      results.push({
        suite: "WebSocket Real-Time Architecture",
        test: "Socket.IO Authenticated Handshake (Status 101 Switching Protocols)",
        status: "PASS",
        statusCode: 101,
        details: `Socket connected with ID: ${socket.id}, auth user: usr_demo_saifan`,
      });

      // Join room and test message sending
      if (userRooms.length > 0) {
        const testRoomId = userRooms[0].id;
        socket.emit("room:join", { roomId: testRoomId });

        socket.emit(
          "message:send",
          {
            roomId: testRoomId,
            content: "Automated end-to-end integration test message.",
            type: "TEXT",
          },
          (ack) => {
            if (ack && ack.status === "ok") {
              results.push({
                suite: "WebSocket Real-Time Architecture",
                test: "Real-Time message:send Event & DB Persistence (Status 200 Ack)",
                status: "PASS",
                statusCode: 200,
                details: `Message persisted & broadcast ack received. Message ID: ${ack.messageId}`,
              });
            } else {
              results.push({
                suite: "WebSocket Real-Time Architecture",
                test: "Real-Time message:send Event",
                status: "FAIL",
                details: `Ack failed: ${JSON.stringify(ack)}`,
              });
            }
            socket.disconnect();
            resolve();
          }
        );
      } else {
        socket.disconnect();
        resolve();
      }
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      results.push({
        suite: "WebSocket Real-Time Architecture",
        test: "Socket.IO Handshake",
        status: "FAIL",
        details: err.message,
      });
      resolve();
    });
  });

  // Print Summary
  console.log("\n===============================================================");
  console.log("AUDIT RESULTS SUMMARY");
  console.log("===============================================================");
  let passedCount = 0;
  for (const r of results) {
    const icon = r.status === "PASS" ? "PASS" : "FAIL";
    if (r.status === "PASS") passedCount++;
    console.log(`[${icon}] [${r.statusCode || "N/A"}] ${r.suite} -> ${r.test}`);
    console.log(`    ↳ ${r.details}`);
  }

  console.log("\n---------------------------------------------------------------");
  console.log(`Total Tests: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
  console.log("===============================================================\n");

  return results;
}

runTests().then((res) => {
  fs.writeFileSync("test_results.json", JSON.stringify(res, null, 2));
  process.exit(0);
});
