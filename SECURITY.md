# Seguridad de la API

## Medidas de Seguridad Implementadas

### 1. CORS (Cross-Origin Resource Sharing)
- Solo permite requests desde dominios específicos configurados
- Configurado en `src/main.ts`
- Dominios permitidos se definen en el array `origin`

### 2. Autenticación por API Key
- Todas las rutas protegidas requieren header `X-API-Key`
- Las API Keys válidas se configuran en variables de entorno
- Guard implementado en `src/auth/auth.guard.ts`

### 3. Rate Limiting
- Límite de 100 requests por minuto por IP
- Configurado con `@nestjs/throttler`
- Previene ataques de fuerza bruta y abuso

### 4. Variables de Entorno
- Configuración sensible en archivo `.env`
- API Keys nunca hardcodeadas en el código
- Usar `@nestjs/config` para acceso seguro

## Configuración

### Variables de Entorno Requeridas
```env
# Puerto de la aplicación
PORT=3000

# Claves API permitidas
FRONTEND_API_KEY=tu-clave-secreta-frontend
MOBILE_API_KEY=tu-clave-secreta-mobile

# Dominios permitidos para CORS
ALLOWED_ORIGINS=https://tu-frontend.com,https://tu-app.com

# Entorno
NODE_ENV=production
```

## Uso desde el Frontend

### Ejemplo de Request con API Key
```javascript
fetch('https://tu-api.com/endpoint', {
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'tu-clave-secreta-frontend'
  }
})
```

### Rutas Públicas
- `GET /health` - Health check (sin autenticación)

### Rutas Protegidas
- `GET /` - Requiere API Key
- Todas las rutas futuras requerirán API Key por defecto

## Recomendaciones Adicionales

1. **Usar HTTPS en producción** - Nunca HTTP para datos sensibles
2. **Rotar API Keys regularmente** - Cambiar keys periódicamente
3. **Monitorear logs** - Detectar intentos de acceso no autorizados
4. **Implementar JWT** - Para autenticación de usuarios más robusta
5. **Validar inputs** - Siempre validar datos de entrada
6. **Usar helmet** - Para headers de seguridad adicionales 