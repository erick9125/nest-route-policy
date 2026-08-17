import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('Invoices API listening on http://localhost:3000');
  console.log('Identify as user-a, user-b, manager-a, or admin-a with the x-user header.');
}

void bootstrap();
