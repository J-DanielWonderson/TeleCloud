use serde::{ser::SerializeStruct, Serialize, Serializer};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Keystore security error: {0}")]
    Keystore(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Telegram MTProto error: {0}")]
    Telegram(String),

    #[error("Telegram FLOOD_WAIT: cooldown required for {0} seconds")]
    FloodWait(u64),

    #[error("Authentication required: user session is missing or expired")]
    AuthRequired,

    #[error("Invalid phone number or authentication code")]
    InvalidAuthCode,

    #[error("2-Step Verification password is required for this Telegram account")]
    Password2FaRequired,

    #[error("Invalid 2-Step Verification password")]
    InvalidPassword,

    #[error("TeleCloud storage channel not provisioned or inaccessible")]
    StorageChannelNotFound,

    #[error("File system I/O error: {0}")]
    Io(String),

    #[error("Chunk integrity verification failed: expected {expected}, computed {computed}")]
    ChunkHashMismatch {
        expected: String,
        computed: String,
    },

    #[error("VFS file record not found: {0}")]
    FileNotFound(String),

    #[error("VFS folder record not found: {0}")]
    FolderNotFound(String),

    #[error("Input validation error: {0}")]
    Validation(String),

    #[error("Data serialization error: {0}")]
    Serialization(String),

    #[error("Worker bot pool exhausted or unavailable")]
    WorkerPoolExhausted,
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("AppError", 3)?;
        state.serialize_field("message", &self.to_string())?;

        let code = match self {
            AppError::Keystore(_) => "KEYSTORE_ERROR",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Telegram(_) => "TELEGRAM_ERROR",
            AppError::FloodWait(_) => "FLOOD_WAIT",
            AppError::AuthRequired => "AUTH_REQUIRED",
            AppError::InvalidAuthCode => "INVALID_AUTH_CODE",
            AppError::Password2FaRequired => "PASSWORD_2FA_REQUIRED",
            AppError::InvalidPassword => "INVALID_PASSWORD",
            AppError::StorageChannelNotFound => "CHANNEL_NOT_FOUND",
            AppError::Io(_) => "IO_ERROR",
            AppError::ChunkHashMismatch { .. } => "HASH_MISMATCH",
            AppError::FileNotFound(_) => "FILE_NOT_FOUND",
            AppError::FolderNotFound(_) => "FOLDER_NOT_FOUND",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::Serialization(_) => "SERIALIZATION_ERROR",
            AppError::WorkerPoolExhausted => "WORKER_POOL_EXHAUSTED",
        };
        state.serialize_field("code", code)?;

        if let AppError::FloodWait(wait_seconds) = self {
            state.serialize_field("retry_after_secs", &Some(wait_seconds))?;
        } else {
            state.serialize_field("retry_after_secs", &None::<u64>)?;
        }

        state.end()
    }
}
