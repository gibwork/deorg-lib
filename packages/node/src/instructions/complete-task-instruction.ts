import { Connection, PublicKey } from '@solana/web3.js';
import { DeorgVotingProgram } from '../deorg_voting_program';
import * as anchor from '@coral-xyz/anchor';
import idl from '../deorg_voting_program.json';
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';

export async function completeTaskInstruction(
  taskAddress: string,
  connection: Connection,
  programId: PublicKey,
  token: string,
  assignee: PublicKey,
  project: PublicKey,
) {
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

  const program = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    provider,
  );

  const tokenMint = new PublicKey(token);

  // Find task vault PDA
  const [taskVaultPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('task_vault'), new PublicKey(taskAddress).toBuffer()],
    programId,
  );

  // Find vault authority PDA
  const [vaultAuthorityPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('vault_authority'), new PublicKey(taskAddress).toBuffer()],
    programId,
  );

  // Find vault token account PDA
  const [vaultTokenAccountPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('vault_token_account'), new PublicKey(taskAddress).toBuffer()],
    programId,
  );

  // Get the assignee's token account
  const assigneeTokenAccounts = await connection.getParsedTokenAccountsByOwner(
    assignee,
    {
      mint: tokenMint,
    },
  );

  if (assigneeTokenAccounts.value.length === 0) {
    throw new Error('No token account found for the assignee');
  }

  const assigneeTokenAccount = assigneeTokenAccounts.value[0].pubkey;

  const instruction = program.instruction.completeTask({
    accounts: {
      assignee,
      project,
      task: new PublicKey(taskAddress),
      taskVault: taskVaultPDA,
      assigneeTokenAccount: assigneeTokenAccount,
      vaultTokenAccount: vaultTokenAccountPDA,
      vaultAuthority: vaultAuthorityPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  return {
    instruction,
    assigneeTokenAccount,
  };
}
