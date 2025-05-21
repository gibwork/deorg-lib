import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { DeorgVotingProgram } from '../deorg_voting_program';
import idl from '../deorg_voting_program.json';
import * as anchor from '@coral-xyz/anchor';

export async function initOrganizationTreasuryInstruction(
  organizationAddress: string,
  authority: string,
  programId: PublicKey,
  connection: Connection,
) {
  const program = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    connection as any,
  );

  const organization = new PublicKey(organizationAddress);

  // Calculate PDA for the treasury registry
  const [treasuryRegistryPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('treasury_registry'), organization.toBuffer()],
    programId,
  );

  const treasuryRegistryAccount =
    await connection.getAccountInfo(treasuryRegistryPDA);

  if (treasuryRegistryAccount) {
    return {
      instruction: null,
      treasuryRegistryPDA: treasuryRegistryPDA.toString(),
    };
  }

  const instruction = program.instruction.initializeTreasuryRegistry({
    accounts: {
      authority: new PublicKey(authority),
      organization,
      tokenRegistry: treasuryRegistryPDA,
      systemProgram: SystemProgram.programId,
    },
  });

  return { instruction, treasuryRegistryPDA: treasuryRegistryPDA.toString() };
}
