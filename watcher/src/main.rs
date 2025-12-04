use num_bigint::BigUint;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, str::FromStr};
use tonic::transport::ClientTlsConfig;

use zcash_client_backend::{
    decrypt_transaction,
    keys::UnifiedFullViewingKey,
    proto::service::{
        compact_tx_streamer_client::CompactTxStreamerClient, BlockId, BlockRange, ChainSpec,
        TxFilter,
    },
};

use zcash_primitives::transaction::Transaction;
use zcash_protocol::{
    consensus::{BlockHeight, BranchId, TestNetwork},
    memo::MemoBytes,
};

/// Circuit parameters - must match circom
const N_TX_BYTES: usize = 2000;
const N_OUTPUTS: usize = 4;
const N_MEMO_BYTES: usize = 32;
const MERKLE_DEPTH: usize = 20;

/// Transaction data for the ZK circuit
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
struct ZecTxData {
    tx_bytes: Vec<u8>,
    memo_bytes: Vec<u8>,
    out_values: Vec<u64>,
    out_scriptHashes: Vec<String>,
    merkle_sibling_hi: Vec<String>,
    merkle_sibling_lo: Vec<String>,
    merkle_path_dir: Vec<u8>,
    #[serde(rename = "merkleRoot_hi")]
    merkle_root_hi: String,
    #[serde(rename = "merkleRoot_lo")]
    merkle_root_lo: String,
    #[serde(rename = "txId_hi")]
    tx_id_hi: String,
    #[serde(rename = "txId_lo")]
    tx_id_lo: String,
}

/// Request body for submitting to backend
#[derive(Debug, Serialize)]
struct SubmitRequest {
    txid: String,
    amount: u64,
    recipient: String,
    confirmations: u32,
    #[serde(rename = "txData")]
    tx_data: ZecTxData,
}

