-- Add 'plan' column to tasks table
ALTER TABLE tasks ADD COLUMN plan TEXT;

-- SQLite doesn't support modifying CHECK constraints directly,
-- but the CHECK constraint is only enforced on INSERT/UPDATE.
-- We need to recreate the table to update the constraint.
-- However, for simplicity, we'll create a new table and migrate data.

-- Create new tasks table with updated constraint
CREATE TABLE tasks_new (
    id                    BLOB PRIMARY KEY,
    project_id            BLOB NOT NULL,
    title                 TEXT NOT NULL,
    description           TEXT,
    plan                  TEXT,
    status                TEXT NOT NULL DEFAULT 'todo'
                             CHECK (status IN ('todo','plan','inprogress','done','cancelled','inreview')),
    parent_task_attempt   BLOB,
    shared_task_id        BLOB,
    created_at            TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Copy data from old table
INSERT INTO tasks_new (id, project_id, title, description, plan, status, parent_task_attempt, shared_task_id, created_at, updated_at)
SELECT id, project_id, title, description, plan, status, parent_task_attempt, shared_task_id, created_at, updated_at
FROM tasks;

-- Drop old table
DROP TABLE tasks;

-- Rename new table
ALTER TABLE tasks_new RENAME TO tasks;

-- Recreate indexes (from optimize_selects_and_cleanup_indexes migration)
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_shared_task_id ON tasks(shared_task_id) WHERE shared_task_id IS NOT NULL;
