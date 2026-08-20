import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Zezwalamy na komunikację (Nginx i tak to zabezpiecza)
  app.enableCors({
    origin: '*', // W produkcji lepiej podać konkretny adres, np. 'https://mojadomena.pl'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.listen(3000);
}
bootstrap();
