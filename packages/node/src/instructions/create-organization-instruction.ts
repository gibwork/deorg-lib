import { PublicKey, Connection, SystemProgram } from '@solana/web3.js';
import { CreateOrganizationDto } from '../types';
import { BN } from '@coral-xyz/anchor';
import { DeorgVotingProgram } from '../deorg_voting_program';
import idl from '../deorg_voting_program.json';
import * as anchor from '@coral-xyz/anchor';

export async function createOrganizationInstruction(
  dto: CreateOrganizationDto,
  programId: PublicKey,
  connection: Connection,
) {
  const program = new anchor.Program<DeorgVotingProgram>(
    idl as DeorgVotingProgram,
    connection as any,
  );

  const walletPublicKey = new PublicKey(dto.creatorWallet);

  const uuidBytes = new Uint8Array(16);
  const uuidParts = dto.organizationId.replace(/-/g, '');
  for (let i = 0; i < 16; i++) {
    uuidBytes[i] = parseInt(uuidParts.substring(i * 2, i * 2 + 2), 16);
  }

  const uuidBuffer = Buffer.from(uuidBytes);

  const [organizationPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('organization'), walletPublicKey.toBuffer(), uuidBuffer],
    programId,
  );

  const [creatorContributorPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('contributor'),
      organizationPDA.toBuffer(),
      walletPublicKey.toBuffer(),
    ],
    programId,
  );

  const tokenMint = new PublicKey(dto.tokenMint);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    walletPublicKey,
    { mint: tokenMint },
  );
  const creatorTokenAccount = tokenAccounts.value[0].pubkey;

  const [orgMetadataPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('metadata'), organizationPDA.toBuffer()],
    programId,
  );

  const instruction = program.instruction.createOrganization(
    uuidBytes,
    dto.name,
    dto.contributorProposalThreshold,
    new BN(dto.contributorProposalValidityPeriod * 24 * 60 * 60),
    new BN(dto.contributorValidityPeriod * 24 * 60 * 60),
    dto.contributorProposalQuorumPercentage,
    dto.projectProposalThreshold,
    new BN(dto.projectProposalValidityPeriod * 24 * 60 * 60),
    new BN(dto.minimumTokenRequirement),
    dto.treasuryTransferThresholdPercentage || 70,
    new BN((dto.treasuryTransferProposalValidityPeriod || 14) * 24 * 60 * 60),
    dto.treasuryTransferQuorumPercentage || 40,
    new BN(100),
    {
      accounts: {
        creator: walletPublicKey,
        organization: organizationPDA,
        creatorContributor: creatorContributorPDA,
        tokenMint: tokenMint,
        creatorTokenAccount: creatorTokenAccount,
        systemProgram: SystemProgram.programId,
      },
    },
  );

  const metadataInstruction =
    program.instruction.initializeOrganizationMetadata(
      dto.logoUrl || null,
      dto.websiteUrl || null,
      dto.twitterUrl || null,
      dto.discordUrl || null,
      dto.telegramUrl || null,
      dto.description || null,
      {
        accounts: {
          creator: walletPublicKey,
          organization: organizationPDA,
          metadata: orgMetadataPDA,
          systemProgram: SystemProgram.programId,
        },
      },
    );

  return { instruction, metadataInstruction, organizationPDA };
}
