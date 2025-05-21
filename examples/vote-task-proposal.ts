import * as dotenv from 'dotenv';
dotenv.config();
import { Deorg } from '@deorg/node';
import { signTransaction } from './utils/signTransaction';
import { Connection, Transaction } from '@solana/web3.js';

async function main() {
  const deorg = new Deorg({
    rpcUrl: process.env.RPC_URL,
  });

  const orgAddress = '5J4v8jARWSHmPKGinXMAso4NJ1SNFMYpLMHxnyyxeLDv';
  const projectAddress = 'CfBkfJdaey4smNZTBN15sQKG2xGZooSHHcxhf1hNmRAN';
  const proposalAddress = 'BSrBXrS3toomwgCBzqPpCgJqAdjgnmvnZqDmeYzdf7A2';

  const voteTaskProposalTransaction = await deorg.voteTaskProposalTransaction({
    assignee: process.env.WALLET2,
    organizationAddress: orgAddress,
    proposalAddress,
    vote: true,
    proposerWallet: process.env.WALLET1,
    projectAddress,
  });

  const serializedTransaction = voteTaskProposalTransaction.transaction
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
    proposalAddress,
    txHash,
  });
}

main();
