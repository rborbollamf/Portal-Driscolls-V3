# Monitoreo confiable

Las validaciones ya no usan datos de demostración. Cada proveedor se consulta desde el worker con un identificador de correlación, límite por proveedor, tiempo máximo de 15 segundos y una respuesta validada antes de afectar alertas.

## Configuración segura

Configure las URL de proveedores como variables de entorno y sus tokens únicamente como secretos del entorno:

- `SAT_VALIDATION_URL` y `SAT_API_TOKEN`
- `IMSS_VALIDATION_URL` y `IMSS_API_TOKEN`
- `FINANCIAL_VALIDATION_URL` y `FINANCIAL_API_TOKEN`
- `LEGAL_VALIDATION_URL` y `LEGAL_API_TOKEN`

Cada servicio recibe `POST` con `{ rfc, legalEntityId }`, un encabezado `Authorization: Bearer …` y `X-Correlation-Id`. Los contratos de respuesta se validan en `lib/adapters/`; una credencial o URL ausente deja un trabajo fallido visible, nunca un resultado simulado.

Las rutas de encolado requieren `Idempotency-Key`. El cliente debe conservar la misma llave al repetir una petición; EventBridge/SQS debe enviar una llave determinista por ventana y cohorte.

## Ejecución

Ejecute la aplicación web y el worker por separado:

```bash
npm run dev
npm run worker:monitoring
```

Los trabajos se reclaman mediante bloqueo de filas en PostgreSQL (`SKIP LOCKED`), por lo que más de un worker puede ejecutarse sin procesar un trabajo dos veces. Los errores transitorios se reintentan con espera exponencial (30 s a 1 h, máximo 4 intentos); los errores permanentes se marcan como fallidos. Un bloqueo que excede 10 minutos vuelve a la cola.

La llave de idempotencia evita que una repetición HTTP encole duplicados. Las alertas activas son únicas por entidad y regla; cambios y resoluciones quedan en `alert_history`. El ritmo máximo de cada proveedor se reserva en PostgreSQL para respetarlo incluso con varios workers.

## AWS recomendado

En producción, configure **EventBridge Scheduler** para publicar cada ventana de monitoreo en una cola **SQS**. Un worker en ECS/Fargate o Lambda debe convertir el mensaje en llamadas de encolado con una llave determinista por ventana, entidad y tipo. La tabla `monitoring_jobs` sigue siendo el registro de estado, idempotencia y auditoría; SQS aporta entrega desacoplada y escalado del consumidor. Configure una DLQ en SQS y una alarma de CloudWatch para mensajes en DLQ, trabajos `FAILED` y trabajos `RETRY` envejecidos.

No ejecute `node-cron` dentro del proceso web: los reinicios y el escalado horizontal hacen que esa alternativa no sea recuperable.