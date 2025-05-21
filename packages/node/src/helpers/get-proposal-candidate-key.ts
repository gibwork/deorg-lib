import { Connection, PublicKey } from '@solana/web3.js';

export async function getProposalCandidateKey(
  connection: Connection,
  proposalPubkey: PublicKey,
): Promise<Buffer> {
  // Fetch the proposal account data
  const proposalAccount = await connection.getAccountInfo(proposalPubkey);

  if (!proposalAccount) {
    throw new Error('Proposal account not found');
  }

  // Skip the 8-byte discriminator
  const dataBuffer = proposalAccount.data.slice(8);

  // Candidate address is at offset 32-64 (after organization pubkey)
  return dataBuffer.slice(32, 64);
}
