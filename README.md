# 🚀 Precios API - Sistema de Búsqueda Global de Precios

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

API avanzada para búsqueda y comparación global de precios de productos industriales, construida con NestJS y potenciada por IA.

## 🎯 Características Principales

- **🔍 Búsqueda Global Multi-País**: Consulta simultánea en PE, US, MX
- **🤖 Validación IA Avanzada**: OpenAI + Gemini para precisión máxima
- **📊 Análisis Estratégico**: Recomendaciones automáticas de importación
- **🏢 Multi-Marketplace**: MercadoLibre, Amazon Business, EFC, Grainger
- **⚡ Alta Performance**: Rate limiting, caching, logging estructurado
- **🔒 Seguridad Enterprise**: API Keys, CORS, validación robusta

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone <repository-url>
cd precios-api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp config.env.example .env.local
# Editar .env.local con tus API keys

# Inicializar base de datos (si aplica)
npm run db:init
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

```bash
# APIs de IA (Fase 2)
OPENAI_API_KEY=sk-proj-xxx
GEMINI_API_KEY=AIzaSyxxx
AI_VALIDATION_ENABLED=true

# Configuración del Servidor
NODE_ENV=development
PORT=3000
```

## 🚀 Ejecución

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Con Docker
docker-compose -f docker-compose.dev.yml up
```

## 📖 Uso de la API

### Búsqueda Local
```bash
GET /search?product=taladro bosch&country=PE
Headers: X-API-Key: your-api-key
```

### Búsqueda Global
```bash
GET /search/global?product=taladro bosch&countries=PE,US,MX&maxResults=20
Headers: X-API-Key: your-api-key
```

### Estado de IA
```bash
GET /search/ai-status
Headers: X-API-Key: your-api-key
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Cobertura
npm run test:cov

# Test de búsqueda
curl -X GET "http://localhost:3000/search/test" -H "X-API-Key: frontend-key-123"
```

## 📁 Estructura del Proyecto

```
src/
├── ai/              # Módulo de IA (OpenAI + Gemini)
├── auth/            # Autenticación y guards
├── config/          # Configuraciones (logger, etc.)
├── entities/        # Entidades de datos
├── scraping/        # Servicios de scraping
├── search/          # Controladores de búsqueda
├── sources/         # Gestión de fuentes de datos
└── main.ts          # Punto de entrada
```

## 🔧 API Keys de Desarrollo

Para pruebas locales, puedes usar estas keys:

```bash
# Frontend
X-API-Key: frontend-key-123

# Backend Services  
X-API-Key: backend-service-456

# Admin
X-API-Key: admin-super-key-789
```

## 🌟 Roadmap

- [x] **Fase 1**: Estructura base y seguridad
- [x] **Fase 2**: IA Avanzada (OpenAI + Gemini)
- [ ] **Fase 3**: Scraping real de marketplaces
- [ ] **Fase 4**: Dashboard y analytics
- [ ] **Fase 5**: API pública y monetización

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📋 Fuentes Configuradas

| Fuente | País | Tipo | Estado |
|--------|------|------|---------|
| MercadoLibre PE | 🇵🇪 | B2C | ✅ Activo |
| MercadoLibre MX | 🇲🇽 | B2C | ✅ Activo |
| Amazon Business US | 🇺🇸 | B2B | ✅ Activo |
| EFC PE | 🇵🇪 | B2B | ✅ Activo |
| Grainger US | 🇺🇸 | B2B | ✅ Activo |

## 📞 Soporte

- **Documentación**: [API Docs](http://localhost:3000/docs)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/precios-api/issues)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

<p align="center">
  Construido con ❤️ usando <a href="https://nestjs.com/">NestJS</a>
</p>
