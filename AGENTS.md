# Workspace Rules - Hirose Maintenance Log

## 1. Database Command Execution Safety Rule

> [!CAUTION]
> **Strict Database Command Prohibition**:
> The AI assistant must **NEVER** autonomously execute terminal commands that connect to, alter, migrate, seed, or manipulate the database.
> 
> Prohibited automatic commands include (but are not limited to):
> - `npm run db:migrate` / `drizzle-kit migrate`
> - `npm run db:seed` / database seed scripts
> - `drizzle-kit push` / `drizzle-kit generate` that connects to the database
> - `psql` or any raw SQL client commands
> - `docker compose up db` / `docker exec` against database containers
> - Any script that executes DDL/DML directly against the live database

### Required Workflow for Database Operations:
1. The AI assistant prepares, edits, and verifies the application code, schema definitions, and migration/seed scripts.
2. The AI assistant must present the exact command line strings clearly in the response.
3. The execution must be performed **manually by the USER**, or run by the AI **ONLY IF** the user gives explicit, affirmative instruction/confirmation in that specific turn.

---

## 2. Environment Files Protection Rule (`.env`)

> [!CAUTION]
> **Strict `.env` Privacy & Modification Prohibition**:
> The AI assistant must **NEVER** read, view, print, edit, modify, overwrite, or delete any actual environment files (e.g., `.env`, `.env.local`, `.env.production`, `backend/.env`, etc.).
> 
> - **Zero Read**: Never inspect or display the contents of `.env` files using any tool (`view_file`, `Get-Content`, `cat`, etc.) to protect user secrets and credentials.
> - **Zero Write / Edit**: Never create, edit, replace, or modify `.env` files. The actual `.env` file is managed solely and manually by the **USER**.
> - **Allowed Scope**: The AI is ONLY permitted to view, create, or update template files such as `.env.example` as a public reference for required environment variable names.

---

## 3. Directory Inspection & Terminal Reconnaissance Rule

> [!WARNING]
> **Prohibition of Unsolicited Directory Inspection Commands**:
> The AI assistant must **NEVER** autonomously execute shell commands (e.g., `dir`, `ls`, `Get-ChildItem`) to scan, inspect, or explore directory structures (such as `backend\src\modules`, `backend\src\middlewares`, `backend\tests`, etc.) upon starting a conversation or planning a task.
> 
> - **Trust Project Blueprints**: Assume that the directory structure and implementation progress strictly adhere to the documentation in `docs/` (`Struktur Proyek.md` and `Roadmap Project.md`).
> - **Prefer Internal File Tools**: When verifying code or file contents, use internal file-reading tools (`view_file`) on specific target files rather than running terminal directory listing commands.
> - **Immediate Focus**: Proceed directly to discussing architecture, answering technical questions, or implementing the code requested by the user without preliminary terminal reconnaissance.
