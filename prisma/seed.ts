import { PrismaClient, RoomType, MessageType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  const currentUserId = "usr_demo_saifan";

  // 1. Upsert Current User
  await prisma.user.upsert({
    where: { id: currentUserId },
    create: {
      id: currentUserId,
      username: "saifan",
      displayName: "Saifan",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      about: "Product Engineer @ Stratotech Corp",
      isOnline: true,
    },
    update: {
      username: "saifan",
      displayName: "Saifan",
      isOnline: true,
    },
  });

  // 2. Team Members from the Screenshot
  const users = [
    {
      id: "usr_sofia_petrovna",
      username: "sofia",
      displayName: "Sofia Petrovna",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isOnline: true,
    },
    {
      id: "usr_noah_brown",
      username: "noah",
      displayName: "Noah Brown",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      isOnline: true,
    },
    {
      id: "usr_liam_johnson",
      username: "liam",
      displayName: "Liam Johnson",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      isOnline: true,
    },
    {
      id: "usr_sophia_anderson",
      username: "sophia_a",
      displayName: "Sophia Anderson",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      isOnline: false,
    },
    {
      id: "usr_olivia_smith",
      username: "olivia",
      displayName: "Olivia Smith",
      avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
      isOnline: true,
    },
    {
      id: "usr_emma_wilson",
      username: "emma",
      displayName: "Emma Wilson",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      isOnline: true,
    },
    {
      id: "usr_william_martinez",
      username: "william",
      displayName: "William Martinez",
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
      isOnline: true,
    },
    {
      id: "usr_ava_davis",
      username: "ava",
      displayName: "Ava Davis",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      isOnline: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isOnline: u.isOnline,
      },
      update: {
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isOnline: u.isOnline,
      },
    });
  }

  // 3. Create Direct Conversation with Sofia Petrovna
  let sofiaRoom = await prisma.chatRoom.findFirst({
    where: {
      type: RoomType.DIRECT,
      AND: [
        { members: { some: { userId: currentUserId } } },
        { members: { some: { userId: "usr_sofia_petrovna" } } },
      ],
    },
  });

  if (!sofiaRoom) {
    sofiaRoom = await prisma.chatRoom.create({
      data: {
        type: RoomType.DIRECT,
        createdBy: currentUserId,
        members: {
          create: [
            { userId: currentUserId, isAdmin: true },
            { userId: "usr_sofia_petrovna", isAdmin: false },
          ],
        },
      },
    });
  }

  // Seed Messages in Sofia's conversation if empty or refresh
  const existingMsgCount = await prisma.chatMessage.count({
    where: { roomId: sofiaRoom.id },
  });

  if (existingMsgCount === 0) {
    console.log("Seeding Sofia Petrovna messages...");
    const baseTime = new Date();
    baseTime.setHours(10, 37, 0, 0);

    const m1 = await prisma.chatMessage.create({
      data: {
        roomId: sofiaRoom.id,
        senderId: "usr_noah_brown",
        content: "I've noticed that every messaging app I use has a reply arrow, but managing threads often feels messy... 🤔",
        createdAt: new Date(baseTime.getTime()),
      },
    });

    baseTime.setMinutes(baseTime.getMinutes() + 5); // 10:42 AM
    const m2 = await prisma.chatMessage.create({
      data: {
        roomId: sofiaRoom.id,
        senderId: "usr_sofia_petrovna",
        content: "That's a good point. In the same conversation, you can either reply or quote someone. How would you like to see this improved? 💡",
        createdAt: new Date(baseTime.getTime()),
      },
    });

    baseTime.setMinutes(baseTime.getMinutes() + 1); // 10:43 AM
    const m3 = await prisma.chatMessage.create({
      data: {
        roomId: sofiaRoom.id,
        senderId: "usr_noah_brown",
        content: "As a project manager, I often need to clarify things with clients.\nQuoting in threads requires copying links, which takes extra time.\nMaybe we can simplify this?",
        createdAt: new Date(baseTime.getTime()),
      },
    });

    baseTime.setMinutes(baseTime.getMinutes() + 3); // 10:46 AM
    const m4 = await prisma.chatMessage.create({
      data: {
        roomId: sofiaRoom.id,
        senderId: "usr_noah_brown",
        content: "Let's brainstorm some ideas! 💡 It's tough to locate specific messages, especially with so many links and side discussions in the mix.",
        createdAt: new Date(baseTime.getTime()),
      },
    });

    baseTime.setMinutes(baseTime.getMinutes() + 5); // 10:51 AM
    const m5 = await prisma.chatMessage.create({
      data: {
        roomId: sofiaRoom.id,
        senderId: "usr_sofia_petrovna",
        content: "That's a good point! Maybe we could think about a feature that allows users to quickly quote a specific part of a message with just one click? It might help simplify conversations in threads. ✅",
        createdAt: new Date(baseTime.getTime()),
      },
    });

    baseTime.setMinutes(baseTime.getMinutes() + 12); // 11:03 AM
    const m6 = await prisma.chatMessage.create({
      data: {
        roomId: sofiaRoom.id,
        senderId: "usr_noah_brown",
        content: "Do we have enough time to dive into this right now?",
        createdAt: new Date(baseTime.getTime()),
      },
    });

    baseTime.setMinutes(baseTime.getMinutes() + 3); // 11:06 AM
    const m7 = await prisma.chatMessage.create({
      data: {
        roomId: sofiaRoom.id,
        senderId: "usr_sofia_petrovna",
        replyToId: m6.id, // Quote reply to m6!
        content: "We have as much time as we need! 🚀 It's important to figure out the best solution for this.",
        createdAt: new Date(baseTime.getTime()),
      },
    });
  }

  // 4. Create other DM rooms for Liam, Sophia, Olivia, Noah, Emma, William, Ava
  for (const other of users.filter((u) => u.id !== "usr_sofia_petrovna")) {
    const existing = await prisma.chatRoom.findFirst({
      where: {
        type: RoomType.DIRECT,
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: other.id } } },
        ],
      },
    });

    if (!existing) {
      const room = await prisma.chatRoom.create({
        data: {
          type: RoomType.DIRECT,
          createdBy: currentUserId,
          members: {
            create: [
              { userId: currentUserId, isAdmin: true },
              { userId: other.id, isAdmin: false },
            ],
          },
        },
      });

      // Add a friendly greeting message
      const initialText =
        other.id === "usr_liam_johnson"
          ? "Hey Saif Ali! Here is the latest project review document and design specification."
          : `Hey there! Let's connect on our upcoming milestones.`;

      const msg = await prisma.chatMessage.create({
        data: {
          roomId: room.id,
          senderId: other.id,
          content: initialText,
        },
      });

      // Attach real database document records for testing
      if (other.id === "usr_liam_johnson") {
        await prisma.chatAttachment.create({
          data: {
            messageId: msg.id,
            objectKey: "chat/rooms/sample/Md_Saif_Ali_Performance_Review.docx",
            fileName: "Md_Saif_Ali_Performance_Review.docx",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: BigInt(2450000),
          },
        });
        await prisma.chatAttachment.create({
          data: {
            messageId: msg.id,
            objectKey: "chat/rooms/sample/Stratotech_Q3_Roadmap.pdf",
            fileName: "Stratotech_Q3_Roadmap.pdf",
            mimeType: "application/pdf",
            size: BigInt(1850000),
          },
        });
      } else if (other.id === "usr_noah_brown") {
        await prisma.chatAttachment.create({
          data: {
            messageId: msg.id,
            objectKey: "chat/rooms/sample/Saif_Ali_Product_Architecture_v2.pdf",
            fileName: "Saif_Ali_Product_Architecture_v2.pdf",
            mimeType: "application/pdf",
            size: BigInt(3200000),
          },
        });
      }
    }
  }

  // 5. Seed Channels / Group Rooms matching sections in screenshot
  const channelGroups = [
    { name: "Team Projects", avatarUrl: null },
    { name: "Internals", avatarUrl: null },
    { name: "Feedback Sessions", avatarUrl: null },
  ];

  for (const group of channelGroups) {
    const existing = await prisma.chatRoom.findFirst({
      where: {
        type: RoomType.GROUP,
        name: group.name,
      },
    });

    if (!existing) {
      const created = await prisma.chatRoom.create({
        data: {
          type: RoomType.GROUP,
          name: group.name,
          createdBy: currentUserId,
          members: {
            create: [
              { userId: currentUserId, isAdmin: true },
              { userId: "usr_sofia_petrovna", isAdmin: false },
              { userId: "usr_noah_brown", isAdmin: false },
            ],
          },
        },
      });

      await prisma.chatMessage.create({
        data: {
          roomId: created.id,
          senderId: currentUserId,
          content: `Welcome to the #${group.name.toLowerCase().replace(/\s+/g, "-")} channel!`,
        },
      });
    }
  }

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
