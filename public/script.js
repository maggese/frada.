/* ==========================================================
   frada. · reservas
   1) Pegá acá la URL de tu aplicación web de Google Apps Script (ver apps-script/Code.gs).
   2) Mientras esté vacía, el formulario avisa que las reservas se activan en breve.
   ========================================================== */

const CONFIG = {
  endpointReservas: "https://script.google.com/macros/s/AKfycbxhE6VHeHp9EGkDfifmTgxAOElDiBGYdLyXINxbgyBQ_tfD0PYrpntqT2GWGwkhskgq/exec",
};

const HORARIOS = ["20:00", "20:15", "20:30", "20:45", "21:00", "21:15"];
const DIAS_PERMITIDOS = [5, 6];
const DIAS_VENTANA = 60;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const formulario = document.getElementById("form-reserva");
const calDias = document.getElementById("cal-dias");
const calMes = document.getElementById("cal-mes");
const calPrev = document.getElementById("cal-prev");
const calNext = document.getElementById("cal-next");
const horariosBox = document.getElementById("horarios");
const inputFecha = document.getElementById("input-fecha");
const inputHora = document.getElementById("input-hora");
const selectPersonas = document.getElementById("select-personas");
const botonReserva = document.getElementById("boton-reserva");
const mensaje = document.getElementById("mensaje-reserva");

const hoy = new Date();
const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DIAS_VENTANA);

let mesVista = new Date(primerDia.getFullYear(), primerDia.getMonth(), 1);
let disponibilidad = {};   // { "2026-11-20": { "20:00": 28, ... } }
let fechaElegida = null;   // "2026-11-20"
let horaElegida = null;    // "20:00"

function aISO(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const día = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${día}`;
}

function mostrar(texto, tipo = "") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
}

/* Consulta o registra usando JSONP: una etiqueta <script> no está sujeta a CORS */
function consultar(params) {
  return new Promise((resolve, reject) => {
    const nombreCb = `fradaCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");

    const limpiar = () => {
      delete window[nombreCb];
      script.remove();
    };
    const limite = setTimeout(() => {
      limpiar();
      reject(new Error("tiempo agotado"));
    }, 20000);

    window[nombreCb] = (datos) => {
      clearTimeout(limite);
      limpiar();
      resolve(datos);
    };
    script.onerror = () => {
      clearTimeout(limite);
      limpiar();
      reject(new Error("sin conexión"));
    };

    const query = new URLSearchParams({ ...params, callback: nombreCb }).toString();
    script.src = `${CONFIG.endpointReservas}?${query}`;
    document.body.appendChild(script);
  });
}

function esReservable(d) {
  return DIAS_PERMITIDOS.includes(d.getDay()) && d >= primerDia && d <= ultimoDia;
}

function diaCompleto(clave) {
  const libres = disponibilidad[clave];
  return Boolean(libres) && Object.values(libres).every((n) => n < 1);
}

function renderCalendario() {
  const año = mesVista.getFullYear();
  const mes = mesVista.getMonth();
  calMes.textContent = `${MESES[mes]} ${año}`;
  calDias.innerHTML = "";

  const offset = (new Date(año, mes, 1).getDay() + 6) % 7; // la semana empieza el lunes
  for (let i = 0; i < offset; i++) {
    calDias.appendChild(document.createElement("span"));
  }

  const cantidad = new Date(año, mes + 1, 0).getDate();
  for (let n = 1; n <= cantidad; n++) {
    const d = new Date(año, mes, n);
    const clave = aISO(d);
    const celda = document.createElement("button");
    celda.type = "button";
    celda.className = "cal-dia";
    celda.textContent = n;

    if (!esReservable(d)) {
      celda.disabled = true;
      celda.classList.add("no-disponible");
    } else if (diaCompleto(clave)) {
      celda.disabled = true;
      celda.classList.add("completo");
    } else {
      celda.classList.add("con-lugar");
      celda.addEventListener("click", () => elegirDia(clave));
    }

    if (clave === fechaElegida) celda.classList.add("seleccionado");
    calDias.appendChild(celda);
  }

  calPrev.disabled = mesVista <= new Date(primerDia.getFullYear(), primerDia.getMonth(), 1);
  calNext.disabled = mesVista >= new Date(ultimoDia.getFullYear(), ultimoDia.getMonth(), 1);
}

function renderHorarios() {
  horariosBox.innerHTML = "";
  if (!fechaElegida) {
    horariosBox.innerHTML = '<p class="texto-suave">Primero elegí un día.</p>';
    return;
  }

  const libres = disponibilidad[fechaElegida] || {};
  if (horaElegida && libres[horaElegida] !== undefined && libres[horaElegida] < 1) {
    horaElegida = null;
    inputHora.value = "";
  }

  HORARIOS.forEach((hora) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "horario";
    boton.textContent = `${hora} hs`;

    if (libres[hora] !== undefined && libres[hora] < 1) {
      boton.disabled = true;
      boton.title = "Completo";
    }
    if (hora === horaElegida) boton.classList.add("seleccionado");

    boton.addEventListener("click", () => elegirHora(hora));
    horariosBox.appendChild(boton);
  });
}

