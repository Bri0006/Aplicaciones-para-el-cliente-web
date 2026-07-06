import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { createApp, nextTick } = Vue;

createApp({
    data() {
        return {
            // Control de interfaces y sesión
            rolUsuario: 'Cargando...',
            mostrarModalLogout: false,
            anioSeleccionado: 'TODOS',
            cohortesUnicas: [],

            // Estructura de KPIs reactivos
            kpis: {
                graduados: 0,
                pendientes: 0,
                carreras: 0,
                encuestas: 0
            },

            // Caché local para optimizar el rendimiento de filtros
            datosRaw: {
                graduados: [],
                solicitudes: [],
                encuestas: [],
                historialLaboral: []
            },

            // Instancias de Chart.js
            charts: {
                anios: null,
                estados: null,
                salarios: null
            }
        };
    },
    methods: {
        obtenerRolSesion() {
            const sessionData = localStorage.getItem('admin_session');
            if (sessionData) {
                try {
                    const admin = JSON.parse(sessionData);
                    this.rolUsuario = admin.rol || 'No definido';
                } catch (e) {
                    this.rolUsuario = 'Error de Sesión';
                }
            } else {
                this.rolUsuario = 'Sin Sesión';
            }
        },

        mapearRangoANumero(rangoTexto) {
            if (!rangoTexto) return 0;
            const texto = String(rangoTexto);
            if (texto.includes("Menos de $460")) return 450;
            if (texto.includes("$460 - $600")) return 530;
            if (texto.includes("$601 - $1000")) return 800;
            if (texto.includes("$1001 - $1500")) return 1250;
            if (texto.includes("Más de $1500")) return 1600;
            return 0;
        },

        async cargarDatosBase() {
            try {
                // Total real de carreras para el KPI independiente
                const { count: totalCarrerasReal } = await supabase
                    .from('carreras')
                    .select('*', { count: 'exact', head: true });
                this.kpis.carreras = totalCarrerasReal || 0;

                // Carga masiva paralela
                const [grad, sol, encuestas, historial] = await Promise.all([
                    supabase.from('graduados').select('*'),
                    supabase.from('solicitudes_registro').select('*'),
                    supabase.from('encuestas_caces').select('*'),
                    supabase.from('historial_laboral').select('*')
                ]);

                this.datosRaw.graduados = grad.data || [];
                this.datosRaw.solicitudes = sol.data || [];
                this.datosRaw.encuestas = encuestas.data || [];
                this.datosRaw.historialLaboral = historial.data || [];

                // Generar lista única de cohortes ordenadas descendentemente
                const anios = [...new Set(this.datosRaw.graduados.map(g => g.ano_graduacion).filter(Boolean))];
                this.cohortesUnicas = anios.sort((a, b) => b - a);

                // Primera renderización analítica de KPIs y Gráficas
                this.filtrarDashboard();

            } catch (error) {
                console.error("Error crítico en el ecosistema del Dashboard:", error);
                this.filtrarDashboard();
            }
        },

        filtrarDashboard() {
            let graduadosFiltrados = this.datosRaw.graduados;
            let solicitudesFiltradas = this.datosRaw.solicitudes;

            if (this.anioSeleccionado !== "TODOS") {
                graduadosFiltrados = this.datosRaw.graduados.filter(g => String(g.ano_graduacion) === String(this.anioSeleccionado));
                solicitudesFiltradas = this.datosRaw.solicitudes.filter(s => String(s.anio_graduacion) === String(this.anioSeleccionado));
            }

            // Actualizar contadores métricos (KPIs) de forma reactiva
            this.kpis.graduados = graduadosFiltrados.length;
            
            const pendientes = solicitudesFiltradas.filter(s => s.estado?.toLowerCase() === 'pendiente').length;
            const aprobadas = solicitudesFiltradas.filter(s => s.estado?.toLowerCase() === 'approved' || s.estado?.toLowerCase() === 'aprobado').length;
            const rechazadas = solicitudesFiltradas.filter(s => s.estado?.toLowerCase() === 'rechazado').length;
            
            this.kpis.pendientes = pendientes;

            const idsGraduadosFiltrados = graduadosFiltrados.map(g => g.id);
            const encuestasFiltradas = this.datosRaw.encuestas.filter(e => idsGraduadosFiltrados.includes(e.graduado_id));
            this.kpis.encuestas = this.anioSeleccionado === "TODOS" ? this.datosRaw.encuestas.length : encuestasFiltradas.length;

            // Esperar a que Vue actualice el DOM si hiciera falta antes de dibujar en los Canvas
            nextTick(() => {
                this.renderizarGraficoPastel(pendientes, aprobadas, rechazadas);
                this.renderizarGraficoAnios(graduadosFiltrados);
                this.renderizarGraficoSalarios();
            });
        },

        // =========================================================
        // MÉTODOS DE RENDERIZADO (CHART.JS)
        // =========================================================
        renderizarGraficoPastel(p, a, r) {
            const ctx = document.getElementById('chartEstados')?.getContext('2d');
            if (!ctx) return;

            if (this.charts.estados) this.charts.estados.destroy();
            const tieneDatos = (p + a + r) > 0;

            this.charts.estados = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: tieneDatos ? ['Pendientes', 'Aprobadas', 'Rechazadas'] : ['Sin Registros'],
                    datasets: [{
                        data: tieneDatos ? [p, a, r] : [1],
                        backgroundColor: tieneDatos ? ['#f59e0b', '#10b981', '#ef4444'] : ['#cbd5e1'],
                        borderWidth: 2
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: tieneDatos } } }
            });
        },

        renderizarGraficoAnios(graduados) {
            const ctx = document.getElementById('chartAnios')?.getContext('2d');
            if (!ctx) return;

            if (this.charts.anios) this.charts.anios.destroy();

            const conteoAnios = {};
            graduados.forEach(g => {
                const a = g.ano_graduacion || 'Sin Cohorte';
                conteoAnios[a] = (conteoAnios[a] || 0) + 1;
            });
            
            const labels = Object.keys(conteoAnios).sort();
            const data = labels.map(l => conteoAnios[l]);

            this.charts.anios = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['Sin datos'],
                    datasets: [{
                        label: 'Egresados Registrados',
                        data: data.length ? data : [0],
                        backgroundColor: '#004a99',
                        borderRadius: 5
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        },

        renderizarGraficoSalarios() {
            const ctx = document.getElementById('chartSalarios')?.getContext('2d');
            if (!ctx) return;

            if (this.charts.salarios) this.charts.salarios.destroy();

            const { sumaSalarios, conteoSalarios } = this.datosRaw.historialLaboral.reduce((acc, registro) => {
                const graduadoAsociado = this.datosRaw.graduados.find(g => g.id === registro.graduado_id);
                if (graduadoAsociado) {
                    if (this.anioSeleccionado !== "TODOS" && String(graduadoAsociado.ano_graduacion) !== String(this.anioSeleccionado)) {
                        return acc;
                    }
                    const carrera = graduadoAsociado.carrera || 'Otras Carreras';
                    const valorSalario = this.mapearRangoANumero(registro.salario_aproximado);

                    if (valorSalario > 0) {
                        acc.sumaSalarios[carrera] = (acc.sumaSalarios[carrera] || 0) + valorSalario;
                        acc.conteoSalarios[carrera] = (acc.conteoSalarios[carrera] || 0) + 1;
                    }
                }
                return acc;
            }, { sumaSalarios: {}, conteoSalarios: {} });

            const labels = Object.keys(conteoSalarios);
            const data = labels.map(carrera => Math.round(sumaSalarios[carrera] / conteoSalarios[carrera]));

            this.charts.salarios = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['Sin datos'],
                    datasets: [{
                        label: 'Ingreso Mensual Promedio ($)',
                        data: data.length ? data : [0],
                        backgroundColor: '#8b5cf6',
                        borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { x: { beginAtZero: true, ticks: { callback: val => '$' + val } } }
                }
            });
        },

        ejecutarLogout() {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../auth/login_admin.html";
        }
    },
    mounted() {
        this.obtenerRolSesion();
        this.cargarDatosBase();
    }
}).mount('#app');