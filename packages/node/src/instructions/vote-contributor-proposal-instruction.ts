import { PublicKey, Connection, SystemProgram } from '@solana/web3.js';
import { DeorgVotingProgram } from '../deorg_voting_program';
import { VoteContributorProposalDto } from '../types';
import * as anchor from '@coral-xyz/anchor';
import idl from '../deorg_voting_program.json';
import { getProposalCandidateKey } from '../helpers/get-proposal-candidate-key';

export async function voteContributorProposalInstruction(
  dto: VoteContributorProposalDto,
  connection: Connection,
  programId: PublicKey,
) {
  const program = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    {
      connection,
    },
  );

  const organization = new PublicKey(dto.organizationAddress);
  const proposal = new PublicKey(dto.proposalAddress);
  const tokenMint = new PublicKey(dto.tokenMint);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    new PublicKey(dto.proposerWallet),
    { mint: tokenMint },
  );

  if (tokenAccounts.value.length === 0) {
    throw new Error('No token account found for the organization token mint');
  }

  const voterTokenAccount = tokenAccounts.value[0].pubkey;

  // Calculate PDA for the contributor account that will be created/updated
  const [contributorPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('contributor'),
      organization.toBuffer(),
      // Get the candidate pubkey from the proposal account data
      await getProposalCandidateKey(connection, proposal),
    ],
    programId,
  );

  const instruction = program.instruction.voteOnContributorProposal(dto.vote, {
    accounts: {
      organization,
      proposal,
      contributor: contributorPDA,
      voterTokenAccount,
      systemProgram: SystemProgram.programId,
      voter: new PublicKey(dto.proposerWallet),
    },
  });

  return {
    instruction,
    contributorPDA,
  };
}
