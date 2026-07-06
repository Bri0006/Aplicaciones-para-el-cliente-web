import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { createApp } = Vue;

createApp({
    data() {
        return {
            // Estados de Control de Modales
            mostrarModalPerfil: false,
            mostrarModalLogout: false,
            
            // Datos del Usuario e Interfaz
            rolUsuario: 'Cargando...',
            listaGraduados: [],
            
            // Datos del Modal de un Egresado
            graduadoSeleccionado: {},
            historialLaboral: [],
            formacionContinua: []
        };
    },
    methods: {
        // Obtener el rol del Administrador en LocalStorage
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

        // Obtener lista de graduados aprobados desde Supabase
        async cargarGraduados() {
            try {
                const { data, error } = await supabase
                    .from('graduados')
                    .select('*')
                    .eq('estado_registro', 'aprobado')
                    .order('apellidos', { ascending: true });

                if (error) throw error;
                this.listaGraduados = data || [];
            } catch (error) {
                console.error("Error al traer graduados desde Supabase:", error.message);
            }
        },

        // Traer datos relacionales del perfil completo al pinchar el botón
        async abrirPerfilCompleto(graduadoId) {
            try {
                const { data: g } = await supabase.from('graduados').select('*').eq('id', graduadoId).single();
                const { data: laboral } = await supabase.from('historial_laboral').select('*').eq('graduado_id', graduadoId);
                const { data: formacion } = await supabase.from('formacion_continua').select('*').eq('graduado_id', graduadoId);

                if (g) {
                    this.graduadoSeleccionado = g;
                    this.historialLaboral = laboral || [];
                    this.formacionContinua = formacion || [];
                    this.mostrarModalPerfil = true; // Abre el modal de forma reactiva
                }
            } catch (error) {
                console.error("Error al desplegar modal relacional de Vue:", error);
            }
        },

        // Proceso de logout limpio
        ejecutarLogout() {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../auth/login_admin.html";
        }
    },
    mounted() {
        // Este hook se ejecuta automáticamente cuando la app está lista
        this.obtenerRolSesion();
        this.cargarGraduados();
    }
}).mount('#app');