/// Response from backend
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct SubmitResponse {
    success: bool,
    transaction: Option<TransactionInfo>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct TransactionInfo {
    txid: String,
    status: String,
}

/// Backend API client
struct BackendClient {
    client: Client,
    base_url: String,
    watcher_secret: String,
}

impl BackendClient {
    fn new(base_url: String, watcher_secret: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            watcher_secret,
        }
    }

    async fn submit_transaction(&self, request: &SubmitRequest) -> Result<SubmitResponse, String> {
        let url = format!("{}/api/watcher/submit", self.base_url);

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-Watcher-Secret", &self.watcher_secret)
            .json(request)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if response.status().is_success() {
            response
                .json::<SubmitResponse>()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))
        } else {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            Err(format!("Backend returned {}: {}", status, body))
        }
    }

    async fn update_confirmations(&self, txid: &str, confirmations: u32) -> Result<(), String> {
        let url = format!("{}/api/watcher/update-confirmations", self.base_url);

        let body = serde_json::json!({
            "txid": txid,
            "confirmations": confirmations
        });

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-Watcher-Secret", &self.watcher_secret)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            Err(format!("Backend returned {}: {}", status, body))
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Install rustls crypto provider (required for TLS)
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    dotenvy::dotenv().ok();

    let ufvk_str = std::env::var("UFVK").expect("UFVK is missing");
    let server =
        std::env::var("LIGHTWALLETD_URL").unwrap_or("https://testnet.zec.rocks:443".to_string());
    let backend_url = std::env::var("BACKEND_URL").unwrap_or("http://localhost:3001".to_string());
    let watcher_secret =
        std::env::var("WATCHER_SECRET").unwrap_or("dev-secret-change-in-production".to_string());

    // Decode UFVK
    let ufvk = UnifiedFullViewingKey::decode(&TestNetwork, &ufvk_str).expect("Invalid UFVK");

    // decrypt_transaction expects AccountId -> UFVK map
    let mut ufvks = HashMap::new();
    ufvks.insert(0u32, ufvk.clone());

    // Create backend client
    let backend = BackendClient::new(backend_url.clone(), watcher_secret);

    // Track already submitted transactions
    let mut submitted_txids: HashMap<String, u32> = HashMap::new();

    println!("🔭 ZEC to ETH Bridge Watcher");
    println!("   Lightwalletd: {}", server);
    println!("   Backend: {}", backend_url);
    println!();

    let tls_config = ClientTlsConfig::new().with_native_roots();

    let channel = tonic::transport::Endpoint::from_str(server.as_str())
        .unwrap()
        .tls_config(tls_config)
        .unwrap()
        .connect()
        .await?;

    let mut client = CompactTxStreamerClient::new(channel.clone());

    // Get chain tip
    let tip = client
        .get_latest_block(ChainSpec {})
        .await?
        .into_inner()
        .height;

    println!("📦 Chain tip = {}", tip);

    // Start from a few blocks back
    let mut height = BlockHeight::from_u32(tip.saturating_sub(5) as u32);

    loop {
        // Get current chain tip
        let current_tip = client
            .get_latest_block(ChainSpec {})
            .await?
            .into_inner()
            .height;

        // Calculate end height, but don't go past the chain tip
        let height_u32: u32 = height.to_string().parse().unwrap();
        let end_height = std::cmp::min(height_u32 + 20, current_tip as u32);

        // If we're at the tip, wait for new blocks
        if height_u32 >= current_tip as u32 {
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
            continue;
        }

        let end = BlockHeight::from_u32(end_height);

        let range = BlockRange {
            start: Some(BlockId {
                height: height.into(),
                hash: vec![],
            }),
            end: Some(BlockId {
                height: end.into(),
                hash: vec![],
            }),
        };

        let blocks_result = client.get_block_range(range).await;

        let mut blocks = match blocks_result {
            Ok(b) => b.into_inner(),
            Err(e) => {
                eprintln!("⚠️  Failed to get block range: {}", e);
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            }
        };

        while let Some(block) = blocks.message().await? {
            let bh = BlockHeight::from_u32(block.height as u32);
            let branch = BranchId::for_height(&TestNetwork, bh);
            let confirmations = current_tip.saturating_sub(block.height) as u32;

            // Collect all txids in the block for merkle proof
            let block_txids: Vec<String> = block
                .vtx
                .iter()
                .map(|t| hex::encode(t.txid().as_ref()))
                .collect();

            for ctx in block.vtx {
                let txid = ctx.txid();
                let txid_hex = hex::encode(txid.as_ref());

                // Check if we already submitted this tx
                if let Some(prev_confs) = submitted_txids.get(&txid_hex) {
                    // Update confirmations if changed significantly
                    if confirmations > *prev_confs + 1 {
                        if let Err(e) = backend.update_confirmations(&txid_hex, confirmations).await
                        {
                            eprintln!("⚠️  Failed to update confirmations for {}: {}", txid_hex, e);
                        } else {
                            submitted_txids.insert(txid_hex.clone(), confirmations);
                            println!(
                                "📊 Updated confirmations for {}: {}",
                                &txid_hex[..16],
                                confirmations
                            );
                        }
                    }
                    continue;
                }

                // Get raw transaction
                let raw = client
                    .get_transaction(TxFilter {
                        block: None,
                        index: 0,
                        hash: txid.as_ref().to_vec(),
                    })
                    .await?
                    .into_inner()
                    .data;

                let tx = Transaction::read(&raw[..], branch).expect("Invalid transaction");

                // Decrypt the transaction
                let dec = decrypt_transaction(&TestNetwork, Some(bh), Some(bh), &tx, &ufvks);

                if dec.orchard_outputs().is_empty() && dec.sapling_outputs().is_empty() {
                    continue;
                }

                println!("\n📥 Detected incoming shielded transaction");
                println!("   Height: {}", bh);
                println!("   TxID:   {}", txid_hex);
                println!("   Confirmations: {}", confirmations);

                // Process outputs and extract memo (recipient address)
                let mut total_value: u64 = 0;
                let mut recipient: Option<String> = None;

                for a in dec.orchard_outputs() {
                    let value = a.note().value().inner();
                    total_value += value;
                    println!("   Orchard value: {} zatoshis", value);

                    let memo_str = memo_to_string(&a.memo());
                    println!("   Memo: {}", memo_str);

                    // Check if memo is an Ethereum address
                    if memo_str.starts_with("0x") && memo_str.len() == 42 {
                        recipient = Some(memo_str);
                    }
                }

                for s in dec.sapling_outputs() {
                    let value = s.note().value().inner();
                    total_value += value;
                    println!("   Sapling value: {} zatoshis", value);

                    let memo_str = memo_to_string(&s.memo());
                    println!("   Memo: {}", memo_str);

                    // Check if memo is an Ethereum address
                    if memo_str.starts_with("0x") && memo_str.len() == 42 {
                        recipient = Some(memo_str);
                    }
                }

                // If we found an Ethereum address in the memo, submit to backend
                if let Some(eth_address) = recipient {
                    println!("   🎯 Found Ethereum recipient: {}", eth_address);

                    // Build transaction data for circuit
                    let tx_data = build_tx_data(&raw, &txid_hex, &block_txids);

                    let request = SubmitRequest {
                        txid: txid_hex.clone(),
                        amount: total_value,
                        recipient: eth_address,
                        confirmations,
                        tx_data,
                    };

                    match backend.submit_transaction(&request).await {
                        Ok(response) => {
                            if response.success {
                                println!("   ✅ Submitted to backend successfully");
                                submitted_txids.insert(txid_hex.clone(), confirmations);
                            } else {
                                println!("   ⚠️  Backend rejected transaction");
                            }
                        }
                        Err(e) => {
                            eprintln!("   ❌ Failed to submit to backend: {}", e);
                        }
                    }
                } else {
                    println!("   ⏭️  No Ethereum address in memo, skipping");
                }

                println!("----------------------------------------");
            }
        }

        height = end;
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    }
}

