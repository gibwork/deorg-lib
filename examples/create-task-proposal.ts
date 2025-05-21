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

  const createTaskProposalTransaction =
    await deorg.createTaskProposalTransaction({
      assignee: process.env.WALLET2,
      title: 'Multiplayer RPG PvP Game Dev',
      description:
        'Create a robust multiplayer RPG PvP game system with real-time combat mechanics, character progression, and matchmaking features',
      paymentAmount: 0.1,
      projectAddress,
      proposerWallet: process.env.WALLET1,
      organizationAddress: orgAddress,
    });

  const serializedTransaction = createTaskProposalTransaction.transaction
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
    proposalAddress: createTaskProposalTransaction.proposalPDA,
    txHash,
  });
}

main();
