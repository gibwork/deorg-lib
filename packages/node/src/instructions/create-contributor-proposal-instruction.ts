import { CreateContributorProposalDto } from '../types';
import * as anchor from '@coral-xyz/anchor';
import { DeorgVotingProgram } from '../deorg_voting_program';
import idl from '../deorg_voting_program.json';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bignumber.js';

export async function createContributorProposalInstruction(
  dto: CreateContributorProposalDto,
  connection: Connection,
  programId: PublicKey,
) {
  const program = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    {
      connection,
    },
  );

  // Verify they're valid public keys
  const organization = new PublicKey(dto.organizationAccount);
  const candidate = new PublicKey(dto.candidateWallet);
  const tokenMint = new PublicKey(dto.tokenMint);

  // Find proposer token account
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    new PublicKey(dto.proposerWallet),
    { mint: tokenMint },
  );

  if (tokenAccounts.value.length === 0) {
    throw new Error('No token account found for the organization token mint');
  }

  const proposerTokenAccount = tokenAccounts.value[0].pubkey;

  // Calculate PDA for contributor proposal
  const [proposalPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('contributor_proposal'),
      organization.toBuffer(),
      candidate.toBuffer(),
    ],
    programId,
  );

  // Calculate PDA for the contributor account that might be created
  const [contributorPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('contributor'), organization.toBuffer(), candidate.toBuffer()],
    programId,
  );

  const instruction = program.instruction.proposeContributor(
    new BN(dto.proposedRate),
    {
      accounts: {
        organization,
        candidate,
        proposerTokenAccount,
        contributor: contributorPDA,
        systemProgram: SystemProgram.programId,
        proposal: proposalPDA,
        proposer: new PublicKey(dto.proposerWallet),
      },
    },
  );

  return {
    instruction,
    proposalPDA,
  };
}
