import { GasPrice, IndexedTx, MsgDelegateEncodeObject, MsgSendEncodeObject, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { readFile } from "fs/promises"

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

const ALICE = "cosmos1ttgyp5qzhy22zj8g7p0h7t7d4lsqrrtd53snqv"
const FAUCET = 'cosmos15aptdqmm7ddgtcrjvc5hs988rlrkze40l4q0he';

const getAliceSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
  return DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key")).toString(), {
    prefix: "cosmos",
  })
}

const runAll = async (): Promise<void> => {
  const client = await StargateClient.connect(rpc)
  console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())

  console.log(
    "Alice balances:",
    await client.getAllBalances(ALICE), // <-- replace with your generated address
  )

  const faucetTx: IndexedTx = (await client.getTx(
    "B3847E1D3F363B54492B44DA2E58989C7AAD04DD2DB025199219A871E9761DC7",
  ))!
  console.log("🚀 ~ file: experiment.ts:17 ~ runAll ~ faucetTx", faucetTx)

  const decodedTx: Tx = Tx.decode(faucetTx.tx)
  console.log("DecodedTx:", decodedTx)

  console.log("Decoded messages:", decodedTx.body!.messages)

  const sendMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value)
  console.log("Sent message:", sendMessage)

  console.log(
    "Faucet balances:",
    await client.getAllBalances(FAUCET), // <-- replace with your generated address
  )

  const aliceSigner: OfflineDirectSigner = await getAliceSignerFromMnemonic()
  const alice = (await aliceSigner.getAccounts())[0].address
  console.log("Alice's address from signer", alice)

  const signingClient = await SigningStargateClient.connectWithSigner(rpc, aliceSigner,
    {
      prefix: "cosmos",
      gasPrice: GasPrice.fromString("0.0025uatom")
    })

  console.log(
    "With signing client, chain id:",
    await signingClient.getChainId(),
    ", height:",
    await signingClient.getHeight()
  )

  // Check the balance of Alice and the Faucet
  console.log("Alice balance before:", await client.getAllBalances(ALICE))
  console.log("Faucet balance before:", await client.getAllBalances(FAUCET))

  // Execute the sendTokens Tx and store the result
  const result = await signingClient.sendTokens(
    ALICE,
    FAUCET,
    [{ denom: "uatom", amount: "100000" }],
    {
      amount: [{ denom: "uatom", amount: "500" }],
      gas: "200000",
    },
  )
  // Output the result of the Tx
  console.log("Transfer result:", result)

  console.log("Alice balance after:", await client.getAllBalances(ALICE))
  console.log("Faucet balance after:", await client.getAllBalances(FAUCET))

  const validator = 'cosmosvaloper178h4s6at5v9cd8m9n7ew3hg7k9eh0s6wptxpcn';

  const sendMsgDelegate: MsgDelegateEncodeObject = {
    typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
    value: {
      delegatorAddress: ALICE,
      validatorAddress: validator,
      amount: { denom: "uatom", amount: "500" },
    },
  };

  const delegationResult = await signingClient.signAndBroadcast(ALICE, [sendMsgDelegate], 'auto', "memo123");
  console.log("🚀 ~ file: experiment.ts:90 ~ runAll ~ delegationResult", delegationResult)

}

runAll()