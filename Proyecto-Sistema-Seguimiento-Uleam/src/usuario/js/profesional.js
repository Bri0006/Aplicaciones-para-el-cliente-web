// src/usuario/js/profesional.js
import { createApp, ref, reactive, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

const supabase = window.supabase;

createApp({
    setup() {
        const graduadoId = localStorage.getItem('session_graduado_id');
        const lblNombreUsuario = ref(localStorage.getItem('session_graduado_nombre') || 'Graduado');
        const carreraUsuario = ref('');
        
        const cargandoHistorial = ref(true);
        const procesando = ref(false);
        const historial = ref([]);

        // Estructura reactiva del formulario
        const form = reactive({
            cargo: '',
            empresa: '',
            area_desarrollo: '',
            area_otro_texto: '', // Campo para cuando eligen 'Otro'
            salario_aproximado: '',
            fecha_inicio: '',
            fecha_finalizacion: '',
            es_trabajo_actual: false,
            relacion_con_carrera: true
        });

        const alerta = reactive({
            visible: false,
            texto: '',
            bg: '',
            color: ''
        });

        if (!graduadoId) {
            window.location.href = '../auth/login.html';
        }

        // VALIDACIÓN EN TIEMPO REAL: Solo letras y espacios
        const validarSoloLetras = (campo) => {
            // Reemplaza cualquier cosa que NO sea letra (incluyendo eñes y acentos) o espacio
            form[campo] = form[campo].replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '');
        };

        const obtenerCarreraUsuario = async () => {
            try {
                const { data, error } = await supabase
                    .from('graduados')
                    .select('carrera')
                    .eq('id', graduadoId)
                    .single();

                if (data && data.carrera) {
                    carreraUsuario.value = data.carrera;
                }
            } catch (e) {
                console.error("No se pudo personalizar el texto de la carrera:", e);
            }
        };

        const cargarHistorial = async () => {
            cargandoHistorial.value = true;
            try {
                const { data, error } = await supabase
                    .from('historial_laboral')
                    .select('*')
                    .eq('graduado_id', graduadoId)
                    .order('fecha_inicio', { ascending: false });

                if (error) throw error;
                historial.value = data || [];
            } catch (err) {
                console.error("Error al cargar historial:", err);
                mostrarAlerta("Error al recuperar el historial laboral.", "#fef2f2", "#dc2626");
            } finally {
                cargandoHistorial.value = false;
            }
        };

        const cambioTrabajoActual = () => {
            if (form.es_trabajo_actual) {
                form.fecha_finalizacion = '';
            }
        };

        // GUARDAR REGISTRO CON TODAS LAS VALIDACIONES DE FECHAS Y TEXTO
        // GUARDAR REGISTRO CON CORRECCIÓN DE UUID Y TODAS LAS VALIDACIONES DE FECHAS
        const guardarRegistro = async () => {
            alerta.visible = false;
            
            // 1. Validar área personalizada
            let areaFinal = form.area_desarrollo;
            if (form.area_desarrollo === 'Otro') {
                if (!form.area_otro_texto.trim()) {
                    mostrarAlerta("Por favor, especifique el área de trabajo.", "#fef2f2", "#dc2626");
                    return;
                }
                areaFinal = form.area_otro_texto.trim();
            }

            // 2. Obtener fecha actual en formato local YYYY-MM-DD
            const hoy = new Date().toISOString().split('T')[0];
            
            // Validación: Inicio no mayor al día de hoy
            if (form.fecha_inicio > hoy) {
                mostrarAlerta("La fecha de inicio no puede ser una fecha futura a la actual.", "#fef2f2", "#dc2626");
                return;
            }

            // Validaciones para la fecha de finalización si no es el trabajo actual
            if (!form.es_trabajo_actual) {
                if (!form.fecha_finalizacion) {
                    mostrarAlerta("Por favor, ingresa una fecha de finalización.", "#fef2f2", "#dc2626");
                    return;
                }
                // NUEVA VALIDACIÓN: Finalización no mayor a hoy
                if (form.fecha_finalizacion > hoy) {
                    mostrarAlerta("La fecha de finalización no puede ser una fecha futura a la actual.", "#fef2f2", "#dc2626");
                    return;
                }
                // Validación: Finalización no menor al inicio
                if (form.fecha_finalizacion < form.fecha_inicio) {
                    mostrarAlerta("La fecha de finalización no puede ser anterior a la fecha de inicio.", "#fef2f2", "#dc2626");
                    return;
                }
            }

            procesando.value = true;

            try {
                // CORRECCIÓN CLAVE: Enviamos graduadoId directamente como texto (UUID), sin parseInt
                const registroAPersistir = {
                    graduado_id: graduadoId, 
                    cargo: form.cargo.trim(),
                    empresa: form.empresa.trim(),
                    area_desarrollo: areaFinal, 
                    salario_aproximado: form.salario_aproximado,
                    fecha_inicio: form.fecha_inicio,
                    fecha_finalizacion: form.es_trabajo_actual ? null : form.fecha_finalizacion,
                    es_trabajo_actual: form.es_trabajo_actual,
                    relacion_con_carrera: form.relacion_con_carrera
                };

                const { data, error } = await supabase
                    .from('historial_laboral')
                    .insert([registroAPersistir])
                    .select();

                if (error) throw error;

                mostrarAlerta("¡Experiencia laboral guardada exitosamente!", "#ecfdf5", "#059669");
                
                // Resetear formulario de forma limpia
                Object.assign(form, {
                    cargo: '',
                    empresa: '',
                    area_desarrollo: '',
                    area_otro_texto: '',
                    salario_aproximado: '',
                    fecha_inicio: '',
                    fecha_finalizacion: '',
                    es_trabajo_actual: false,
                    relacion_con_carrera: true
                });

                // Recargar el historial visual instantáneamente
                await cargarHistorial();

            } catch (err) {
                console.error("Error crítico al insertar en Supabase:", err);
                mostrarAlerta(`Error al guardar: ${err.message || 'Verifica la conexión.'}`, "#fef2f2", "#dc2626");
            } finally {
                procesando.value = false;
            }
        };

        const eliminarRegistro = async (id) => {
            if (!confirm('¿Estás seguro de eliminar este registro laboral?')) return;

            try {
                const { error } = await supabase
                    .from('historial_laboral')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                await cargarHistorial();
                mostrarAlerta("Registro eliminado correctamente.", "#f1f5f9", "#475569");
            } catch (err) {
                console.error("Error al eliminar:", err);
                alert("No se pudo eliminar el registro.");
            }
        };

        const mostrarAlerta = (texto, fondo, colorTexto) => {
            alerta.texto = texto;
            alerta.bg = fondo;
            alerta.color = colorTexto;
            alerta.visible = true;
        };

        const cerrarSesion = () => {
            localStorage.clear();
            window.location.href = '../auth/login.html';
        };

        onMounted(async () => {
            await obtenerCarreraUsuario();
            await cargarHistorial();
        });

        return {
            lblNombreUsuario,
            carreraUsuario,
            cargandoHistorial,
            procesando,
            historial,
            form,
            alerta,
            validarSoloLetras,
            cambioTrabajoActual,
            guardarRegistro,
            eliminarRegistro,
            cerrarSesion
        };
    }
}).mount('#app');