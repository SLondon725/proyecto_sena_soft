// Variables globales
let datosOriginales = [];
let datosFiltrados = [];

// Guardamos referencias a los gráficos para poder actualizarlos
let chartProgramas = null;
let chartModalidades = null;
let chartNiveles = null;

// Cuando el usuario selecciona un archivo en el input
const cargarExcel = document.getElementById("cargarExcel");
cargarExcel.addEventListener("change", (e) => {
  const archivo = e.target.files[0];
  if (!archivo) {
    alert("No se seleccionó ningún archivo");
    return;
  }
  leerExcel(archivo);
});

// Función que lee el archivo excel
function leerExcel(archivo) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const libro = XLSX.read(data, { type: "array" });

    const nombreHoja = libro.SheetNames[0];
    const hoja = libro.Sheets[nombreHoja];

    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });

    if (filas.length === 0) {
      datosOriginales = [];
      datosFiltrados = [];
      llenarFiltros();
      actualizarDashboard();
      return;
    }

    const encabezados = filas[0];
    const datos = [];

    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i];
      if (fila.every(celda => celda === "")) continue;

      const obj = {};
      for (let j = 0; j < encabezados.length; j++) {
        const nombreCol = encabezados[j];
        obj[nombreCol] = fila[j] !== undefined ? fila[j] : "";
      }
      datos.push(obj);
    }

    datosOriginales = datos;
    datosFiltrados = datosOriginales;

    llenarFiltros();
    actualizarDashboard();
  };

  reader.readAsArrayBuffer(archivo);
}

// Función que llena los selects con opciones
function llenarFiltros() {
  const modalidades = [];
  const programas = [];
  const niveles = [];

  for (let i = 0; i < datosOriginales.length; i++) {
    const fila = datosOriginales[i];

    if (!modalidades.includes(fila.MODALIDAD_FORMACION)) {
      modalidades.push(fila.MODALIDAD_FORMACION);
    }
    if (!programas.includes(fila.NOMBRE_PROGRAMA_FORMACION)) {
      programas.push(fila.NOMBRE_PROGRAMA_FORMACION);
    }
    if (!niveles.includes(fila.NIVEL_FORMACION)) {
      niveles.push(fila.NIVEL_FORMACION);
    }
  }

  ponerOpciones("filtroModalidad", modalidades);
  ponerOpciones("filtroPrograma", programas);
  ponerOpciones("filtroNivelFormacion", niveles);

  document.getElementById("filtroModalidad").addEventListener("change", actualizarDashboard);
  document.getElementById("filtroPrograma").addEventListener("change", actualizarDashboard);
  document.getElementById("filtroNivelFormacion").addEventListener("change", actualizarDashboard);
}

// Función que pone opciones en un select
function ponerOpciones(id, valores) {
  const select = document.getElementById(id);
  let html = "<option>Todos</option>";
  for (let i = 0; i < valores.length; i++) {
    html += `<option>${valores[i]}</option>`;
  }
  select.innerHTML = html;
}

// Función que aplica los filtros
function aplicarFiltros() {
  const modalidad = document.getElementById("filtroModalidad").value;
  const programa  = document.getElementById("filtroPrograma").value;
  const nivel     = document.getElementById("filtroNivelFormacion").value;

  const resultado = [];
  for (let i = 0; i < datosOriginales.length; i++) {
    const fila = datosOriginales[i];

    let pasa = true;
    if (modalidad !== "Todos" && fila.MODALIDAD_FORMACION !== modalidad) pasa = false;
    if (programa  !== "Todos" && fila.NOMBRE_PROGRAMA_FORMACION !== programa) pasa = false;
    if (nivel     !== "Todos" && fila.NIVEL_FORMACION !== nivel) pasa = false;

    if (pasa) {
      resultado.push(fila);
    }
  }

  datosFiltrados = resultado;
}

