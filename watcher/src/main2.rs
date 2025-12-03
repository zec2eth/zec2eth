use anyhow::Result;
use dotenv::dotenv;
use std::{collections::HashMap, str::FromStr};
use tonic::transport::ClientTlsConfig;

use zcash_client_backend::{
    decrypt_transaction,
    keys::UnifiedFullViewingKey,
    proto::service::{
        BlockId, BlockRange, ChainSpec, TxFilter,
        compact_tx_streamer_client::CompactTxStreamerClient,
    },
};

use zcash_primitives::{
    consensus::{BlockHeight, BranchId, Parameters, TestNetwork},
    memo::MemoBytes,
    transaction::Transaction,
};

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    let ufvk_str = std::env::var("UFVK").expect("UFVK is missing");
    let server =
        std::env::var("LIGHTWALLETD_URL").unwrap_or("https://testnet.zec.rocks:443".to_string());

    // Decode UFVK
    let ufvk = UnifiedFullViewingKey::decode(&TestNetwork, &ufvk_str).expect("Invalid UFVK");

    // decrypt_transaction expects AccountId -> UFVK map
    let mut ufvks = HashMap::new();
    ufvks.insert(0u32, ufvk.clone());

    println!("Connecting to {}", server);

    let tls_config = ClientTlsConfig::new().with_native_roots();

    let channel = tonic::transport::Endpoint::from_str(server.as_str())
        .unwrap()
        .tls_config(tls_config)
        .unwrap()
        .connect()
        .await?;

    let mut client = CompactTxStreamerClient::new(channel.clone());

    // MUST pass ChainSpec {} — Empty is wrong!
    let tip = client
        .get_latest_block(ChainSpec {})
        .await?
        .into_inner()
        .height;

    println!("Chain tip = {}", tip);

    let mut height = BlockHeight::from_u32(tip.saturating_sub(5) as u32);

    loop {
        let end = BlockHeight::from_u32(height.to_string().parse::<u32>().unwrap() + 20);

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

        let mut blocks = client.get_block_range(range).await?.into_inner();

        while let Some(block) = blocks.message().await? {
            let bh = BlockHeight::from_u32(block.height as u32);
            let branch = BranchId::for_height(&TestNetwork, bh);

            for ctx in block.vtx {
                let txid = ctx.txid();
                let txid_hex = hex::encode(txid.as_ref());

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

                let dec = decrypt_transaction(&TestNetwork, Some(bh), Some(bh), &tx, &ufvks);

                if dec.orchard_outputs().is_empty() && dec.sapling_outputs().is_empty() {
                    continue;
                }

                println!("\n📥 Incoming shielded tx");
                println!("Height: {}", bh.to_string());
                println!("TxID:  {}", txid_hex);

                for a in dec.orchard_outputs() {
                    println!("Orchard value: {}", a.note().value().inner());
                    println!("Memo: {}", memo_to_string(&a.memo()));
                }

                for s in dec.sapling_outputs() {
                    println!("Sapling value: {}", s.note().value().inner());
                    println!("Memo: {}", memo_to_string(&s.memo()));
                }

                println!("----------------------------------------");
            }
        }

        height = end;
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    }
}

fn memo_to_string(m: &MemoBytes) -> String {
    let bytes = m.as_slice();

    let trimmed = bytes
        .iter()
        .copied()
        .take_while(|&b| b != 0)
        .collect::<Vec<_>>();

    String::from_utf8(trimmed).unwrap_or_else(|_| hex::encode(bytes))
}
