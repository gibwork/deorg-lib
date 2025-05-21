import { PublicKey } from '@solana/web3.js';

export type DeorgConfig = {
  rpcUrl?: string;
};

export type CreateOrganizationDto = {
  tokenMint: string;
  name: string;
  contributorProposalThreshold: number;
  contributorProposalValidityPeriod: number;
  contributorValidityPeriod: number;
  contributorProposalQuorumPercentage: number;
  projectProposalThreshold: number;
  projectProposalValidityPeriod: number;
  minimumTokenRequirement: number;
  treasuryTransferThresholdPercentage?: number;
  treasuryTransferProposalValidityPeriod?: number;
  treasuryTransferQuorumPercentage?: number;
  creatorWallet: string;
  organizationId: string;
  logoUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  description?: string;
};

export type CreateContributorProposalDto = {
  organizationAccount: string;
  candidateWallet: string;
  proposerWallet: string;
  proposedRate: number;
  tokenMint: string;
};

export type VoteContributorProposalDto = {
  organizationAddress: string;
  proposalAddress: string;
  vote: boolean;
  proposerWallet: string;
  tokenMint: string;
};

export type CreateTaskProposalDto = {
  projectAddress: string;
  title: string;
  paymentAmount: number;
  assignee: string;
  description: string;
  organizationAddress: string;
  proposerWallet: string;
};

export type VoteTaskProposalDto = {
  organizationAddress: string;
  proposalAddress: string;
  vote: boolean;
  proposerWallet: string;
  projectAddress: string;
  assignee: string;
};

export type CreateProjectProposalDto = {
  id: string;
  name: string;
  description: string;
  members: PublicKey[];
  organizationAddress: string;
  projectProposalThreshold: number;
  projectProposalValidityPeriod: number;
  proposerWallet: string;
};

export type VoteProjectProposalDto = {
  organizationAddress: string;
  proposalAddress: string;
  vote: boolean;
  proposerWallet: string;
};

export enum ProposalType {
  CONTRIBUTOR = 'CONTRIBUTOR',
  PROJECT = 'PROJECT',
  TASK = 'TASK',
}
