/* ==========================================================
   frada. · reservas
   1) Pegá acá la URL de tu aplicación web de Google Apps Script (ver apps-script/Code.gs).
   2) Mientras esté vacía, el formulario avisa que las reservas se activan en breve.
   ========================================================== */

const CONFIG = {
  endpointReservas: "https://script.google.com/macros/s/AKfycbxhE6VHeHp9EGkDfifmTgxAOElDiBGYdLyXINxbgyBQ_tfD0PYrpntqT2GWGwkhskgq/exec",
};

const formulario = document.getElementById("form-reserva");
const selectFecha = document.getElementById("select-fecha");
const botonReserva = document.getElementById("boton-reserva");
const mensaje = document.getElementById("mensaje-reserva");

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/* Próximos viernes y sábados (desde mañana, hasta 8 semanas). */
function proximosFinesDeSemana(semanas = 8) {
  const fechas = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let i = 1; i <= semanas * 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (d.getDay() === 5 || d.getDay() === 6) fechas.push(d);
  }
  return fechas;
}

function aISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const día = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${día}`;
}

function cargarFechas() {
  proximosFinesDeSemana().forEach((d) => {
    const opción = document.createElement("option");
    opción.value = aISO(d);
    opción.textContent = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
    selectFecha.appendChild(opción);
  });
}

function mostrar(texto, tipo = "") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
}

cargarFechas();

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = Object.fromEntries(new FormData(formulario));

  if (!datos.nombre?.trim() || !datos.telefono?.trim()) {
    mostrar("Completá tu nombre y un teléfono de contacto.", "error");
    return;
  }

  if (!CONFIG.endpointReservas) {
    mostrar("Las reservas online se activan en breve. Mientras tanto, escribinos por Instagram.", "error");
    return;
  }

  botonReserva.disabled = true;
  mostrar("Enviando tu reserva...");

  try {
    // no-cors: la página envía la reserva sin leer la respuesta del script
    await fetch(CONFIG.endpointReservas, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...datos, nombre: datos.nombre.trim(), telefono: datos.telefono.trim() }),
    });

    const fechaTexto = selectFecha.options[selectFecha.selectedIndex].textContent;
    mostrar(`¡Recibimos tu reserva, ${datos.nombre.trim()}! Para el ${fechaTexto} a las ${datos.hora} hs.`, "ok");
    formulario.reset();
  } catch (error) {
    mostrar("Hubo un problema de conexión. Escribinos por Instagram y lo resolvemos.", "error");
  } finally {
    botonReserva.disabled = false;
  }
});
