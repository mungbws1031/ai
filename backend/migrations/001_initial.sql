-- Initial schema for MVP; for production use Alembic migration scripts.
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  drive_mapping JSON,
  created_at TIMESTAMP
);
