// TeleCloud Vault — RusqliteSession MTProto Session Storage
// Replaces libsql with bundled rusqlite to eliminate MSVC duplicate symbol link collisions.

use std::collections::HashMap;
use std::fmt;
use std::net::{AddrParseError, Ipv4Addr, Ipv6Addr, SocketAddrV4, SocketAddrV6};
use std::path::Path;
use std::sync::{Arc, Mutex};

use grammers_session::{
    types::{
        ChannelKind, ChannelState, DcOption, PeerAuth, PeerId, PeerInfo, PeerKind, UpdateState,
        UpdatesState,
    },
    BoxFuture, Session,
};
use rusqlite::{params, Connection, OptionalExtension};

pub const DEFAULT_DC: i32 = 2;

const fn ipv4(a: u8, b: u8, c: u8, d: u8) -> SocketAddrV4 {
    SocketAddrV4::new(Ipv4Addr::new(a, b, c, d), 443)
}

const fn ipv6(a: u16, b: u16, c: u16, d: u16, e: u16, f: u16, g: u16, h: u16) -> SocketAddrV6 {
    SocketAddrV6::new(Ipv6Addr::new(a, b, c, d, e, f, g, h), 443, 0, 0)
}

pub const KNOWN_DC_OPTIONS: [DcOption; 5] = [
    DcOption {
        id: 1,
        ipv4: ipv4(149, 154, 175, 53),
        ipv6: ipv6(0x2001, 0xb28, 0xf23d, 0xf001, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 2,
        ipv4: ipv4(149, 154, 167, 41),
        ipv6: ipv6(0x2001, 0x67c, 0x4e8, 0xf002, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 3,
        ipv4: ipv4(149, 154, 175, 100),
        ipv6: ipv6(0x2001, 0xb28, 0xf23d, 0xf003, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 4,
        ipv4: ipv4(149, 154, 167, 92),
        ipv6: ipv6(0x2001, 0x67c, 0x4e8, 0xf004, 0, 0, 0, 0xa),
        auth_key: None,
    },
    DcOption {
        id: 5,
        ipv4: ipv4(91, 108, 56, 104),
        ipv6: ipv6(0x2001, 0xb28, 0xf23f, 0xf005, 0, 0, 0, 0xa),
        auth_key: None,
    },
];

#[repr(u8)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum PeerSubtype {
    UserBot = 1,
    UserSelf = 2,
    UserSelfBot = 3,
    Megagroup = 4,
    Broadcast = 8,
    Gigagroup = 12,
    Community = 16,
}

#[derive(Debug)]
pub enum RusqliteSessionError {
    Poisoned,
    AddrParse(AddrParseError),
    Sql(rusqlite::Error),
    InvalidAuthKeyLength(usize),
}

impl std::error::Error for RusqliteSessionError {}

impl fmt::Display for RusqliteSessionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Poisoned => write!(f, "session lock is poisoned"),
            Self::AddrParse(e) => write!(f, "invalid socket address: {e}"),
            Self::Sql(e) => write!(f, "sqlite error: {e}"),
            Self::InvalidAuthKeyLength(len) => {
                write!(f, "invalid auth_key length: expected 256, got {len}")
            }
        }
    }
}

impl From<AddrParseError> for RusqliteSessionError {
    fn from(err: AddrParseError) -> Self {
        Self::AddrParse(err)
    }
}

impl From<rusqlite::Error> for RusqliteSessionError {
    fn from(err: rusqlite::Error) -> Self {
        Self::Sql(err)
    }
}

struct Cache {
    home_dc: i32,
    dc_options: HashMap<i32, DcOption>,
}

#[derive(Clone)]
pub struct RusqliteSession {
    conn: Arc<Mutex<Connection>>,
    cache: Arc<Mutex<Cache>>,
}

impl RusqliteSession {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, RusqliteSessionError> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS dc_home (
                 dc_id INTEGER NOT NULL PRIMARY KEY
             );
             CREATE TABLE IF NOT EXISTS dc_option (
                 dc_id INTEGER NOT NULL PRIMARY KEY,
                 ipv4 TEXT NOT NULL,
                 ipv6 TEXT NOT NULL,
                 auth_key BLOB
             );
             CREATE TABLE IF NOT EXISTS peer_info (
                 peer_id INTEGER NOT NULL PRIMARY KEY,
                 hash INTEGER,
                 subtype INTEGER
             );
             CREATE TABLE IF NOT EXISTS update_state (
                 pts INTEGER NOT NULL,
                 qts INTEGER NOT NULL,
                 date INTEGER NOT NULL,
                 seq INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS channel_state (
                 peer_id INTEGER NOT NULL PRIMARY KEY,
                 pts INTEGER NOT NULL
             );",
        )?;

