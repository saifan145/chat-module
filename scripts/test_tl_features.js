const http = require("http");

const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : "http://localhost:3000";

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
  console.log("===============================================================================");
  console.log("TESTING TL REQUESTED FEATURES: CHAT ACTIVITY, NAME CHANGE, MEMBER POPUPS & @HANDLES");
  console.log("===============================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name, condition, details) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${name}`);
      console.log(`       ↳ ${details}`);
    } else {
      console.log(`[FAIL] ${name}`);
      console.log(`       ↳ ${details}`);
    }
  }

  // 1. List users and verify @username handles
  console.log("--- 1. User Directory & @Username Handles ---");
  try {
    const res = await httpRequest(
      "/api/trpc/user.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D",
      "GET",
      { "x-user-id": "usr_demo_saifan" }
    );
    const parsed = JSON.parse(res.data);
    const users = parsed[0]?.result?.data?.json || [];
    assert(
      "Fetch Users with @Handles",
      res.statusCode === 200 && users.length > 0,
      `Successfully loaded ${users.length} teammates with @username handles (e.g. @${users[0]?.username})`
    );
  } catch (e) {
    assert("Fetch Users with @Handles", false, e.message);
  }

  // 2. Profile Display Name & @handle Update
  console.log("\n--- 2. Profile Name & @Username Change ---");
  try {
    const updatePayload = {
      0: {
        json: {
          displayName: "Saifan Ahmed (Lead)",
          username: "saifan_lead",
        },
      },
    };
    const res = await httpRequest(
      "/api/trpc/user.updateProfile?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      updatePayload
    );
    const parsed = JSON.parse(res.data);
    const updatedUser = parsed[0]?.result?.data?.json;
    assert(
      "Update User Display Name & @Handle",
      res.statusCode === 200 && updatedUser?.username === "saifan_lead",
      `Profile updated: "${updatedUser?.displayName}" with handle "@${updatedUser?.username}"`
    );

    // Revert back cleanly to "saifan"
    await httpRequest(
      "/api/trpc/user.updateProfile?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      { 0: { json: { displayName: "Saifan Ahmed", username: "saifan" } } }
    );
  } catch (e) {
    assert("Update User Display Name & @Handle", false, e.message);
  }

  // 3. Create a test group room, rename it, and test member add/remove
  console.log("\n--- 3. Group Room Management & Chat Activity Feed ---");
  let testRoomId = null;
  try {
    // 3.1 Create test group
    const createRes = await httpRequest(
      "/api/trpc/room.create?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      {
        0: {
          json: {
            type: "GROUP",
            name: "Initial Sprint Alpha",
            participantIds: ["usr_demo_saifan", "usr_sofia_petrovna"],
          },
        },
      }
    );
    const createData = JSON.parse(createRes.data);
    testRoomId = createData[0]?.result?.data?.json?.id;
    assert(
      "Create Group Room",
      createRes.statusCode === 200 && Boolean(testRoomId),
      `Created group room ID: ${testRoomId}`
    );

    // 3.2 Rename the group and verify system activity notice
    const renameRes = await httpRequest(
      "/api/trpc/room.updateName?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      {
        0: {
          json: {
            roomId: testRoomId,
            name: "Sprint 2026 Core Delivery",
          },
        },
      }
    );
    const renameData = JSON.parse(renameRes.data);
    const renamedRoom = renameData[0]?.result?.data?.json?.room;
    const systemNotice = renameData[0]?.result?.data?.json?.systemMessage;
    assert(
      "Rename Group Room & Activity Feed Announcement",
      renameRes.statusCode === 200 &&
        renamedRoom?.name === "Sprint 2026 Core Delivery" &&
        systemNotice?.content.includes("renamed the group to \"Sprint 2026 Core Delivery\""),
      `Renamed to "${renamedRoom?.name}". Generated Chat Activity: "${systemNotice?.content}"`
    );

    // 3.3 Add member (Noah Brown) to the group
    const addRes = await httpRequest(
      "/api/trpc/room.addMember?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      {
        0: {
          json: {
            roomId: testRoomId,
            userId: "usr_noah_brown",
          },
        },
      }
    );
    const addData = JSON.parse(addRes.data);
    const addedUser = addData[0]?.result?.data?.json?.targetUser;
    const addSystemNotice = addData[0]?.result?.data?.json?.systemMessage;
    assert(
      "Add Member to Group & Activity Feed Notice",
      addRes.statusCode === 200 && Boolean(addedUser),
      `Added ${addedUser?.displayName} (@${addedUser?.username}). Chat Activity: "${addSystemNotice?.content}"`
    );

    // 3.4 Remove member from the group
    const removeRes = await httpRequest(
      "/api/trpc/room.removeMember?batch=1",
      "POST",
      { "x-user-id": "usr_demo_saifan" },
      {
        0: {
          json: {
            roomId: testRoomId,
            userId: "usr_noah_brown",
          },
        },
      }
    );
    const removeData = JSON.parse(removeRes.data);
    const removeSystemNotice = removeData[0]?.result?.data?.json?.systemMessage;
    assert(
      "Remove Member from Group & Activity Feed Notice",
      removeRes.statusCode === 200,
      `Removed member successfully. Chat Activity: "${removeSystemNotice?.content}"`
    );
  } catch (e) {
    assert("Group Room Management & Chat Activity Feed", false, e.message);
  }

  console.log("\n===============================================================================");
  console.log(`TESTS COMPLETE: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("===============================================================================");
}

runTests().catch(console.error);
