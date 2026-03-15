# pretix Headless / API Reference

Documentacion completa de la funcionalidad headless de pretix: API REST, autenticacion, webhooks, widget embebible y OpenID Connect.

**Instancia de referencia:** `https://pretix.ovopaydemo.live/`

---

## Tabla de Contenidos

- [Diagnostico de la Instancia](#diagnostico-de-la-instancia)
- [Setup Requerido para Frontend Headless](#setup-requerido-para-frontend-headless)
- [Arquitectura General](#arquitectura-general)
- [Autenticacion y API Keys](#autenticacion-y-api-keys)
- [Endpoints de la API REST](#endpoints-de-la-api-rest)
- [Widget Embebible (Presale)](#widget-embebible-presale)
- [Sistema de Webhooks](#sistema-de-webhooks)
- [OpenID Connect (Customer SSO)](#openid-connect-customer-sso)
- [OAuth2 para Aplicaciones](#oauth2-para-aplicaciones)
- [Device API](#device-api)
- [Paginacion, Filtrado e Idempotencia](#paginacion-filtrado-e-idempotencia)
- [Permisos](#permisos)
- [Gaps y Mejoras Potenciales](#gaps-y-mejoras-potenciales)

---

## Diagnostico de la Instancia

**URL:** `https://pretix.ovopaydemo.live/`
**Estado:** Operativa (responde correctamente, en espanol)
**Certificado SSL:** Self-signed (los clientes API deben deshabilitar verificacion SSL o instalar el certificado)
**Titulo:** "OvoPay Pretix"

### Token Validado

**Token activo:** Asociado al equipo **"Remoto"** (id: 2) del organizador **"PrestaYa"** (`prestaya-latam`).

**Permisos del token:** Todos habilitados excepto `can_checkin_orders`.

### Estado de Recursos

| Recurso | Estado | Accion |
|---------|--------|--------|
| Organizador | `prestaya-latam` (PrestaYa) | OK |
| Eventos | **0 eventos** | CREAR al menos uno con productos y cuotas |
| Plugins de pago | **Ninguno activo** | ACTIVAR Stripe, PayPal o transferencia |
| Webhooks | **0 configurados** | CREAR para notificaciones de pedidos |
| Sales Channels | Solo `web` | OK para empezar |
| CORS | **No configurado** | CONFIGURAR en nginx para frontend externo |
| SSL | Self-signed | INSTALAR certificado valido (Let's Encrypt) |
| Locale | Espanol (`es`) | OK |
| Check-in | Deshabilitado en token | HABILITAR si el frontend lo requiere |

**Nota sobre el nombre de token:** `re_iynRDjvN_AY2GP1MpdfeaDhhwGvrKMLUY` es el **nombre** asignado al primer token creado (no el token en si). Los tokens reales son de 64 caracteres `[a-z0-9]`.

### Como crear un Team API Token valido

1. Ir a `https://pretix.ovopaydemo.live/control/`
2. Iniciar sesion con cuenta de administrador
3. Navegar a: **Organizadores** > *{tu organizador}* > **Teams** (Equipos)
4. Seleccionar un equipo existente o crear uno nuevo con los permisos necesarios (ver seccion [Permisos](#permisos))
5. En la pestana **"API Tokens"** del equipo, hacer clic en **"Create a new token"**
6. Copiar el token de 64 caracteres generado (**se muestra solo una vez**)

```bash
# Verificar el token:
curl -k -H "Authorization: Token <tu-token-de-64-chars>" \
     https://pretix.ovopaydemo.live/api/v1/organizers/
```

---

## Setup Requerido para Frontend Headless

Para conectar un frontend separado (React, Vue, Next.js, etc.) a pretix como backend headless, necesitas configurar lo siguiente:

### 1. Crear Organizador y Evento (si no existen)

Desde el panel de control (`/control/`):
- Crear al menos un **Organizador**
- Crear al menos un **Evento** con productos y cuotas

### 2. Crear Team API Token (BLOQUEANTE - sin esto nada funciona)

Ver instrucciones arriba. El equipo debe tener **al minimo** estos permisos:
- `can_view_orders` - Ver pedidos
- `can_change_orders` - Crear/modificar pedidos
- `can_change_items` - Leer productos (si, se necesita "change" para leer via API)
- `can_view_vouchers` - Validar vouchers

Para un frontend de venta completo, se recomienda:
- `can_view_orders` + `can_change_orders`
- `can_change_items`
- `can_view_vouchers`
- `can_change_event_settings` (para leer configuracion del evento)

### 3. Configurar CORS en el Servidor (BLOQUEANTE para frontend en navegador)

**Problema critico:** La API REST de pretix **NO incluye headers CORS**. Un frontend en navegador en otro dominio sera bloqueado por la politica de same-origin.

**Solucion A - Reverse proxy (recomendada):**

Agregar headers CORS en nginx/caddy delante de pretix:

```nginx
# En la configuracion de nginx del servidor pretix.ovopaydemo.live
location /api/ {
    # Headers CORS
    add_header Access-Control-Allow-Origin "https://tu-frontend.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Idempotency-Key" always;
    add_header Access-Control-Max-Age 86400 always;

    # Preflight OPTIONS
    if ($request_method = OPTIONS) {
        return 204;
    }

    proxy_pass http://pretix_upstream;
}
```

**Solucion B - django-cors-headers (cambio en el codigo):**

```bash
pip install django-cors-headers
```

En `pretix.cfg` o settings custom:
```python
INSTALLED_APPS += ['corsheaders']
MIDDLEWARE.insert(0, 'corsheaders.middleware.CorsMiddleware')
CORS_ALLOWED_ORIGINS = ["https://tu-frontend.com"]
CORS_ALLOW_HEADERS = ["authorization", "content-type", "x-idempotency-key"]
```

**Solucion C - API Gateway / BFF (Backend-for-Frontend):**

Crear un servidor intermedio (Node.js, Python, etc.) que haga proxy a la API de pretix. El frontend habla con el BFF (mismo dominio), y el BFF habla con pretix server-side (sin restricciones CORS).

### 4. Certificado SSL Valido (RECOMENDADO)

El sitio usa un certificado self-signed. Para un frontend en produccion:
- Instalar un certificado valido (Let's Encrypt es gratuito)
- O el frontend debe configurarse para aceptar certificados self-signed (solo en desarrollo)

### 5. Flujo de Integracion Headless Completo

```
Frontend (React/Vue/Next.js)
    |
    |  HTTPS + Authorization: Token <team-api-token>
    |
    v
[CORS Layer] -- nginx / API Gateway / BFF
    |
    v
pretix API (https://pretix.ovopaydemo.live/api/v1/)
    |
    +-- GET /organizers/{org}/events/{event}/items/     --> Listar productos
    +-- GET /organizers/{org}/events/{event}/quotas/     --> Disponibilidad
    +-- POST /organizers/{org}/events/{event}/cartpositions/  --> Agregar al carrito
    +-- POST /organizers/{org}/events/{event}/orders/    --> Crear pedido
    +-- GET /organizers/{org}/events/{event}/orders/{code}/ --> Estado del pedido
    +-- Webhooks --> Notificar al frontend de cambios
```

### 6. Endpoints Minimos para un Frontend de Venta

| Paso | Endpoint | Metodo | Descripcion |
|------|----------|--------|-------------|
| Listar eventos | `/api/v1/organizers/{org}/events/` | GET | Eventos disponibles |
| Detalle evento | `/api/v1/organizers/{org}/events/{event}/` | GET | Info del evento |
| Productos | `/api/v1/organizers/{org}/events/{event}/items/` | GET | Listar productos/entradas |
| Categorias | `/api/v1/organizers/{org}/events/{event}/categories/` | GET | Categorias de productos |
| Disponibilidad | `/api/v1/organizers/{org}/events/{event}/quotas/` | GET | Stock/cuotas con `?with_availability=true` |
| Preguntas | `/api/v1/organizers/{org}/events/{event}/questions/` | GET | Preguntas del formulario |
| Agregar al carrito | `/api/v1/organizers/{org}/events/{event}/cartpositions/` | POST | Crear posicion de carrito |
| Crear pedido | `/api/v1/organizers/{org}/events/{event}/orders/` | POST | Finalizar compra |
| Ver pedido | `/api/v1/organizers/{org}/events/{event}/orders/{code}/` | GET | Estado y detalles |
| Aplicar voucher | `/api/v1/organizers/{org}/events/{event}/cartpositions/` | POST | Con campo `voucher` |
| Sub-eventos | `/api/v1/organizers/{org}/events/{event}/subevents/` | GET | Fechas de series |

### 7. Ejemplo: Crear un Pedido via API

```bash
curl -k -X POST \
  -H "Authorization: Token <tu-token-de-64-chars>" \
  -H "Content-Type: application/json" \
  https://pretix.ovopaydemo.live/api/v1/organizers/{org}/events/{event}/orders/ \
  -d '{
    "email": "cliente@example.com",
    "locale": "es",
    "payment_provider": "banktransfer",
    "positions": [
      {
        "item": 1,
        "variation": null,
        "answers": []
      }
    ]
  }'
```

### 8. Checklist de Prerequisitos

- [ ] **Certificado SSL valido** (o aceptar self-signed en desarrollo)
- [ ] **Organizador creado** en el panel de control
- [ ] **Evento creado** con al menos un producto y una cuota
- [ ] **Team API Token generado** (64 caracteres, desde el panel de control)
- [ ] **CORS configurado** (nginx, django-cors-headers, o BFF)
- [ ] **Webhook configurado** (opcional, para notificaciones push)
- [ ] **Evento activado** ("live") para que acepte pedidos

---

## Arquitectura General

La funcionalidad headless de pretix se compone de:

| Componente | Base URL | Proposito |
|---|---|---|
| API REST v1 | `/api/v1/` | CRUD completo de todos los recursos |
| Widget API | `/events/{event}/widget/` | Listado de productos para widgets embebidos |
| OAuth2 | `/api/v1/oauth/` | Autenticacion de aplicaciones terceras |
| Device API | `/api/v1/device/` | Gestion de dispositivos de check-in |
| OIDC (Customer SSO) | `/oauth2/v1/` | Single Sign-On para clientes |
| Webhooks | Configurado via API | Notificaciones push de eventos |

**Archivos clave del codigo:**

| Archivo | Responsabilidad |
|---|---|
| `src/pretix/api/urls.py` | Enrutamiento de toda la API |
| `src/pretix/api/auth/token.py` | Autenticacion por Team API Token |
| `src/pretix/api/auth/device.py` | Autenticacion por Device Token |
| `src/pretix/api/auth/session.py` | Autenticacion por sesion (CSRF) |
| `src/pretix/api/auth/permission.py` | Sistema de permisos |
| `src/pretix/api/middleware.py` | Idempotencia y scoping |
| `src/pretix/api/webhooks.py` | Motor de webhooks |
| `src/pretix/presale/views/widget.py` | Widget API de productos |

---

## Autenticacion y API Keys

### 1. Team API Token (Principal para integraciones headless)

**Header:** `Authorization: Token <token>`

**Modelo:** `TeamAPIToken` en `src/pretix/base/models/organizer.py`
- Token de 64 caracteres alfanumericos, generado automaticamente
- Asociado a un **Team**, hereda los permisos del equipo
- Campos: `team`, `name`, `active`, `token`

**Como crear un Team API Token:**
1. Ir a **Control Panel** > **Organizadores** > **{Organizador}** > **Teams**
2. Seleccionar o crear un equipo con los permisos deseados
3. En la seccion "API Tokens" del equipo, crear un nuevo token
4. **Via API:** `POST /api/v1/organizers/{organizer}/teams/{team}/tokens/`

**Ejemplo de uso:**
```bash
curl -H "Authorization: Token abc123def456..." \
     https://pretix.example.com/api/v1/organizers/myorg/events/
```

### 2. Device Token (para dispositivos de check-in)

**Header:** `Authorization: Device <token>`

**Modelo:** `Device` en `src/pretix/base/models/devices.py`
- Token de 64 caracteres, asignado tras inicializacion
- `initialization_token`: Token de 16 caracteres para setup inicial
- `security_profile`: Restringe capacidades (`full`, `checkinonly`)
- Permisos fijos: `can_view_orders`, `can_change_orders`, `can_view_vouchers`, `can_manage_gift_cards`, `can_manage_reusable_media`

**Flujo de inicializacion:**
```bash
# 1. Crear dispositivo via API (requiere Team Token)
POST /api/v1/organizers/{organizer}/devices/

# 2. Inicializar dispositivo con el initialization_token
POST /api/v1/device/initialize
Body: {"token": "<initialization_token>", "hardware_brand": "...", ...}
# Respuesta incluye el api_token definitivo
```

### 3. OAuth2 Bearer Token (para apps terceras)

**Header:** `Authorization: Bearer <access_token>`

**Modelo:** `OAuthAccessToken` en `src/pretix/api/models.py`
- Scopes soportados: `read`, `write`, `profile`
- Restringido por organizador
- Requiere registro previo de `OAuthApplication`

### 4. Session Authentication (para frontend)

- Basada en cookies de sesion Django
- Requiere header CSRF (`X-CSRFToken`)
- Solo util para integraciones en el mismo dominio
- Clase: `SessionAuthentication` en `src/pretix/api/auth/session.py`

**Orden de evaluacion:** TeamToken > DeviceToken > Session > OAuth2

---

## Endpoints de la API REST

Base URL: `/api/v1/`

### Utilidades

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/version` | Version de la API |
| GET | `/me` | Perfil del usuario autenticado |
| POST | `/upload` | Subir archivo |
| POST | `/idempotency_query` | Consultar clave de idempotencia |

### Organizadores

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/organizers/` | Listar organizadores |
| GET | `/organizers/{organizer}/` | Detalle de organizador |
| PATCH | `/organizers/{organizer}/` | Actualizar organizador |
| GET/PATCH | `/organizers/{organizer}/settings/` | Configuracion del organizador |

### Equipos y Tokens

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `/organizers/{organizer}/teams/` | Listar/crear equipos |
| GET/PUT/PATCH/DELETE | `/organizers/{organizer}/teams/{team}/` | CRUD equipo |
| GET/POST | `/organizers/{organizer}/teams/{team}/tokens/` | Listar/crear API tokens |
| DELETE | `/organizers/{organizer}/teams/{team}/tokens/{id}/` | Revocar API token |
| GET | `/organizers/{organizer}/teams/{team}/members/` | Listar miembros |
| DELETE | `/organizers/{organizer}/teams/{team}/members/{id}/` | Eliminar miembro |
| GET/POST | `/organizers/{organizer}/teams/{team}/invites/` | Listar/crear invitaciones |
| DELETE | `/organizers/{organizer}/teams/{team}/invites/{id}/` | Cancelar invitacion |

### Eventos

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `/organizers/{organizer}/events/` | Listar/crear eventos |
| GET/PUT/PATCH/DELETE | `/organizers/{organizer}/events/{event}/` | CRUD evento |
| POST | `/organizers/{organizer}/events/{event}/clone/` | Clonar evento |
| GET/PATCH | `/organizers/{organizer}/events/{event}/settings/` | Configuracion del evento |

### Sub-eventos (series de fechas)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `/organizers/{organizer}/events/{event}/subevents/` | Listar/crear sub-eventos |
| GET/PUT/PATCH/DELETE | `/organizers/{organizer}/events/{event}/subevents/{id}/` | CRUD sub-evento |
| GET/POST | `/organizers/{organizer}/subevents/` | Sub-eventos a nivel organizador |

### Productos (Items)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `/organizers/{organizer}/events/{event}/items/` | Listar/crear productos |
| GET/PUT/PATCH/DELETE | `.../items/{item}/` | CRUD producto |
| GET/POST | `.../items/{item}/variations/` | Variaciones del producto |
| GET/POST | `.../items/{item}/addons/` | Add-ons del producto |
| GET/POST | `.../items/{item}/bundles/` | Bundles del producto |
| GET/POST | `.../items/{item}/program_times/` | Horarios del programa |
| GET/POST | `.../categories/` | Categorias de productos |
| GET/POST | `.../questions/` | Preguntas personalizadas |
| GET/POST | `.../questions/{question}/options/` | Opciones de preguntas |
| GET/POST | `.../quotas/` | Cuotas/disponibilidad |
| GET/POST | `.../discounts/` | Descuentos |
| GET/POST | `.../taxrules/` | Reglas de impuestos |
| GET/POST | `.../item_meta_properties/` | Meta-propiedades de items |

### Pedidos (Orders)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `.../events/{event}/orders/` | Listar/crear pedidos |
| GET/PATCH/DELETE | `.../orders/{code}/` | CRUD pedido |
| GET | `.../orders/{code}/payments/` | Pagos del pedido |
| POST | `.../orders/{code}/payments/` | Crear pago |
| GET | `.../orders/{code}/refunds/` | Reembolsos del pedido |
| POST | `.../orders/{code}/refunds/` | Crear reembolso |
| GET/POST | `.../orderpositions/` | Posiciones de pedido |
| GET | `.../transactions/` | Transacciones |
| GET | `.../invoices/` | Facturas |
| GET | `/organizers/{organizer}/orders/` | Pedidos a nivel organizador (solo lectura) |
| GET | `/organizers/{organizer}/orderpositions/` | Posiciones a nivel organizador |
| GET | `/organizers/{organizer}/invoices/` | Facturas a nivel organizador |
| GET | `/organizers/{organizer}/transactions/` | Transacciones a nivel organizador |

### Carrito (Cart)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `.../cartpositions/` | Listar/crear posiciones de carrito |
| POST | `.../cartpositions/bulk_create/` | Crear multiples posiciones |
| DELETE | `.../cartpositions/{id}/` | Eliminar posicion |

### Vouchers

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `.../vouchers/` | Listar/crear vouchers |
| GET/PUT/PATCH/DELETE | `.../vouchers/{id}/` | CRUD voucher |

### Check-in

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `.../checkinlists/` | Listar/crear listas de check-in |
| GET/PUT/PATCH/DELETE | `.../checkinlists/{id}/` | CRUD lista |
| GET | `.../checkinlists/{list}/positions/` | Posiciones en la lista |
| GET | `.../checkins/` | Registros de check-in |
| POST | `/organizers/{organizer}/checkinrpc/redeem/` | RPC: canjear entrada |
| GET | `/organizers/{organizer}/checkinrpc/search/` | RPC: buscar entradas |
| POST | `/organizers/{organizer}/checkinrpc/annul/` | RPC: anular check-in |

### Waiting List

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `.../waitinglistentries/` | Listar/crear entradas de espera |
| GET/PUT/PATCH/DELETE | `.../waitinglistentries/{id}/` | CRUD entrada |

### Gift Cards

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `/organizers/{organizer}/giftcards/` | Listar/crear tarjetas regalo |
| GET/PUT/PATCH/DELETE | `.../giftcards/{id}/` | CRUD tarjeta |
| GET | `.../giftcards/{giftcard}/transactions/` | Transacciones de la tarjeta |

### Clientes y Membresías

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `/organizers/{organizer}/customers/` | Listar/crear clientes |
| GET/PUT/PATCH/DELETE | `.../customers/{id}/` | CRUD cliente |
| GET/POST | `/organizers/{organizer}/memberships/` | Membresías |
| GET/POST | `/organizers/{organizer}/membershiptypes/` | Tipos de membresía |

### Otros Recursos

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET/POST | `/organizers/{organizer}/webhooks/` | Webhooks |
| GET/POST | `/organizers/{organizer}/seatingplans/` | Planes de asientos |
| GET/POST | `/organizers/{organizer}/saleschannels/` | Canales de venta |
| GET/POST | `/organizers/{organizer}/devices/` | Dispositivos |
| GET/POST | `/organizers/{organizer}/reusablemedia/` | Medios reutilizables |
| GET | `.../events/{event}/seats/` | Asientos del evento |
| GET | `.../revokedsecrets/` | Secretos revocados |
| GET | `.../blockedsecrets/` | Secretos bloqueados |

### Exportadores

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `.../exporters/` | Listar exportadores disponibles |
| GET | `.../exporters/{id}/` | Detalle de exportador |
| GET/POST | `.../scheduled_exports/` | Exportaciones programadas |
| GET | `/organizers/{organizer}/exporters/` | Exportadores a nivel organizador |

### Shredders (GDPR)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `.../shredders/` | Listar shredders de datos |
| GET | `.../shredders/{id}/` | Detalle de shredder |

---

## Widget Embebible (Presale)

El widget permite embeber la tienda de entradas en sitios web externos sin necesidad de redirigir al usuario.

### Endpoints del Widget

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/{organizer}/{event}/widget/product_list` | Lista de productos (JSON) |
| GET | `/{organizer}/{event}/{subevent}/widget/product_list` | Productos de sub-evento |
| GET | `/{organizer}/widget/product_list` | Productos a nivel organizador |
| GET | `/{organizer}/{event}/widget/v{version}.css` | CSS del widget |
| GET | `/widget/v{version}.{lang}.js` | JavaScript del widget |

**Version actual del widget:** 2

### CORS

Los endpoints del widget envian `Access-Control-Allow-Origin: *` para permitir la carga cross-origin. CSP se deshabilita para estos recursos.

### Cart Namespace (Seguridad)

El widget usa un sistema de **cart namespace** para aislar sesiones de carrito:
- Namespace de 16 caracteres alfanumericos (`[a-zA-Z0-9]{16}`)
- URLs de carrito: `/w/{cart_namespace}/cart/add`, `/w/{cart_namespace}/cart/remove`, etc.
- CSRF exempt para `cart/add` cross-origin
- Implementado en `src/pretix/presale/views/cart.py` (funcion `get_or_create_cart_id`)

### Archivos del Widget

| Archivo | Descripcion |
|---|---|
| `src/pretix/static/pretixpresale/js/widget/widget.js` | Widget principal (Vue.js) |
| `src/pretix/static/pretixpresale/js/widget/docready.js` | Polyfill document ready |
| `src/pretix/static/pretixpresale/js/widget/floatformat.js` | Formateo de precios |
| `src/pretix/static/pretixpresale/scss/widget.scss` | Estilos del widget |
| `src/pretix/presale/views/widget.py` | Backend del widget |

### Ejemplo de integracion del Widget

```html
<link rel="stylesheet" href="https://pretix.example.com/myorg/myevent/widget/v2.css">
<script src="https://pretix.example.com/widget/v2.en.js" async></script>
<pretix-widget event="https://pretix.example.com/myorg/myevent/"></pretix-widget>
```

---

## Sistema de Webhooks

Los webhooks notifican a sistemas externos cuando ocurren eventos en pretix.

### Configuracion via API

```bash
# Crear webhook
POST /api/v1/organizers/{organizer}/webhooks/
{
    "target_url": "https://example.com/webhook",
    "enabled": true,
    "all_events": true,
    "comment": "Mi webhook",
    "listeners": [
        {"action_type": "pretix.event.order.placed"},
        {"action_type": "pretix.event.order.paid"}
    ]
}
```

### Eventos de Webhook Registrados

**Pedidos:**
| Evento | Descripcion |
|---|---|
| `pretix.event.order.placed` | Nuevo pedido creado |
| `pretix.event.order.placed.require_approval` | Pedido requiere aprobacion |
| `pretix.event.order.paid` | Pedido marcado como pagado |
| `pretix.event.order.canceled` | Pedido cancelado |
| `pretix.event.order.reactivated` | Pedido reactivado |
| `pretix.event.order.expired` | Pedido expirado |
| `pretix.event.order.expirychanged` | Fecha de expiracion cambiada |
| `pretix.event.order.modified` | Informacion del pedido cambiada |
| `pretix.event.order.contact.changed` | Direccion de contacto cambiada |
| `pretix.event.order.changed.*` | Pedido modificado (cualquier cambio) |
| `pretix.event.order.approved` | Pedido aprobado |
| `pretix.event.order.denied` | Pedido denegado |
| `pretix.event.order.deleted` | Pedido eliminado |

**Pagos y Reembolsos:**
| Evento | Descripcion |
|---|---|
| `pretix.event.order.refund.created` | Reembolso creado |
| `pretix.event.order.refund.created.externally` | Reembolso externo |
| `pretix.event.order.refund.requested` | Reembolso solicitado por cliente |
| `pretix.event.order.refund.done` | Reembolso completado |
| `pretix.event.order.refund.canceled` | Reembolso cancelado |
| `pretix.event.order.refund.failed` | Reembolso fallido |
| `pretix.event.order.payment.confirmed` | Pago confirmado |

**Check-in:**
| Evento | Descripcion |
|---|---|
| `pretix.event.checkin` | Entrada registrada (incluye `checkin_list`, `type`, `first_checkin`) |
| `pretix.event.checkin.reverted` | Check-in revertido |

**Eventos:**
| Evento | Descripcion |
|---|---|
| `pretix.event.added` | Evento creado |
| `pretix.event.changed` | Evento modificado |
| `pretix.event.deleted` | Evento eliminado |
| `pretix.event.live.activated` | Tienda activada (live) |
| `pretix.event.live.deactivated` | Tienda desactivada |
| `pretix.event.testmode.activated` | Modo test activado |
| `pretix.event.testmode.deactivated` | Modo test desactivado |

**Sub-eventos:**
| Evento | Descripcion |
|---|---|
| `pretix.subevent.added` | Fecha de serie creada |
| `pretix.subevent.changed` | Fecha de serie modificada |
| `pretix.subevent.deleted` | Fecha de serie eliminada |

**Productos:**
| Evento | Descripcion |
|---|---|
| `pretix.event.item.*` | Producto cambiado (incluye variaciones, bundles) |

**Vouchers:**
| Evento | Descripcion |
|---|---|
| `pretix.voucher.added` | Voucher creado |
| `pretix.voucher.changed` | Voucher modificado |
| `pretix.voucher.deleted` | Voucher eliminado |

**Waiting List:**
| Evento | Descripcion |
|---|---|
| `pretix.event.orders.waitinglist.added` | Entrada en lista de espera |
| `pretix.event.orders.waitinglist.changed` | Entrada modificada |
| `pretix.event.orders.waitinglist.deleted` | Entrada eliminada |
| `pretix.event.orders.waitinglist.voucher_assigned` | Voucher asignado a la entrada |

**Clientes:**
| Evento | Descripcion |
|---|---|
| `pretix.customer.created` | Cuenta de cliente creada |
| `pretix.customer.changed` | Cuenta modificada |
| `pretix.customer.anonymized` | Cuenta anonimizada |

**Gift Cards:**
| Evento | Descripcion |
|---|---|
| `pretix.giftcards.created` | Tarjeta regalo creada |
| `pretix.giftcards.modified` | Tarjeta modificada |
| `pretix.giftcards.transaction.*` | Transaccion con tarjeta regalo |

### Politica de Reintentos

Los webhooks fallidos se reintentan con intervalos exponenciales durante ~3 dias:
- +5s, +30s, +1min, +5min, +20min, +1h, +4h, +6h, +12h, +24h, +24h
- Los reintentos cortos (<5min) se programan directamente en Celery
- Los reintentos largos (>=5min) se persisten en base de datos y se programan via `periodic_task`
- Codigo HTTP `410 Gone` desactiva automaticamente el webhook

### Retencion de Datos

- Logs de llamadas webhook: 30 dias
- Cache de idempotencia (ApiCall): 24 horas

---

## OpenID Connect (Customer SSO)

Pretix actua como **OpenID Connect Provider** para cuentas de clientes.

### Endpoints OIDC

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/.well-known/openid-configuration` | Discovery endpoint |
| GET/POST | `/oauth2/v1/authorize` | Autorizacion |
| POST | `/oauth2/v1/token` | Intercambio de token |
| GET | `/oauth2/v1/userinfo` | Informacion del usuario |
| GET | `/oauth2/v1/keys` | JWKS (claves publicas) |

**Archivos:**
- `src/pretix/presale/views/oidc_op.py` - Vistas OIDC
- `src/pretix/base/customersso/oidc.py` - Logica SSO
- `src/pretix/base/models/customers.py` - Modelos: `CustomerSSOClient`, `CustomerSSOAccessToken`, `CustomerSSOGrant`

---

## OAuth2 para Aplicaciones

### Endpoints OAuth2

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/v1/oauth/authorize` | Pantalla de autorizacion |
| POST | `/api/v1/oauth/token` | Intercambio de codigo por token |
| POST | `/api/v1/oauth/revoke_token` | Revocar token |

### Scopes Disponibles

| Scope | Descripcion |
|---|---|
| `read` | Lectura de datos |
| `write` | Escritura de datos |
| `profile` | Informacion del perfil |

### Modelos OAuth2

- `OAuthApplication` - Registro de aplicacion (client_id, client_secret, redirect_uris)
- `OAuthAccessToken` - Token de acceso (con restriccion por organizador)
- `OAuthRefreshToken` - Token de renovacion
- `OAuthGrant` - Codigo de autorizacion
- `OAuthIDToken` - ID Token (OpenID Connect)

**Validador personalizado:** `src/pretix/api/oauth.py` - Extiende `OAuth2Validator` con restriccion por organizador

---

## Device API

Endpoints para dispositivos de check-in (apps moviles, scanners).

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/v1/device/initialize` | Inicializar dispositivo (usa `initialization_token`) |
| POST | `/api/v1/device/update` | Actualizar software del dispositivo |
| POST | `/api/v1/device/roll` | Rotar clave RSA |
| POST | `/api/v1/device/revoke` | Revocar dispositivo |
| GET | `/api/v1/device/info` | Informacion del dispositivo |
| POST | `/api/v1/device/eventselection` | Seleccionar evento para el dispositivo |

### Perfiles de Seguridad de Dispositivos

| Perfil | Descripcion |
|---|---|
| `full` | Acceso completo (por defecto) |
| `checkinonly` | Solo operaciones de check-in |

Registrados via signal `register_device_security_profile` en `src/pretix/api/auth/devicesecurity.py`.

---

## Paginacion, Filtrado e Idempotencia

### Paginacion

- **Clase:** `Pagination` en `src/pretix/api/pagination.py`
- **Tipo:** `PageNumberPagination`
- **Tamano por defecto:** 50 items
- **Tamano maximo:** 50 items
- **Parametro:** `?page_size=25&page=2`

### Filtrado

- **Backend:** `DjangoFilterBackend`
- **Ordenamiento:** `TotalOrderingFilter` (determinista con tie-breaking)
- **Multi-valor:** `MultipleCharFilter` soporta filtrado OR/AND con multiples valores

### Idempotencia

- **Header:** `X-Idempotency-Key: <clave-unica>`
- **Middleware:** `IdempotencyMiddleware` en `src/pretix/api/middleware.py`
- **Modelo:** `ApiCall` - cachea respuestas por 24 horas
- **Deteccion de concurrencia:** Previene operaciones duplicadas simultaneas
- **Consulta:** `POST /api/v1/idempotency_query` para verificar una clave

---

## Permisos

### Permisos de Equipo (Team)

Los Team API Tokens heredan los permisos del equipo asociado:

| Permiso | Descripcion |
|---|---|
| `can_create_events` | Crear eventos |
| `can_change_teams` | Modificar equipos |
| `can_change_organizer_settings` | Cambiar config del organizador |
| `can_manage_customers` | Gestionar clientes |
| `can_manage_reusable_media` | Gestionar medios reutilizables |
| `can_manage_gift_cards` | Gestionar tarjetas regalo |
| `can_change_event_settings` | Cambiar config de eventos |
| `can_change_items` | Modificar productos |
| `can_view_orders` | Ver pedidos |
| `can_change_orders` | Modificar pedidos |
| `can_checkin_orders` | Hacer check-in |
| `can_view_vouchers` | Ver vouchers |
| `can_change_vouchers` | Modificar vouchers |

### Clases de Permisos

| Clase | Uso |
|---|---|
| `EventPermission` | Permiso base para endpoints de evento/organizador |
| `EventCRUDPermission` | Permisos CRUD de evento (create/update/delete) |
| `ProfilePermission` | Para el endpoint `/me` |
| `AnyAuthenticatedClientPermission` | Solo requiere autenticacion basica |

---

## Gaps y Mejoras Potenciales

### Lo que falta o podria mejorarse

1. **Rate Limiting / Throttling**
   - **Estado actual:** No hay throttling configurado en `REST_FRAMEWORK` settings
   - **Riesgo:** La API es vulnerable a abuso sin rate limiting
   - **Recomendacion:** Implementar `DEFAULT_THROTTLE_CLASSES` y `DEFAULT_THROTTLE_RATES` en settings, o configurar rate limiting a nivel de reverse proxy (nginx)

2. **Versionado de API**
   - **Estado actual:** Solo existe `v1`. El versionado usa `NamespaceVersioning` pero no hay estrategia de deprecacion
   - **Recomendacion:** Documentar politica de versionado para cambios breaking

3. **Documentacion OpenAPI / Swagger**
   - **Estado actual:** No hay generacion automatica de esquema OpenAPI en el codigo
   - **Recomendacion:** Integrar `drf-spectacular` o `drf-yasg` para generar documentacion interactiva

4. **Webhook Signing**
   - **Estado actual:** Los webhooks no incluyen firma HMAC en los headers
   - **Riesgo:** El receptor no puede verificar que la solicitud proviene de pretix
   - **Recomendacion:** Agregar header `X-Pretix-Signature` con HMAC-SHA256

5. **GraphQL**
   - **Estado actual:** No existe endpoint GraphQL
   - **Nota:** La API REST es muy completa, GraphQL seria complementario para queries complejas

6. **Streaming / SSE / WebSockets**
   - **Estado actual:** No hay soporte para eventos en tiempo real
   - **Nota:** Los webhooks cubren la mayoria de casos, pero para dashboards en tiempo real se podria considerar SSE

7. **Bulk Operations**
   - **Estado actual:** Solo `cartpositions/bulk_create/` soporta operaciones bulk
   - **Recomendacion:** Considerar bulk create/update/delete para orders, vouchers, items

8. **API Keys con Scopes Granulares**
   - **Estado actual:** Los Team API Tokens heredan TODOS los permisos del equipo
   - **Recomendacion:** Permitir scopes por token individual (similar a GitHub fine-grained tokens)

9. **CORS en la API REST**
   - **Estado actual:** Solo el widget tiene headers CORS (`Access-Control-Allow-Origin: *`)
   - **La API REST no tiene CORS**, lo que impide integraciones desde navegadores
   - **Recomendacion:** Agregar soporte CORS configurable para la API via `django-cors-headers`

10. **Health Check Endpoint**
    - **Estado actual:** No hay endpoint dedicado para health checks (DB, Redis, Celery)
    - **Recomendacion:** Agregar `GET /api/v1/health/` que verifique conectividad a servicios

---

## Requerimientos para Usar la API Headless

### Infraestructura Minima

| Servicio | Requerido | Proposito |
|---|---|---|
| PostgreSQL | Si | Base de datos principal |
| Redis | Recomendado | Cache, sesiones, broker Celery |
| Celery Worker | Recomendado | Procesamiento asincrono (webhooks, emails, exports) |
| Reverse Proxy (nginx) | Produccion | TLS, rate limiting, static files |

### Configuracion Minima (`pretix.cfg`)

```ini
[pretix]
url=https://pretix.example.com

[database]
backend=postgresql
name=pretix
user=pretix
password=<password>
host=localhost

[redis]
location=redis://localhost:6379/0
sessions=on

[celery]
broker=redis://localhost:6379/1
backend=redis://localhost:6379/2
```

### Flujo Tipico de Integracion Headless

```
1. Crear Team con permisos necesarios
   POST /api/v1/organizers/{org}/teams/

2. Crear API Token del Team
   POST /api/v1/organizers/{org}/teams/{team}/tokens/

3. Crear Evento
   POST /api/v1/organizers/{org}/events/

4. Crear Productos (Items)
   POST /api/v1/organizers/{org}/events/{event}/items/

5. Crear Cuotas
   POST /api/v1/organizers/{org}/events/{event}/quotas/

6. Activar evento (ir live)
   PATCH /api/v1/organizers/{org}/events/{event}/
   {"live": true}

7. Configurar webhook para recibir notificaciones
   POST /api/v1/organizers/{org}/webhooks/

8. Crear pedido via API
   POST /api/v1/organizers/{org}/events/{event}/orders/
```

---

## Frontend Headless Integrado (front-pretix)

### Arquitectura

El frontend es una SPA React que se conecta al backend pretix via API REST usando un Vite proxy para resolver CORS.

```
Browser (localhost:5173)
    |
    |  GET /api/v1/...  (same origin)
    |
    v
Vite Dev Server (front-pretix:5173)
    |
    |  proxy /api/* → http://web:8000
    |
    v
Django runserver (web:8000)
    |
    v
PostgreSQL (db:5432) + Redis (redis:6379)
```

### Stack del Frontend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 18.3 | UI framework |
| TypeScript | 5.5 | Type safety |
| Vite | 5.4 | Build tool + dev server + proxy |
| Tailwind CSS | 3.4 | Estilos utility-first |
| React Router | 7.13 | Client-side routing |
| i18next | 25.8 | Internacionalizacion (es/en) |
| Supabase | 2.57 | BNPL backend |

### Rutas del Frontend

| Ruta | Componente | Descripcion |
|------|------------|-------------|
| `/` | EventList | Pagina principal, lista de eventos |
| `/event` | EventDetail | Detalle de evento con productos |
| `/cart` | Cart | Carrito de compras |
| `/checkout` | CheckoutWithBNPL | Proceso de pago |
| `/order/:orderCode` | OrderDetails | Detalle de orden |
| `/bnpl/dashboard` | BNPLDashboard | Panel BNPL |

### Variables de Entorno

| Variable | Valor (Docker dev) | Proposito |
|----------|-------------------|-----------|
| `VITE_PRETIX_API_URL` | *(vacio)* | Vacio = usa Vite proxy |
| `VITE_PRETIX_API_TOKEN` | `nkpu39gs...` | Token de autenticacion API |
| `VITE_PRETIX_ORGANIZER` | `prestaya-latam` | Slug del organizador |
| `VITE_PRETIX_EVENT` | `eliminatoria01` | Slug del evento |
| `VITE_SUPABASE_URL` | `https://...supabase.co` | URL Supabase (BNPL) |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Clave anonima Supabase |

### Levantar Todo el Stack

```bash
# Build y levantar 5 servicios (db, redis, web, celery, front-pretix)
docker compose -f docker-compose.dev.yml up --build

# Acceder al frontend: http://localhost:5173
# Acceder al backend:  http://localhost:8000
# Panel de control:    http://localhost:8000/control/
```

### Archivos Clave del Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `frontend/src/lib/config/env.ts` | Configuracion centralizada desde env vars |
| `frontend/src/lib/api/pretix-client.ts` | Cliente API pretix (fetch + Token auth) |
| `frontend/src/lib/api/bnpl-client.ts` | Cliente Supabase para BNPL |
| `frontend/src/routes/index.tsx` | Definicion de rutas |
| `frontend/vite.config.ts` | Config Vite con proxy API |
| `frontend/Dockerfile` | Imagen Docker (node:20-alpine) |
