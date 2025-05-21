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

  const contributorProposal = await deorg.createContributorProposalTransaction({
    candidateWallet: process.env.WALLET2,
    organizationAccount: orgAddress,
    proposerWallet: process.env.WALLET1,
    proposedRate: 100,
    tokenMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  });

  const serializedTransaction = contributorProposal.transaction
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
    txHash,
    contributorProposal: contributorProposal.proposalPDA,
  });
}
main();
