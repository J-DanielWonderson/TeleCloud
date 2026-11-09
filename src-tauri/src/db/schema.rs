use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

pub const DEFAULT_CHUNK_SIZE_BYTES: i64 = 262_144_000; // 250 MB
const DB_FILE_NAME: &str = "telecloud_vfs.db";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfigEntry {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreadcrumbItem {
    pub id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_trashed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileRecord {
    pub id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub total_size_bytes: i64,
    pub mime_type: String,
    pub full_sha256: Option<String>,
    pub total_chunks: i64,
    pub status: String, // 'PENDING', 'UPLOADING', 'READY', 'CORRUPTED'
    pub created_at: i64,
    pub updated_at: i64,
    pub is_trashed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChunkRecord {
    pub id: String,
    pub file_id: String,
    pub chunk_index: i64,
    pub byte_offset: i64,
    pub byte_length: i64,
    pub telegram_message_id: Option<i64>,
    pub chunk_sha256: Option<String>,
    pub upload_status: String, // 'PENDING', 'UPLOADING', 'UPLOADED', 'VERIFIED'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerBotRecord {
    pub bot_id: String,
    pub bot_username: String,
    pub token_encrypted: String,
    pub cooldown_until: i64,
    pub total_uploaded_bytes: i64,
    pub is_active: i64,
}

#[derive(Clone)]
pub struct DbManager {
    conn: Arc<Mutex<Connection>>,
    db_path: PathBuf,
}

impl DbManager {
    /// Initialize local SQLite VFS database with exact schema and WAL mode
    pub fn new(app_handle: &AppHandle) -> Result<Self, AppError> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Database(format!("Failed to resolve app data directory: {e}")))?;

        let db_dir = app_dir.join("db");
        if !db_dir.exists() {
            fs::create_dir_all(&db_dir)
                .map_err(|e| AppError::Database(format!("Failed to create db directory: {e}")))?;
        }

        let db_path = db_dir.join(DB_FILE_NAME);
        Self::open(db_path)
    }

    pub fn open(db_path: PathBuf) -> Result<Self, AppError> {
        let conn = Connection::open(&db_path)
            .map_err(|e| AppError::Database(format!("Failed to open SQLite database: {e}")))?;

        let _ = conn.busy_timeout(std::time::Duration::from_secs(10));

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: db_path.clone(),
        };

        if let Err(e) = db.init_schema() {
            let msg = format!("Failed to initialize SQLite schema on {}: {e}. Attempting recovery...", db_path.display());
            eprintln!("[DATABASE] {msg}");
            crate::android_bridge::log_to_file("DATABASE", &msg);
            drop(db);
            let ts = chrono::Utc::now().timestamp();
            let corrupt_path = db_path.with_file_name(format!("{}.corrupt-{}", DB_FILE_NAME, ts));
            let _ = fs::rename(&db_path, &corrupt_path);
            let new_conn = Connection::open(&db_path)
                .map_err(|err| AppError::Database(format!("Failed to recreate SQLite database: {err}")))?;
            let _ = new_conn.busy_timeout(std::time::Duration::from_secs(10));
            let new_db = Self {
                conn: Arc::new(Mutex::new(new_conn)),
                db_path,
            };
            new_db.init_schema()?;
            return Ok(new_db);
        }

        Ok(db)
    }

    /// Creates an in-memory SQLite database instance with schema initialized
    pub fn open_in_memory() -> Result<Self, AppError> {
        let conn = Connection::open_in_memory()
            .map_err(|e| AppError::Database(format!("Failed to open in-memory SQLite: {e}")))?;
        let _ = conn.busy_timeout(std::time::Duration::from_secs(10));
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: PathBuf::from(":memory:"),
        };
        db.init_schema()?;
        Ok(db)
    }

    /// Safe fallback database manager that guarantees a usable SQLite database
    pub fn fallback() -> Self {
        if let Ok(db) = Self::open_in_memory() {
            return db;
        }
        let fallback_path = std::env::temp_dir().join(format!("telecloud_fallback_{}.db", chrono::Utc::now().timestamp()));
        if let Ok(db) = Self::open(fallback_path) {
            return db;
        }
        let conn = Connection::open_in_memory().unwrap_or_else(|_| Connection::open(":memory:").unwrap());
        Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: PathBuf::from(":memory:"),
        }
    }

    /// Initializes schema with strict PRAGMAs, tables, and indexes
    fn init_schema(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();

        // Strict PRAGMAs
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA synchronous = NORMAL;
            "#,
        )?;

        // Tables and indexes
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS vault_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                color TEXT DEFAULT '#3b82f6',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_trashed INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                total_size_bytes INTEGER NOT NULL,
                mime_type TEXT NOT NULL,
                full_sha256 TEXT,
                total_chunks INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('PENDING', 'UPLOADING', 'READY', 'CORRUPTED')),
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_trashed INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS file_chunks (
                id TEXT PRIMARY KEY,
                file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                byte_offset INTEGER NOT NULL,
                byte_length INTEGER NOT NULL,
                telegram_message_id INTEGER,
                chunk_sha256 TEXT,
                upload_status TEXT NOT NULL CHECK(upload_status IN ('PENDING', 'UPLOADING', 'UPLOADED', 'VERIFIED')),
                UNIQUE(file_id, chunk_index)
            );

            CREATE TABLE IF NOT EXISTS worker_bots (
                bot_id TEXT PRIMARY KEY,
                bot_username TEXT NOT NULL,
                token_encrypted TEXT NOT NULL,
                cooldown_until INTEGER NOT NULL DEFAULT 0,
                total_uploaded_bytes INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
            CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
            CREATE INDEX IF NOT EXISTS idx_chunks_file ON file_chunks(file_id, chunk_index);
            "#,
        )?;

        // Non-destructive schema migration for existing databases
        let _ = conn.execute("ALTER TABLE folders ADD COLUMN color TEXT DEFAULT '#3b82f6'", []);

        // Seed default config keys if missing
        let defaults = [
            ("chunk_size_bytes", DEFAULT_CHUNK_SIZE_BYTES.to_string()),
            ("last_synced_message_id", "0".to_string()),
            ("sync_version", "1".to_string()),
        ];

        for (k, v) in defaults {
            conn.execute(
                "INSERT OR IGNORE INTO vault_config (key, value) VALUES (?1, ?2)",
                params![k, v],
            )?;
        }

        Ok(())
    }

    pub fn get_db_path(&self) -> PathBuf {
        self.db_path.clone()
    }

    // -------------------------------------------------------------------------
    // Configuration CRUD
    // -------------------------------------------------------------------------
    pub fn get_config(&self, key: &str) -> Result<Option<String>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM vault_config WHERE key = ?1")?;
        let res = stmt.query_row(params![key], |row| row.get(0)).optional()?;
        Ok(res)
    }

    pub fn set_config(&self, key: &str, value: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO vault_config (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_chunk_size_bytes(&self) -> Result<i64, AppError> {
        let val = self.get_config("chunk_size_bytes")?;
        Ok(val.and_then(|v| v.parse::<i64>().ok()).unwrap_or(DEFAULT_CHUNK_SIZE_BYTES))
    }

    // -------------------------------------------------------------------------
    // Folders CRUD
    // -------------------------------------------------------------------------
    pub fn create_folder(&self, record: &FolderRecord) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO folders (id, parent_id, name, color, created_at, updated_at, is_trashed)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                record.id,
                record.parent_id,
                record.name,
                record.color.as_deref().unwrap_or("#3b82f6"),
                record.created_at,
                record.updated_at,
                record.is_trashed
            ],
        )?;
        Ok(())
    }

    pub fn list_folders(&self, parent_id: Option<&str>, is_trashed: bool) -> Result<Vec<FolderRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let trashed_val = if is_trashed { 1 } else { 0 };

        let mut folders = Vec::new();
        match parent_id {
            Some(pid) => {
                let mut stmt = conn.prepare(
                    "SELECT id, parent_id, name, color, created_at, updated_at, is_trashed FROM folders WHERE parent_id = ?1 AND is_trashed = ?2 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![pid, trashed_val], |row| {
                    Ok(FolderRecord {
                        id: row.get(0)?,
                        parent_id: row.get(1)?,
                        name: row.get(2)?,
                        color: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                        is_trashed: row.get(6)?,
                    })
                })?;
                for f in rows {
                    folders.push(f?);
                }
            }
            None => {
                let mut stmt = conn.prepare(
                    "SELECT id, parent_id, name, color, created_at, updated_at, is_trashed FROM folders WHERE parent_id IS NULL AND is_trashed = ?1 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![trashed_val], |row| {
                    Ok(FolderRecord {
                        id: row.get(0)?,
                        parent_id: row.get(1)?,
                        name: row.get(2)?,
                        color: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                        is_trashed: row.get(6)?,
                    })
                })?;
                for f in rows {
                    folders.push(f?);
                }
            }
        }
        Ok(folders)
    }

    /// Dynamic breadcrumb path resolution from any nested folder up to Root ("Home")
    pub fn get_breadcrumbs(&self, current_folder_id: Option<&str>) -> Result<Vec<BreadcrumbItem>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut crumbs = Vec::new();
        let mut curr = current_folder_id.map(|s| s.to_string());

        while let Some(fid) = curr {
            let mut stmt = conn.prepare("SELECT id, parent_id, name FROM folders WHERE id = ?1")?;
            let res = stmt.query_row(params![fid], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                ))
            });

            match res {
                Ok((id, parent_id, name)) => {
                    crumbs.push(BreadcrumbItem { id: Some(id), name });
                    curr = parent_id;
                }
                Err(_) => break,
            }
        }

        crumbs.reverse();
        let mut full_path = vec![BreadcrumbItem { id: None, name: "Home".to_string() }];
        full_path.extend(crumbs);
        Ok(full_path)
    }

    /// Move a folder into another parent folder (with cycle/descendant guard)
    pub fn move_folder(&self, folder_id: &str, target_parent_id: Option<&str>) -> Result<(), AppError> {
        if let Some(target_id) = target_parent_id {
            if target_id == folder_id {
                return Err(AppError::Validation("Cannot move folder into itself".into()));
            }
            // Check if target_id is a descendant of folder_id
            let conn = self.conn.lock().unwrap();
            let mut curr = Some(target_id.to_string());
            while let Some(pid) = curr {
                if pid == folder_id {
                    return Err(AppError::Validation("Cannot move folder into its own sub-folder".into()));
                }
                let mut stmt = conn.prepare("SELECT parent_id FROM folders WHERE id = ?1")?;
                let res = stmt.query_row(params![pid], |row| row.get::<_, Option<String>>(0));
                match res {
                    Ok(next_pid) => curr = next_pid,
                    Err(_) => break,
                }
            }
        }

        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE folders SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![target_parent_id, now, folder_id],
        )?;
        Ok(())
    }

    /// Move a file into another folder (or root if None)
    pub fn move_file(&self, file_id: &str, target_folder_id: Option<&str>) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE files SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![target_folder_id, now, file_id],
        )?;
        Ok(())
    }

    pub fn rename_folder(&self, id: &str, new_name: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_name, now, id],
        )?;
        Ok(())
    }

    pub fn set_folder_trashed(&self, id: &str, is_trashed: bool) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let val = if is_trashed { 1 } else { 0 };
        conn.execute(
            "UPDATE folders SET is_trashed = ?1, updated_at = ?2 WHERE id = ?3",
            params![val, now, id],
        )?;
        Ok(())
    }

    pub fn delete_folder_permanent(&self, id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_folder(&self, id: &str) -> Result<Option<FolderRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, parent_id, name, color, created_at, updated_at, is_trashed FROM folders WHERE id = ?1",
        )?;
        let res = stmt
            .query_row(params![id], |row| {
                Ok(FolderRecord {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                    is_trashed: row.get(6)?,
                })
            })
            .optional()?;
        Ok(res)
    }

    /// Duplicate a file and all its MTProto chunks into target_folder_id (instant cloud copy)
    pub fn copy_file(&self, file_id: &str, target_folder_id: Option<&str>) -> Result<FileRecord, AppError> {
        let original = self.get_file(file_id)?.ok_or_else(|| AppError::FileNotFound(file_id.to_string()))?;
        let chunks = self.get_chunks_for_file(file_id)?;

        let mut target_name = original.name.clone();
        let existing_files = self.list_files(target_folder_id, false)?;
        let name_exists = existing_files.iter().any(|f| f.name.eq_ignore_ascii_case(&target_name));

        if name_exists || original.folder_id.as_deref() == target_folder_id {
            let (stem, ext) = match original.name.rfind('.') {
                Some(dot_idx) if dot_idx > 0 => (&original.name[..dot_idx], &original.name[dot_idx..]),
                _ => (original.name.as_str(), ""),
            };
            let mut counter = 1;
            loop {
                let candidate = if counter == 1 {
                    format!("{} - Copy{}", stem, ext)
                } else {
                    format!("{} - Copy ({}){}", stem, counter, ext)
                };
                if !existing_files.iter().any(|f| f.name.eq_ignore_ascii_case(&candidate)) {
                    target_name = candidate;
                    break;
                }
                counter += 1;
            }
        }

        let new_file_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let new_file = FileRecord {
            id: new_file_id.clone(),
            folder_id: target_folder_id.map(|s| s.to_string()),
            name: target_name,
            total_size_bytes: original.total_size_bytes,
            mime_type: original.mime_type,
            full_sha256: original.full_sha256,
            total_chunks: original.total_chunks,
            status: original.status,
            created_at: now,
            updated_at: now,
            is_trashed: 0,
        };

        self.create_file(&new_file)?;

        if !chunks.is_empty() {
            let mut new_chunks = Vec::with_capacity(chunks.len());
            for c in chunks {
                new_chunks.push(FileChunkRecord {
                    id: uuid::Uuid::new_v4().to_string(),
                    file_id: new_file_id.clone(),
                    chunk_index: c.chunk_index,
                    byte_offset: c.byte_offset,
                    byte_length: c.byte_length,
                    telegram_message_id: c.telegram_message_id,
                    chunk_sha256: c.chunk_sha256,
                    upload_status: c.upload_status,
                });
            }
            self.insert_chunks_batch(&new_chunks)?;
        }

        Ok(new_file)
    }

    /// Recursively duplicate a folder, its nested subfolders, and all contained files
    pub fn copy_folder(&self, folder_id: &str, target_parent_id: Option<&str>) -> Result<FolderRecord, AppError> {
        let original = self.get_folder(folder_id)?.ok_or_else(|| AppError::FolderNotFound(folder_id.to_string()))?;

        // Guard against cycles: cannot copy folder into itself or any descendant
        if let Some(target_id) = target_parent_id {
            if target_id == folder_id {
                return Err(AppError::Validation("Cannot copy folder into itself".into()));
            }
            let conn = self.conn.lock().unwrap();
            let mut curr = Some(target_id.to_string());
            while let Some(pid) = curr {
                if pid == folder_id {
                    return Err(AppError::Validation("Cannot copy folder into its own sub-folder".into()));
                }
                let mut stmt = conn.prepare("SELECT parent_id FROM folders WHERE id = ?1")?;
                let res = stmt.query_row(params![pid], |row| row.get::<_, Option<String>>(0));
                match res {
                    Ok(next_pid) => curr = next_pid,
                    Err(_) => break,
                }
            }
        }

        let mut target_name = original.name.clone();
        let existing_folders = self.list_folders(target_parent_id, false)?;
        let name_exists = existing_folders.iter().any(|f| f.name.eq_ignore_ascii_case(&target_name));

        if name_exists || original.parent_id.as_deref() == target_parent_id {
            let mut counter = 1;
            loop {
                let candidate = if counter == 1 {
                    format!("{} - Copy", original.name)
                } else {
                    format!("{} - Copy ({})", original.name, counter)
                };
                if !existing_folders.iter().any(|f| f.name.eq_ignore_ascii_case(&candidate)) {
                    target_name = candidate;
                    break;
                }
                counter += 1;
            }
        }

        let new_folder_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let new_folder = FolderRecord {
            id: new_folder_id,
            parent_id: target_parent_id.map(|s| s.to_string()),
            name: target_name,
            color: original.color.clone(),
            created_at: now,
            updated_at: now,
            is_trashed: 0,
        };
        self.create_folder(&new_folder)?;

        // Recursively duplicate files in folder
        let files = self.list_files(Some(folder_id), false)?;
        for f in files {
            self.copy_file(&f.id, Some(&new_folder.id))?;
        }

        // Recursively duplicate child subfolders
        let subfolders = self.list_folders(Some(folder_id), false)?;
        for sf in subfolders {
            self.copy_folder(&sf.id, Some(&new_folder.id))?;
        }

        Ok(new_folder)
    }

    // -------------------------------------------------------------------------
    // Files CRUD
    // -------------------------------------------------------------------------
    pub fn create_file(&self, file: &FileRecord) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO files (id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                file.id,
                file.folder_id,
                file.name,
                file.total_size_bytes,
                file.mime_type,
                file.full_sha256,
                file.total_chunks,
                file.status,
                file.created_at,
                file.updated_at,
                file.is_trashed
            ],
        )?;
        Ok(())
    }

    pub fn get_file(&self, id: &str) -> Result<Option<FileRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files WHERE id = ?1"
        )?;
        let res = stmt
            .query_row(params![id], |row| {
                Ok(FileRecord {
                    id: row.get(0)?,
                    folder_id: row.get(1)?,
                    name: row.get(2)?,
                    total_size_bytes: row.get(3)?,
                    mime_type: row.get(4)?,
                    full_sha256: row.get(5)?,
                    total_chunks: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    is_trashed: row.get(10)?,
                })
            })
            .optional()?;
        Ok(res)
    }

    pub fn list_files(&self, folder_id: Option<&str>, is_trashed: bool) -> Result<Vec<FileRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let trashed_val = if is_trashed { 1 } else { 0 };

        let mut files = Vec::new();
        match folder_id {
            Some(fid) => {
                let mut stmt = conn.prepare(
                    "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files WHERE folder_id = ?1 AND is_trashed = ?2 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![fid, trashed_val], |row| {
                    Ok(FileRecord {
                        id: row.get(0)?,
                        folder_id: row.get(1)?,
                        name: row.get(2)?,
                        total_size_bytes: row.get(3)?,
                        mime_type: row.get(4)?,
                        full_sha256: row.get(5)?,
                        total_chunks: row.get(6)?,
                        status: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                        is_trashed: row.get(10)?,
                    })
                })?;
                for f in rows {
                    files.push(f?);
                }
            }
            None => {
                let mut stmt = conn.prepare(
                    "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files WHERE folder_id IS NULL AND is_trashed = ?1 ORDER BY name ASC"
                )?;
                let rows = stmt.query_map(params![trashed_val], |row| {
                    Ok(FileRecord {
                        id: row.get(0)?,
                        folder_id: row.get(1)?,
                        name: row.get(2)?,
                        total_size_bytes: row.get(3)?,
                        mime_type: row.get(4)?,
                        full_sha256: row.get(5)?,
                        total_chunks: row.get(6)?,
                        status: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                        is_trashed: row.get(10)?,
                    })
                })?;
                for f in rows {
                    files.push(f?);
                }
            }
        }
        Ok(files)
    }

    pub fn update_file_status(&self, id: &str, status: &str, full_sha256: Option<&str>) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE files SET status = ?1, full_sha256 = COALESCE(?2, full_sha256), updated_at = ?3 WHERE id = ?4",
            params![status, full_sha256, now, id],
        )?;
        Ok(())
    }

    pub fn set_file_trashed(&self, id: &str, is_trashed: bool) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        let val = if is_trashed { 1 } else { 0 };
        conn.execute(
            "UPDATE files SET is_trashed = ?1, updated_at = ?2 WHERE id = ?3",
            params![val, now, id],
        )?;
        Ok(())
    }

    pub fn delete_file_permanent(&self, id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM files WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn rename_file(&self, id: &str, new_name: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE files SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_name, now, id],
        )?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // File Chunks CRUD
    // -------------------------------------------------------------------------
    pub fn insert_chunks_batch(&self, chunks: &[FileChunkRecord]) -> Result<(), AppError> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO file_chunks (id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ON CONFLICT(file_id, chunk_index) DO UPDATE SET
                    byte_offset = excluded.byte_offset,
                    byte_length = excluded.byte_length
                "#
            )?;

            for chunk in chunks {
                stmt.execute(params![
                    chunk.id,
                    chunk.file_id,
                    chunk.chunk_index,
                    chunk.byte_offset,
                    chunk.byte_length,
                    chunk.telegram_message_id,
                    chunk.chunk_sha256,
                    chunk.upload_status
                ])?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    pub fn get_chunks_for_file(&self, file_id: &str) -> Result<Vec<FileChunkRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status
            FROM file_chunks
            WHERE file_id = ?1
            ORDER BY chunk_index ASC
            "#,
        )?;

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(FileChunkRecord {
                id: row.get(0)?,
                file_id: row.get(1)?,
                chunk_index: row.get(2)?,
                byte_offset: row.get(3)?,
                byte_length: row.get(4)?,
                telegram_message_id: row.get(5)?,
                chunk_sha256: row.get(6)?,
                upload_status: row.get(7)?,
            })
        })?;

        let mut chunks = Vec::new();
        for r in rows {
            chunks.push(r?);
        }
        Ok(chunks)
    }

    pub fn get_pending_chunks_for_file(&self, file_id: &str) -> Result<Vec<FileChunkRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status
            FROM file_chunks
            WHERE file_id = ?1 AND upload_status != 'UPLOADED' AND upload_status != 'VERIFIED'
            ORDER BY chunk_index ASC
            "#,
        )?;

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(FileChunkRecord {
                id: row.get(0)?,
                file_id: row.get(1)?,
                chunk_index: row.get(2)?,
                byte_offset: row.get(3)?,
                byte_length: row.get(4)?,
                telegram_message_id: row.get(5)?,
                chunk_sha256: row.get(6)?,
                upload_status: row.get(7)?,
            })
        })?;

        let mut chunks = Vec::new();
        for r in rows {
            chunks.push(r?);
        }
        Ok(chunks)
    }

    pub fn update_chunk_uploaded(
        &self,
        file_id: &str,
        chunk_index: i64,
        telegram_message_id: i64,
        chunk_sha256: &str,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            UPDATE file_chunks
            SET telegram_message_id = ?1,
                chunk_sha256 = ?2,
                upload_status = 'UPLOADED'
            WHERE file_id = ?3 AND chunk_index = ?4
            "#,
            params![telegram_message_id, chunk_sha256, file_id, chunk_index],
        )?;
        Ok(())
    }

    pub fn update_chunk_verified(&self, file_id: &str, chunk_index: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE file_chunks SET upload_status = 'VERIFIED' WHERE file_id = ?1 AND chunk_index = ?2",
            params![file_id, chunk_index],
        )?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // Worker Bots CRUD
    // -------------------------------------------------------------------------
    pub fn upsert_worker_bot(&self, bot: &WorkerBotRecord) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO worker_bots (bot_id, bot_username, token_encrypted, cooldown_until, total_uploaded_bytes, is_active)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(bot_id) DO UPDATE SET
                bot_username = excluded.bot_username,
                token_encrypted = excluded.token_encrypted,
                is_active = excluded.is_active
            "#,
            params![
                bot.bot_id,
                bot.bot_username,
                bot.token_encrypted,
                bot.cooldown_until,
                bot.total_uploaded_bytes,
                bot.is_active
            ],
        )?;
        Ok(())
    }

    pub fn get_worker_bot(&self, bot_id: &str) -> Result<Option<WorkerBotRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT bot_id, bot_username, token_encrypted, cooldown_until, total_uploaded_bytes, is_active FROM worker_bots WHERE bot_id = ?1"
        )?;
        let res = stmt
            .query_row(params![bot_id], |row| {
                Ok(WorkerBotRecord {
                    bot_id: row.get(0)?,
                    bot_username: row.get(1)?,
                    token_encrypted: row.get(2)?,
                    cooldown_until: row.get(3)?,
                    total_uploaded_bytes: row.get(4)?,
                    is_active: row.get(5)?,
                })
            })
            .optional()?;
        Ok(res)
    }

    pub fn list_active_bots(&self) -> Result<Vec<WorkerBotRecord>, AppError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT bot_id, bot_username, token_encrypted, cooldown_until, total_uploaded_bytes, is_active FROM worker_bots WHERE is_active = 1"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(WorkerBotRecord {
                bot_id: row.get(0)?,
                bot_username: row.get(1)?,
                token_encrypted: row.get(2)?,
                cooldown_until: row.get(3)?,
                total_uploaded_bytes: row.get(4)?,
                is_active: row.get(5)?,
            })
        })?;

        let mut bots = Vec::new();
        for b in rows {
            bots.push(b?);
        }
        Ok(bots)
    }

    pub fn update_bot_cooldown(&self, bot_id: &str, cooldown_until: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE worker_bots SET cooldown_until = ?1 WHERE bot_id = ?2",
            params![cooldown_until, bot_id],
        )?;
        Ok(())
    }

    pub fn add_bot_uploaded_bytes(&self, bot_id: &str, bytes: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE worker_bots SET total_uploaded_bytes = total_uploaded_bytes + ?1 WHERE bot_id = ?2",
            params![bytes, bot_id],
        )?;
        Ok(())
    }

    pub fn delete_worker_bot(&self, bot_id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM worker_bots WHERE bot_id = ?1", params![bot_id])?;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // VFS Snapshot Export & Import for Cloud Sync
    // -------------------------------------------------------------------------
    pub fn export_vfs_snapshot(
        &self,
    ) -> Result<(Vec<FolderRecord>, Vec<FileRecord>, Vec<FileChunkRecord>), AppError> {
        let conn = self.conn.lock().unwrap();

        // Folders
        let mut f_stmt = conn.prepare("SELECT id, parent_id, name, color, created_at, updated_at, is_trashed FROM folders")?;
        let folders = f_stmt
            .query_map([], |r| {
                Ok(FolderRecord {
                    id: r.get(0)?,
                    parent_id: r.get(1)?,
                    name: r.get(2)?,
                    color: r.get(3)?,
                    created_at: r.get(4)?,
                    updated_at: r.get(5)?,
                    is_trashed: r.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Files
        let mut file_stmt = conn.prepare(
            "SELECT id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed FROM files"
        )?;
        let files = file_stmt
            .query_map([], |r| {
                Ok(FileRecord {
                    id: r.get(0)?,
                    folder_id: r.get(1)?,
                    name: r.get(2)?,
                    total_size_bytes: r.get(3)?,
                    mime_type: r.get(4)?,
                    full_sha256: r.get(5)?,
                    total_chunks: r.get(6)?,
                    status: r.get(7)?,
                    created_at: r.get(8)?,
                    updated_at: r.get(9)?,
                    is_trashed: r.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Chunks
        let mut c_stmt = conn.prepare(
            "SELECT id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status FROM file_chunks"
        )?;
        let chunks = c_stmt
            .query_map([], |r| {
                Ok(FileChunkRecord {
                    id: r.get(0)?,
                    file_id: r.get(1)?,
                    chunk_index: r.get(2)?,
                    byte_offset: r.get(3)?,
                    byte_length: r.get(4)?,
                    telegram_message_id: r.get(5)?,
                    chunk_sha256: r.get(6)?,
                    upload_status: r.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok((folders, files, chunks))
    }

    /// Import and merge a remote VFS snapshot atomically inside a SQLite transaction
    pub fn import_vfs_snapshot(
        &self,
        folders: &[FolderRecord],
        files: &[FileRecord],
        chunks: &[FileChunkRecord],
    ) -> Result<(), AppError> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // 1. Upsert Folders
        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO folders (id, parent_id, name, color, created_at, updated_at, is_trashed)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ON CONFLICT(id) DO UPDATE SET
                    parent_id = excluded.parent_id,
                    name = excluded.name,
                    color = excluded.color,
                    updated_at = excluded.updated_at,
                    is_trashed = excluded.is_trashed
                WHERE excluded.updated_at >= folders.updated_at
                "#,
            )?;
            for f in folders {
                stmt.execute(params![
                    f.id,
                    f.parent_id,
                    f.name,
                    f.color.as_deref().unwrap_or("#3b82f6"),
                    f.created_at,
                    f.updated_at,
                    f.is_trashed
                ])?;
            }
        }

        // 2. Upsert Files
        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO files (id, folder_id, name, total_size_bytes, mime_type, full_sha256, total_chunks, status, created_at, updated_at, is_trashed)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                ON CONFLICT(id) DO UPDATE SET
                    folder_id = excluded.folder_id,
                    name = excluded.name,
                    total_size_bytes = excluded.total_size_bytes,
                    mime_type = excluded.mime_type,
                    full_sha256 = excluded.full_sha256,
                    total_chunks = excluded.total_chunks,
                    status = excluded.status,
                    updated_at = excluded.updated_at,
                    is_trashed = excluded.is_trashed
                WHERE excluded.updated_at >= files.updated_at
                "#,
            )?;
            for file in files {
                stmt.execute(params![
                    file.id,
                    file.folder_id,
                    file.name,
                    file.total_size_bytes,
                    file.mime_type,
                    file.full_sha256,
                    file.total_chunks,
                    file.status,
                    file.created_at,
                    file.updated_at,
                    file.is_trashed
                ])?;
            }
        }

        // 3. Upsert Chunks
        {
            let mut stmt = tx.prepare(
                r#"
                INSERT INTO file_chunks (id, file_id, chunk_index, byte_offset, byte_length, telegram_message_id, chunk_sha256, upload_status)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ON CONFLICT(file_id, chunk_index) DO UPDATE SET
                    telegram_message_id = COALESCE(excluded.telegram_message_id, file_chunks.telegram_message_id),
                    chunk_sha256 = COALESCE(excluded.chunk_sha256, file_chunks.chunk_sha256),
                    upload_status = CASE
                        WHEN excluded.upload_status IN ('UPLOADED', 'VERIFIED') THEN excluded.upload_status
                        ELSE file_chunks.upload_status
                    END
                "#,
            )?;
            for c in chunks {
                stmt.execute(params![
                    c.id,
                    c.file_id,
                    c.chunk_index,
                    c.byte_offset,
                    c.byte_length,
                    c.telegram_message_id,
                    c.chunk_sha256,
                    c.upload_status
                ])?;
            }
        }

        tx.commit()?;
        Ok(())
    }
}
