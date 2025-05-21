import * as dotenv from 'dotenv';
dotenv.config();
import { Deorg } from '@deorg/node';
import { randomUUID } from 'node:crypto';
import { signTransaction } from './utils/signTransaction';
import { Connection, Transaction } from '@solana/web3.js';

async function main() {
  const deorg = new Deorg({
    rpcUrl: process.env.RPC_URL,
  });

  const organizationUuid = randomUUID();

  const createOrganizationTransaction =
    await deorg.createOrganizationTransaction({
      name: 'Game Builders',
      creatorWallet: process.env.WALLET1,
      description: 'Game Builders Organization',
      discordUrl: 'https://discord.com/gamebuilders',
      telegramUrl: 'https://t.me/gamebuilders',
      twitterUrl: 'https://twitter.com/gamebuilders',
      websiteUrl: 'https://gamebuilders.com',
      logoUrl:
        'https://img.pikbest.com/origin/10/50/46/10ppIkbEsTtgD.png!bw700',
      tokenMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
      contributorProposalQuorumPercentage: 100,
      contributorProposalThreshold: 1,
      contributorProposalValidityPeriod: 1000,
      contributorValidityPeriod: 1000,
      projectProposalThreshold: 1,
      projectProposalValidityPeriod: 1000,
      minimumTokenRequirement: 1,
      organizationId: organizationUuid,
      treasuryTransferProposalValidityPeriod: 1000,
      treasuryTransferQuorumPercentage: 100,
      treasuryTransferThresholdPercentage: 100,
    });

  const serializedTransaction = createOrganizationTransaction.transaction
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
    organization: createOrganizationTransaction.organizationPDA,
    txHash,
  });
}

main();
