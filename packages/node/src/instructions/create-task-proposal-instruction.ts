import { CreateTaskProposalDto } from '../types';
import * as anchor from '@coral-xyz/anchor';
import { DeorgVotingProgram } from '../deorg_voting_program';
import idl from '../deorg_voting_program.json';
import { PublicKey, Connection, SystemProgram } from '@solana/web3.js';
import BN from 'bignumber.js';

export async function createTaskProposalInstruction(
  dto: CreateTaskProposalDto,
  token: string,
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
  const project = new PublicKey(dto.projectAddress);
  const assignee = new PublicKey(dto.assignee);
  const tokenMint = new PublicKey(token);
  const organization = new PublicKey(dto.organizationAddress);

  // Find treasury registry PDA
  const [tokenRegistryPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('treasury_registry'), organization.toBuffer()],
    programId,
  );

  // Find treasury authority PDA
  const [treasuryAuthorityPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('treasury_authority'), organization.toBuffer()],
    programId,
  );

  // Find treasury token account for the specified mint
  const treasuryTokenAccounts = await connection.getParsedTokenAccountsByOwner(
    treasuryAuthorityPDA,
    {
      mint: tokenMint,
    },
  );

  if (treasuryTokenAccounts.value.length === 0) {
    throw new Error('No treasury token account found for the specified mint');
  }

  const treasuryTokenAccount = treasuryTokenAccounts.value[0].pubkey;

  // Find destination token account for the assignee
  const destinationTokenAccounts =
    await connection.getParsedTokenAccountsByOwner(assignee, {
      mint: tokenMint,
    });

  if (destinationTokenAccounts.value.length === 0) {
    throw new Error(
      'No token account found for the assignee for the specified mint',
    );
  }

  const destinationTokenAccount = destinationTokenAccounts.value[0].pubkey;

  const organizationAccount = await connection.getAccountInfo(organization);
  if (!organizationAccount) {
    throw new Error('Organization account not found');
  }

  // Find creator's token account for the organization token
  const creatorTokenAccounts = await connection.getParsedTokenAccountsByOwner(
    new PublicKey(dto.proposerWallet),
    { mint: tokenMint },
  );

  if (!creatorTokenAccounts || creatorTokenAccounts.value.length === 0) {
    throw new Error(
      'No token account found for the creator for the governance token',
    );
  }

  const creatorTokenAccount = creatorTokenAccounts.value[0].pubkey;

  // Calculate PDA for transfer proposal
  // Get token decimals from mint account
  const tokenMintInfo = await connection.getAccountInfo(tokenMint);

  // Try to get token decimals - default to 9 if not available
  let tokenDecimals = 9;
  try {
    // SPL token mints store decimals at offset 44
    if (tokenMintInfo && tokenMintInfo.data.length >= 45) {
      tokenDecimals = tokenMintInfo.data[44];
    }
  } catch (err) {
    console.error('Could not determine token decimals, using default of 9');
  }

  const paymentAmountTokenUnits = Math.floor(
    dto.paymentAmount * Math.pow(10, tokenDecimals),
  );

  // Calculate PDA for contributor proposal
  const [proposalPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('task_proposal'),
      organization.toBuffer(),
      project.toBuffer(),
      Buffer.from(dto.title),
    ],
    programId,
  );

  const instruction = program.instruction.proposeTask(
    dto.title,
    dto.description,
    new BN(paymentAmountTokenUnits),
    assignee,
    tokenMint,
    {
      accounts: {
        proposer: new PublicKey(dto.proposerWallet),
        organization,
        project,
        proposal: proposalPDA,
        tokenRegistry: tokenRegistryPDA,
        treasuryTokenAccount: treasuryTokenAccount,
        treasuryAuthority: treasuryAuthorityPDA,
        destinationTokenAccount: destinationTokenAccount,
        proposerTokenAccount: creatorTokenAccount,
        systemProgram: SystemProgram.programId,
      },
    },
  );

  return {
    instruction,
    proposalPDA,
  };
}
