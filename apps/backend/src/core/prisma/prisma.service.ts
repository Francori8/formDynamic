import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../node_modules/.prisma/client/index.js';
type PrismaClientInstance = InstanceType<typeof PrismaClient>;
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClientInstance;

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    this.client = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  get user() { return this.client.user; }
  get form() { return this.client.form; }
  get formLink() { return this.client.formLink; }
  get formLinkEmail() { return this.client.formLinkEmail; }
  get otpCode() { return this.client.otpCode; }
  get response() { return this.client.response; }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
