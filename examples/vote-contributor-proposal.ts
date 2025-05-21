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
  const proposalAddress = 'z2zbL5bAmxDzkvnUftyvmj5ub9VCGPjR57HzEAJ5eNd';

  const voteProposalTransaction =
    await deorg.voteContributorProposalTransaction({
      organizationAddress: orgAddress,
      proposalAddress,
      vote: true,
      proposerWallet: process.env.WALLET1,
      tokenMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    });

  const serializedTransaction = voteProposalTransaction.transaction
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
