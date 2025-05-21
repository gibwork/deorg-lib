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

  const completeTaskTransaction =
    await deorg.completeTaskTransaction(taskAddress);

  const serializedTransaction = completeTaskTransaction.transaction
    .serialize({ requireAllSignatures: false })
    .toString('base64');

  const signedTransaction = await signTransaction(
    serializedTransaction,
    process.env.WALLET2_PRIVATE_KEY,
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
