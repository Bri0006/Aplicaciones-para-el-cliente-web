// src/usuario/js/encuesta.js
import { createApp, ref, reactive, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

// Configuración directa y segura del cliente de Supabase
const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M'; // Pon aquí tu clave real anon fija

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

createApp({
    setup() {
        const graduadoId = localStorage.getItem('session_graduado_id');
        const lblNombreUsuario = ref(localStorage.getItem('session_graduado_nombre') || 'Graduado ULEAM');
        
        // Manejo de pantallas: 'cargando', 'intro', 'form', 'success'
        const estadoVista = ref('cargando'); 
        const procesando = ref(false);
        const lblFechaEnvio = ref('');

        // Formulario reactivo estructurado
        const form = reactive({
            p1: '', p2: '', p3: '', p4: '',
            p5: '', p6: '', p7: '', // Nuevas Likert
        p8: '', p9: ''           // Las de texto anterior (Sugerencias)
});

        // Alerta de errores
        const alerta = reactive({
            visible: false,
            texto: ''
        });

        // Validar sesión antes de renderizar
        if (!graduadoId) {
            window.location.href = '../auth/login.html';
        }

        // VERIFICAR SI EL GRADUADO YA LLENÓ LA ENCUESTA ANTES
        const verificarEstadoEncuesta = async () => {
            try {
                const { data, error } = await supabase
                    .from('encuestas_caces')
                    .select('fecha_envio')
                    .eq('graduado_id', graduadoId)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    // Si ya existe registro, salta directo a la vista de éxito
                    const fecha = new Date(data.fecha_envio).toLocaleDateString('es-ES', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    lblFechaEnvio.value = `Enviada con éxito el: ${fecha}.`;
                    estadoVista.value = 'success';
                } else {
                    // Si no la ha llenado, muestra la introducción limpia
                    estadoVista.value = 'intro';
                }
            } catch (err) {
                console.error("Error al validar el estado del CACES:", err);
                // Fallback de contingencia: mostrar introducción por defecto
                estadoVista.value = 'intro';
            }
        };

        // PASAR A RESPONDER EL CUESTIONARIO
        const comenzarEncuesta = () => {
            estadoVista.value = 'form';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // ENVIAR ENCUESTA A SUPABASE
        const enviarEncuesta = async () => {
            alerta.visible = false;

            // Validación extra de seguridad (Vue obliga con el require, pero esto dobla el blindaje)
            if (!form.p1 || !form.p2 || !form.p3 || !form.p4) {
                alert("Por favor, responda todas las preguntas de la escala de valoración.");
                return;
            }

            if (!confirm('¿Estás seguro de enviar la encuesta? No podrás modificar tus respuestas posteriormente.')) {
                return;
            }

            procesando.value = true;

            try {
                const { error } = await supabase
                    .from('encuestas_caces')
                    .insert([{
                        graduado_id: graduadoId,
                        p1_aplicabilidad_conocimientos: parseInt(form.p1),
                        p2_actualizacion_malla: parseInt(form.p2),
                        p3_calidad_infraestructura: parseInt(form.p3),
                        p4_desempeno_docente: parseInt(form.p4),
                        p5_vinculacion_practicas: parseInt(form.p5),     // Nueva
                        p6_recursos_tecnologicos: parseInt(form.p6),     // Nueva
                        p7_perfil_egreso_coherencia: parseInt(form.p7),  // Nueva
                        p8_competencias_faltantes: form.p8.trim(),
                        p9_sugerencias_mejora: form.p9.trim(),
                        finalizada: true
                    }]);

                if (error) throw error;

                lblFechaEnvio.value = `Procesado con éxito hoy de forma correcta.`;
                estadoVista.value = 'success';
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (err) {
                console.error("Error al guardar en Supabase:", err);
                alerta.texto = "Error al conectar con la base de datos. Vuelve a intentarlo.";
                alerta.visible = true;
            } finally {
                procesando.value = false;
            }
        };

        const volverInicio = () => {
            window.location.href = 'inicio.html';
        };

        const cerrarSesion = () => {
            localStorage.clear();
            window.location.href = '../auth/login.html';
        };

        // Ciclo de vida: Inicialización
        onMounted(async () => {
            await verificarEstadoEncuesta();
        });

        return {
            lblNombreUsuario,
            estadoVista,
            procesando,
            lblFechaEnvio,
            form,
            alerta,
            comenzarEncuesta,
            enviarEncuesta,
            volverInicio,
            cerrarSesion
        };
    }
}).mount('#app');