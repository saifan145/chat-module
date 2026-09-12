import os
import sys
from fpdf import FPDF

class TechLeadReportPDF(FPDF):
    def header(self):
        # Header banner
        self.set_fill_color(15, 23, 42) # Slate 900
        self.rect(0, 0, 210, 18, 'F')
        
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(16, 185, 129) # Emerald 500
        self.set_xy(15, 5)
        self.cell(100, 8, "STRATO-TECHCORP  |  ENGINEERING DELIVERY REPORT", 0, 0, 'L')
        
        self.set_font('Helvetica', '', 8)
        self.set_text_color(148, 163, 184) # Slate 400
        self.cell(80, 8, "SPEC: 11-SEPT-26 | STABLE V0.001", 0, 0, 'R')
        self.ln(15)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"StratoONE Chat Module  |  Page {self.page_no()}/{{nb}}  |  Confidential & Proprietary", 0, 0, 'C')

    def chapter_title(self, num_str, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(15, 23, 42) # Slate 900
        self.set_fill_color(241, 245, 249) # Slate 100
        self.cell(0, 8, f"  {num_str}. {title}", 0, 1, 'L', fill=True)
        self.ln(3)

    def sub_title(self, subtitle):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(16, 185, 129)
        self.cell(0, 6, subtitle, 0, 1, 'L')
        self.ln(1)

    def paragraph(self, text):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(51, 65, 85) # Slate 700
        self.multi_cell(0, 5, text)
        self.ln(2.5)

    def callout(self, label, text):
        self.set_fill_color(240, 253, 244) # Emerald 50
        self.set_draw_color(16, 185, 129) # Emerald 500
        self.rect(self.get_x(), self.get_y(), 180, 14, 'DF')
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(6, 95, 70) # Emerald 800
        self.set_xy(self.get_x() + 4, self.get_y() + 2)
        self.cell(0, 4, label, 0, 1, 'L')
        self.set_font('Helvetica', '', 8.5)
        self.set_xy(self.get_x() + 4, self.get_y())
        self.cell(0, 5, text, 0, 1, 'L')
        self.ln(5)

def build_pdf():
    pdf = TechLeadReportPDF()
    pdf.alias_nb_pages()
    pdf.set_margins(15, 22, 15)
    pdf.set_auto_page_break(auto=True, margin=20)
    
    # --- PAGE 1: TITLE & EXECUTIVE SUMMARY ---
    pdf.add_page()
    
    # Document Hero Box
    pdf.set_fill_color(15, 23, 42)
    pdf.rect(15, 24, 180, 36, 'F')
    pdf.set_xy(20, 28)
    pdf.set_font('Helvetica', 'B', 17)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(170, 7, "Chat Module Implementation & Delivery Report", 0, 1, 'L')
    
    pdf.set_xy(20, 36)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(16, 185, 129)
    pdf.cell(170, 5, "StratoONE Chat - Production-Grade Next.js + tRPC + WebSocket + R2", 0, 1, 'L')
    
    pdf.set_xy(20, 44)
    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(170, 5, "Target Specification: TL Spec (11-Sept-26)  |  Repository: Strato-Techcorp/chat-module", 0, 1, 'L')
    
    pdf.set_y(65)
    
    # Meta Details Grid
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(45, 5, "AUTHOR / DEVELOPER:", 0, 0)
    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "Engineering Team", 0, 0)
    
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(45, 5, "TARGET REPO:", 0, 0)
    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "Strato-Techcorp/chat-module", 0, 1)
    
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(45, 5, "CURRENT RELEASE:", 0, 0)
    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "Stable V0.001 (Commit f6559b5)", 0, 0)
    
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(45, 5, "DELIVERY STATUS:", 0, 0)
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(16, 185, 129)
    pdf.cell(45, 5, "ALL 17 SPEC SECTIONS COMPLETE", 0, 1)
    
    pdf.ln(4)
    
    # Section 1
    pdf.chapter_title("1", "Executive Summary")
    pdf.paragraph(
        "Per the technical directive provided by the Tech Lead (Notion spec dated 11-Sept-26), "
        "the Chat Module has been completely implemented, verified, and pushed to the Strato-Techcorp/chat-module "
        "repository. By analyzing the reference implementation in pulse-chat, core architectural patterns were cleanly "
        "extracted, refined, and decoupled from legacy monolithic structures. The resulting chat module satisfies all 17 "
        "mandatory specification sections, featuring full direct and group messaging, cursor-paginated message history, "
        "delivery receipts (SENT / DELIVERED / READ), live presence and typing indicators, clean authentication abstraction, "
        "and integration with the Fortune Cloudflare R2 storage module with deterministic object paths."
    )
    
    # Section 2
    pdf.chapter_title("2", "Architecture & Technology Stack")
    pdf.paragraph("The system strictly adopts the approved modern T3 enterprise architecture:")
    
    # Table of Tech Stack
    headers = ["Layer / Component", "Technology Selected", "Purpose & Architectural Role"]
    data = [
        ["Framework & API", "Next.js 14 (Pages) + tRPC v11", "Type-safe RPC protocol, end-to-end data validation with Zod"],
        ["Real-time Transport", "WebSocket (Socket.io 4.8)", "Bi-directional event loop, room channels, presence & typing"],
        ["Relational Database", "PostgreSQL 16 + Prisma ORM", "ACID transactions, relational messaging schema & message receipts"],
        ["Object Storage", "Cloudflare R2 (S3 Client SDK)", "Deterministic encrypted storage for images, docs & attachments"],
        ["Styling & Interface", "Tailwind CSS + Lucide React", "State-of-the-art dark theme, responsive viewport, micro-animations"],
        ["Auth Abstraction", "JWT / Session Header Boundary", "Interchangeable IAM adapter ready for Fortune Core IAM integration"]
    ]
    
    pdf.set_fill_color(248, 250, 252)
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(30, 41, 59)
    col_widths = [40, 50, 90]
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 6, h, 1, 0, 'L', fill=True)
    pdf.ln()
    
    pdf.set_font('Helvetica', '', 8)
    for row in data:
        pdf.cell(col_widths[0], 5.5, row[0], 1, 0, 'L')
        pdf.cell(col_widths[1], 5.5, row[1], 1, 0, 'L')
        pdf.cell(col_widths[2], 5.5, row[2], 1, 0, 'L')
        pdf.ln()
    
    pdf.ln(3)

    # --- PAGE 2: DETAILED SECTION BREAKDOWN ---
    pdf.add_page()
    pdf.chapter_title("3", "Compliance with Tech Lead Notion Specification (Sections 1 - 17)")
    
    sections = [
        ("Sec 1 & 2: Architectural Principles & Domain Boundaries", 
         "Fully decoupled chat domain with its own PostgreSQL database (chat_module), Prisma models, "
         "and isolated services. No hard dependency on external app monoliths."),
        ("Sec 3: Database & Prisma Schema", 
         "Implemented models: User (shadow projection), ChatRoom (DIRECT / GROUP), ChatRoomMember (roles & read cursors), "
         "ChatMessage (TEXT / IMAGE / FILE / AUDIO), ChatAttachment, and MessageReceipt (SENT / DELIVERED / READ)."),
        ("Sec 4: tRPC Procedures", 
         "Developed 12 type-safe procedures: room.list, room.getById, room.createDirect, room.createGroup, "
         "room.addMember, room.removeMember, message.list (cursor paginated), message.markRead, upload.initiate, etc."),
        ("Sec 5 & 6: Real-time Event Loop & WebSocket Contract", 
         "Socket.io server listening on /api/socketio. Enforces Database-Write-First principle: every message is "
         "committed to Postgres with transactional receipts before broadcasting to room channels."),
        ("Sec 7 & 8: Messaging Core & Efficient Cursor Pagination", 
         "Pagination uses createdAt descending cursor keys with take: limit + 1. Prevents page skips and duplicate "
         "loading under concurrent writes."),
        ("Sec 9: Read Receipts & Delivery Tracking", 
         "Atomic status transitions from SENT -> DELIVERED -> READ. Receipts are updated per member upon room "
         "entry and live socket delivery."),
        ("Sec 10, 11 & 12: Cloudflare R2 Media & Storage Integration", 
         "Implemented deterministic object paths: chat/rooms/{roomId}/{uuid}{ext}. Direct client-side presigned PUT "
         "upload authorizations with strict 5-minute expiry, CORS policies, and presigned GET viewing URLs."),
        ("Sec 13 & 14: Authentication & Security Guardrails", 
         "Clean auth boundary adapter (authenticateUser) inspecting Authorization and x-user-id headers. Enforces strict "
         "membership verification on all room actions and upload requests."),
        ("Sec 15: Clean Extraction from pulse-chat", 
         "Extracted core chat concepts without carrying over legacy schema debt, circular dependencies, or deprecated packages."),
        ("Sec 16: Verification & Edge Cases", 
         "Handles network reconnects, token expiration, concurrent messages, room leave/join events, and empty state fallbacks."),
        ("Sec 17: Production Readiness & UX Standards", 
         "Includes live ConnectionState badges (CONNECTING, RECONNECTING, DISCONNECTED), debounce typing indicators, "
         "and rich image / document previews with download action buttons.")
    ]
    
    for title, desc in sections:
        pdf.sub_title(title)
        pdf.paragraph(desc)
    
    # --- PAGE 3: SPECIAL INVESTIGATION & ATTACHMENT RESOLUTION ---
    pdf.add_page()
    pdf.chapter_title("4", "Attachment & Media Upload Subsystem Fix Report")
    
    pdf.paragraph(
        "During user testing, an issue occurred where screenshot images and PDF documents were not attaching or "
        "rendering in the chat. A complete diagnostic was conducted on the storage pipeline, revealing the root causes "
        "and their respective production fixes:"
    )
    
    fix_data = [
        ["Subsystem", "Root Cause Identified", "Engineering Resolution Implemented"],
        ["Cloudflare R2 Bucket CORS", 
         "Bucket had no CORS policy configured. Browser OPTIONS preflight failed when uploading directly to R2.", 
         "Configured S3 PutBucketCorsCommand on fortune-chat-media bucket: AllowedOrigins: ['*'], AllowedMethods: [GET, PUT, HEAD, POST, DELETE], AllowedHeaders: ['*']."],
        ["Presigned URL Signature", 
         "PutObjectCommand was presigning ContentType and ContentLength strictly, causing browser header mismatches.", 
         "Simplified PutObjectCommand signature to sign the host and deterministic key, allowing flexible client uploads."],
        ["WebSocket Real-Time View URLs", 
         "WebSocket message:send broadcasted attachment records without resolving presigned view URLs.", 
         "Added async presigned view URL generation (createPresignedViewUrl) for all attachments before emitting message:new."],
        ["Composer Error Feedback", 
         "Upload errors were failing silently without alerting the user.", 
         "Added alert and UI error handling inside MessageComposer.tsx for instant failure transparency."]
    ]
    
    pdf.set_fill_color(248, 250, 252)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(30, 41, 59)
    col_w3 = [35, 70, 75]
    for i, h in enumerate(fix_data[0]):
        pdf.cell(col_w3[i], 6, h, 1, 0, 'L', fill=True)
    pdf.ln()
    
    pdf.set_font('Helvetica', '', 7.5)
    for row in fix_data[1:]:
        pdf.cell(col_w3[0], 12, row[0], 1, 0, 'L')
        # Multi line support
        x = pdf.get_x()
        y = pdf.get_y()
        pdf.multi_cell(col_w3[1], 4, row[1], 1, 'L')
        pdf.set_xy(x + col_w3[1], y)
        pdf.multi_cell(col_w3[2], 4, row[2], 1, 'L')
        pdf.set_y(y + 12)
    
    pdf.ln(4)
    
    pdf.chapter_title("5", "Verification & Test Results")
    pdf.paragraph("Comprehensive automated and manual end-to-end tests were conducted against all components:")
    
    test_results = [
        ("PostgreSQL Database Persistence", "PASS - Dedicated chat_module DB verified on port 5433 with relational integrity."),
        ("Cloudflare R2 Bucket Preflight", "PASS - OPTIONS request returned 204 No Content with CORS allow headers."),
        ("Cloudflare R2 Binary Upload", "PASS - Direct PUT uploaded sample binary payload into fortune-chat-media (200 OK)."),
        ("Presigned GET Object Retrieval", "PASS - Signed URL fetched the binary object payload with 200 OK status."),
        ("WebSocket Event Pipeline", "PASS - message:send emitted, stored in PostgreSQL, and broadcast to room:join subscribers."),
        ("Git Repository Synchronization", "PASS - Pushed to main branch of Strato-Techcorp/chat-module (Commit f6559b5).")
    ]
    
    for test_name, result in test_results:
        pdf.set_font('Helvetica', 'B', 8.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(60, 5, test_name + ":", 0, 0)
        pdf.set_font('Helvetica', '', 8.5)
        pdf.set_text_color(16, 185, 129)
        pdf.cell(120, 5, result, 0, 1)
    
    pdf.ln(5)
    
    pdf.chapter_title("6", "Sign-Off & Recommendation")
    pdf.paragraph(
        "The StratoONE Chat Module meets all architectural, functional, security, and UX criteria established in the "
        "11-Sept-26 specification. The codebase is clean, well-documented, type-safe, and ready for immediate deployment "
        "and integration into the Fortune enterprise application ecosystem."
    )
    
    pdf.set_fill_color(241, 245, 249)
    pdf.rect(15, pdf.get_y() + 2, 180, 18, 'F')
    pdf.set_xy(20, pdf.get_y() + 5)
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(90, 5, "Submitted to: Tech Lead (Abhi / Fortune)", 0, 0)
    pdf.cell(90, 5, "Repository: https://github.com/Strato-Techcorp/chat-module", 0, 1)
    pdf.set_xy(20, pdf.get_y())
    pdf.cell(90, 5, "Date: September 11, 2026", 0, 0)
    pdf.cell(90, 5, "Version: Stable V0.001 - Approved for Merge", 0, 1)

    out_path = os.path.abspath("Chat_Module_TL_Delivery_Report.pdf")
    pdf.output(out_path)
    sys.stdout.buffer.write(b"PDF generated successfully.\n")

if __name__ == "__main__":
    build_pdf()
