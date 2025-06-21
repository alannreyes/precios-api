import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS - Solo permitir dominios específicos
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4200',
      'https://tu-frontend.com',
      'https://www.tu-frontend.com',
      // Agregar más dominios según necesites
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // Configurar puerto desde variables de entorno
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 API running on: http://localhost:${port}`);
}
bootstrap();
