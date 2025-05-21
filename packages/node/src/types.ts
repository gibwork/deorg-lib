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
  organizationAccount: string;
  candidateWallet: string;
  proposerWallet: string;
  proposedRate: number;
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
