import {
  clusterApiUrl,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { CreateOrganizationDto, DeorgConfig } from './types';
import idl from './deorg_voting_program.json';
import {
  createOrganizationInstruction,
  initOrganizationTreasuryInstruction,
  registerOrganizationTreasuryInstruction,
} from './instructions';

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
      await this.initOrganizationTreasury(
        organizationPDA.toString(),
        dto.creatorWallet,
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

    return tx;
  }

  async initOrganizationTreasury(
    organizationAddress: string,
    authority: string,
  ) {
    const data = await initOrganizationTreasuryInstruction(
      organizationAddress,
      authority,
      this.PROGRAM_ID,
      this.connection,
    );

    return data;
  }
}
