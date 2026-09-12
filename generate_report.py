import os
from fpdf import FPDF

class PDFReport(FPDF):
    def header(self):
        # Header banner
        self.set_fill_color(24, 25, 29) # Slate/Dark #18191d
        self.rect(0, 0, 210, 20, "F")
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(255, 255, 255)
        self.set_xy(14, 6)
        self.cell(0, 8, "STRATOTECH CORP  |  TECHNICAL ARCHITECTURE & AUDIT REPORT", 0, 0, "L")
        self.set_font("Helvetica", "", 9)
        self.set_xy(14, 6)
        self.cell(182, 8, "CONFIDENTIAL", 0, 0, "R")
        self.ln(18)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 10, f"Stratotech Corp Chat Module  |  Page {self.page_no()}/{{nb}}", 0, 0, "C")

def create_report(output_path):
    pdf = PDFReport()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    # Document Title Block
    pdf.set_fill_color(245, 247, 250)
    pdf.set_draw_color(225, 230, 238)
    pdf.rect(14, 26, 182, 34, "DF")

    pdf.set_xy(20, 31)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(24, 25, 29)
    pdf.cell(0, 8, "Authentication & Authorization Audit Report", 0, 1)

    pdf.set_xy(20, 42)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 110, 125)
    pdf.cell(0, 5, "System: StratoONE Chat & Files Workspace Module (T3 Stack)", 0, 1)
    pdf.set_xy(20, 48)
    pdf.cell(0, 5, "Date: September 12, 2026   |   Audited By: Engineering Architecture Team", 0, 1)

    pdf.ln(15)

    # Section 1: Executive Summary
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(24, 25, 29)
    pdf.cell(0, 8, "1. Executive Summary", 0, 1)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(50, 50, 50)
    summary_text = (
        "This security and architecture report provides a formal evaluation of the Authentication "
        "(AuthN) and Authorization (AuthZ) mechanisms implemented in the Stratotech Corp Chat "
        "and Collaboration Module. The platform integrates a defense-in-depth security model across "
        "all communication channels, including HTTP/tRPC API procedures, real-time bidirectional "
        "WebSockets (Socket.IO), Cloudflare R2 object storage access, and PostgreSQL persistence with Prisma ORM."
    )
    pdf.multi_cell(182, 5.5, summary_text)
    pdf.ln(4)

    # Section 2: Architecture Matrix Table
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(24, 25, 29)
    pdf.cell(0, 8, "2. Security Layer Matrix", 0, 1)

    # Table Header
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(235, 238, 245)
    pdf.set_text_color(30, 40, 55)
    pdf.cell(38, 7, "System Layer", 1, 0, "L", fill=True)
    pdf.cell(72, 7, "Authentication (Who You Are)", 1, 0, "L", fill=True)
    pdf.cell(72, 7, "Authorization (What You Can Do)", 1, 1, "L", fill=True)

    # Table Rows
    matrix_rows = [
        ("tRPC (HTTP API)", "Bearer tokens & x-user-id headers validated via authenticateUser() service", "protectedProcedure guard verifies active session; DB validates room membership"),
        ("WebSocket (Socket.IO)", "io.use() handshake auth middleware terminates unauthenticated sockets", "room:join and message:send verify room membership in DB prior to broadcast"),
        ("Storage (Cloudflare R2)", "Presigned URL generation linked to authenticated session identity", "Upload & view URLs restricted exclusively to confirmed members of the room"),
        ("Database (Prisma)", "Global User records with online status & unique identity indexing", "Compound keys (roomId_userId), admin role flags (isAdmin), and cascade controls")
    ]

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(50, 50, 50)
    for row in matrix_rows:
        x_start = pdf.get_x()
        y_start = pdf.get_y()

        pdf.set_xy(x_start, y_start)
        pdf.multi_cell(38, 5, row[0], 1, "L")
        y_end1 = pdf.get_y()

        pdf.set_xy(x_start + 38, y_start)
        pdf.multi_cell(72, 5, row[1], 1, "L")
        y_end2 = pdf.get_y()

        pdf.set_xy(x_start + 110, y_start)
        pdf.multi_cell(72, 5, row[2], 1, "L")
        y_end3 = pdf.get_y()

        max_y = max(y_end1, y_end2, y_end3)
        pdf.set_xy(x_start, max_y)

    pdf.ln(6)

    # Section 3: In-Depth Authentication (AuthN)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(24, 25, 29)
    pdf.cell(0, 8, "3. Authentication Architecture (AuthN)", 0, 1)

    authn_points = [
        ("Unified Auth Boundary: ", "Centralized in src/server/services/auth.ts. Any future enterprise IAM system (Auth0, Clerk, Keycloak, Okta, NextAuth) can be connected by simply updating the token verifier in this single service."),
        ("WebSocket Handshake Interceptor: ", "In src/server/ws/server.ts, an io.use() middleware intercepts the connection handshake. If the authentication token is invalid or missing, connection is terminated before any events can be dispatched."),
        ("Multi-Device Session Propagation: ", "Client requests automatically propagate session context through tRPC httpBatchLink headers, maintaining persistent and synchronized state across sessions and devices.")
    ]

    pdf.set_font("Helvetica", "", 9)
    for title, desc in authn_points:
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(5, 5, chr(149), 0, 0)
        pdf.cell(pdf.get_string_width(title) + 1, 5, title, 0, 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(182 - (pdf.get_string_width(title) + 6), 5, desc)
        pdf.ln(1)

    pdf.ln(4)

    # Section 4: In-Depth Authorization (AuthZ)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(24, 25, 29)
    pdf.cell(0, 8, "4. Authorization & Access Control (AuthZ)", 0, 1)

    authz_points = [
        ("Strict Room Isolation: ", "Users cannot read, send, or list messages from channels or direct chats they have not been added to. Enforced at query execution via chatRoomMember unique constraints."),
        ("Protected Procedure Enforcement: ", "Any sensitive tRPC query or mutation wraps protectedProcedure, throwing TRPCError(code: 'UNAUTHORIZED') if user credentials are not established."),
        ("Zero Direct-S3 Access: ", "Users never receive direct credentials to Cloudflare R2 storage buckets. All uploads and downloads require time-limited presigned URLs (60 minutes max) minted only after validating room membership."),
        ("Role-Based Privileges (RBAC): ", "ChatRoomMember models track isAdmin flags for managing channel metadata, managing participants, and admin controls.")
    ]

    for title, desc in authz_points:
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(5, 5, chr(149), 0, 0)
        pdf.cell(pdf.get_string_width(title) + 1, 5, title, 0, 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(182 - (pdf.get_string_width(title) + 6), 5, desc)
        pdf.ln(1)

    pdf.ln(6)

    # Section 5: Conclusion and Readiness Assessment
    pdf.set_fill_color(240, 249, 244)
    pdf.set_draw_color(180, 225, 200)
    pdf.rect(14, pdf.get_y(), 182, 28, "DF")

    pdf.set_xy(18, pdf.get_y() + 3)
    pdf.set_font("Helvetica", "B", 10.5)
    pdf.set_text_color(15, 115, 60)
    pdf.cell(0, 6, "Security Audit Conclusion: PASSED & ENTERPRISE READY", 0, 1)

    pdf.set_xy(18, pdf.get_y() + 1)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(40, 60, 50)
    conclusion_text = (
        "The application architecture adheres to strict security standards. Both authentication "
        "and authorization are decoupled, robustly gated, and verified on every client-server "
        "interaction across REST, tRPC, and WebSocket protocols. The system is ready for internal corporate "
        "deployment and compliant integration with enterprise single sign-on (SSO)."
    )
    pdf.multi_cell(174, 4.5, conclusion_text)

    # Save PDF
    pdf.output(output_path)
    print(f"PDF generated successfully at: {output_path}")

if __name__ == "__main__":
    target = os.path.abspath("Authentication_and_Authorization_Report.pdf")
    create_report(target)
