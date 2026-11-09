use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaProbe {
    pub container: String,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_secs: Option<f64>,
    pub bitrate_bps: Option<u64>,
    pub megapixels: Option<f64>,
    pub moov_at_end: bool,
    pub moov_offset: Option<u64>,
    pub moov_size: Option<u64>,
    pub webview_likely_playable: bool,
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct BoxInfo {
    pub fourcc: [u8; 4],
    pub offset: u64,
    pub size: u64,
    pub header_size: u64,
}

impl BoxInfo {
    pub fn name(&self) -> String {
        String::from_utf8_lossy(&self.fourcc).to_string()
    }
}

/// Parses top-level ISO-BMFF (MP4/MOV) boxes from a slice known to start at file offset `base_offset`
pub fn parse_isobmff_boxes(data: &[u8], base_offset: u64, total_file_size: u64) -> Vec<BoxInfo> {
    let mut boxes = Vec::new();
    let mut cursor = 0usize;

    while cursor + 8 <= data.len() {
        let box_start = match base_offset.checked_add(cursor as u64) {
            Some(s) => s,
            None => break,
        };
        let size_u32 = u32::from_be_bytes([data[cursor], data[cursor + 1], data[cursor + 2], data[cursor + 3]]);
        let fourcc = [data[cursor + 4], data[cursor + 5], data[cursor + 6], data[cursor + 7]];

        let (box_size, header_size) = if size_u32 == 1 {
            if cursor + 16 > data.len() {
                break;
            }
            let largesize = u64::from_be_bytes([
                data[cursor + 8], data[cursor + 9], data[cursor + 10], data[cursor + 11],
                data[cursor + 12], data[cursor + 13], data[cursor + 14], data[cursor + 15],
            ]);
            (largesize, 16u64)
        } else if size_u32 == 0 {
            (total_file_size.saturating_sub(box_start), 8u64)
        } else {
            (size_u32 as u64, 8u64)
        };

        if box_size < header_size {
            break;
        }

        boxes.push(BoxInfo {
            fourcc,
            offset: box_start,
            size: box_size,
            header_size,
        });

        // Advance cursor with checked bounds
        let remaining = (data.len().saturating_sub(cursor)) as u64;
        if box_size > remaining {
            // Box extends beyond current buffer
            break;
        }
        cursor = match cursor.checked_add(box_size as usize) {
            Some(c) => c,
            None => break,
        };
    }

    boxes
}

/// Parses internal details of a `moov` box payload
pub fn parse_moov_payload(moov_data: &[u8]) -> (Option<String>, Option<String>, Option<u32>, Option<u32>, Option<f64>) {
    let mut video_codec = None;
    let mut audio_codec = None;
    let mut width = None;
    let mut height = None;
    let mut duration_secs = None;

    // Scan for mvhd, trak, etc.
    let mut cursor = 0usize;
    while cursor + 8 <= moov_data.len() {
        let size_u32 = u32::from_be_bytes([
            moov_data[cursor], moov_data[cursor + 1], moov_data[cursor + 2], moov_data[cursor + 3],
        ]);
        let fourcc = &moov_data[cursor + 4..cursor + 8];
        let (box_size, header_size) = if size_u32 == 1 && cursor + 16 <= moov_data.len() {
            let largesize = u64::from_be_bytes([
                moov_data[cursor + 8], moov_data[cursor + 9], moov_data[cursor + 10], moov_data[cursor + 11],
                moov_data[cursor + 12], moov_data[cursor + 13], moov_data[cursor + 14], moov_data[cursor + 15],
            ]);
            (usize::try_from(largesize).unwrap_or(usize::MAX), 16usize)
        } else {
            (size_u32 as usize, 8usize)
        };

        let box_end = match cursor.checked_add(box_size) {
            Some(e) => e,
            None => break,
        };

        if box_size < header_size || box_end > moov_data.len() {
            break;
        }

        let payload_start = match cursor.checked_add(header_size) {
            Some(p) => p,
            None => break,
        };
        let payload = &moov_data[payload_start..box_end];

        if fourcc == b"mvhd" {
            if let Some(dur) = parse_mvhd(payload) {
                duration_secs = Some(dur);
            }
        } else if fourcc == b"trak" {
            let (v_codec, a_codec, w, h) = parse_trak(payload);
            if let Some(vc) = v_codec {
                video_codec = Some(vc);
            }
            if let Some(ac) = a_codec {
                audio_codec = Some(ac);
            }
            if let (Some(tw), Some(th)) = (w, h) {
                width = Some(tw);
                height = Some(th);
            }
        }

        cursor = box_end;
    }

    (video_codec, audio_codec, width, height, duration_secs)
}

fn parse_mvhd(payload: &[u8]) -> Option<f64> {
    if payload.len() < 24 {
        return None;
    }
    let version = payload[0];
    if version == 1 {
        if payload.len() < 32 {
            return None;
        }
        // version (1) + flags (3) + creation (8) + modification (8)
        let timescale = u32::from_be_bytes([payload[20], payload[21], payload[22], payload[23]]) as f64;
        let duration = u64::from_be_bytes([
            payload[24], payload[25], payload[26], payload[27],
            payload[28], payload[29], payload[30], payload[31],
        ]) as f64;
        if timescale > 0.0 {
            return Some(duration / timescale);
        }
    } else {
        // version (1) + flags (3) + creation (4) + modification (4)
        let timescale = u32::from_be_bytes([payload[12], payload[13], payload[14], payload[15]]) as f64;
        let duration = u32::from_be_bytes([payload[16], payload[17], payload[18], payload[19]]) as f64;
        if timescale > 0.0 {
            return Some(duration / timescale);
        }
    }
    None
}

fn parse_trak(payload: &[u8]) -> (Option<String>, Option<String>, Option<u32>, Option<u32>) {
    let mut video_codec = None;
    let mut audio_codec = None;
    let mut width = None;
    let mut height = None;

    // Traverse boxes in trak
    let mut cursor = 0usize;
    while cursor + 8 <= payload.len() {
        let size = u32::from_be_bytes([payload[cursor], payload[cursor + 1], payload[cursor + 2], payload[cursor + 3]]) as usize;
        let fourcc = &payload[cursor + 4..cursor + 8];
        let next_cursor = match cursor.checked_add(size) {
            Some(c) => c,
            None => break,
        };
        if size < 8 || next_cursor > payload.len() {
            break;
        }
        let box_data = &payload[cursor + 8..next_cursor];

        if fourcc == b"tkhd" && !box_data.is_empty() {
            let version = box_data[0];
            let offset = if version == 1 { 88 } else { 76 };
            if box_data.len() >= offset + 8 {
                let w = u32::from_be_bytes([box_data[offset], box_data[offset + 1], box_data[offset + 2], box_data[offset + 3]]) >> 16;
                let h = u32::from_be_bytes([box_data[offset + 4], box_data[offset + 5], box_data[offset + 6], box_data[offset + 7]]) >> 16;
                if w > 0 && h > 0 {
                    width = Some(w);
                    height = Some(h);
                }
            }
        } else if fourcc == b"mdia" {
            let (vc, ac, mw, mh) = parse_mdia(box_data);
            if let Some(c) = vc { video_codec = Some(c); }
            if let Some(c) = ac { audio_codec = Some(c); }
            if width.is_none() && mw.is_some() { width = mw; }
            if height.is_none() && mh.is_some() { height = mh; }
        }

        cursor = next_cursor;
    }

    (video_codec, audio_codec, width, height)
}

fn parse_mdia(payload: &[u8]) -> (Option<String>, Option<String>, Option<u32>, Option<u32>) {
    let mut video_codec = None;
    let mut audio_codec = None;
    let mut width = None;
    let mut height = None;

    let mut cursor = 0usize;
    while cursor + 8 <= payload.len() {
        let size = u32::from_be_bytes([payload[cursor], payload[cursor + 1], payload[cursor + 2], payload[cursor + 3]]) as usize;
        let fourcc = &payload[cursor + 4..cursor + 8];
        let next_cursor = match cursor.checked_add(size) {
            Some(c) => c,
            None => break,
        };
        if size < 8 || next_cursor > payload.len() {
            break;
        }
        let box_data = &payload[cursor + 8..next_cursor];

        if fourcc == b"minf" {
            let (vc, ac, mw, mh) = parse_minf(box_data);
            if let Some(c) = vc { video_codec = Some(c); }
            if let Some(c) = ac { audio_codec = Some(c); }
            if let (Some(w), Some(h)) = (mw, mh) {
                width = Some(w);
                height = Some(h);
            }
        }

        cursor = next_cursor;
    }

    (video_codec, audio_codec, width, height)
}

fn parse_minf(payload: &[u8]) -> (Option<String>, Option<String>, Option<u32>, Option<u32>) {
    let mut cursor = 0usize;
    while cursor + 8 <= payload.len() {
        let size = u32::from_be_bytes([payload[cursor], payload[cursor + 1], payload[cursor + 2], payload[cursor + 3]]) as usize;
        let fourcc = &payload[cursor + 4..cursor + 8];
        let next_cursor = match cursor.checked_add(size) {
            Some(c) => c,
            None => break,
        };
        if size < 8 || next_cursor > payload.len() {
            break;
        }
        let box_data = &payload[cursor + 8..next_cursor];

        if fourcc == b"stbl" {
            return parse_stbl(box_data);
        }

        cursor = next_cursor;
    }
    (None, None, None, None)
}

fn parse_stbl(payload: &[u8]) -> (Option<String>, Option<String>, Option<u32>, Option<u32>) {
    let mut cursor = 0usize;
    while cursor + 8 <= payload.len() {
        let size = u32::from_be_bytes([payload[cursor], payload[cursor + 1], payload[cursor + 2], payload[cursor + 3]]) as usize;
        let fourcc = &payload[cursor + 4..cursor + 8];
        let next_cursor = match cursor.checked_add(size) {
            Some(c) => c,
            None => break,
        };
        if size < 8 || next_cursor > payload.len() {
            break;
        }
        let box_data = &payload[cursor + 8..next_cursor];

        if fourcc == b"stsd" {
            return parse_stsd(box_data);
        }

        cursor = next_cursor;
    }
    (None, None, None, None)
}

fn parse_stsd(payload: &[u8]) -> (Option<String>, Option<String>, Option<u32>, Option<u32>) {
    // version (1) + flags (3) + entry_count (4) = 8 bytes
    if payload.len() < 8 {
        return (None, None, None, None);
    }
    let entry_count = u32::from_be_bytes([payload[4], payload[5], payload[6], payload[7]]) as usize;
    let mut cursor = 8usize;

    let mut video_codec = None;
    let mut audio_codec = None;
    let mut width = None;
    let mut height = None;

    for _ in 0..entry_count {
        if cursor + 8 > payload.len() {
            break;
        }
        let entry_size = u32::from_be_bytes([payload[cursor], payload[cursor + 1], payload[cursor + 2], payload[cursor + 3]]) as usize;
        let format_fourcc = &payload[cursor + 4..cursor + 8];
        let format_str = String::from_utf8_lossy(format_fourcc).to_string();

        let next_cursor = match cursor.checked_add(entry_size) {
            Some(c) => c,
            None => break,
        };
        if entry_size < 8 || next_cursor > payload.len() {
            break;
        }

        let entry_payload = &payload[cursor + 8..next_cursor];

        // Identify video formats
        let is_video = matches!(
            format_fourcc,
            b"avc1" | b"avc3" | b"hvc1" | b"hev1" | b"dvh1" | b"dvhe" | b"av01" | b"vp09" | b"vp08" | b"mp4v"
        );
        let is_audio = matches!(
            format_fourcc,
            b"mp4a" | b"ac-3" | b"ec-3" | b"opus" | b"alac" | b"flac" | b"samr" | b"sawb"
        );

        if is_video {
            video_codec = Some(format_str);
            // VisualSampleEntry: 6 reserved bytes + 2 data_ref_index + 16 pre_defined/reserved + 2 width + 2 height = 28 bytes
            if entry_payload.len() >= 28 {
                let w = u16::from_be_bytes([entry_payload[24], entry_payload[25]]) as u32;
                let h = u16::from_be_bytes([entry_payload[26], entry_payload[27]]) as u32;
                if w > 0 && h > 0 {
                    width = Some(w);
                    height = Some(h);
                }
            }
        } else if is_audio {
            audio_codec = Some(format_str);
        }

        cursor = next_cursor;
    }

    (video_codec, audio_codec, width, height)
}

/// Parses EBML header to detect WebM or Matroska container and simple CodecIDs
pub fn parse_ebml(data: &[u8]) -> Option<(String, Option<String>, Option<String>)> {
    if data.len() < 4 || data[0..4] != [0x1A, 0x45, 0xDF, 0xA3] {
        return None;
    }

    // Search for DocType (0x4282)
    let mut doc_type = "matroska".to_string();
    if let Some(pos) = data.windows(2).position(|w| w == [0x42, 0x82]) {
        let rem = &data[pos + 2..];
        if !rem.is_empty() {
            let len = (rem[0] & 0x7F) as usize;
            if rem.len() >= 1 + len {
                let name = String::from_utf8_lossy(&rem[1..1 + len]).trim().to_lowercase();
                if !name.is_empty() {
                    doc_type = name;
                }
            }
        }
    }

    // Try scanning for CodecID (0x86)
    let mut video_codec = None;
    let mut audio_codec = None;
    for i in 0..data.len().saturating_sub(10) {
        if data[i] == 0x86 {
            let len = (data[i + 1] & 0x7F) as usize;
            if len > 0 && len < 64 && i + 2 + len <= data.len() {
                let val = String::from_utf8_lossy(&data[i + 2..i + 2 + len]).to_string();
                if val.starts_with("V_") && video_codec.is_none() {
                    video_codec = Some(val);
                } else if val.starts_with("A_") && audio_codec.is_none() {
                    audio_codec = Some(val);
                }
            }
        }
    }

    Some((doc_type, video_codec, audio_codec))
}

/// Evaluates WebView playability based on discovered container, video and audio codecs
pub fn evaluate_webview_playability(
    container: &str,
    video_codec: Option<&str>,
    audio_codec: Option<&str>,
) -> (bool, String) {
    let container_lower = container.to_lowercase();
    if container_lower == "matroska" || container_lower == "mkv" {
        return (
            false,
            "Matroska (.mkv) container is not supported natively by Android System WebView. ExoPlayer Native Player recommended.".to_string(),
        );
    }
    if container_lower == "avi" || container_lower == "video/x-msvideo" {
        return (
            false,
            "AVI container is not supported in system WebView.".to_string(),
        );
    }
    if container_lower == "ts" || container_lower == "video/mp2t" {
        return (
            false,
            "MPEG-TS (.ts) container is not supported in system WebView.".to_string(),
        );
    }

    if let Some(vc) = video_codec {
        let vc_lower = vc.to_lowercase();
        if vc_lower.contains("hvc1") || vc_lower.contains("hev1") || vc_lower.contains("hevc") {
            return (
                false,
                format!("HEVC (H.265 / {vc}) video track is not decoded by Android System WebView. ExoPlayer Native Player recommended."),
            );
        }
        if vc_lower.contains("dvh1") || vc_lower.contains("dvhe") {
            return (
                false,
                "Dolby Vision track cannot be decoded by system WebView.".to_string(),
            );
        }
        if vc_lower.contains("av01") || vc_lower.contains("av1") {
            return (
                false,
                "AV1 video track is not reliably supported in system WebView.".to_string(),
            );
        }
    }

    if let Some(ac) = audio_codec {
        let ac_lower = ac.to_lowercase();
        if ac_lower.contains("ac-3") || ac_lower.contains("ec-3") || ac_lower.contains("ac3") || ac_lower.contains("eac3") {
            return (
                false,
                format!("Dolby AC-3/E-AC-3 ({ac}) audio track is not supported by Android WebView without hardware license."),
            );
        }
        if ac_lower.contains("dts") {
            return (
                false,
                format!("DTS ({ac}) audio track is not supported in system WebView."),
            );
        }
    }

    (true, "Video track appears standard (H.264 / AAC / WebM) and compatible with system WebView.".to_string())
}

/// Computes average bitrate (bps) and megapixels (MP) from media metadata
pub fn calculate_bitrate_and_mp(
    total_size_bytes: u64,
    duration_secs: Option<f64>,
    width: Option<u32>,
    height: Option<u32>,
) -> (Option<u64>, Option<f64>) {
    let bitrate_bps = duration_secs.and_then(|dur| {
        if dur > 0.0 && total_size_bytes > 0 {
            Some((total_size_bytes as f64 * 8.0 / dur).round() as u64)
        } else {
            None
        }
    });

    let megapixels = match (width, height) {
        (Some(w), Some(h)) if w > 0 && h > 0 => {
            Some(((w as f64 * h as f64) / 1_000_000.0 * 100.0).round() / 100.0)
        }
        _ => None,
    };

    (bitrate_bps, megapixels)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build_box(fourcc: &[u8; 4], payload: &[u8]) -> Vec<u8> {
        let size = (8 + payload.len()) as u32;
        let mut b = Vec::new();
        b.extend_from_slice(&size.to_be_bytes());
        b.extend_from_slice(fourcc);
        b.extend_from_slice(payload);
        b
    }

    #[test]
    fn test_calculate_bitrate_and_mp() {
        // 1080p video: 1920x1080, 150 MB (157,286,400 bytes), 60 seconds -> ~20.97 Mbps
        let total_size = 157_286_400u64;
        let (bitrate, mp) = calculate_bitrate_and_mp(total_size, Some(60.0), Some(1920), Some(1080));
        assert!(bitrate.is_some());
        let bps = bitrate.unwrap();
        assert_eq!(bps, 20_971_520); // 157286400 * 8 / 60
        assert_eq!(mp, Some(2.07));

        // 4K video: 3840x2160, 1 GB (1,073,741,824 bytes), 120 seconds -> ~71.58 Mbps
        let (bitrate_4k, mp_4k) = calculate_bitrate_and_mp(1_073_741_824, Some(120.0), Some(3840), Some(2160));
        assert_eq!(mp_4k, Some(8.29));
        assert!(bitrate_4k.unwrap() > 70_000_000);

        // Missing duration (e.g. EBML initial state) -> None bitrate
        let (bitrate_ebml, mp_ebml) = calculate_bitrate_and_mp(100_000_000, None, Some(1280), Some(720));
        assert!(bitrate_ebml.is_none());
        assert_eq!(mp_ebml, Some(0.92));
    }

    #[test]
    fn test_faststart_mp4_box_parsing() {
        // ftyp + moov + mdat
        let mut data = Vec::new();
        data.extend_from_slice(&build_box(b"ftyp", b"isom\0\0\x02\0isommp41"));
        data.extend_from_slice(&build_box(b"moov", &[0u8; 32]));
        data.extend_from_slice(&build_box(b"mdat", &[0u8; 64]));

        let boxes = parse_isobmff_boxes(&data, 0, data.len() as u64);
        assert_eq!(boxes.len(), 3);
        assert_eq!(boxes[0].name(), "ftyp");
        assert_eq!(boxes[1].name(), "moov");
        assert_eq!(boxes[2].name(), "mdat");
        assert!(boxes[1].offset < boxes[2].offset); // moov before mdat => faststart!
    }

    #[test]
    fn test_moov_at_end_parsing() {
        // ftyp + mdat + moov
        let mut data = Vec::new();
        data.extend_from_slice(&build_box(b"ftyp", b"isom\0\0\x02\0isommp41"));
        data.extend_from_slice(&build_box(b"mdat", &[0u8; 100]));
        data.extend_from_slice(&build_box(b"moov", &[0u8; 40]));

        let boxes = parse_isobmff_boxes(&data, 0, data.len() as u64);
        assert_eq!(boxes.len(), 3);
        assert_eq!(boxes[0].name(), "ftyp");
        assert_eq!(boxes[1].name(), "mdat");
        assert_eq!(boxes[2].name(), "moov");
        assert!(boxes[2].offset > boxes[1].offset); // moov after mdat => moov at end!
    }

    #[test]
    fn test_hevc_unplayable_flag() {
        let (playable, reason) = evaluate_webview_playability("mp4", Some("hvc1"), Some("mp4a"));
        assert!(!playable);
        assert!(reason.contains("HEVC"));

        let (playable, _) = evaluate_webview_playability("mp4", Some("avc1"), Some("mp4a"));
        assert!(playable);

        let (mkv_playable, _) = evaluate_webview_playability("matroska", Some("avc1"), Some("mp4a"));
        assert!(!mkv_playable);
    }

    #[test]
    fn test_tkhd_dimensions_parsing() {
        // Build version 0 tkhd box (84 bytes payload)
        let mut tkhd_payload = vec![0u8; 84];
        tkhd_payload[0] = 0; // version 0
        // width 1920 at offset 76: (1920 << 16)
        let w_fixed = 1920u32 << 16;
        tkhd_payload[76..80].copy_from_slice(&w_fixed.to_be_bytes());
        // height 1080 at offset 80: (1080 << 16)
        let h_fixed = 1080u32 << 16;
        tkhd_payload[80..84].copy_from_slice(&h_fixed.to_be_bytes());

        let tkhd_box = build_box(b"tkhd", &tkhd_payload);
        let (_, _, w, h) = parse_trak(&tkhd_box);
        assert_eq!(w, Some(1920));
        assert_eq!(h, Some(1080));
    }
}
