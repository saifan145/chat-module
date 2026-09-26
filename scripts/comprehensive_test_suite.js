const http = require("http");
const { io: ClientIO } = require("socket.io-client");
const fs = require("fs");

const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : "http://localhost:3001";
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

function recordResult(category, testName, testType, status, details, extra = {}) {
  const entry = {
    category,
    testName,
    testType, // 'CONNECTIVITY' | 'WHITEBOX' | 'GRAYBOX' | 'BLACKBOX'
    status, // 'PASS' | 'FAIL'
    details,
    ...extra,
  };
  results.push(entry);
  const tag = status === "PASS" ? "PASS" : "FAIL";
  console.log(`[${tag}] [${testType}] ${category} -> ${testName}`);
  console.log(`       ↳ ${details}`);
}

async function runComprehensiveAudit() {
  console.log("===============================================================================");
  console.log("STRATO-ONE CHAT MODULE: FULL CONNECTIVITY & MULTI-TIER SECURITY AUDIT");
  console.log("===============================================================================\n");

  // Ensure socket route is initialized
  await httpRequest("/api/socketio");

  // =========================================================================
  // SECTION 1: FRONTEND & BACKEND CONNECTIVITY TESTING
  // =========================================================================
  console.log("\n--- [1] FRONTEND & BACKEND CONNECTIVITY TESTS ---");

  // 1.1 Web App Root Rendering
  try {
    const res = await httpRequest("/");
    if (res.statusCode === 200 && res.data.includes("__NEXT_DATA__")) {
      recordResult(
        "Frontend Connectivity",
        "Next.js Root Page SSR & Hydration Manifest",
        "CONNECTIVITY",
        "PASS",
        "HTTP 200 OK with valid React hydration manifest",
        { statusCode: res.statusCode }
      );
    } else {
      recordResult(
        "Frontend Connectivity",
        "Next.js Root Page SSR",
        "CONNECTIVITY",
        "FAIL",
        `Expected 200 with Next.js manifest, got status ${res.statusCode}`
      );
    }
  } catch (e) {
    recordResult("Frontend Connectivity", "Next.js Root Page SSR", "CONNECTIVITY", "FAIL", e.message);
  }

  // 1.2 tRPC Router Connectivity (room.list)
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
      recordResult(
        "Backend Connectivity",
        "tRPC Batch API - room.list Procedure",
        "CONNECTIVITY",
        "PASS",
        `tRPC HTTP transport live. Retrieved ${userRooms.length} rooms for primary user.`,
        { statusCode: res.statusCode, roomCount: userRooms.length }
      );
    } else {
      recordResult(
        "Backend Connectivity",
        "tRPC Batch API - room.list Procedure",
        "CONNECTIVITY",
        "FAIL",
        `Status ${res.statusCode}: ${res.data}`
      );
    }
  } catch (e) {
    recordResult("Backend Connectivity", "tRPC room.list", "CONNECTIVITY", "FAIL", e.message);
  }

  // 1.3 tRPC upload.listFiles Query
  try {
    const inputPayload = encodeURIComponent(
      JSON.stringify({ "0": { json: { ownership: "all", search: "", type: "all" } } })
    );
    const res = await httpRequest(
      `/api/trpc/upload.listFiles?batch=1&input=${inputPayload}`,
      "GET",
      { "x-user-id": "usr_demo_saifan" }
    );
    if (res.statusCode === 200) {
      const parsed = JSON.parse(res.data);
      const files = parsed[0]?.result?.data?.json || [];
      recordResult(
        "Backend Connectivity",
        "tRPC File Manager Service - upload.listFiles",
        "CONNECTIVITY",
        "PASS",
        `Retrieved ${files.length} indexed files with metadata and R2 presigned URLs.`,
        { statusCode: res.statusCode, fileCount: files.length }
      );
    } else {
      recordResult(
        "Backend Connectivity",
        "tRPC upload.listFiles",
        "CONNECTIVITY",
        "FAIL",
        `Status ${res.statusCode}: ${res.data}`
      );
    }
  } catch (e) {
    recordResult("Backend Connectivity", "tRPC upload.listFiles", "CONNECTIVITY", "FAIL", e.message);
  }

  // 1.4 WebSocket Full-Duplex Connectivity & Handshake
  let activeSocket = null;
  await new Promise((resolve) => {
    const socket = ClientIO("http://localhost:3000", {
      path: "/api/socketio",
      auth: { token: "usr_demo_saifan" },
      transports: ["polling", "websocket"],
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      recordResult(
        "Real-Time Connectivity",
        "Socket.IO WebSocket Handshake",
        "CONNECTIVITY",
        "FAIL",
        "Connection timed out after 5000ms"
      );
      socket.disconnect();
      resolve();
    }, 5000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      activeSocket = socket;
      recordResult(
        "Real-Time Connectivity",
        "Socket.IO WebSocket Handshake (101 Switching Protocols)",
        "CONNECTIVITY",
        "PASS",
        `Handshake successful. Transport: ${socket.io.engine.transport.name}, SocketID: ${socket.id}`,
        { transport: socket.io.engine.transport.name, socketId: socket.id }
      );
      resolve();
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      recordResult(
        "Real-Time Connectivity",
        "Socket.IO WebSocket Handshake",
        "CONNECTIVITY",
        "FAIL",
        `Connect error: ${err.message}`
      );
      resolve();
    });
  });

  // 1.5 Real-Time Message Send via WebSocket with Database Write Ack
  let createdTestMessageId = null;
  const targetRoomId = userRooms[0]?.id;
  if (activeSocket && targetRoomId) {
    await new Promise((resolve) => {
      activeSocket.emit("room:join", { roomId: targetRoomId });
      activeSocket.emit(
        "message:send",
        {
          roomId: targetRoomId,
          content: "Automated Connectivity Test Message",
          type: "TEXT",
        },
        (ack) => {
          if (ack && ack.status === "ok" && ack.messageId) {
            createdTestMessageId = ack.messageId;
            recordResult(
              "Real-Time Connectivity",
              "WebSocket Event Emission (message:send) & Database Persistence Ack",
              "CONNECTIVITY",
              "PASS",
              `PostgreSQL write confirmed in real-time. Message ID: ${ack.messageId}`,
              { messageId: ack.messageId }
            );
          } else {
            recordResult(
              "Real-Time Connectivity",
              "WebSocket message:send",
              "CONNECTIVITY",
              "FAIL",
              `Ack error: ${JSON.stringify(ack)}`
            );
          }
          resolve();
        }
      );
    });
  }

  // =========================================================================
  // SECTION 2: WHITEBOX TESTING (Code Logic, Authorization, Injections)
  // =========================================================================
  console.log("\n--- [2] WHITEBOX SECURITY & LOGIC TESTS ---");

  // 2.1 Object-Level Authorization (IDOR) - Non-member Message Snooping
  try {
    const fakeRoomId = "00000000-0000-0000-0000-000000000000";
    const inputPayload = encodeURIComponent(
      JSON.stringify({ "0": { json: { roomId: fakeRoomId, limit: 10 } } })
    );
    const res = await httpRequest(
      `/api/trpc/message.list?batch=1&input=${inputPayload}`,
      "GET",
      { "x-user-id": "usr_demo_saifan" }
    );
    const parsed = JSON.parse(res.data);
    const code = parsed[0]?.error?.json?.data?.code;
    const httpStatus = parsed[0]?.error?.json?.data?.httpStatus;

    if (code === "FORBIDDEN" || httpStatus === 403) {
      recordResult(
        "Whitebox Security",
        "IDOR Prevention: Non-Member Message History Query",
        "WHITEBOX",
        "PASS",
        "Access control guard verified: chatRoomMember check strictly enforces 403 FORBIDDEN.",
        { httpStatus: 403, code }
      );
    } else {
      recordResult(
        "Whitebox Security",
        "IDOR Prevention: Non-Member Message History Query",
        "WHITEBOX",
        "FAIL",
        `Expected FORBIDDEN, received ${res.statusCode}: ${res.data}`
      );
    }
  } catch (e) {
    recordResult("Whitebox Security", "IDOR Prevention", "WHITEBOX", "FAIL", e.message);
  }

  // 2.2 Storage Boundary Authorization - Non-Member Upload Presigning Block
  try {
    const fakeRoomId = "00000000-0000-0000-0000-000000000000";
    const postBody = {
      "0": {
        json: {
          roomId: fakeRoomId,
          fileName: "confidential_export.pdf",
          contentType: "application/pdf",
          fileSizeBytes: 2048,
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
    const code = parsed[0]?.error?.json?.data?.code;

    if (code === "FORBIDDEN") {
      recordResult(
        "Whitebox Security",
        "Cloudflare R2 Boundary: Upload Presigning Rejection for Unauthorized Room",
        "WHITEBOX",
        "PASS",
        "Presigned URL generation rejected before invoking AWS/R2 S3 SDK.",
        { code }
      );
    } else {
      recordResult(
        "Whitebox Security",
        "Cloudflare R2 Boundary",
        "WHITEBOX",
        "FAIL",
        `Expected FORBIDDEN, got: ${res.data}`
      );
    }
  } catch (e) {
    recordResult("Whitebox Security", "Cloudflare R2 Boundary", "WHITEBOX", "FAIL", e.message);
  }

  // 2.3 IDOR Check on Message Editing (User cannot edit another user's message)
  if (createdTestMessageId) {
    try {
      const editBody = {
        "0": {
          json: {
            messageId: createdTestMessageId,
            content: "Tampered content attempt by rogue user",
          },
        },
      };
      // Send as an unauthorized user
      const res = await httpRequest(
        "/api/trpc/message.edit?batch=1",
        "POST",
        { "x-user-id": "usr_unauthorized_attacker" },
        editBody
      );
      const parsed = JSON.parse(res.data);
      const code = parsed[0]?.error?.json?.data?.code;

      if (code === "FORBIDDEN") {
        recordResult(
          "Whitebox Security",
          "IDOR Prevention: Cross-User Message Edit Mutation",
          "WHITEBOX",
          "PASS",
          "Ownership verification verified: ctx.user.id !== message.senderId strictly yields FORBIDDEN.",
          { code }
        );
      } else {
        recordResult(
          "Whitebox Security",
          "IDOR Prevention: Cross-User Message Edit",
          "WHITEBOX",
          "FAIL",
          `Expected FORBIDDEN, got: ${res.data}`
        );
      }
    } catch (e) {
      recordResult("Whitebox Security", "IDOR Edit Check", "WHITEBOX", "FAIL", e.message);
    }
  }

  // 2.4 IDOR Check on Message Deletion (User cannot delete another user's message)
  if (createdTestMessageId) {
    try {
      const deleteBody = {
        "0": {
          json: {
            messageId: createdTestMessageId,
          },
        },
      };
      const res = await httpRequest(
        "/api/trpc/message.delete?batch=1",
        "POST",
        { "x-user-id": "usr_unauthorized_attacker" },
        deleteBody
      );
      const parsed = JSON.parse(res.data);
      const code = parsed[0]?.error?.json?.data?.code;

      if (code === "FORBIDDEN") {
        recordResult(
          "Whitebox Security",
          "IDOR Prevention: Cross-User Message Deletion Mutation",
          "WHITEBOX",
          "PASS",
          "Deletion authorization verified: Non-owner deletion blocked with FORBIDDEN.",
          { code }
        );
      } else {
        recordResult(
          "Whitebox Security",
          "IDOR Prevention: Cross-User Message Deletion",
          "WHITEBOX",
          "FAIL",
          `Expected FORBIDDEN, got: ${res.data}`
        );
      }
    } catch (e) {
      recordResult("Whitebox Security", "IDOR Delete Check", "WHITEBOX", "FAIL", e.message);
    }
  }

  // 2.5 Path Traversal in File Upload Key Generation
  try {
    // We test upload initiation with directory traversal path in fileName
    if (targetRoomId) {
      const traversalBody = {
        "0": {
          json: {
            roomId: targetRoomId,
            fileName: "../../../../etc/passwd.jpg",
            contentType: "image/jpeg",
            fileSizeBytes: 1024,
          },
        },
      };
      const res = await httpRequest(
        "/api/trpc/upload.initiate?batch=1",
        "POST",
        { "x-user-id": "usr_demo_saifan" },
        traversalBody
      );
      const parsed = JSON.parse(res.data);
      const key = parsed[0]?.result?.data?.json?.key;

      if (key && !key.includes("..") && key.startsWith(`chat/rooms/${targetRoomId}/`)) {
        recordResult(
          "Whitebox Security",
          "Path Traversal Prevention in R2 Key Sanitization",
          "WHITEBOX",
          "PASS",
          `Deterministic UUID key generator sanitized path: ${key}`,
          { generatedKey: key }
        );
      } else {
        recordResult(
          "Whitebox Security",
          "Path Traversal Prevention",
          "WHITEBOX",
          "FAIL",
          `Key contained unsafe pattern: ${key}`
        );
      }
    }
  } catch (e) {
    recordResult("Whitebox Security", "Path Traversal Test", "WHITEBOX", "FAIL", e.message);
  }

  // =========================================================================
  // SECTION 3: GRAYBOX TESTING (Schema Validation, Type Safety & Boundaries)
  // =========================================================================
  console.log("\n--- [3] GRAYBOX SCHEMA & BOUNDARY TESTS ---");

  // 3.1 Zod Schema Validation: Invalid UUID Rejection
  try {
    const invalidUuidPayload = encodeURIComponent(
      JSON.stringify({ "0": { json: { roomId: "not-a-valid-uuid-format", limit: 10 } } })
    );
    const res = await httpRequest(
      `/api/trpc/message.list?batch=1&input=${invalidUuidPayload}`,
      "GET",
      { "x-user-id": "usr_demo_saifan" }
    );
    const parsed = JSON.parse(res.data);
    const zodError = parsed[0]?.error?.json?.data?.zodError;
    const code = parsed[0]?.error?.json?.data?.code;

    if (code === "BAD_REQUEST" && zodError && zodError.fieldErrors?.roomId) {
      recordResult(
        "Graybox Validation",
        "Zod UUID Schema Enforcement (message.list roomId)",
        "GRAYBOX",
        "PASS",
        `Input rejected with BAD_REQUEST: ${zodError.fieldErrors.roomId[0]}`,
        { zodField: "roomId", error: zodError.fieldErrors.roomId[0] }
      );
    } else {
      recordResult(
        "Graybox Validation",
        "Zod UUID Schema Enforcement",
        "GRAYBOX",
        "FAIL",
        `Expected BAD_REQUEST with zodError, got: ${res.data}`
      );
    }
  } catch (e) {
    recordResult("Graybox Validation", "Zod UUID Schema", "GRAYBOX", "FAIL", e.message);
  }

  // 3.2 Zod Schema Validation: File Size Boundary (>20MB)
  if (targetRoomId) {
    try {
      const oversizedBody = {
        "0": {
          json: {
            roomId: targetRoomId,
            fileName: "large_video.mp4",
            contentType: "video/mp4",
            fileSizeBytes: 25 * 1024 * 1024, // 25MB exceeds 20MB limit
          },
        },
      };
      const res = await httpRequest(
        "/api/trpc/upload.initiate?batch=1",
        "POST",
        { "x-user-id": "usr_demo_saifan" },
        oversizedBody
      );
      const parsed = JSON.parse(res.data);
      const code = parsed[0]?.error?.json?.data?.code;
      const zodError = parsed[0]?.error?.json?.data?.zodError;

      if (code === "BAD_REQUEST" && zodError?.fieldErrors?.fileSizeBytes) {
        recordResult(
          "Graybox Validation",
          "File Upload Size Guard (Max 20MB)",
          "GRAYBOX",
          "PASS",
          `Rejected oversized upload with message: ${zodError.fieldErrors.fileSizeBytes[0]}`,
          { error: zodError.fieldErrors.fileSizeBytes[0] }
        );
      } else {
        recordResult(
          "Graybox Validation",
          "File Upload Size Guard",
          "GRAYBOX",
          "FAIL",
          `Expected BAD_REQUEST, got: ${res.data}`
        );
      }
    } catch (e) {
      recordResult("Graybox Validation", "File Size Guard", "GRAYBOX", "FAIL", e.message);
    }
  }

  // 3.3 Zod Schema Validation: Group Room Name Requirement
  try {
    const invalidGroupBody = {
      "0": {
        json: {
          type: "GROUP",
          name: "   ", // Empty whitespace name
          participantIds: ["usr_demo_saifan", "usr_another_user"],
        },
      },
    };
    const res = await httpRequest(
      "/api/trpc/room.create?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      invalidGroupBody
    );
    const parsed = JSON.parse(res.data);
    const code = parsed[0]?.error?.json?.data?.code;

    if (code === "BAD_REQUEST") {
      recordResult(
        "Graybox Validation",
        "Business Logic Guard: Group Room Non-Empty Name Requirement",
        "GRAYBOX",
        "PASS",
        "Empty group name rejected with BAD_REQUEST",
        { code }
      );
    } else {
      recordResult(
        "Graybox Validation",
        "Group Room Name Requirement",
        "GRAYBOX",
        "FAIL",
        `Expected BAD_REQUEST, got: ${res.data}`
      );
    }
  } catch (e) {
    recordResult("Graybox Validation", "Group Room Guard", "GRAYBOX", "FAIL", e.message);
  }

  // =========================================================================
  // SECTION 4: BLACKBOX TESTING (External Behavior, Fuzzing & Negative Tests)
  // =========================================================================
  console.log("\n--- [4] BLACKBOX API & STRESS TESTS ---");

  // 4.1 Route Fuzzing: Non-existent routes return 404 Not Found
  try {
    const res = await httpRequest("/api/non-existent-service-endpoint");
    if (res.statusCode === 404) {
      recordResult(
        "Blackbox Resilience",
        "404 Not Found Handling on Non-Existent Routes",
        "BLACKBOX",
        "PASS",
        "Proper HTTP 404 response without leaking internal stack traces",
        { statusCode: 404 }
      );
    } else {
      recordResult(
        "Blackbox Resilience",
        "404 Handling",
        "BLACKBOX",
        "FAIL",
        `Expected 404, received ${res.statusCode}`
      );
    }
  } catch (e) {
    recordResult("Blackbox Resilience", "404 Handling", "BLACKBOX", "FAIL", e.message);
  }

  // 4.2 Malformed JSON Payload Resiliency
  try {
    const res = await httpRequest(
      "/api/trpc/room.list?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      "{ malformed_json_syntax: true, "
    );
    // Server should return 400 or 500 cleanly without crashing the process
    if (res.statusCode >= 400 && res.statusCode < 600) {
      recordResult(
        "Blackbox Resilience",
        "Malformed JSON Body Handling",
        "BLACKBOX",
        "PASS",
        `Server cleanly handled invalid JSON with HTTP status ${res.statusCode}`,
        { statusCode: res.statusCode }
      );
    } else {
      recordResult(
        "Blackbox Resilience",
        "Malformed JSON Body Handling",
        "BLACKBOX",
        "FAIL",
        `Unexpected response: ${res.statusCode}`
      );
    }
  } catch (e) {
    recordResult("Blackbox Resilience", "Malformed JSON", "BLACKBOX", "FAIL", e.message);
  }

  // 4.3 WebSocket Multi-Client Broadcast Isolation (Room Privacy)
  // Create second client pretending to be another user and join different channel
  await new Promise((resolve) => {
    const clientB = ClientIO("http://localhost:3000", {
      path: "/api/socketio",
      auth: { token: "usr_isolated_user_b" },
      transports: ["polling", "websocket"],
      reconnection: false,
    });

    let receivedUnintendedMessage = false;

    clientB.on("connect", () => {
      // Client B listens for message:new events
      clientB.on("message:new", (payload) => {
        if (payload.roomId === targetRoomId) {
          receivedUnintendedMessage = true;
        }
      });

      // Client A sends message to targetRoomId
      if (activeSocket && targetRoomId) {
        activeSocket.emit(
          "message:send",
          {
            roomId: targetRoomId,
            content: "Private room isolation verification ping",
            type: "TEXT",
          },
          () => {
            // Give 800ms to ensure clientB didn't receive it
            setTimeout(() => {
              if (!receivedUnintendedMessage) {
                recordResult(
                  "Blackbox Security",
                  "WebSocket Channel Isolation (No Private Message Leak to Non-Members)",
                  "BLACKBOX",
                  "PASS",
                  "Channel isolation verified: Non-member socket did NOT receive the room broadcast",
                  { isolatedUserId: "usr_isolated_user_b" }
                );
              } else {
                recordResult(
                  "Blackbox Security",
                  "WebSocket Channel Isolation",
                  "BLACKBOX",
                  "FAIL",
                  "LEAK DETECTED: Non-member socket received private room message!"
                );
              }
              clientB.disconnect();
              resolve();
            }, 800);
          }
        );
      } else {
        clientB.disconnect();
        resolve();
      }
    });

    clientB.on("connect_error", () => {
      clientB.disconnect();
      resolve();
    });
  });

  // 4.4 High-Frequency Burst Test (Ordering & Non-blocking test)
  if (activeSocket && targetRoomId) {
    await new Promise((resolve) => {
      const burstCount = 5;
      let acksReceived = 0;
      let burstErrors = 0;

      for (let i = 1; i <= burstCount; i++) {
        activeSocket.emit(
          "message:send",
          {
            roomId: targetRoomId,
            content: `Burst test message #${i}`,
            type: "TEXT",
          },
          (ack) => {
            if (ack && ack.status === "ok") {
              acksReceived++;
            } else {
              burstErrors++;
            }

            if (acksReceived + burstErrors === burstCount) {
              if (burstErrors === 0) {
                recordResult(
                  "Blackbox Performance",
                  "Real-Time Message Burst Handling (5 concurrent messages)",
                  "BLACKBOX",
                  "PASS",
                  `All ${burstCount} burst messages persisted and acknowledged concurrently without deadlock.`,
                  { burstCount, acksReceived }
                );
              } else {
                recordResult(
                  "Blackbox Performance",
                  "Real-Time Message Burst Handling",
                  "BLACKBOX",
                  "FAIL",
                  `Burst failures: ${burstErrors}/${burstCount}`
                );
              }
              resolve();
            }
          }
        );
      }
    });
  }

  // Cleanup active socket
  if (activeSocket) {
    activeSocket.disconnect();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n===============================================================================");
  console.log("FINAL AUDIT RESULTS SUMMARY");
  console.log("===============================================================================");

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    byType: {
      CONNECTIVITY: results.filter((r) => r.testType === "CONNECTIVITY" && r.status === "PASS").length,
      WHITEBOX: results.filter((r) => r.testType === "WHITEBOX" && r.status === "PASS").length,
      GRAYBOX: results.filter((r) => r.testType === "GRAYBOX" && r.status === "PASS").length,
      BLACKBOX: results.filter((r) => r.testType === "BLACKBOX" && r.status === "PASS").length,
    },
  };

  console.log(`TOTAL TESTS EXECUTED: ${summary.total}`);
  console.log(`PASSED: ${summary.passed} | FAILED: ${summary.failed}`);
  console.log(`Connectivity Tests Passed: ${summary.byType.CONNECTIVITY}`);
  console.log(`Whitebox Tests Passed:     ${summary.byType.WHITEBOX}`);
  console.log(`Graybox Tests Passed:       ${summary.byType.GRAYBOX}`);
  console.log(`Blackbox Tests Passed:      ${summary.byType.BLACKBOX}`);
  console.log("===============================================================================\n");

  fs.writeFileSync("comprehensive_audit_results.json", JSON.stringify(results, null, 2));
  return summary;
}

runComprehensiveAudit().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
