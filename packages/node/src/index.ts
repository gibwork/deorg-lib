import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { CreateOrganizationDto, DeorgConfig } from './types';
import idl from './deorg_voting_program.json';
import { createOrganizationInstruction } from './instructions';

export class Deorg {
  connection: Connection;
  PROGRAM_ID = new PublicKey(idl.address);

  constructor(config: DeorgConfig) {
    this.connection = new Connection(
      config.rpcUrl || clusterApiUrl('mainnet-beta'),
    );
  }

  async createOrganization(dto: CreateOrganizationDto) {
    const data = await createOrganizationInstruction(
      dto,
      this.PROGRAM_ID,
      this.connection,
    );

    return data;
  }
}
