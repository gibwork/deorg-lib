import { PublicKey, Connection, SystemProgram } from '@solana/web3.js';
import { VoteProjectProposalDto } from '../types';
import { DeorgVotingProgram } from '../deorg_voting_program';
import * as anchor from '@coral-xyz/anchor';
import idl from '../deorg_voting_program.json';

export async function voteProjectProposalInstruction(
  dto: VoteProjectProposalDto,
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
  const proposal = new PublicKey(dto.proposalAddress);

  const tokenMint = new PublicKey(token);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    new PublicKey(dto.proposerWallet),
    { mint: tokenMint },
  );

  if (tokenAccounts.value.length === 0) {
    throw new Error('No token account found for the organization token mint');
  }

  const voterTokenAccount = tokenAccounts.value[0].pubkey;

  const proposalKeyBuffer = proposal.toBuffer();
  const projectUuid = proposalKeyBuffer.slice(0, 16);

  // Find the expected PDA for the project
  const [projectPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('project'), organization.toBuffer(), projectUuid],
    programId,
  );

  const instruction = program.instruction.voteOnProjectProposal(dto.vote, {
    accounts: {
      organization,
      proposal,
      voterTokenAccount,
      systemProgram: SystemProgram.programId,
      voter: new PublicKey(dto.proposerWallet),
      project: projectPDA,
      rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
    },
  });

  return {
    instruction,
  };
}
