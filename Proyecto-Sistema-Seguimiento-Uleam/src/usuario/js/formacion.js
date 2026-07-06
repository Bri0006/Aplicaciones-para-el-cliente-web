// src/usuario/js/formacion.js
import { createApp, ref, reactive, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

// Coloca aquí tus credenciales de Supabase (las mismas que usas en los demás archivos)
const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co'; // Extraída de tus pestañas abiertas
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M'; // Pon aquí tu clave pública real

// Inicializamos el cliente correctamente
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

createApp({
    setup() {
        const graduadoId = localStorage.getItem('session_graduado_id');
        const lblNombreUsuario = ref(localStorage.getItem('session_graduado_nombre') || 'Graduado');
        
        const cargandoHistorial = ref(true);
        const procesando = ref(false);
        const estudios = ref([]);

        const form = reactive({
            tipo: '',
            titulo_nombre: '',
            institucion: '',
            fecha_inicio: '',
            fecha_finalizacion: ''
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

        const cargarEstudios = async () => {
            cargandoHistorial.value = true;
            try {
                const { data, error } = await supabase
                    .from('formacion_continua')
                    .select('*')
                    .eq('graduado_id', graduadoId)
                    .order('fecha_finalizacion', { ascending: false });

                if (error) throw error;
                estudios.value = data || [];
            } catch (err) {
                console.error("Error al cargar formación continua:", err);
                mostrarAlerta("Error al recuperar los datos académicos.", "#fef2f2", "#dc2626");
            } finally {
                cargandoHistorial.value = false;
            }
        };

        const guardarFormacion = async () => {
            alerta.visible = false;
            const hoy = new Date().toISOString().split('T')[0];

            if (form.fecha_inicio > hoy) {
                mostrarAlerta("La fecha de inicio no puede ser una fecha futura a la actual.", "#fef2f2", "#dc2626");
                return;
            }

            if (form.fecha_finalizacion > hoy) {
                mostrarAlerta("La fecha de finalización no puede ser una fecha futura a la actual.", "#fef2f2", "#dc2626");
                return;
            }

            if (form.fecha_finalizacion < form.fecha_inicio) {
                mostrarAlerta("La fecha de finalización no puede ser anterior a la fecha de inicio.", "#fef2f2", "#dc2626");
                return;
            }

            procesando.value = true;

            try {
                const registroAPersistir = {
                    graduado_id: graduadoId,
                    tipo: form.tipo,
                    titulo_nombre: form.titulo_nombre.trim(),
                    institucion: form.institucion.trim(),
                    fecha_inicio: form.fecha_inicio,
                    fecha_finalizacion: form.fecha_finalizacion
                };

                const { error } = await supabase
                    .from('formacion_continua')
                    .insert([registroAPersistir]);

                if (error) throw error;

                mostrarAlerta("¡Formación académica guardada con éxito!", "#ecfdf5", "#059669");
                
                Object.assign(form, {
                    tipo: '',
                    titulo_nombre: '',
                    institucion: '',
                    fecha_inicio: '',
                    fecha_finalizacion: ''
                });

                await cargarEstudios();

            } catch (err) {
                console.error("Error al insertar formación:", err);
                mostrarAlerta("Hubo un error al intentar guardar los datos en Supabase.", "#fef2f2", "#dc2626");
            } finally {
                procesando.value = false;
            }
        };

        const eliminarEstudio = async (id) => {
            if (!confirm('¿Estás seguro de eliminar este registro académico?')) return;

            try {
                const { error } = await supabase
                    .from('formacion_continua')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                
                await cargarEstudios();
                mostrarAlerta("Registro académico eliminado correctamente.", "#f1f5f9", "#475569");
            } catch (err) {
                console.error("Error al eliminar:", err);
                alert("No se pudo eliminar el registro de formación.");
            }
        };

        const obtenerClaseBadge = (tipo) => {
            if (tipo === 'Maestría') return 'badge-maestria';
            if (tipo === 'Certificación') return 'badge-certificacion';
            if (tipo === 'Diplomado') return 'badge-diplomado';
            if (tipo === 'Doctorado') return 'badge-doctorado';
            return 'badge-curso';
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
            await cargarEstudios();
        });

        return {
            lblNombreUsuario,
            cargandoHistorial,
            procesando,
            estudios,
            form,
            alerta,
            guardarFormacion,
            eliminarEstudio,
            obtenerClaseBadge,
            cerrarSesion
        };
    }
}).mount('#app');