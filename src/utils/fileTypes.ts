export type FileCategory =
  | 'video'
  | 'audio'
  | 'image'
  | 'pdf'
  | 'text'
  | 'code'
  | 'markdown'
  | 'spreadsheet'
  | 'document'
  | 'archive'
  | 'binary';

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'tif',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'mkv', 'mov', 'avi', 'wmv', 'flv', 'm4v', '3gp', 'ts', 'ogv',
]);

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus', 'weba',
]);

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'less', 'py', 'rs',
  'c', 'cpp', 'h', 'hpp', 'cs', 'java', 'go', 'php', 'rb', 'swift', 'kt', 'kts',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'yaml', 'yml', 'xml', 'sql', 'toml',
  'ini', 'env', 'dockerfile', 'makefile', 'r', 'dart', 'lua',
]);

const SPREADSHEET_EXTENSIONS = new Set(['csv', 'tsv', 'xlsx', 'xls']);
const DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'rtf', 'odt']);
const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']);

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function getFileCategory(fileName: string, mimeType = ''): FileCategory {
  const ext = getFileExtension(fileName);
  const mime = mimeType.toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') {
    return 'pdf';
  }
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(ext) || mime.startsWith('video/')) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.has(ext) || mime.startsWith('audio/')) {
    return 'audio';
  }
  if (ext === 'md' || ext === 'markdown') {
    return 'markdown';
  }
  if (SPREADSHEET_EXTENSIONS.has(ext) || mime.includes('csv') || mime.includes('spreadsheet')) {
    return 'spreadsheet';
  }
  if (DOCUMENT_EXTENSIONS.has(ext) || mime.includes('word') || mime.includes('officedocument')) {
    return 'document';
  }
  if (CODE_EXTENSIONS.has(ext)) {
    return 'code';
  }
  if (ext === 'txt' || ext === 'log' || mime.startsWith('text/')) {
    return 'text';
  }
  if (ARCHIVE_EXTENSIONS.has(ext)) {
    return 'archive';
  }

  return 'binary';
}

export function canPreviewInApp(fileName: string, mimeType = ''): boolean {
  const cat = getFileCategory(fileName, mimeType);
  return (
    cat === 'video' ||
    cat === 'audio' ||
    cat === 'image' ||
    cat === 'pdf' ||
    cat === 'text' ||
    cat === 'code' ||
    cat === 'markdown' ||
    cat === 'spreadsheet' ||
    cat === 'document'
  );
}

export function getCategoryBadge(category: FileCategory): { label: string; color: string } {
  switch (category) {
    case 'video':
      return { label: 'Video', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    case 'audio':
      return { label: 'Audio', color: 'bg-pink-500/15 text-pink-400 border-pink-500/30' };
    case 'image':
      return { label: 'Image', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    case 'pdf':
      return { label: 'PDF', color: 'bg-red-500/15 text-red-400 border-red-500/30' };
    case 'markdown':
      return { label: 'Markdown', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
    case 'spreadsheet':
      return { label: 'Sheet', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' };
    case 'document':
      return { label: 'Document', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    case 'code':
      return { label: 'Code', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' };
    case 'text':
      return { label: 'Text', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
    case 'archive':
      return { label: 'Archive', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    default:
      return { label: 'File', color: 'bg-slate-700/30 text-slate-400 border-slate-600/30' };
  }
}
