use std::path::Path;
use std::str::FromStr;

use tokio;
use tonic::IntoRequest;
use tonic::transport::{Channel, ClientTlsConfig};

use zcash_client_backend::data_api::wallet::{self, ConfirmationsPolicy};
use zcash_client_backend::data_api::{AccountBirthday, AccountPurpose, WalletRead, WalletWrite};
use zcash_client_backend::keys::UnifiedFullViewingKey;
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_backend::proto::service::{self, BlockId, ChainSpec};
use zcash_client_backend::sync::run;
use zcash_client_memory::MemBlockCache;
use zcash_client_sqlite::WalletDb;
use zcash_client_sqlite::util::SystemClock;
use zcash_client_sqlite::wallet::init::init_wallet_db;
use zcash_protocol::consensus::{TEST_NETWORK, TestNetwork};

use chrono::{DateTime, Utc};
use rand_core::OsRng;
use rusqlite::Connection;

// DEĞİŞİKLİK 2: TestNetwork tipi kullanıldı
pub struct ReadOnlyAccount {
    db: WalletDb<Connection, TestNetwork, SystemClock, OsRng>,
    client: CompactTxStreamerClient<Channel>,
    db_path: String,
}

impl ReadOnlyAccount {
    pub fn new(
        db: WalletDb<Connection, TestNetwork, SystemClock, OsRng>,
        client: CompactTxStreamerClient<Channel>,
        db_path: String,
    ) -> Self {
        ReadOnlyAccount {
            db,
            client,
            db_path,
        }
    }

    pub async fn init(
        &mut self,
        ufvk_str: &str,
        birthday_height: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // DEĞİŞİKLİK 3: TEST_NETWORK kullanıldı
        let ufvk = UnifiedFullViewingKey::decode(&TEST_NETWORK, ufvk_str).map_err(|e| {
            format!(
                "Viewing Key formatı hatalı (Mainnet key olmalı 'uview...'): {}",
                e
            )
        })?;

        println!("📅 Birthday bilgisi sunucudan çekiliyor...");

        let request = service::BlockId {
            height: (birthday_height - 1).into(),
            ..Default::default()
        };

        let response = self.client.get_tree_state(request).await?;
        let birthday = AccountBirthday::from_treestate(response.into_inner(), None)
            .map_err(|_| "Birthday TreeState oluşturma hatası")?;

        self.db
            .import_account_ufvk("default", &ufvk, &birthday, AccountPurpose::ViewOnly, None)?;

        println!("✅ Hesap başarıyla veritabanına eklendi.");
        Ok(())
    }

    pub async fn sync(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔄 Senkronizasyon başlıyor... (Mainnet)");

        let db_cache = MemBlockCache::new();

        run(
            &mut self.client,
            &TEST_NETWORK, // DEĞİŞİKLİK 4
            &db_cache,
            &mut self.db,
            100,
        )
        .await?;

        println!("✅ Senkronizasyon tamamlandı.");
        Ok(())
    }

    pub async fn get_latest_block(&mut self) -> Result<u64, Box<dyn std::error::Error>> {
        let response = self
            .client
            .get_latest_block(ChainSpec::default().into_request())
            .await?;
        Ok(response.into_inner().height)
    }

    pub fn print_transactions(&self) -> Result<(), Box<dyn std::error::Error>> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare(
            "SELECT hex(txid), mined_height, account_balance_delta, block_time FROM v_transactions ORDER BY mined_height DESC"
        )?;

        let tx_iter = stmt.query_map([], |row: &rusqlite::Row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<u32>>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<i64>>(3)?,
            ))
        })?;

        println!("\n📊 --- İŞLEM GEÇMİŞİ (MAINNET) ---");
        let mut count = 0;
        for tx in tx_iter {
            let (txid, height, delta, time) = tx?;
            let date_str = if let Some(t) = time {
                DateTime::<Utc>::from_timestamp(t, 0)
                    .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string())
                    .unwrap_or("Bilinmiyor".to_string())
            } else {
                "Bekliyor".to_string()
            };

            let amount = delta as f64 / 100_000_000.0;
            let type_str = if delta > 0 { "GELEN (+)" } else { "GİDEN (-)" };

            println!("--------------------------------------------------");
            println!("TX ID : {}...", &txid[0..16]);
            println!("Tarih : {}", date_str);
            println!("Blok  : {:?}", height);
            println!("Tutar : {} {:.8} ZEC", type_str, amount.abs());
            count += 1;
        }

        if count == 0 {
            println!("📭 Henüz hiç işlem bulunamadı (Cüzdan boş olabilir).");
        }
        println!("--------------------------------------------------\n");
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    println!("🔒 Zcash FHE Projesi - MAINNET Client Başlatılıyor...");

    let url = std::env::var("LIGHTWALLETD_URL").expect("LIGHTWALLETD_URL eksik");
    let viewing_key = std::env::var("VIEWING_KEY").expect("VIEWING_KEY eksik");
    let birthday = std::env::var("BIRTHDAY_HEIGHT")
        .unwrap_or("2500000".to_string())
        .parse::<u64>()?;

    let db_path_str = "./wallet.db";
    let db_path = Path::new(db_path_str);
    // DEĞİŞİKLİK 5: TEST_NETWORK
    let mut db = WalletDb::for_path(db_path, TEST_NETWORK, SystemClock, OsRng)?;
    init_wallet_db(&mut db, None)?;

    println!("🌍 Sunucuya bağlanılıyor: {}", url);
    let endpoint = tonic::transport::Endpoint::from_str(&url)?
        .tls_config(ClientTlsConfig::new().with_native_roots())?;
    let channel = endpoint.connect().await?;
    let client = CompactTxStreamerClient::new(channel);

    let mut account = ReadOnlyAccount::new(db, client, db_path_str.to_string());

    if account.db.get_account_ids()?.is_empty() {
        println!("🆕 Yeni hesap tanımlanıyor (Birthday: {})...", birthday);
        account.init(&viewing_key, birthday).await?;
    } else {
        println!("💾 Kayıtlı hesap yüklendi.");
    }

    let latest_height = account.get_latest_block().await?;
    println!("📦 Güncel Ağ Yüksekliği: {}", latest_height);

    account.sync().await?;
    account.print_transactions()?;

    println!("✅ İşlem Tamamlandı.");
    Ok(())
}