// Función que actualiza todo el dashboard
function actualizarDashboard() {
  aplicarFiltros();

  let total = 0, fem = 0, masc = 0, nb = 0, activos = 0;
  const programas = [];
  const modalidades = [];
  const niveles = [];

  for (let i = 0; i < datosFiltrados.length; i++) {
    const fila = datosFiltrados[i];

    total   += parseInt(fila.TOTAL_APRENDICES) || 0;
    fem     += parseInt(fila.TOTAL_APRENDICES_FEMENINOS) || 0;
    masc    += parseInt(fila.TOTAL_APRENDICES_MASCULINOS) || 0;
    nb      += parseInt(fila.TOTAL_APRENDICES_NOBINARIO) || 0;
    activos += parseInt(fila.TOTAL_APRENDICES_ACTIVOS) || 0;

    if (!programas.includes(fila.NOMBRE_PROGRAMA_FORMACION)) programas.push(fila.NOMBRE_PROGRAMA_FORMACION);
    if (!modalidades.includes(fila.MODALIDAD_FORMACION))     modalidades.push(fila.MODALIDAD_FORMACION);
    if (!niveles.includes(fila.NIVEL_FORMACION))             niveles.push(fila.NIVEL_FORMACION);
  }

  // Mostrar en tarjetas
  document.getElementById("totalAprendices").textContent = datosFiltrados.length ? total : "Sin datos";
  document.getElementById("femeninos").textContent       = datosFiltrados.length ? fem   : "Sin datos";
  document.getElementById("masculinos").textContent      = datosFiltrados.length ? masc  : "Sin datos";
  document.getElementById("noBinarios").textContent      = datosFiltrados.length ? nb    : "Sin datos";
  document.getElementById("activos").textContent         = datosFiltrados.length ? activos : "Sin datos";
  document.getElementById("gruposPrograma").textContent  = datosFiltrados.length ? programas.length  : "Sin datos";
  document.getElementById("gruposModalidad").textContent = datosFiltrados.length ? modalidades.length : "Sin datos";
  document.getElementById("gruposNivel").textContent     = datosFiltrados.length ? niveles.length     : "Sin datos";

  // Dibujar gráficas
  dibujarGraficas(programas, modalidades, niveles);
}

// Función que dibuja las gráficas
function dibujarGraficas(programas, modalidades, niveles) {
  // Destruimos gráficas anteriores si existen
  if (chartProgramas) chartProgramas.destroy();
  if (chartModalidades) chartModalidades.destroy();
  if (chartNiveles) chartNiveles.destroy();

  // Gráfico de programas
  const prog = contarAgrupar(datosFiltrados, "NOMBRE_PROGRAMA_FORMACION");
  chartProgramas = new Chart(document.getElementById("chartProgramas"), {
    type: "bar",
    data: { labels: prog.labels, datasets: [{ label: "# de grupos", data: prog.counts, backgroundColor: "#0d6efd" }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  // Gráfico de modalidades
  const mod = contarAgrupar(datosFiltrados, "MODALIDAD_FORMACION");
  chartModalidades = new Chart(document.getElementById("chartModalidades"), {
    type: "doughnut",
    data: { labels: mod.labels, datasets: [{ data: mod.counts, backgroundColor: paletaColores(mod.counts.length) }] },
    options: { responsive: true }
  });

  // Gráfico de niveles
  const niv = contarAgrupar(datosFiltrados, "NIVEL_FORMACION");
  chartNiveles = new Chart(document.getElementById("chartNiveles"), {
    type: "bar",
    data: { labels: niv.labels, datasets: [{ label: "# de grupos", data: niv.counts, backgroundColor: "#198754" }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// Función que cuenta cuántos hay por categoría
function contarAgrupar(datos, key) {
  const map = {};
  for (let i = 0; i < datos.length; i++) {
    const valor = datos[i][key] || "Sin valor";
    if (!map[valor]) map[valor] = 0;
    map[valor]++;
  }
  return { labels: Object.keys(map), counts: Object.values(map) };
}

// Colores para las gráficas
function paletaColores(n) {
  const colors = ["#0d6efd","#6c757d","#198754","#dc3545","#ffc107","#0dcaf0","#6610f2","#d63384","#fd7e14","#20c997"];
  const salida = [];
  for (let i = 0; i < n; i++) {
    salida.push(colors[i % colors.length]);
  }
  return salida;
}