        let home_dc: i32 = conn
            .query_row("SELECT dc_id FROM dc_home LIMIT 1", [], |row| row.get(0))
            .optional()?
            .unwrap_or(DEFAULT_DC);

        let dc_options = {
            let mut stmt = conn.prepare("SELECT dc_id, ipv4, ipv6, auth_key FROM dc_option")?;
            let dc_options_rows = stmt.query_map([], |row| {
                let id: i32 = row.get(0)?;
                let ipv4_str: String = row.get(1)?;
                let ipv6_str: String = row.get(2)?;
                let auth_key_raw: Option<Vec<u8>> = row.get(3)?;
                Ok((id, ipv4_str, ipv6_str, auth_key_raw))
            })?;

            let mut map = HashMap::new();
            for item in dc_options_rows {
                let (id, ipv4_str, ipv6_str, auth_key_raw) = item?;
                let ipv4: SocketAddrV4 = ipv4_str.parse().map_err(RusqliteSessionError::AddrParse)?;
                let ipv6: SocketAddrV6 = ipv6_str.parse().map_err(RusqliteSessionError::AddrParse)?;
                let auth_key = match auth_key_raw {
                    Some(bytes) => {
                        let len = bytes.len();
                        let key: [u8; 256] = bytes
                            .try_into()
                            .map_err(|_| RusqliteSessionError::InvalidAuthKeyLength(len))?;
                        Some(key)
                    }
                    None => None,
                };
                map.insert(
                    id,
                    DcOption {
                        id,
                        ipv4,
                        ipv6,
                        auth_key,
                    },
                );
            }
            map
        };

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            cache: Arc::new(Mutex::new(Cache {
                home_dc,
                dc_options,
            })),
        })
    }
}

impl Session for RusqliteSession {
    type Error = RusqliteSessionError;

    fn home_dc_id(&self) -> Result<i32, Self::Error> {
        Ok(self
            .cache
            .lock()
            .map_err(|_| RusqliteSessionError::Poisoned)?
            .home_dc)
    }

