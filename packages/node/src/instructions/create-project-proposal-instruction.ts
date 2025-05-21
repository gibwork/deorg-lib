import { CreateProjectProposalDto } from '../types';
import * as anchor from '@coral-xyz/anchor';
import idl from '../deorg_voting_program.json';
import { DeorgVotingProgram } from '../deorg_voting_program';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bignumber.js';

export async function createProjectProposalInstruction(
  dto: CreateProjectProposalDto,
  connection: Connection,
  programId: PublicKey,
  token: string,
) {
  const program = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    {
      connection,
    },
  );

  const organization = new PublicKey(dto.organizationAddress);

  // Calculate PDA for contributor proposal
  const [proposalPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('project_proposal'),
      organization.toBuffer(),
      Buffer.from(dto.name),
    ],
    programId,
  );

  const tokenMint = new PublicKey(token);

  // Find proposer token account
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    new PublicKey(dto.proposerWallet),
    { mint: tokenMint },
  );

  if (tokenAccounts.value.length === 0) {
    throw new Error('No token account found for the organization token mint');
  }

  const proposerTokenAccount = tokenAccounts.value[0].pubkey;

  const instruction = program.instruction.proposeProject(
    dto.name,
    dto.description,
    dto.members,
    dto.projectProposalThreshold,
    new BN(dto.projectProposalValidityPeriod * 24 * 60 * 60),
    {
      accounts: {
        organization,
        proposal: proposalPDA,
        proposer: new PublicKey(dto.proposerWallet),
        proposerTokenAccount,
        systemProgram: SystemProgram.programId,
      },
    },
  );

  return {
    instruction,
    proposalPDA,
  };
}
