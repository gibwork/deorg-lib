import { PublicKey, Connection, SystemProgram } from '@solana/web3.js';
import { DeorgVotingProgram } from '../deorg_voting_program';
import * as anchor from '@coral-xyz/anchor';
import idl from '../deorg_voting_program.json';
import { VoteTaskProposalDto } from '../types';
import { getProposalCandidateKey } from '../helpers/get-proposal-candidate-key';

export async function voteTaskProposalInstruction(
  dto: VoteTaskProposalDto,
  connection: Connection,
  token: string,
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
  const project = new PublicKey(dto.projectAddress);
  const assignee = new PublicKey(dto.assignee);
  const tokenMint = new PublicKey(token);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    new PublicKey(dto.proposerWallet),
    { mint: tokenMint },
  );

  if (tokenAccounts.value.length === 0) {
    throw new Error('No token account found for the organization token mint');
  }

  // Create a dummy wallet provider for read-only operations
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as anchor.Wallet;

  const provider = new anchor.AnchorProvider(connection, dummyWallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });

  // Create a new program instance for fetching
  const fetchProgram = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    provider,
  );

  // Get proposal data to get task title
  const proposalAccount =
    await fetchProgram.account.taskProposal.fetch(proposal);
  const taskTitle = proposalAccount.title;
  // Calculate task PDA
  const [taskPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('task'),
      organization.toBuffer(),
      project.toBuffer(),
      Buffer.from(taskTitle),
    ],
    programId,
  );

  const voterTokenAccount = tokenAccounts.value[0].pubkey;

  // Find task vault PDA
  const [taskVaultPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('task_vault'), taskPDA.toBuffer()],
    programId,
  );

  // Find vault authority PDA
  const [vaultAuthorityPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('vault_authority'), taskPDA.toBuffer()],
    programId,
  );

  // Find vault token account PDA
  const [vaultTokenAccountPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('vault_token_account'), taskPDA.toBuffer()],
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

  const instruction = program.instruction.voteOnTaskProposal(dto.vote, {
    accounts: {
      voter: new PublicKey(dto.proposerWallet),
      organization,
      proposal,
      project,
      voterTokenAccount,
      treasuryTokenAccount,
      treasuryAuthority: treasuryAuthorityPDA,
      destinationTokenAccount,
      task: taskPDA,
      taskVault: taskVaultPDA,
      tokenMint,
      vaultTokenAccount: vaultTokenAccountPDA,
      vaultAuthority: vaultAuthorityPDA,
      systemProgram: SystemProgram.programId,
      tokenProgram: new PublicKey(
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      ),
      rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
    },
  });

  return {
    instruction,
    contributorPDA,
  };
}