function elegirDia(clave) {
  fechaElegida = clave;
  horaElegida = null;
  inputFecha.value = clave;
  inputHora.value = "";
  renderCalendario();
  renderHorarios();
  actualizarPersonas();
}

function elegirHora(hora) {
  horaElegida = hora;
  inputHora.value = hora;
  renderHorarios();
  actualizarPersonas();
}

/* Limita las personas a los lugares libres del horario elegido */
function actualizarPersonas() {
  const libres = fechaElegida && horaElegida
    ? (disponibilidad[fechaElegida]?.[horaElegida] ?? 8)
    : 8;

  [...selectPersonas.options].forEach((o) => {
    o.disabled = Number(o.value) > libres;
  });

  if (selectPersonas.selectedOptions[0]?.disabled) {
    const habilitadas = [...selectPersonas.options].filter((o) => !o.disabled);
    if (habilitadas.length) habilitadas[habilitadas.length - 1].selected = true;
  }
}

async function cargarDisponibilidad() {
  if (!CONFIG.endpointReservas) return;
  try {
    const res = await consultar({ desde: aISO(primerDia), hasta: aISO(ultimoDia) });
    if (!res.ok) return;

    disponibilidad = res.dias;

    if (fechaElegida && diaCompleto(fechaElegida)) {
      fechaElegida = null;
      horaElegida = null;
      inputFecha.value = "";
      inputHora.value = "";
    }

    renderCalendario();
    renderHorarios();
    actualizarPersonas();
  } catch (error) {
    // Sin consulta, el calendario muestra todos los días abiertos y el script valida al enviar.
  }
}

/* Muestra debajo del mensaje el link para cancelar la reserva */
function agregarLinkCancelar(url, email) {
  const texto = document.createElement("span");
  texto.textContent = email
    ? " Te enviamos la confirmación a tu mail. Si necesitás cancelar, también podés usar este link: "
    : " Guardá este link si necesitás cancelar: ";

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.target = "_blank";
  enlace.rel = "noopener";
  enlace.textContent = "Cancelar reserva";
  enlace.style.color = "#e0653a";
  enlace.style.fontWeight = "600";

  mensaje.append(document.createElement("br"), texto, enlace);
}

function resetearFormulario() {
  formulario.reset();
  fechaElegida = null;
  horaElegida = null;
  inputFecha.value = "";
  inputHora.value = "";
  renderCalendario();
  renderHorarios();
  actualizarPersonas();
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!CONFIG.endpointReservas) {
    mostrar("Las reservas online se activan en breve. Mientras tanto, escribinos por Instagram.", "error");
    return;
  }

  const datos = Object.fromEntries(new FormData(formulario));
  const nombre = datos.nombre?.trim() || "";
  const telefono = datos.telefono?.trim() || "";

  if (!nombre || !telefono) {
    mostrar("Completá tu nombre, teléfono y email de contacto.", "error");
    return;
  }
  const email = datos.email?.trim() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrar("Ingresá un email válido para enviarte la confirmación.", "error");
    return;
  }
  if (!fechaElegida || !horaElegida) {
    mostrar("Elegí un día y un horario en el calendario.", "error");
    return;
  }
  if (selectPersonas.selectedOptions[0]?.disabled) {
    mostrar("No hay lugar para esa cantidad de personas en ese horario. Elegí menos personas u otro horario.", "error");
    return;
  }

  botonReserva.disabled = true;
  mostrar("Enviando tu reserva...");

  try {
    const res = await consultar({
      accion: "reservar",
      nombre,
      telefono,
      email,
      personas: datos.personas,
      fecha: fechaElegida,
      hora: horaElegida,
      comentarios: datos.comentarios || "",
    });

    if (res.ok) {
      mostrar(`¡Listo, ${nombre}! Tu mesa para ${res.fechaTexto} a las ${horaElegida} hs está reservada.`, "ok");
      if (res.cancelUrl) agregarLinkCancelar(res.cancelUrl, email);
      resetearFormulario();
    } else {
      mostrar(res.error, "error");
    }

    await cargarDisponibilidad();
  } catch (error) {
    mostrar("Hubo un problema de conexión. Escribinos por Instagram y lo resolvemos.", "error");
  } finally {
    botonReserva.disabled = false;
  }
});

calPrev.addEventListener("click", () => {
  mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth() - 1, 1);
  renderCalendario();
});
calNext.addEventListener("click", () => {
  mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 1);
  renderCalendario();
});

renderCalendario();
renderHorarios();
cargarDisponibilidad();
