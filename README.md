# StratoONE Chat Module — Stable V0.001

## 📌 Overview
StratoONE Chat Module is an enterprise-ready, real-time messaging solution built adhering strictly to the **Tech Lead’s Architecture Specification**:
[Chat Module 11-Sept-26 Blueprint](https://abhi-fortune.notion.site/Chat-Module-11-Sept-26-3d8cbf433aa180b5987de666b8ff45a9).

Extracted from the foundational `pulse-chat` service and transformed into a unified **T3 Stack (Next.js, React, TypeScript, tRPC, WebSocket, PostgreSQL, Cloudflare R2)**.

---

## 🏗️ Architecture & Core Principles

```
                         STRATOONE CHAT
                               │
                     ┌─────────┴─────────┐
                     │                   │
                 Next.js              React
                     │
              ┌──────┴──────┐
              │             │
            tRPC         WebSocket
              │             │
              └──────┬──────┘
                     │
                Chat Module
                     │
           ┌─────────┼─────────┐
           │                   │
           ▼                   ▼
      PostgreSQL              R2
      ┌─────────┐          ┌─────────┐
      │ Rooms   │          │ Images  │
      │ Members │          │ Files   │
      │ Messages│          │ Media   │
      └─────────┘          └─────────┘

           Existing Auth
                 │
                 ▼
         Authenticated User
```

1. **T3 Architecture (Section 3)**:
   - **tRPC API**: Primary application API for request/response operations (`room.list`, `room.get`, `room.create`, `message.list`, `message.create`, `message.read`, `upload.initiate`).
   - **WebSocket (Socket.IO)**: Low-latency real-time communication (`message:send`, `message:new`, `message:read`, `typing:start`, `typing:stop`, `presence:update`).
   - **DB-First Persistence (Section 5)**: All messages and attachments are written to PostgreSQL before real-time dispatch.

2. **Cloudflare R2 Object Storage (Section 10 & 11)**:
   - Media uploaded directly to R2 using presigned URLs.
   - Deterministic object paths: `chat/rooms/{roomId}/{uuid}{ext}` avoiding collision or unsafe user filenames.
   - Fully compatible with existing `R2_Storage_Module` and `Fortune Storage App`.

3. **PostgreSQL & Prisma Schema (Section 7 & 8)**:
   - Tables: `chat_rooms`, `chat_room_members`, `chat_messages`, `chat_attachments`, `chat_message_receipts`.
   - Indexing optimized for common chat patterns:
     - `chat_messages(room_id, created_at DESC)`
     - `chat_messages(sender_id)`
     - `chat_room_members(room_id)`
     - `chat_room_members(user_id)`
     - `chat_attachments(message_id)`

4. **Connection Lifecycle (Section 17)**:
   - Managed lifecycle states: `CONNECTING`, `CONNECTED`, `DISCONNECTED`, `RECONNECTING`.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.x
- PostgreSQL instance
- Cloudflare R2 bucket credentials (or S3-compatible credentials)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your configuration:
```ini
DATABASE_URL="postgresql://user:password@localhost:5432/chat_module?schema=public"

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET="fortune-chat-media"
R2_BUCKET_PREFIX="fortune-"
R2_PUBLIC_BASE_URL="https://storage.fortune.app"
```

### 3. Database Migration
```bash
npm run db:push
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Chat application.
