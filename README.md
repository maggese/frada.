# frada.

Página web del bar/restaurante **frada.**, en Av. San Martín 1960, Caballito (CABA).
Sitio estático con carta, horarios, reservas online conectadas a Google Calendar, reseñas de Google, mapa y acceso directo a Instagram.

- Horario: todos los días de 7:30 a 00:00 hs.
- Reservas: viernes y sábados, de 20:00 a 21:15 hs.
- Instagram: [@frada.ba](https://www.instagram.com/frada.ba)
- Cómo llegar: [Google Maps](https://maps.app.goo.gl/DLDHQESYEP1AhfUH8)
- Hosting: Cloudflare Workers (archivos estáticos).

---

## Estructura del repositorio

```
frada/
├── public/                  # Todo lo que se publica en el sitio
│   ├── index.html           # Página principal (estructura y contenido)
│   ├── styles.css           # Estilos y paleta de colores
│   ├── script.js            # Lógica del formulario de reservas
│   └── assets/              # Fotos, logo y carta en PDF
│       ├── logo.jpg
│       ├── fachada.png          # Imagen del hero
│       ├── reservas.jpg         # Foto de la sección de reservas
│       ├── cafe-torta.png       # Galería de la carta
│       ├── torta-pistacho.png
│       ├── medialuna.png
│       ├── cookies.png
│       └── carta-frada.pdf      # Carta completa
├── apps-script/
│   └── Code.gs              # Backend de reservas (se pega en Google Apps Script, no se publica)
├── wrangler.jsonc           # Configuración de Cloudflare Workers
└── README.md
```

Solo la carpeta `public/` llega al navegador. `apps-script/` y este README quedan en el repo como documentación y código de respaldo.

---

## Secciones de la página

1. **Encabezado:** logo, menú de anclas y botón "Reservar". En celular, el menú se reemplaza por una barra fija abajo.
2. **Hero:** fachada, nombre y tres botones: Reservar mesa (`#reservar`), Ver carta (PDF) y Cómo llegar (`#ubicacion`).
3. **Franja de datos** (`#horarios`): horario general, dirección y horario de reservas.
4. **Reservas** (`#reservar`): formulario con nombre, día, horario, cantidad de personas, teléfono y comentarios.
5. **Carta** (`#carta`): galería de fotos, lista de categorías y botón al PDF completo.
6. **Reseñas** (`#resenas`): calificación de Google y tarjetas con resúmenes de reseñas.
7. **Cómo llegar** (`#ubicacion`): dirección, horarios, mapa embebido y botones a Google Maps e Instagram.
8. **Banda de Instagram:** invitación a escribir por mensaje directo para cualquier duda.
9. **Pie de página:** nombre, dirección, Instagram y derechos.

---

## Sistema de reservas

Una página estática no puede escribir sola en Google Calendar. La conexión funciona así:

1. El cliente completa el formulario en `public/index.html`.
2. `public/script.js` envía los datos a una **aplicación web de Google Apps Script**.
3. El script (`apps-script/Code.gs`) valida los datos y crea un evento en el calendario **"Reservas frada."** de la cuenta de Google del local.

Reglas que aplica el backend (además de las del formulario):
- Solo viernes y sábados.
- Solo horarios entre 20:00 y 21:15 (intervalos de 15 minutos).
- Duración estimada de la mesa: 90 minutos (`DURACION_MIN`).
- Cupo de 12 reservas por horario (`MAX_RESERVAS_POR_HORARIO`).
- Opcional: envío de un mail de aviso al local (`EMAIL_AVISOS`).

### Instalación del backend (una sola vez, desde la cuenta de Google del local)

1. Entrar a [script.google.com](https://script.google.com) y crear un proyecto nuevo.
2. Pegar el contenido de `apps-script/Code.gs`.
3. En **Configuración del proyecto**, poner la zona horaria `America/Argentina/Buenos_Aires`.
4. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Aceptar los permisos de Calendar (y Gmail, si se usa el aviso por mail).
6. Copiar la URL que termina en `/exec` y pegarla en `public/script.js`:
   ```js
   const CONFIG = {
     endpointReservas: "https://script.google.com/macros/s/XXXX/exec",
   };
   ```
7. Hacer una reserva de prueba y verificar que aparezca en el calendario "Reservas frada.".

Mientras `endpointReservas` esté vacío, el formulario muestra un aviso de que las reservas se activan en breve.

---

## Cómo actualizar el contenido

| Qué cambiar | Dónde |
|---|---|
| Carta (precios, platos) | Reemplazar `public/assets/carta-frada.pdf` (mismo nombre) |
| Horario general | Franja de datos y sección "Cómo llegar" en `public/index.html` |
| Horario de reservas | Opciones del `<select name="hora">` en `public/index.html` y `HORARIOS_VALIDOS` en `Code.gs` |
| Reseñas | Tarjetas `.tarjeta-resena` en `public/index.html` y la calificación de la sección |
| Fotos | Reemplazar los archivos de `public/assets/` respetando el nombre |
| Cupo por horario | `MAX_RESERVAS_POR_HORARIO` en `Code.gs` |
| Colores | Variables `:root` al inicio de `public/styles.css` |

---

## Despliegue en Cloudflare

El sitio se despliega como **Cloudflare Workers con archivos estáticos**, según `wrangler.jsonc`:

- `assets.directory` apunta a `./public`, así que solo se publica esa carpeta.
- Para desplegar desde GitHub: en Cloudflare, Workers & Pages → el Worker → conectar el repositorio.
  - Comando de build: vacío.
  - Comando de deploy: `npx wrangler deploy` (valor por defecto).
- Cada push a `main` vuelve a publicar el sitio.
- Si el Worker tiene otro nombre en Cloudflare, cambiar `"name"` en `wrangler.jsonc`.

---

## Pendientes para revisar

- **Dirección:** Google Maps muestra "Av. S. Martín 1971", pero el local figura como 1960 en la carta y en Instagram. Confirmar.
- **Horario de domingo:** Google muestra 8:00 a 00:00 los domingos; la página dice 7:30 todos los días. Confirmar.
- **Reseñas:** las tres tarjetas son resúmenes en español de reseñas reales publicadas en inglés en Google. La calificación (4,6) y la cantidad (más de 560) son de la fecha de este README y conviene actualizarlas.
- **Reservas:** probar el flujo completo con una reserva real antes de entregar el sitio al cliente.
- **Traspaso:** el repositorio, el Worker, el dominio y el calendario deben quedar a nombre del cliente, y la cuenta de Google que ejecuta el script debe ser la del local.

---

## Historial

- Versión inicial: reemplaza los archivos de prueba previos (`index.html` y `wrangler.jsonc` en la raíz). La nueva configuración vive en `public/`.
