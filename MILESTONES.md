# Review milestones

Start each requested change on a new branch from the latest remote main. Review each milestone by its commit link, pull request, or GitHub comparison with main.

After each milestone, run the relevant checks and record the commands or manual steps, expected and observed results, and any gaps in the verification log. Commit with a meaningful message and push the working branch when publishing is authorized. Share the commit link, what changed, and what needs human review. Pause at the review checkpoint before starting the next milestone. Keep credentials, local databases and runtime logs out of Git.

## 1. Planning and architecture brief

- **Scope:** Create the English plan, repository instructions, milestone checklist, development log and PDF architecture brief.
- **Checks:** Compare the scope with the assignment and confirm that the diagram shows the shared notification sender with separate email and Slack adapters.
- **Human review:** Approve the MVP boundary, architecture and review checkpoints.
- **Commit:** `docs: define project scope and review milestones`
- **Status:** Published on main.

## 2. Application shell and authentication

- **Scope:** Scaffold root-level `frontend/` and `backend/` projects, EF Core and SQLite. Add an English, responsive Angular shell with Tailwind, Supabase registration and login, logout, email verification and password reset. Prepare NgRx feature state under `+state/`, a placeholder feed and profile, and a lazy-loaded admin panel guarded by backend authorization.
- **Checks:** Build both projects, apply migrations to a fresh SQLite database, exercise registration and login, and verify that a normal user receives a denial from an admin endpoint. Check navigation and forms on mobile and desktop.
- **Human review:** Review the page shell, Supabase flow, authorization boundary and NgRx folder structure.
- **Commit:** `feat: scaffold application and authentication`
- **Status:** Shell ready for review. Build, fixture migration, anonymous API checks and mocked browser checks passed. Real Supabase flows remain pending project configuration.

## 3. RSS ingestion and browsing

- **Scope:** Verify the initial RSS source and its permitted use. Implement scheduled imports, topic-to-source mapping, source settings, manual runs and the paginated feed.
- **Checks:** Import a live feed and replay a deterministic fixture twice. Verify deduplication, silent first import, topic filtering and loading the next page.
- **Human review:** Review source configuration, feed UX and duplicate prevention.
- **Commit:** `feat: import and browse RSS articles`
- **Status:** Ready for review. Includes profile preferences, source assignments and basic in-app notifications. Live BBC and USGS import passed. Scheduled import is opt-in pending permitted-use review.

## 4. Alert rules and delivery

- **Scope:** Add topic, tag, keyword and source rules, a persistent inbox, and the shared sender interface with email and Slack adapters.
- **Checks:** Test matching and nonmatching stories, repeated ingestion, isolated channel failures and ambiguous delivery. Record real receipt separately from delivery records.
- **Human review:** Review rule semantics, preference defaults and adapter boundaries.
- **Commit:** `feat: match alerts and deliver notifications`
- **Status:** Adapter and queue workflow ready for review. Live email and Slack receipt require provider credentials and a matching Slack workspace account.

## 5. Administration and realtime

- **Scope:** Complete user and rule administration, supported channel configuration, global channel switches, SignalR updates and self-service account deletion.
- **Checks:** Verify online and offline channel changes, authorization boundaries, retained preferences and delivery suppression after deletion.
- **Human review:** Review administrator workflows, live status and deletion behavior.
- **Commit:** `feat: complete administration and realtime updates`

## 6. End-to-end verification and handoff

- **Scope:** Document setup and the demo, collect evidence, preserve prompt history and agent handoffs, and review the repository contents.
- **Checks:** Start from a clean checkout and reproduce the demo. Check tracked files for credentials, databases and logs. Record any unverified integrations.
- **Human review:** Review the final demo, outstanding gaps and supporting evidence.
- **Commit:** `docs: record verification and demo instructions`

Price alerts are optional and receive a separate review milestone if added after the news flow passes verification.
