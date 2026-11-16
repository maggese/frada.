/**
 * frada. · Reservas → Google Calendar
 *
 * Cómo instalarlo (desde la cuenta de Google del local):
 *  1. Entrá a script.google.com → Nuevo proyecto. Pegá este código.
 *  2. Configuración del proyecto → Zona horaria: America/Argentina/Buenos_Aires.
 *  3. Implementar → Nueva implementación → Tipo: Aplicación web.
 *       Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 *  4. Copiá la URL que termina en /exec y pegala en script.js (CONFIG.endpointReservas).
 *  5. La primera vez Google pide permisos para Calendar y Gmail: aceptalos.
 */

const NOMBRE_CALENDARIO = "Reservas frada.";
const DURACION_MIN = 90;                       // duración estimada de la mesa
const MAX_RESERVAS_POR_HORARIO = 12;           // ajustá según la capacidad del local
const HORARIOS_VALIDOS = ["20:00", "20:15", "20:30", "20:45", "21:00", "21:15"];
const DIAS_PERMITIDOS = [5, 6];                // 5 = viernes, 6 = sábado
const EMAIL_AVISOS = "";                       // opcional: mail del local para recibir cada reserva

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    const nombre = String(datos.nombre || "").trim().slice(0, 80);
    const telefono = String(datos.telefono || "").trim().slice(0, 40);
    const personas = parseInt(datos.personas, 10) || 2;
    const comentarios = String(datos.comentarios || "").trim().slice(0, 300);

    if (!nombre || !telefono) return respuesta({ ok: false, error: "Faltan datos de contacto." });

    // Fecha: "YYYY-MM-DD" interpretada en la zona horaria del proyecto
    const [año, mes, día] = String(datos.fecha || "").split("-").map(Number);
    if (!año || !mes || !día) return respuesta({ ok: false, error: "Elegí un día válido." });

    const fecha = new Date(año, mes - 1, día);
    if (!DIAS_PERMITIDOS.includes(fecha.getDay())) {
      return respuesta({ ok: false, error: "Solo tomamos reservas para viernes y sábados." });
    }

    if (!HORARIOS_VALIDOS.includes(datos.hora)) {
      return respuesta({ ok: false, error: "Elegí un horario entre las 20:00 y las 21:15 hs." });
    }

    const [hora, minutos] = datos.hora.split(":").map(Number);
    const inicio = new Date(año, mes - 1, día, hora, minutos, 0);
    const fin = new Date(inicio.getTime() + DURACION_MIN * 60 * 1000);

    const calendario = obtenerCalendario();

    // Control simple de cupo por horario
    const ocupados = calendario.getEvents(inicio, inicio).length;
    if (ocupados >= MAX_RESERVAS_POR_HORARIO) {
      return respuesta({ ok: false, error: "Ese horario ya está completo. Probá con otro horario o día." });
    }

    const titulo = `${nombre} · ${personas} ${personas === 1 ? "persona" : "personas"}`;
    const descripcion = [
      `Teléfono: ${telefono}`,
      `Personas: ${personas}`,
      comentarios ? `Comentarios: ${comentarios}` : "",
      "",
      "Reserva creada desde la web.",
    ].filter(Boolean).join("\n");

    calendario.createEvent(titulo, inicio, fin, {
      description: descripcion,
      location: "Av. San Martín 1960, Caballito, CABA",
    });

    if (EMAIL_AVISOS) {
      MailApp.sendEmail(
        EMAIL_AVISOS,
        `Nueva reserva: ${nombre} · ${datos.hora} hs`,
        descripcion + `\nFecha: ${fechaLegible(inicio)} ${datos.hora} hs`
      );
    }

    return respuesta({ ok: true, fechaTexto: fechaLegible(inicio) });
  } catch (error) {
    return respuesta({ ok: false, error: "No pudimos registrar la reserva. Escribinos por Instagram." });
  }
}

/* Calendario dedicado "Reservas frada.", se crea solo si no existe */
function obtenerCalendario() {
  const existentes = CalendarApp.getCalendarsByName(NOMBRE_CALENDARIO);
  return existentes.length ? existentes[0] : CalendarApp.createCalendar(NOMBRE_CALENDARIO);
}

function fechaLegible(d) {
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}

function respuesta(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
