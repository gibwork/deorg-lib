import * as dotenv from 'dotenv';
dotenv.config();
import { Deorg } from '@deorg/node';
import { signTransaction } from './utils/signTransaction';
import { Connection, Transaction } from '@solana/web3.js';

async function main() {
  const deorg = new Deorg({
    rpcUrl: process.env.RPC_URL,
  });

  const taskAddress = 'Drw1DDSudbGRouYyY5YbuRC2wZrBkGynu5aPM4sQKbwN';

  const enableTaskWithdrawTransaction =
    await deorg.enableTaskVaultWithdrawalTransaction(
      taskAddress,
      process.env.WALLET1,
    );

  const serializedTransaction = enableTaskWithdrawTransaction.transaction
    .serialize({ requireAllSignatures: false })
    .toString('base64');

  const signedTransaction = await signTransaction(
    serializedTransaction,
    process.env.WALLET1_PRIVATE_KEY,
  );

  const tx = Transaction.from(Buffer.from(signedTransaction, 'base64'));

  const connection = new Connection(process.env.RPC_URL);

  const txHash = await connection.sendRawTransaction(tx.serialize());

  console.log({
    taskAddress,
    txHash,
  });
}

main();
