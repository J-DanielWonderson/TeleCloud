use std::time::{SystemTime, UNIX_EPOCH};
use grammers_mtsender::InvocationError;
use rand::Rng;
use tokio::time::{sleep, Duration};

/// Helper to get current Unix timestamp in seconds
pub fn current_unix_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Injects a randomized delay between 2,500ms and 4,500ms before chunk upload
/// or high-frequency Telegram RPC operations to prevent rate limiting.
pub async fn inject_jitter() {
    let jitter_ms = {
        let mut rng = rand::thread_rng();
        rng.gen_range(2500..=4500)
    };
    sleep(Duration::from_millis(jitter_ms)).await;
}

/// Inspects a Telegram RPC error or InvocationError to determine if it is a FLOOD_WAIT error.
/// If so, extracts the required wait duration in seconds.
pub fn extract_flood_wait_secs(err: &InvocationError) -> Option<u64> {
    match err {
        InvocationError::Rpc(rpc_err) => {
            // grammers-mtsender normalizes "FLOOD_WAIT_X" to name="FLOOD_WAIT" with value=Some(X)
            if rpc_err.name == "FLOOD_WAIT" {
                return Some(rpc_err.value.unwrap_or(30) as u64);
            }

            if rpc_err.name.starts_with("FLOOD_WAIT") {
                if let Some(val) = rpc_err.value {
                    return Some(val as u64);
                }
                // Try parsing numerical suffix if present
                let suffix = rpc_err.name.trim_start_matches("FLOOD_WAIT_").trim_start_matches("FLOOD_WAIT");
                if let Ok(num) = suffix.parse::<u64>() {
                    return Some(num);
                }
                return Some(30);
            }
            None
        }
        _ => parse_flood_wait_from_str(&err.to_string()),
    }
}

/// Parses FLOOD_WAIT duration from raw error string
pub fn parse_flood_wait_from_str(err_str: &str) -> Option<u64> {
    if let Some(pos) = err_str.find("FLOOD_WAIT_") {
        let rest = &err_str[pos + "FLOOD_WAIT_".len()..];
        let num_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
        if let Ok(num) = num_str.parse::<u64>() {
            return Some(num);
        }
        return Some(30);
    } else if err_str.contains("FLOOD_WAIT") {
        return Some(30);
    }
    None
}

/// Calculates cooldown timestamp: current_time + X + 2 seconds buffer (Rule 5)
pub fn calculate_cooldown_timestamp(wait_secs: u64) -> i64 {
    current_unix_timestamp() + wait_secs as i64 + 2
}

/// Checks whether an InvocationError indicates a flood wait condition
pub fn is_flood_wait(err: &InvocationError) -> bool {
    extract_flood_wait_secs(err).is_some()
}
