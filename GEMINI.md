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

---

## 4. External Obsidian Vault Roadmap Protection Rule

> [!CAUTION]
> **Strict Prohibition of Copying Obsidian Vault Files**:
> The AI assistant must **NEVER** copy, move, duplicate, or import any roadmap or documentation files from the external Obsidian Vault (specifically `D:\pribadi\ObsidianVault\Ilham's Space\Research\Technical Test\PT Hirose Electric Indonesia\Roadmap Project.md` or any other files in the vault) into this project directory (`D:\pribadi\Projects\hirose-maintenance-log\`), whether in the project root or inside subdirectories.
> 
> - **In-Place Read & Update Only**: When the user requests work or progress tracking based on the Obsidian Vault roadmap, the AI must inspect (`view_file`) and update checklist items (`replace_file_content`) directly *in-place* at its external Obsidian Vault path.
> - **Zero Project Duplication**: Under no circumstances should a copy of the Obsidian Vault roadmap be created in the repository's root folder (`./Roadmap Project.md`, `./Roadmap.md`) or anywhere in the project tree.
> - **Clean Workspace**: Keep the project repository clean and focused strictly on application code and repository documentation, leaving the personal Obsidian Vault strictly as an external tracking workspace.

---

## 5. Gitignore Modular Scoping Rule (`.gitignore`)

> [!IMPORTANT]
> **Strict Sub-folder Scoping for Gitignore**:
> The AI assistant must ensure that `.gitignore` files are strictly located and managed inside their respective service sub-folders (`backend/.gitignore` and `frontend/.gitignore`).
> 
> - **Zero Root `.gitignore`**: The AI assistant must **NEVER** create, restore, or maintain a `.gitignore` file in the root project directory. Any root `.gitignore` must be removed to avoid conflicting exclusion rules and maintain clean monorepo boundaries.
> - **Independent Exclusions**: Each sub-service manages its own build outputs (`dist/`), dependencies (`node_modules/`), and private environments (`.env`, `.env.*`) while always preserving template files (`!.env.example`).

