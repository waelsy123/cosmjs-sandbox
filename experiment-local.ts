import { GasPrice, IndexedTx, MsgSendEncodeObject, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { readFile } from "fs/promises"
import { fromHex } from "@cosmjs/encoding"

const rpc = "http://127.0.0.1:26657"

const ALICE = "cosmos1mtcu5jdedfts4xygp3qrrnaeq5d5zuz2ddywld"
const BOB_FAUCET = "cosmos17lt2499w3qs4advhrzy35ktj4suulxe7tnusfc"
// const FAUCET = 'cosmos15aptdqmm7ddgtcrjvc5hs988rlrkze40l4q0he';

const getAliceSignerFromPriKey = async (): Promise<OfflineDirectSigner> => {
  return DirectSecp256k1Wallet.fromKey(
    fromHex((await readFile("./simd.alice.private.key")).toString()),
    "cosmos",
  )
}

const runAll = async (): Promise<void> => {
  const client = await StargateClient.connect(rpc)
  console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())

  console.log(
    "Alice balances:",
    await client.getAllBalances(ALICE), // <-- replace with your generated address
  )

  const aliceSigner: OfflineDirectSigner = await getAliceSignerFromPriKey()

  const alice = (await aliceSigner.getAccounts())[0].address
  console.log("Alice's address from signer", alice)

  const signingClient = await SigningStargateClient.connectWithSigner(
    rpc,
    aliceSigner,
    {
      prefix: "cosmos",
      gasPrice: GasPrice.fromString("0.0025stake")
    })

  console.log(
    "With signing client, chain id:",
    await signingClient.getChainId(),
    ", height:",
    await signingClient.getHeight()
  )

  // Check the balance of Alice and the Faucet
  console.log("Alice balance before:", await client.getAllBalances(ALICE))
  console.log("Bob (Faucet) balance before:", await client.getAllBalances(BOB_FAUCET))

  // // Execute the sendTokens Tx and store the result
  // const result = await signingClient.sendTokens(
  //   ALICE,
  //   BOB_FAUCET,
  //   [
  //     { denom: "uatom", amount: "100000" },
  //     { denom: "token", amount: "12" },
  //   ],
  //   {
  //     amount: [{ denom: "stake", amount: "500" }],
  //     gas: "200000",
  //   },
  //   "memo123"
  // )

  // sign and broadcast multiple txs
  const sendMsg1: MsgSendEncodeObject = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress: ALICE,
      toAddress: BOB_FAUCET,
      amount: [
        { denom: "token", amount: "12" },
      ]
    },
  };

  const sendMsg2: MsgSendEncodeObject = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress: ALICE,
      toAddress: BOB_FAUCET,
      amount: [
        { denom: "stake", amount: "100000" },
      ]
    },
  };

  const fees = 'auto'
  //  {
  //   amount: [{ denom: "stake", amount: "2000" }],
  //   gas: "200000",
  // };

  const result = await signingClient.signAndBroadcast(ALICE, [sendMsg1, sendMsg2], fees, "memo123");

  // Output the result of the Tx
  console.log("Transfer result:", result)

  console.log("Alice balance after:", await client.getAllBalances(ALICE))
  console.log("Bob(Faucet) balance after:", await client.getAllBalances(BOB_FAUCET))

}

runAll()