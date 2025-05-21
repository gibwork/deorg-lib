import * as dotenv from 'dotenv';
dotenv.config();
import { Deorg } from '@deorg/node';
import { randomUUID } from 'node:crypto';
import { signTransaction } from './utils/signTransaction';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';

async function main() {
  const deorg = new Deorg({
    rpcUrl: process.env.RPC_URL,
  });

  const orgAddress = '5J4v8jARWSHmPKGinXMAso4NJ1SNFMYpLMHxnyyxeLDv';
  const projectId = randomUUID();

  const organizationDetails = await deorg.getOrganizationDetails(orgAddress);

  const createProjectTransaction = await deorg.createProjectProposalTransaction(
    {
      id: projectId,
      name: 'PvP Games',
      description: 'PvP Games',
      members: organizationDetails.contributors.map(
        (contributor) => new PublicKey(contributor),
      ),
      organizationAddress: orgAddress,
      proposerWallet: process.env.WALLET1,
      projectProposalThreshold: 50,
      projectProposalValidityPeriod: 1000,
    },
  );

  const serializedTransaction = createProjectTransaction.transaction
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
    proposalAddress: createProjectTransaction.proposalPDA,
    txHash,
  });
}

main();