    fn set_home_dc_id(&self, dc_id: i32) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        let cache = Arc::clone(&self.cache);
        Box::pin(async move {
            {
                let mut guard = cache.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
                guard.home_dc = dc_id;
            }
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            conn_guard.execute("DELETE FROM dc_home", [])?;
            conn_guard.execute("INSERT INTO dc_home (dc_id) VALUES (?1)", params![dc_id])?;
            Ok(())
        })
    }

    fn dc_option(&self, dc_id: i32) -> Result<Option<DcOption>, Self::Error> {
        Ok(self
            .cache
            .lock()
            .map_err(|_| RusqliteSessionError::Poisoned)?
            .dc_options
            .get(&dc_id)
            .cloned()
            .or_else(|| {
                KNOWN_DC_OPTIONS
                    .iter()
                    .find(|dc_option| dc_option.id == dc_id)
                    .cloned()
            }))
    }

    fn set_dc_option(&self, dc_option: &DcOption) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        let cache = Arc::clone(&self.cache);
        let dc_option = dc_option.clone();
        Box::pin(async move {
            {
                let mut guard = cache.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
                guard.dc_options.insert(dc_option.id, dc_option.clone());
            }
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let auth_key_slice = dc_option.auth_key.as_ref().map(|k| k.as_slice());
            conn_guard.execute(
                "INSERT OR REPLACE INTO dc_option (dc_id, ipv4, ipv6, auth_key) VALUES (?1, ?2, ?3, ?4)",
                params![
                    dc_option.id,
                    dc_option.ipv4.to_string(),
                    dc_option.ipv6.to_string(),
                    auth_key_slice
                ],
            )?;
            Ok(())
        })
    }

    fn peer(&self, peer: PeerId) -> BoxFuture<'_, Result<Option<PeerInfo>, Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;

            let map_row = |row: &rusqlite::Row| -> rusqlite::Result<PeerInfo> {
                let id_val: i64 = row.get(0)?;
                let hash_val: Option<i64> = row.get(1)?;
                let subtype_val: Option<i64> = row.get(2)?;
                let subtype = subtype_val.map(|s| s as u8);

                let auth = hash_val.map(PeerAuth::from_hash);

                Ok(match peer.kind() {
                    PeerKind::User => PeerInfo::User {
                        id: PeerId::user_unchecked(id_val).bare_id_unchecked(),
                        auth,
                        bot: subtype.map(|s| s & (PeerSubtype::UserBot as u8) != 0),
                        is_self: subtype.map(|s| s & (PeerSubtype::UserSelf as u8) != 0),
                    },
                    PeerKind::Chat => PeerInfo::Chat {
                        id: peer.bare_id_unchecked(),
                    },
                    PeerKind::Channel => PeerInfo::Channel {
                        id: peer.bare_id_unchecked(),
                        auth,
                        kind: subtype.and_then(|s| {
                            if (s & PeerSubtype::Gigagroup as u8) == PeerSubtype::Gigagroup as u8 {
                                Some(ChannelKind::Gigagroup)
                            } else if s & PeerSubtype::Broadcast as u8 != 0 {
                                Some(ChannelKind::Broadcast)
                            } else if s & PeerSubtype::Megagroup as u8 != 0 {
                                Some(ChannelKind::Megagroup)
                            } else {
                                None
                            }
                        }),
                    },
                })
            };

            if let Some(peer_id) = peer.bot_api_dialog_id() {
                conn_guard
                    .query_row(
                        "SELECT peer_id, hash, subtype FROM peer_info WHERE peer_id = ?1 LIMIT 1",
                        params![peer_id],
                        map_row,
                    )
                    .optional()
                    .map_err(RusqliteSessionError::Sql)
            } else {
                conn_guard
                    .query_row(
                        "SELECT peer_id, hash, subtype FROM peer_info WHERE (subtype & ?1) != 0 LIMIT 1",
                        params![PeerSubtype::UserSelf as i64],
                        map_row,
                    )
                    .optional()
                    .map_err(RusqliteSessionError::Sql)
            }
        })
    }

    fn cache_peer(&self, peer: PeerInfo) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        let peer_clone = peer.clone();
        Box::pin(async move {
            let mut final_peer = peer_clone;
            if let Some(mut existing) = self.peer(final_peer.id()).await? {
                existing.extend_info(&final_peer);
                final_peer = existing;
            }

            let subtype = match &final_peer {
                PeerInfo::User { bot, is_self, .. } => {
                    match (bot.unwrap_or_default(), is_self.unwrap_or_default()) {
                        (true, true) => Some(PeerSubtype::UserSelfBot),
                        (true, false) => Some(PeerSubtype::UserBot),
                        (false, true) => Some(PeerSubtype::UserSelf),
                        (false, false) => None,
                    }
                }
                PeerInfo::Chat { .. } => None,
                PeerInfo::Channel { kind, .. } => kind.map(|k| match k {
                    ChannelKind::Megagroup => PeerSubtype::Megagroup,
                    ChannelKind::Broadcast => PeerSubtype::Broadcast,
                    ChannelKind::Gigagroup => PeerSubtype::Gigagroup,
                    ChannelKind::Community => PeerSubtype::Community,
                }),
            };

            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let peer_id = final_peer.id().bot_api_dialog_id_unchecked();
            let hash = final_peer.auth().map(|a| a.hash());
            let subtype_num = subtype.map(|s| s as i64);

            conn_guard.execute(
                "INSERT OR REPLACE INTO peer_info (peer_id, hash, subtype) VALUES (?1, ?2, ?3)",
                params![peer_id, hash, subtype_num],
            )?;
            Ok(())
        })
    }

    fn cache_peers(&self, peers: Vec<PeerInfo>) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let mut extended_peers = Vec::with_capacity(peers.len());
            for peer in peers {
                if let Some(mut existing) = self.peer(peer.id()).await? {
                    existing.extend_info(&peer);
                    extended_peers.push(existing);
                } else {
                    extended_peers.push(peer);
                }
            }

            let mut conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let tx = conn_guard.transaction()?;
            for p in extended_peers {
                let subtype = match &p {
                    PeerInfo::User { bot, is_self, .. } => {
                        match (bot.unwrap_or_default(), is_self.unwrap_or_default()) {
                            (true, true) => Some(PeerSubtype::UserSelfBot),
                            (true, false) => Some(PeerSubtype::UserBot),
                            (false, true) => Some(PeerSubtype::UserSelf),
                            (false, false) => None,
                        }
                    }
                    PeerInfo::Chat { .. } => None,
                    PeerInfo::Channel { kind, .. } => kind.map(|k| match k {
                        ChannelKind::Megagroup => PeerSubtype::Megagroup,
                        ChannelKind::Broadcast => PeerSubtype::Broadcast,
                        ChannelKind::Gigagroup => PeerSubtype::Gigagroup,
                        ChannelKind::Community => PeerSubtype::Community,
                    }),
                };
                let peer_id = p.id().bot_api_dialog_id_unchecked();
                let hash = p.auth().map(|a| a.hash());
                let subtype_num = subtype.map(|s| s as i64);

                tx.execute(
                    "INSERT OR REPLACE INTO peer_info (peer_id, hash, subtype) VALUES (?1, ?2, ?3)",
                    params![peer_id, hash, subtype_num],
                )?;
            }
            tx.commit()?;
            Ok(())
        })
    }

    fn updates_state(&self) -> BoxFuture<'_, Result<UpdatesState, Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;

            let state_opt = conn_guard
                .query_row(
                    "SELECT pts, qts, date, seq FROM update_state LIMIT 1",
                    [],
                    |row| {
                        Ok(UpdatesState {
                            pts: row.get(0)?,
                            qts: row.get(1)?,
                            date: row.get(2)?,
                            seq: row.get(3)?,
                            channels: Vec::new(),
                        })
                    },
                )
                .optional()?;

            let mut state = state_opt.unwrap_or_default();

            let mut stmt = conn_guard.prepare("SELECT peer_id, pts FROM channel_state")?;
            let channels_iter = stmt.query_map([], |row| {
                Ok(ChannelState {
                    id: row.get(0)?,
                    pts: row.get(1)?,
                })
            })?;

            for ch in channels_iter {
                state.channels.push(ch?);
            }

            Ok(state)
        })
    }

    fn set_update_state(
        &self,
        update: UpdateState,
    ) -> BoxFuture<'_, Result<(), Self::Error>> {
        let conn = Arc::clone(&self.conn);
        Box::pin(async move {
            let mut conn_guard = conn.lock().map_err(|_| RusqliteSessionError::Poisoned)?;
            let tx = conn_guard.transaction()?;

            match update {
                UpdateState::All(updates_state) => {
                    tx.execute("DELETE FROM update_state", [])?;
                    tx.execute(
                        "INSERT INTO update_state (pts, qts, date, seq) VALUES (?1, ?2, ?3, ?4)",
                        params![
                            updates_state.pts,
                            updates_state.qts,
                            updates_state.date,
                            updates_state.seq
                        ],
                    )?;
                    tx.execute("DELETE FROM channel_state", [])?;
                    for ch in updates_state.channels {
                        tx.execute(
                            "INSERT INTO channel_state (peer_id, pts) VALUES (?1, ?2)",
                            params![ch.id, ch.pts],
                        )?;
                    }
                }
                UpdateState::Primary { pts, date, seq } => {
                    let has_state: bool = tx
                        .query_row("SELECT 1 FROM update_state LIMIT 1", [], |_| Ok(true))
                        .optional()?
                        .unwrap_or(false);

                    if has_state {
                        tx.execute(
                            "UPDATE update_state SET pts = ?1, date = ?2, seq = ?3",
                            params![pts, date, seq],
                        )?;
                    } else {
                        tx.execute(
                            "INSERT INTO update_state (pts, qts, date, seq) VALUES (?1, 0, ?2, ?3)",
                            params![pts, date, seq],
                        )?;
                    }
                }
                UpdateState::Secondary { qts } => {
                    let has_state: bool = tx
                        .query_row("SELECT 1 FROM update_state LIMIT 1", [], |_| Ok(true))
                        .optional()?
                        .unwrap_or(false);

                    if has_state {
                        tx.execute(
                            "UPDATE update_state SET qts = ?1",
                            params![qts],
                        )?;
                    } else {
                        tx.execute(
                            "INSERT INTO update_state (pts, qts, date, seq) VALUES (0, ?1, 0, 0)",
                            params![qts],
                        )?;
                    }
                }
                UpdateState::Channel { id, pts } => {
                    tx.execute(
                        "INSERT OR REPLACE INTO channel_state (peer_id, pts) VALUES (?1, ?2)",
                        params![id, pts],
                    )?;
                }
            }

            tx.commit()?;
            Ok(())
        })
    }
}
