import {
  clusterApiUrl,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  CreateContributorProposalDto,
  CreateOrganizationDto,
  CreateTaskProposalDto,
  DeorgConfig,
  VoteContributorProposalDto,
} from './types';
import idl from './deorg_voting_program.json';
import {
  createOrganizationInstruction,
  initOrganizationTreasuryInstruction,
  registerOrganizationTreasuryInstruction,
} from './instructions';
import { convertUuid } from './helpers/convertUuid';
import { DeorgVotingProgram } from './deorg_voting_program';
import * as anchor from '@coral-xyz/anchor';
import { createContributorProposalInstruction } from './instructions/create-contributor-proposal-instruction';
import { voteContributorProposalInstruction } from './instructions/vote-contributor-proposal-instruction';
import { createTaskProposalInstruction } from './instructions/create-task-proposal-instruction';

export class Deorg {
  connection: Connection;
  PROGRAM_ID = new PublicKey(idl.address);

  constructor(config: DeorgConfig) {
    this.connection = new Connection(
      config.rpcUrl || clusterApiUrl('mainnet-beta'),
    );
  }

  async createOrganizationTransaction(dto: CreateOrganizationDto) {
    const { instruction, metadataInstruction, organizationPDA } =
      await createOrganizationInstruction(
        dto,
        this.PROGRAM_ID,
        this.connection,
      );

    const { instruction: initTreasuryTokenInstruction } =
      await initOrganizationTreasuryInstruction(
        organizationPDA.toString(),
        dto.creatorWallet,
        this.PROGRAM_ID,
        this.connection,
      );

    const treasuryTokenKeypair = new Keypair();

    const { instruction: registerTreasuryTokenInstruction } =
      await registerOrganizationTreasuryInstruction(
        organizationPDA.toString(),
        dto.creatorWallet,
        treasuryTokenKeypair,
        dto.tokenMint,
        this.PROGRAM_ID,
        this.connection,
      );

    const tx = new Transaction();

    // Add all instructions to the transaction
    tx.add(instruction);
    tx.add(metadataInstruction);
    if (initTreasuryTokenInstruction) {
      tx.add(initTreasuryTokenInstruction);
    }
    if (registerTreasuryTokenInstruction) {
      tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 400000,
        }),
      );
      tx.add(registerTreasuryTokenInstruction);
    }

    // Set the fee payer and recent blockhash
    tx.feePayer = new PublicKey(dto.creatorWallet);
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

    if (registerTreasuryTokenInstruction) {
      tx.sign(treasuryTokenKeypair);
    }

    return {
      transaction: tx,
      organizationPDA,
    };
  }

  async createContributorProposalTransaction(
    dto: CreateContributorProposalDto,
  ) {
    const { instruction, proposalPDA } =
      await createContributorProposalInstruction(
        dto,
        this.connection,
        this.PROGRAM_ID,
      );

    const transaction = new Transaction();
    transaction.add(instruction);
    transaction.feePayer = new PublicKey(dto.proposerWallet);
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    return {
      transaction,
      proposalPDA,
    };
  }

  async voteContributorProposalTransaction(dto: VoteContributorProposalDto) {
    const { instruction, proposalPDA } =
      await voteContributorProposalInstruction(
        dto,
        this.connection,
        this.PROGRAM_ID,
      );

    const transaction = new Transaction();
    transaction.add(instruction);
    transaction.feePayer = new PublicKey(dto.proposerWallet);
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    return {
      transaction,
      proposalPDA,
    };
  }

  async createTaskProposalTransaction(dto: CreateTaskProposalDto) {
    const organization = await this.getOrganizationDetails(
      dto.organizationAddress,
    );

    const { instruction, proposalPDA } = await createTaskProposalInstruction(
      dto,
      organization.tokenMint,
      this.connection,
      this.PROGRAM_ID,
    );

    const transaction = new Transaction();
    transaction.add(instruction);
    transaction.feePayer = new PublicKey(dto.proposerWallet);
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    return {
      transaction,
      proposalPDA,
    };
  }

  async getOrganizations() {
    const program = new anchor.Program<DeorgVotingProgram>(
      idl as DeorgVotingProgram,
      {
        connection: this.connection,
      },
    );

    const organizations = await program.account.organization.all([]);

    const metadata = await program.account.organizationMetadata.all([]);

    const organizationsData = organizations.map((organization) => {
      const meta = metadata.find(
        (m) =>
          m.account.organization.toBase58() ===
          organization.publicKey.toBase58(),
      );

      return {
        ...organization,
        metadata: {
          logoUrl: meta?.account.logoUrl,
          websiteUrl: meta?.account.websiteUrl,
          twitterUrl: meta?.account.twitterUrl,
          discordUrl: meta?.account.discordUrl,
          telegramUrl: meta?.account.telegramUrl,
          description: meta?.account.description,
        },
      };
    });

    return organizationsData.map((organization) => ({
      accountAddress: organization.publicKey.toBase58(),
      creator: organization.account.creator.toBase58(),
      uuid: convertUuid(organization.account.uuid),
      name: organization.account.name,
      contributors: organization.account.contributors.map((contributor) =>
        contributor.toBase58(),
      ),
      contributorProposalThresholdPercentage:
        organization.account.contributorProposalThresholdPercentage,
      contributorProposalValidityPeriod:
        organization.account.contributorProposalValidityPeriod.toNumber(),
      treasuryTransferQuorumPercentage:
        organization.account.treasuryTransferQuorumPercentage,
      tokenMint: organization.account.tokenMint.toBase58(),
      treasuryTransferThresholdPercentage:
        organization.account.treasuryTransferThresholdPercentage,
      treasuryTransferProposalValidityPeriod:
        organization.account.treasuryTransferProposalValidityPeriod.toNumber(),
      minimumTokenRequirement:
        organization.account.minimumTokenRequirement.toNumber(),
      contributorValidityPeriod:
        organization.account.contributorValidityPeriod.toNumber(),
      projectProposalValidityPeriod:
        organization.account.projectProposalValidityPeriod.toNumber(),
      contributorProposalQuorumPercentage:
        organization.account.contributorProposalQuorumPercentage,
      projectProposalThresholdPercentage:
        organization.account.projectProposalThresholdPercentage,
      metadata: organization.metadata,
    }));
  }

  async getOrganizationDetails(organizationAccount: string) {
    // Create a dummy wallet provider for read-only operations
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    } as anchor.Wallet;

    const provider = new anchor.AnchorProvider(this.connection, dummyWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });

    const program = new anchor.Program<DeorgVotingProgram>(
      idl as DeorgVotingProgram,
      provider,
    );

    const organization = await program.account.organization.fetch(
      new PublicKey(organizationAccount),
    );

    const treasuryTokenRegistry =
      await program.account.treasuryTokenRegistry.all([
        {
          memcmp: {
            offset: 8,
            bytes: organizationAccount,
          },
        },
      ]);

    const treasuryBalances: {
      tokenAccount: string;
      mint: string;
      raw: string;
      ui: number | null;
      decimals: number;
    }[] = [];
    for (const tokenAccount of treasuryTokenRegistry[0].account.tokenAccounts) {
      if (tokenAccount.tokenAccount) {
        const treasuryTokenAccountAmount =
          await this.connection.getTokenAccountBalance(
            tokenAccount.tokenAccount,
          );

        treasuryBalances.push({
          tokenAccount: tokenAccount.tokenAccount.toBase58(),
          mint: tokenAccount.mint.toBase58(),
          raw: treasuryTokenAccountAmount.value.amount,
          ui: treasuryTokenAccountAmount.value.uiAmount,
          decimals: treasuryTokenAccountAmount.value.decimals,
        });
      }
    }

    let orgmetadata: any = {};
    try {
      const result = await program.account.organizationMetadata.all([
        {
          memcmp: {
            offset: 8,
            bytes: organizationAccount,
          },
        },
      ]);

      orgmetadata = {
        logoUrl: result[0].account.logoUrl,
        websiteUrl: result[0].account.websiteUrl,
        twitterUrl: result[0].account.twitterUrl,
        discordUrl: result[0].account.discordUrl,
        telegramUrl: result[0].account.telegramUrl,
        description: result[0].account.description,
      };
    } catch (error) {
      console.error('Error fetching organization metadata', error);
    }

    return {
      accountAddress: organizationAccount,
      creator: organization.creator.toBase58(),
      uuid: convertUuid(organization.uuid),
      name: organization.name,
      contributors: organization.contributors.map((contributor) =>
        contributor.toBase58(),
      ),
      contributorProposalThresholdPercentage:
        organization.contributorProposalThresholdPercentage,
      contributorProposalValidityPeriod:
        organization.contributorProposalValidityPeriod.toNumber(),
      treasuryTransferQuorumPercentage:
        organization.treasuryTransferQuorumPercentage,
      tokenMint: organization.tokenMint.toBase58(),
      treasuryTransferThresholdPercentage:
        organization.treasuryTransferThresholdPercentage,
      treasuryTransferProposalValidityPeriod:
        organization.treasuryTransferProposalValidityPeriod.toNumber(),
      minimumTokenRequirement: organization.minimumTokenRequirement.toNumber(),
      contributorValidityPeriod:
        organization.contributorValidityPeriod.toNumber(),
      projectProposalValidityPeriod:
        organization.projectProposalValidityPeriod.toNumber(),
      contributorProposalQuorumPercentage:
        organization.contributorProposalQuorumPercentage,
      projectProposalThresholdPercentage:
        organization.projectProposalThresholdPercentage,
      treasuryBalances,
      metadata: orgmetadata,
    };
  }
}
