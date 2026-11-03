export type FileStatus = 'PENDING' | 'UPLOADING' | 'READY' | 'CORRUPTED';
export type ChunkUploadStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'VERIFIED';

export interface SetupStatus {
  is_configured: boolean;
  has_session: boolean;
  storage_channel_id: number | null;
  phone: string | null;
  bot_count: number;
}

export interface InitialCredentialsPayload {
  api_id: number;
  api_hash: string;
  phone: string;
  worker_bot_tokens?: string[];
}

export interface RequestCodeResponse {
  phone: string;
  code_sent: boolean;
}

export interface SignInResponse {
  success: boolean;
  password_required: boolean;
  hint: string | null;
  user_id: number | null;
  storage_channel_id: number | null;
}

export interface StorageChannelInfo {
  channel_id: number;
  title: string;
  is_newly_created: boolean;
}

export interface TelegramUserProfile {
  id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
}

export interface FolderRecord {
  id: string;
  parent_id: string | null;
  name: string;
  color?: string;
  created_at: number;
  updated_at: number;
  is_trashed?: number;
}

export type FolderItem = FolderRecord;

export interface FileRecord {
  id: string;
  folder_id: string | null;
  name: string;
  total_size_bytes: number;
  mime_type: string;
  full_sha256?: string | null;
  total_chunks: number;
  status: FileStatus;
  created_at: number;
  updated_at?: number;
  is_trashed?: number;
}

export type FileItem = FileRecord;

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export interface TransferProgress {
  file_id: string;
  file_name: string;
  bytes_transferred: number;
  total_bytes: number;
  active_chunk: number;
  total_chunks: number;
  speed_mbps: number;
  worker_bot: string;
  is_upload: boolean;
}

export interface FileChunkRecord {
  id: string;
  file_id: string;
  chunk_index: number;
  byte_offset: number;
  byte_length: number;
  telegram_message_id: number | null;
  chunk_sha256: string | null;
  upload_status: ChunkUploadStatus;
}

export interface WorkerBotRecord {
  bot_id: string;
  bot_username: string;
  token_encrypted: string;
  cooldown_until: number;
  total_uploaded_bytes: number;
  is_active: number;
}

export interface AppErrorPayload {
  message: string;
  code: string;
  retry_after_secs: number | null;
}

export type TransferStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'DOWNLOADING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface TransferProgressEvent {
  file_id: string;
  file_name: string;
  chunk_index: number;
  total_chunks: number;
  bytes_transferred_chunk: number;
  total_chunk_bytes: number;
  bytes_transferred_file: number;
  total_file_bytes: number;
  speed_bytes_per_sec: number;
  active_worker: string;
  status: TransferStatus;
  error: string | null;
}

export interface ActiveTransfer {
  fileId: string;
  fileName: string;
  filePath: string;
  transferType: 'UPLOAD' | 'DOWNLOAD';
  totalSizeBytes: number;
  totalChunks: number;
  currentChunkIndex: number;
  bytesTransferredFile: number;
  bytesTransferredChunk: number;
  totalChunkBytes: number;
  speedBytesPerSec: number;
  activeWorker: string;
  status: TransferStatus;
  error: string | null;
  startedAt: number;
  updatedAt: number;
}

export interface WorkerBotInfo {
  bot_id: string;
  bot_username: string;
  cooldown_until: number;
  total_uploaded_bytes: number;
  is_active: boolean;
  is_cooling_down: boolean;
  remaining_cooldown_secs: number;
}

export interface SyncStatus {
  last_synced_message_id: number | null;
  last_synced_at: number | null;
  is_in_sync: boolean;
}

export interface BotPoolHealth {
  total_bots: number;
  active_bots: number;
  cooling_bots: number;
  min_rule_satisfied: boolean;
  required_min_bots: number;
  recommendation: string;
}
