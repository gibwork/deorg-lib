import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';

import { Connection, PublicKey } from '@solana/web3.js';

import { Keypair } from '@solana/web3.js';
import { DeorgVotingProgram } from '../deorg_voting_program';
import idl from '../deorg_voting_program.json';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';

export async function registerOrganizationTreasuryInstruction(
  organizationAddress: string,
  authority: string,
  treasuryTokenKeypair: Keypair,
  token: string,
  programId: PublicKey,
  connection: Connection,
) {
  const program = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    connection as any,
  );

  const organization = new PublicKey(organizationAddress);
  const tokenMint = new PublicKey(token);

  // Calculate PDA for the treasury registry
  const [treasuryRegistryPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('treasury_registry'), organization.toBuffer()],
    programId,
  );

  // Calculate treasury authority PDA (needed by executeFundsTransfer)
  // This is required for creating a reference to the authority for
  // the transaction instruction and token account operations
  const treasuryAuthoritySeed = await PublicKey.findProgramAddress(
    [Buffer.from('treasury_authority'), organization.toBuffer()],
    programId,
  );
  const _treasuryAuthorityPDA = treasuryAuthoritySeed[0];

  // Check if a token account for this mint already exists
  const existingTokenAccounts = await connection.getParsedTokenAccountsByOwner(
    _treasuryAuthorityPDA,
    {
      mint: tokenMint,
    },
  );

  if (existingTokenAccounts.value.length > 0) {
    return {
      instruction: null,
      treasuryTokenAccount: existingTokenAccounts.value[0].pubkey.toString(),
      treasuryTokenKeypair: null,
    };
  }

  // Calculate PDA for the treasury token account
  const [treasuryTokenAccountPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('treasury_token_account'), organization.toBuffer()],
    programId,
  );

  const instruction = program.instruction.registerTreasuryToken({
    accounts: {
      authority: new PublicKey(authority).toString(),
      organization: organization.toString(),
      treasuryTokenAccount: treasuryTokenKeypair.publicKey.toString(),
      tokenMint: tokenMint.toString(),
      treasuryAuthority: _treasuryAuthorityPDA.toString(),
      tokenRegistry: treasuryRegistryPDA.toString(),
      systemProgram: SystemProgram.programId.toString(),
      tokenProgram: TOKEN_PROGRAM_ID.toString(),
      rent: SYSVAR_RENT_PUBKEY.toString(),
    },
  });

  return {
    instruction,
    treasuryTokenAccount: treasuryTokenAccountPDA.toString(),
    treasuryTokenKeypair: null,
  };
}
