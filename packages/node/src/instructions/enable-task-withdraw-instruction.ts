import { SYSVAR_RENT_PUBKEY } from '@solana/web3.js';

import { PublicKey, Connection, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import idl from '../deorg_voting_program.json';
import { DeorgVotingProgram } from '../deorg_voting_program';
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';

export async function enableTaskVaultWithdrawalInstruction(
  taskAddress: string,
  reviewer: string,
  connection: Connection,
  programId: PublicKey,
  token: string,
  assignee: PublicKey,
  project: PublicKey,
  taskVault: PublicKey,
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

  const tokenMint = new PublicKey(token);

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

  const instruction = program.instruction.enableTaskVaultWithdrawal({
    accounts: {
      reviewer: new PublicKey(reviewer),
      project,
      task: new PublicKey(taskAddress),
      taskVault,
      assigneeTokenAccount,
      vaultTokenAccount: vaultTokenAccountPDA,
      vaultAuthority: vaultAuthorityPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY.toString(),
    },
  });

  return {
    instruction,
  };
}
