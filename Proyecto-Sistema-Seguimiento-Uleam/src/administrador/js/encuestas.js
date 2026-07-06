import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { createApp } = Vue;

createApp({
    data() {
        return {
            carreras: [],
            datosEncuestasGlobal: [],
            datosGraduadosGlobal: [],
            
            // Filtros reactivos vinculados por v-model
            filtroPeriodo: 'TODOS',
            filtroCarrera: 'TODAS',
            filtroRespuesta: 'TODOS',
            
            // Estado visual de la interfaz
            loadingTable: false,
            mostrarModalLogout: false,
            textoUltimaDescarga: 'Última descarga: Nunca',
            
            // Instancia interna del gráfico de Chart.js
            chartInstance: null
        };
    },
    computed: {
        // Extrae las cohortes únicas disponibles dinámicamente
        periodosUnicos() {
            const periodos = this.datosGraduadosGlobal.map(g => g.periodo_academico).filter(Boolean);
            return [...new Set(periodos)].sort();
        },
        // Realiza el filtrado cruzado automático de la tabla principal
        matrizAuditoria() {
            let filtrados = this.datosGraduadosGlobal.filter(g => {
                const cumpleCarrera = (this.filtroCarrera === "TODAS" || g.carrera === this.filtroCarrera);
                const cumplePeriodo = (this.filtroPeriodo === "TODOS" || g.periodo_academico === this.filtroPeriodo);
                return cumpleCarrera && cumplePeriodo;
            });

            let matriz = filtrados.map(g => {
                const encuesta = this.datosEncuestasGlobal.find(e => String(e.graduado_id).trim() === String(g.id).trim());
                return { ...g, respondio: encuesta ? 'SI' : 'NO', detallesEncuesta: encuesta || null };
            });

            if (this.filtroRespuesta !== "TODOS") {
                matriz = matriz.filter(m => m.respondio === this.filtroRespuesta);
            }
            return matriz;
        },
        // Calcula dinámicamente los contadores estadísticos superiores
        metricas() {
            let filtrados = this.datosGraduadosGlobal.filter(g => {
                const cumpleCarrera = (this.filtroCarrera === "TODAS" || g.carrera === this.filtroCarrera);
                const cumplePeriodo = (this.filtroPeriodo === "TODOS" || g.periodo_academico === this.filtroPeriodo);
                return cumpleCarrera && cumplePeriodo;
            });

            const total = filtrados.length;
            const respondidos = filtrados.filter(g => this.datosEncuestasGlobal.some(e => String(e.graduado_id).trim() === String(g.id).trim())).length;
            const porcentaje = total > 0 ? Math.round((respondidos / total) * 100) : 0;

            return { total, respondidos, porcentaje };
        },
        // Extrae los comentarios cualitativos basados en la selección de filtros actual (Mapeado a p8)
        comentariosFiltrados() {
            const feedback = [];
            this.matrizAuditoria.forEach(m => {
                if (m.respondio === 'SI' && m.detallesEncuesta) {
                    const e = m.detallesEncuesta;
                    feedback.push({
                        id: e.id,
                        nombre: `${m.apellidos} ${m.nombres}`,
                        periodo: m.periodo_academico,
                        texto: e.p8_competencias_faltantes || 'Ninguna',
                        sugerencias: e.p9_sugerencias_mejora || 'Ninguna'
                    });
                }
            });
            return feedback;
        }
    },
    watch: {
        // Observadores encargados de redibujar el gráfico al mutar los filtros cruzados
        filtroCarrera() { this.calcularYRenderizarGrafico(); },
        filtroPeriodo() { this.calcularYRenderizarGrafico(); },
        filtroRespuesta() { this.calcularYRenderizarGrafico(); }
    },
    methods: {
        async inicializarDatos() {
            this.loadingTable = true;
            try {
                // 1. Obtener catálogo de carreras
                const { data: carreras } = await supabase.from('carreras').select('nombre');
                this.carreras = carreras || [];

                // 2. Traer tablas maestras
                const { data: encuestas } = await supabase.from('encuestas_caces').select('*');
                const { data: graduados } = await supabase.from('graduados')
                    .select('id, cedula, nombres, apellidos, carrera, ano_graduacion, periodo_academico')
                    .eq('estado_registro', 'aprobado');

                this.datosEncuestasGlobal = encuestas || [];
                this.datosGraduadosGlobal = graduados || [];

                this.mostrarUltimaDescargaLog();
                this.calcularYRenderizarGrafico();

            } catch (error) {
                console.error("Error al sincronizar el módulo CACES:", error);
            } finally {
                this.loadingTable = false;
            }
        },

        calcularYRenderizarGrafico() {
            let p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, p6 = 0, p7 = 0, validas = 0;

            this.matrizAuditoria.forEach(m => {
                if (m.respondio === 'SI' && m.detallesEncuesta) {
                    const e = m.detallesEncuesta;
                    p1 += Number(e.p1_aplicabilidad_conocimientos || 0);
                    p2 += Number(e.p2_actualizacion_malla || 0);
                    p3 += Number(e.p3_calidad_infraestructura || 0);
                    p4 += Number(e.p4_desempeno_docente || 0);
                    p5 += Number(e.p5_vinculacion_practicas || 0);
                    p6 += Number(e.p6_recursos_tecnologicos || 0);
                    p7 += Number(e.p7_perfil_egreso_coherencia || 0);
                    validas++;
                }
            });

            const promP1 = validas > 0 ? (p1 / validas).toFixed(1) : "0.0";
            const promP2 = validas > 0 ? (p2 / validas).toFixed(1) : "0.0";
            const promP3 = validas > 0 ? (p3 / validas).toFixed(1) : "0.0";
            const promP4 = validas > 0 ? (p4 / validas).toFixed(1) : "0.0";
            const promP5 = validas > 0 ? (p5 / validas).toFixed(1) : "0.0";
            const promP6 = validas > 0 ? (p6 / validas).toFixed(1) : "0.0";
            const promP7 = validas > 0 ? (p7 / validas).toFixed(1) : "0.0";

            this.renderizarGraficoCaces([promP1, promP2, promP3, promP4, promP5, promP6, promP7]);
        },

        renderizarGraficoCaces(valores) {
            const canvas = document.getElementById('chartCaces');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            if (this.chartInstance) this.chartInstance.destroy();
            
            this.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Aplicabilidad', 'Malla', 'Infraestructura', 'Docentes', 'Prácticas', 'Tecnología', 'Perfil Egreso'],
                    datasets: [{ 
                        label: 'Promedio Calidad', 
                        data: valores, 
                        backgroundColor: ['#004a99', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'], 
                        borderRadius: 5, 
                        maxBarThickness: 35 
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { y: { beginAtZero: true, max: 5 } } 
                }
            });
        },

        registrarDescargaLog() {
            const marcaTiempo = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
            localStorage.setItem('caces_last_down', `${marcaTiempo} (Filtro: ${this.filtroCarrera} | Cohorte: ${this.filtroPeriodo})`);
            this.mostrarUltimaDescargaLog();
        },

        mostrarUltimaDescargaLog() {
            const log = localStorage.getItem('caces_last_down');
            this.textoUltimaDescarga = log ? `Última descarga: ${log}` : "Última descarga: Nunca";
        },

        exportarCSV() {
            const encuestasAAeroportar = [];

            this.datosEncuestasGlobal.forEach(e => {
                const alu = this.datosGraduadosGlobal.find(g => String(g.id).trim() === String(e.graduado_id).trim());
                if (alu) {
                    const cumpleCarrera = (this.filtroCarrera === "TODAS" || alu.carrera === this.filtroCarrera);
                    const cumplePeriodo = (this.filtroPeriodo === "TODOS" || alu.periodo_academico === this.filtroPeriodo);
                    if (cumpleCarrera && cumplePeriodo) {
                        const compFaltantes = e.p8_competencias_faltantes ? e.p8_competencias_faltantes.replace(/,/g, " ").replace(/\n/g, " ") : "";
                        const sugerenciasMejora = e.p9_sugerencias_mejora ? e.p9_sugerencias_mejora.replace(/,/g, " ").replace(/\n/g, " ") : "";
                        
                        encuestasAAeroportar.push({
                            Cedula: alu.cedula || "",
                            Graduado: `${alu.apellidos || ""} ${alu.nombres || ""}`.trim(),
                            Carrera: alu.carrera || "",
                            Periodo_Cohorte: alu.periodo_academico || "",
                            P1_Aplicabilidad: e.p1_aplicabilidad_conocimientos || 0,
                            P2_Malla: e.p2_actualizacion_malla || 0,
                            P3_Infraestructura: e.p3_calidad_infraestructura || 0,
                            P4_Docentes: e.p4_desempeno_docente || 0,
                            P5_Practicas: e.p5_vinculacion_practicas || 0,
                            P6_Tecnologia: e.p6_recursos_tecnologicos || 0,
                            P7_PerfilEgreso: e.p7_perfil_egreso_coherencia || 0,
                            P8_Competencias_Faltantes: compFaltantes,
                            P9_Sugerencias_Mejora: sugerenciasMejora,
                            Fecha_Envio: e.fecha_envio || ""
                        });
                    }
                }
            });

            if (encuestasAAeroportar.length === 0) {
                alert(`No se encontraron registros completados para:\nCarrera: ${this.filtroCarrera}\nCohorte: ${this.filtroPeriodo}`);
                return;
            }

            const headers = Object.keys(encuestasAAeroportar[0]).join(",");
            const rows = encuestasAAeroportar.map(row => Object.values(row).join(","));
            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `REPORTE_CACES_${this.filtroCarrera.replace(/ /g, "_")}_${this.filtroPeriodo.replace(/ /g, "_")}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.registrarDescargaLog();
        },

        exportarPDF() {
            const elementoTarget = document.getElementById('render-informe-pdf');
            if (!elementoTarget) return;

            elementoTarget.style.display = 'block';

            document.getElementById('pdf-lbl-carrera').textContent = this.filtroCarrera === "TODAS" ? "Todas las Carreras" : this.filtroCarrera;
            document.getElementById('pdf-lbl-cohorte').textContent = this.filtroPeriodo === "TODOS" ? "Todos los periodos históricos" : this.filtroPeriodo;
            document.getElementById('pdf-lbl-total').textContent = `${this.metricas.total} graduados`;
            document.getElementById('pdf-lbl-pct').textContent = `${this.metricas.porcentaje}%`;
            
            const f = new Date();
            document.getElementById('pdf-fecha-emision').textContent = `Reporte generado el: ${f.getDate()}/${f.getMonth() + 1}/${f.getFullYear()}`;

            if (this.chartInstance) {
                const valores = this.chartInstance.data.datasets[0].data;
                // Mapeo completo de las 7 preguntas Likert al documento PDF
                if(document.getElementById('pdf-p1')) document.getElementById('pdf-p1').textContent = `${valores[0]} / 5.0`;
                if(document.getElementById('pdf-p2')) document.getElementById('pdf-p2').textContent = `${valores[1]} / 5.0`;
                if(document.getElementById('pdf-p3')) document.getElementById('pdf-p3').textContent = `${valores[2]} / 5.0`;
                if(document.getElementById('pdf-p4')) document.getElementById('pdf-p4').textContent = `${valores[3]} / 5.0`;
                if(document.getElementById('pdf-p5')) document.getElementById('pdf-p5').textContent = `${valores[4]} / 5.0`;
                if(document.getElementById('pdf-p6')) document.getElementById('pdf-p6').textContent = `${valores[5]} / 5.0`;
                if(document.getElementById('pdf-p7')) document.getElementById('pdf-p7').textContent = `${valores[7] || valores[6]} / 5.0`;
            }

            const pdfComentarios = document.getElementById('pdf-contenedor-comentarios');
            if (pdfComentarios) {
                pdfComentarios.innerHTML = '';
                this.comentariosFiltrados.forEach(c => {
                    const block = document.createElement('div');
                    block.style.border = '1px solid #e2e8f0';
                    block.style.padding = '8px';
                    block.style.marginBottom = '5px';
                    block.style.background = '#ffffff';
                    block.style.borderRadius = '4px';
                    block.innerHTML = `<strong>👤 ${c.nombre} (Cohorte ${c.periodo || 'N/A'}):</strong> 
                                       <p style="margin: 2px 0 2px 0;"><strong>Faltantes (P8):</strong> ${c.texto}</p>
                                       <p style="margin: 2px 0 0 0;"><strong>Sugerencias (P9):</strong> ${c.sugerencias}</p>`;
                    pdfComentarios.appendChild(block);
                });
            }

            const opciones = {
                margin: [15, 15, 15, 15],
                filename: `INFORME_CACES_${this.filtroCarrera.replace(/ /g, "_")}_${this.filtroPeriodo.replace(/ /g, "_")}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, logging: false, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            setTimeout(() => {
                html2pdf().from(elementoTarget).set(opciones).save().then(() => {
                    elementoTarget.style.display = 'none';
                    this.registrarDescargaLog();
                }).catch(err => {
                    console.error("Error al compilar el PDF:", err);
                    elementoTarget.style.display = 'none';
                });
            }, 150);
        },

        ejecutarLogout() {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../login.html"; 
        }
    },
    mounted() {
        this.inicializarDatos();
    }
}).mount('#app');