/// Build transaction data for the ZK circuit
fn build_tx_data(raw_tx: &[u8], txid_hex: &str, block_txids: &[String]) -> ZecTxData {
    // Pad tx_bytes to N_TX_BYTES
    let mut tx_bytes = raw_tx.to_vec();
    tx_bytes.resize(N_TX_BYTES, 0);

    // Split txid into hi/lo (16 bytes each)
    let txid_bytes = hex::decode(txid_hex).unwrap_or_default();
    let (tx_id_hi, tx_id_lo) = split_hash_to_hi_lo(&txid_bytes);

    // Build merkle proof
    let (merkle_sibling_hi, merkle_sibling_lo, merkle_path_dir, merkle_root_hi, merkle_root_lo) =
        build_merkle_proof(txid_hex, block_txids);

    // Placeholder values for outputs (would need actual parsing)
    let out_values = vec![0u64; N_OUTPUTS];
    let out_script_hashes = vec!["0".to_string(); N_OUTPUTS];

    // Placeholder memo bytes
    let memo_bytes = vec![0u8; N_MEMO_BYTES];

    ZecTxData {
        tx_bytes,
        memo_bytes,
        out_values,
        out_scriptHashes: out_script_hashes,
        merkle_sibling_hi,
        merkle_sibling_lo,
        merkle_path_dir,
        merkle_root_hi,
        merkle_root_lo,
        tx_id_hi,
        tx_id_lo,
    }
}

/// Split a 32-byte hash into hi (first 16 bytes) and lo (last 16 bytes) as field elements
fn split_hash_to_hi_lo(hash: &[u8]) -> (String, String) {
    if hash.len() != 32 {
        return ("0".to_string(), "0".to_string());
    }

    let hi_bytes = &hash[0..16];
    let lo_bytes = &hash[16..32];

    let hi = BigUint::from_bytes_be(hi_bytes);
    let lo = BigUint::from_bytes_be(lo_bytes);

    (hi.to_string(), lo.to_string())
}

/// Build a Merkle proof for a transaction in a block
fn build_merkle_proof(
    txid: &str,
    block_txids: &[String],
) -> (Vec<String>, Vec<String>, Vec<u8>, String, String) {
    // Find the transaction index
    let tx_index = block_txids.iter().position(|t| t == txid).unwrap_or(0);

    // Convert txids to leaves
    let mut leaves: Vec<(BigUint, BigUint)> = block_txids
        .iter()
        .map(|id| {
            let bytes = hex::decode(id).unwrap_or_default();
            if bytes.len() == 32 {
                let hi = BigUint::from_bytes_be(&bytes[0..16]);
                let lo = BigUint::from_bytes_be(&bytes[16..32]);
                (hi, lo)
            } else {
                (BigUint::from(0u32), BigUint::from(0u32))
            }
        })
        .collect();

    // Pad to power of 2
    let target_size = 1 << MERKLE_DEPTH;
    while leaves.len() < target_size {
        leaves.push((BigUint::from(0u32), BigUint::from(0u32)));
    }

    let mut siblings_hi = Vec::with_capacity(MERKLE_DEPTH);
    let mut siblings_lo = Vec::with_capacity(MERKLE_DEPTH);
    let mut path_dir = Vec::with_capacity(MERKLE_DEPTH);

    let mut current_index = tx_index;

    for _level in 0..MERKLE_DEPTH {
        let is_right = current_index % 2 == 1;
        path_dir.push(if is_right { 1u8 } else { 0u8 });

        let sibling_index = if is_right {
            current_index - 1
        } else {
            current_index + 1
        };

        if sibling_index < leaves.len() {
            siblings_hi.push(leaves[sibling_index].0.to_string());
            siblings_lo.push(leaves[sibling_index].1.to_string());
        } else {
            siblings_hi.push("0".to_string());
            siblings_lo.push("0".to_string());
        }

        // Compute next level using Poseidon-like hash (simplified for now)
        let next_leaves: Vec<(BigUint, BigUint)> = leaves
            .chunks(2)
            .map(|pair| {
                let left = &pair[0];
                let right = if pair.len() > 1 {
                    &pair[1]
                } else {
                    &(BigUint::from(0u32), BigUint::from(0u32))
                };

                // Simplified hash (in production, use proper Poseidon)
                let mut hasher = Sha256::new();
                hasher.update(&left.0.to_bytes_be());
                hasher.update(&left.1.to_bytes_be());
                hasher.update(&right.0.to_bytes_be());
                hasher.update(&right.1.to_bytes_be());
                let hash = hasher.finalize();

                let hi = BigUint::from_bytes_be(&hash[0..16]);
                let lo = BigUint::from_bytes_be(&hash[16..32]);
                (hi, lo)
            })
            .collect();

        leaves = next_leaves;
        current_index /= 2;
    }

    // Root is the final leaf
    let root = leaves
        .first()
        .cloned()
        .unwrap_or((BigUint::from(0u32), BigUint::from(0u32)));

    (
        siblings_hi,
        siblings_lo,
        path_dir,
        root.0.to_string(),
        root.1.to_string(),
    )
}

/// Convert memo bytes to string
fn memo_to_string(m: &MemoBytes) -> String {
    let bytes = m.as_slice();

    let trimmed = bytes
        .iter()
        .copied()
        .take_while(|&b| b != 0)
        .collect::<Vec<_>>();

    String::from_utf8(trimmed).unwrap_or_else(|_| hex::encode(bytes))
}
