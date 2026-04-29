// ============================================================
//  Collaborative Kanban Board — Code.gs (Google Apps Script)
//  Author : Rajit | Roll No: 23053067 | KIIT University
// ============================================================

const SHEET_NAME = 'Tasks';

// ── Entry point ──────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Collaborative Kanban Board')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Sheet helper ─────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 5).setValues(
      [['Task ID', 'Title', 'Description', 'Status', 'Last Updated']]
    );
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f3f3f3');
  }
  return sheet;
}

// ── READ: Return all tasks as JSON ───────────────────────────
function getTasks() {
  try {
    const sheet  = getSheet();
    const values = sheet.getDataRange().getValues();
    const tasks  = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i][0]) {
        tasks.push({
          id          : String(values[i][0]),
          title       : String(values[i][1]),
          description : String(values[i][2] || ''),
          status      : String(values[i][3]),
          lastUpdated : String(values[i][4])
        });
      }
    }
    return JSON.stringify({ success: true, tasks: tasks });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  }
}

// ── READ: Lightweight poll — returns latest timestamp only ───
function getLastTimestamp() {
  try {
    const sheet  = getSheet();
    const values = sheet.getDataRange().getValues();
    let latest   = '';
    for (let i = 1; i < values.length; i++) {
      const ts = String(values[i][4] || '');
      if (ts > latest) latest = ts;
    }
    return JSON.stringify({ success: true, timestamp: latest });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  }
}

// ── UPDATE: Move task to a new column (with LockService) ─────
function updateTaskStatus(taskId, newStatus) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // wait up to 10 s for the lock

    const sheet  = getSheet();
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(taskId)) {
        const now = new Date().toISOString();
        sheet.getRange(i + 1, 4).setValue(newStatus);
        sheet.getRange(i + 1, 5).setValue(now);
        SpreadsheetApp.flush(); // commit immediately
        return JSON.stringify({ success: true, lastUpdated: now });
      }
    }
    return JSON.stringify({ success: false, error: 'Task not found' });

  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ── CREATE: Add new task to Backlog ───────────────────────────
function addTask(title, description) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!title || title.trim() === '') {
      return JSON.stringify({ success: false, error: 'Title is required' });
    }

    const sheet  = getSheet();
    const taskId = 'TASK-' + Date.now();
    const now    = new Date().toISOString();
    sheet.appendRow([taskId, title.trim(), (description || '').trim(), 'Backlog', now]);
    SpreadsheetApp.flush();
    return JSON.stringify({ success: true, id: taskId, lastUpdated: now });

  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ── UPDATE: Edit task title / description ─────────────────────
function editTask(taskId, newTitle, newDescription) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const sheet  = getSheet();
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(taskId)) {
        const now = new Date().toISOString();
        sheet.getRange(i + 1, 2).setValue(newTitle.trim());
        sheet.getRange(i + 1, 3).setValue((newDescription || '').trim());
        sheet.getRange(i + 1, 5).setValue(now);
        SpreadsheetApp.flush();
        return JSON.stringify({ success: true, lastUpdated: now });
      }
    }
    return JSON.stringify({ success: false, error: 'Task not found' });

  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ── DELETE: Remove a task row ─────────────────────────────────
function deleteTask(taskId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const sheet  = getSheet();
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(taskId)) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return JSON.stringify({ success: true });
      }
    }
    return JSON.stringify({ success: false, error: 'Task not found' });

  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ── UTILITY: One-time sheet seed (run manually once) ──────────
function seedSheet() {
  const sheet = getSheet();
  if (sheet.getLastRow() > 1) return; // already seeded
  const now = new Date().toISOString();
  const rows = [
    ['TASK-001', 'Design system architecture',  'Draft component diagram',       'Backlog',     now],
    ['TASK-002', 'Set up Google Sheets DB',      'Configure headers and schema',  'In-Progress', now],
    ['TASK-003', 'Build Kanban frontend',        'HTML/CSS layout with columns',  'In-Progress', now],
    ['TASK-004', 'Implement drag-and-drop',      'Use Sortable.js library',       'Backlog',     now],
    ['TASK-005', 'Deploy to Apps Script',        'Publish as web app',            'Done',        now],
  ];
  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  SpreadsheetApp.flush();
  Logger.log('Sheet seeded successfully.');
}
