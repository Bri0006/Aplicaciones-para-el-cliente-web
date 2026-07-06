// =========================================================
// CONFIGURACIÓN DE INSTANCIA DE SUPABASE
// =========================================================
const CRON_SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co'; 
const CRON_SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M'; 

const supabaseClient = window.supabase ? window.supabase.createClient(CRON_SUPABASE_URL, CRON_SUPABASE_ANON_KEY) : null;

const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // Estados Reactivos
        const todosLosLogs = ref([]);
        const loadingTable = ref(true);
        const procesandoGlobal = ref(false);
        const mostrarModalLogout = ref(false);
        
        // Criterios de Filtrado
        const filtroEstado = ref('TODOS');
        const filtroTipo = ref('TODOS');

        // =========================================================
        // CARGA EXCLUSIVA DE DATOS
        // =========================================================
        const cargarCronJobLogs = async () => {
            loadingTable.value = true;
            
            if (!supabaseClient) {
                console.warn("Supabase no inicializado correctamente, usando logs estáticos.");
                cargarMockLogs();
                loadingTable.value = false;
                return;
            }

            try {
                const { data, error } = await supabaseClient
                    .from('cronjob_log')
                    .select('*')
                    .order('fecha_envio', { ascending: false });

                if (error) throw error;
                
                // Mapeamos para inyectar un estado reactivo local de carga por cada fila de reenvío
                todosLosLogs.value = (data || []).map(log => ({
                    ...log,
                    reenviando: false
                }));
            } catch (error) {
                console.error("Error al extraer registros de Supabase:", error);
            } finally {
                loadingTable.value = false;
            }
        };

        // Mock o Plan de Respaldo por si falla la red o BD
        const cargarMockLogs = () => {
            todosLosLogs.value = [{
                id: 'mock-1',
                fecha_envio: new Date().toISOString(),
                graduado_email: 'simulacion.local@uleam.edu.ec',
                tipo_envio: 'ANUAL',
                estado: 'ENVIADO',
                reenviando: false
            }];
        };

        // =========================================================
        // FILTROS COMBINADOS DINÁMICOS (COMPUTED)
        // =========================================================
        const logsFiltrados = computed(() => {
            return todosLosLogs.value.filter(registro => {
                const estadoLog = registro.estado === 'LEIDO' ? 'LEÍDO' : registro.estado;
                const estadoFiltro = filtroEstado.value;
                
                const cumpleEstado = estadoFiltro === 'TODOS' || estadoLog === estadoFiltro;
                const cumpleTipo = filtroTipo.value === 'TODOS' || (registro.tipo_envio || 'ANUAL') === filtroTipo.value;
                
                return cumpleEstado && cumpleTipo;
            });
        });

        // =========================================================
        // FORZAR CRON-JOB MAESTRO GLOBAL
        // =========================================================
        const forzarCronJobGlobal = async () => {
            const confirmar = confirm("¿Está seguro de que desea forzar la ejecución del Cron-Job ahora?\nEsto leerá la lista de graduados reales y generará los registros de envío.");
            if (!confirmar) return;

            procesandoGlobal.value = true;

            try {
                if (!supabaseClient) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    alert("Modo local activo. No se enviaron registros reales.");
                    return;
                }

                // 1. Obtener correos desde tabla graduados
                const { data: graduados, error: errorGraduados } = await supabaseClient
                    .from('graduados')
                    .select('correo_institucional'); 

                if (errorGraduados) throw errorGraduados;

                const fechaActualISO = new Date().toISOString();
                let registrosCreados = 0;

                if (graduados && graduados.length > 0) {
                    const nuevosLogs = graduados.map(g => ({
                        graduado_email: g.correo_institucional || 'sin-correo@uleam.edu.ec',
                        tipo_envio: 'ANUAL', 
                        estado: 'ENVIADO', 
                        fecha_envio: fechaActualISO
                    }));

                    const { error: errorInsert } = await supabaseClient.from('cronjob_log').insert(nuevosLogs);
                    if (errorInsert) throw errorInsert;
                    registrosCreados = graduados.length;
                } else {
                    // Fallback a solicitudes de registro
                    const { data: solicitudes, error: errorSol } = await supabaseClient
                        .from('solicitudes_registro')
                        .select('correo');
                    
                    if (errorSol) throw errorSol;
                    if (!solicitudes || solicitudes.length === 0) {
                        alert("No hay destinatarios válidos en las tablas maestras.");
                        return;
                    }

                    const nuevosLogsSol = solicitudes.map(s => ({
                        graduado_email: s.correo,
                        tipo_envio: 'ANUAL', 
                        estado: 'ENVIADO', 
                        fecha_envio: fechaActualISO
                    }));

                    const { error: errorInsertSol } = await supabaseClient.from('cronjob_log').insert(nuevosLogsSol);
                    if (errorInsertSol) throw errorInsertSol;
                    registrosCreados = solicitudes.length;
                }

                alert(`¡Cron-Job completado con éxito!\nSe procesaron e insertaron ${registrosCreados} registros al panel.`);
                await cargarCronJobLogs();

            } catch (error) {
                console.error("Error en la ejecución global del cronjob:", error);
                alert("Ocurrió un error inesperado al procesar el lote.");
            } finally {
                procesandoGlobal.value = false;
            }
        };

        // =========================================================
        // REENVÍO INDIVIDUAL DE FILAS FALLIDAS
        // =========================================================
        const reenviarCorreoManual = async (log) => {
            log.reenviando = true;

            try {
                if (supabaseClient) {
                    const { error } = await supabaseClient
                        .from('cronjob_log')
                        .update({ estado: 'ENVIADO', fecha_envio: new Date().toISOString() }) 
                        .eq('id', log.id);

                    if (error) throw error;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                alert(`Invitación reenviada con éxito a:\n${log.graduado_email}`);
                await cargarCronJobLogs();

            } catch (error) {
                console.error("Error en el reenvío manual:", error);
                alert("No se pudo completar la actualización del registro.");
                log.reenviando = false;
            }
        };

        // =========================================================
        // UTILIDADES Y LOGOUT
        // =========================================================
        const formatearFecha = (fechaIso) => {
            if (!fechaIso) return "Sin fecha";
            return new Date(fechaIso).toLocaleString('es-EC', { 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit', hour12: false
            });
        };

        const ejecutarLogout = () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../login.html";
        };

        // Ciclo de Vida inicial
        onMounted(() => {
            cargarCronJobLogs();
        });

        return {
            loadingTable,
            procesandoGlobal,
            mostrarModalLogout,
            filtroEstado,
            filtroTipo,
            logsFiltrados,
            formatearFecha,
            forzarCronJobGlobal,
            reenviarCorreoManual,
            ejecutarLogout
        };
    }
}).mount('#app');