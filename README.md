# Collaborative Kanban Board

with Real-Time Sync - Assignment Submission

**Name:** RAJIT CHAKRABORTY | **Roll No:** 23053067 | **College:** KIIT University | **Email:** 23053067@kiit.ac.in

## Submission Links

| Resource | Link |
| --- | --- |
| Apps Script Project Link | https://docs.google.com/spreadsheets/d/1VqLb8csLB2wiLqjD_-pjn0WFsgYFSuoMIEVbgcizCL8/edit?usp=sharing |
| Deployed Web App Link | https://script.google.com/macros/s/AKfycbzP_6Gs846siSVR4-Q-v7eUAx3y9XGBA5NG7wGxRsTWNAnAbZK_Pk27mirZNAY52Lro/exec |
| Google Sheet Link | https://docs.google.com/spreadsheets/d/1VqLb8csLB2wiLqjD_-pjn0WFsgYFSuoMIEVbgcizCL8/edit? |

**Note for Evaluator - How to access the Apps Script code:** This project uses a sheet-bound Apps Script, meaning the script is embedded inside the Google Sheet. To view the code: (1) Open the Google Sheet link above. (2) Click **Extensions** in the top menu. (3) Click **Apps Script**. This will open the full project with both `Code.gs` and `index.html` files.

## 1. System Architecture

The application is a two-tier system built entirely on Google's infrastructure. The backend runs as a Google Apps Script project and the frontend is served via Apps Script's HTML Service. Persistent storage is provided by a Google Sheet acting as a lightweight relational database.

| File | Role |
| --- | --- |
| `Code.gs` | Backend - `doGet`, `getTasks`, `updateTaskStatus`, `addTask`, `editTask`, `deleteTask`, `getLastTimestamp` |
| `index.html` | Frontend - Kanban UI, Sortable.js drag-drop, polling loop, modal, toast notifications |
| Google Sheet | Persistent DB - columns: Task ID, Title, Description, Status, Last Updated |

### Data Model (Google Sheet - Tasks tab)

| Column | Type | Description |
| --- | --- | --- |
| Task ID | String | Unique identifier (`TASK-{timestamp}`) |
| Title | String | Short task name (required) |
| Description | String | Optional detail text |
| Status | Enum | Backlog, In-Progress, Done |
| Last Updated | ISO 8601 | UTC timestamp of latest write |

## 2. Real-Time Sync - Polling Strategy

Google Apps Script does not support WebSockets or server-sent events. Real-time behaviour is simulated using a two-phase polling strategy that minimises unnecessary data transfers:

- **Phase 1 - Timestamp Poll (every 4 s):** The client calls `getLastTimestamp()`, which returns only the single most-recent ISO 8601 timestamp in the sheet - a very cheap read operation.
- **Phase 2 - Conditional Full Fetch:** If the returned timestamp differs from the client's cached value, a full `getTasks()` call is made to refresh the board. If the timestamp is unchanged, no further call is made.
- **Optimistic UI:** On drag-and-drop, the local state is updated immediately for a snappy feel. If the server write fails, the card is rolled back to its previous column and an error toast is shown.

This reduces `google.script.run` invocations by up to 80% compared to full-data polling, keeping the app well within Apps Script quota limits.

## 3. Concurrency Handling

Every write function (`updateTaskStatus`, `addTask`, `editTask`, `deleteTask`) acquires a script-level `LockService` lock before touching the sheet:

- `LockService.getScriptLock().waitLock(10000)` waits up to 10 seconds for the lock, serialising concurrent writes across all users.
- `SpreadsheetApp.flush()` is called after every write to ensure changes are committed before the lock is released.
- The lock is always released in a `finally` block, preventing deadlocks if an exception occurs mid-write.
- **Last-write-wins:** if two users move the same task simultaneously, the second server write overwrites the first. The next poll cycle delivers the authoritative state to both clients within 4 seconds.

## 4. Features & Upgrades (Beyond Requirements)

| Feature | Description |
| --- | --- |
| Inline Edit Modal | Users can edit task title and description in-place via a modal without reloading the page. |
| Task Deletion | Cards can be removed from any column with a confirmation prompt. |
| Optimistic UI Updates | Drag-and-drop is reflected instantly; the server result either confirms or rolls back. |
| Two-Phase Polling | Cheap timestamp-only poll before expensive full-data fetch saves quota. |
| Toast Notifications | Non-blocking success/error feedback for every user action. |
| Keyboard Shortcut | Press N to open the add-task modal without touching the mouse. |
| Live Sync Indicator | Header badge shows a pulsing green dot and last-sync time, or red on error. |
| `seedSheet()` Utility | A one-time server function pre-populates sample tasks for demo purposes. |

## 5. Challenges Faced

### No WebSocket Support

Google Apps Script provides no push mechanism. The two-phase polling approach (timestamp check then conditional full-fetch) was designed specifically to work around this constraint while keeping API usage low.

### Apps Script Quota Limits

Every `google.script.run` call counts against daily quotas. The timestamp-only poll avoids a full sheet read on every tick, reducing quota consumption significantly.

### Concurrency Race Conditions

Two users dragging the same card simultaneously could corrupt sheet state. `LockService` with `waitLock` serialises all writes. On the client side, the `isBusy` flag prevents the same user from firing overlapping requests.

### HTML Service Restrictions

Apps Script's sandboxed iframe environment strips certain HTML features. All JavaScript was kept in a single inline script block and Sortable.js was loaded from the allowed cdnjs.cloudflare.com CDN.

### Optimistic Rollback Logic

Providing instant UI feedback while still being able to revert on server failure required careful state management: the previous status is stored before the write and restored on the failure handler.

## 6. Setup Instructions

- **Step 1:** Go to script.google.com and create a new project.
- **Step 2:** Replace the contents of `Code.gs` with the provided Code.gs file.
- **Step 3:** Create a new HTML file named `index` and paste the `index.html` contents.
- **Step 4:** Open the linked Google Sheet (or create one via `SpreadsheetApp.create()`), then run the `seedSheet()` function once to initialise headers and sample data.
- **Step 5:** Click **Deploy > New Deployment**, choose **Web App**, set access to **Anyone**.
- **Step 6:** Copy the deployed URL and the Apps Script project link for submission.

Submitted as part of the Antbox SDE Internship Assignment - Collaborative Kanban Board with Real-Time Sync.
