import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { createApp } = Vue;

createApp({
    data() {
        return {
            rolUsuario: 'Cargando...',
            solicitudes: [],
            loading: false,
            errorMensaje: null,
            
            // Estados para controlar acciones asíncronas por elemento
            procesandoId: null,

            // Modales y simulación de correos
            mostrarModalCorreo: false,
            mostrarModalLogout: false,
            cuerpoEmail: ''
        };
    },
    methods: {
        cargarRolAdministrador() {
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

        async cargarSolicitudes() {
            this.loading = true;
            this.errorMensaje = null;
            try {
                const { data, error } = await supabase
                    .from('solicitudes_registro')
                    .select('*')
                    .eq('estado', 'pendiente')
                    .order('creado_en', { ascending: false });

                if (error) {
                    this.errorMensaje = `Error de carga: ${error.message}`;
                    return;
                }

                this.solicitudes = data || [];
            } catch (err) {
                this.errorMensaje = `Fatal: ${err.message}`;
            } finally {
                this.loading = false;
            }
        },

        async aprobarSolicitud(solicitud) {
            this.procesandoId = solicitud.id;
            try {
                const anioSeguro = String(solicitud.anio_graduacion || "2026");
                const periodoSeguro = `${anioSeguro}-1`;
                const correoInstitucionalFormateado = `e${solicitud.cedula}@live.uleam.edu.ec`;

                // Inserción en la tabla maestra de graduados
                const { error: insertError } = await supabase
                    .from('graduados')
                    .insert([
                        {
                            cedula: solicitud.cedula,
                            nombres: solicitud.nombres,
                            apellidos: solicitud.apellidos,
                            correo_institucional: correoInstitucionalFormateado, 
                            correo_personal: solicitud.correo || "correo.egresado@uleam.edu.ec", 
                            fecha_nacimiento: solicitud.fecha_nacimiento || "2000-01-01",
                            celular: solicitud.celular || null,
                            ano_graduacion: anioSeguro, 
                            periodo_academico: periodoSeguro, 
                            carrera: solicitud.carrera || 'Ingeniería en Software',
                            estado_registro: 'aprobado'
                        }
                    ]);

                if (insertError) {
                    console.error("Detalle del error en la inserción:", insertError);
                    alert("Error en la base de datos al transferir a graduados: " + insertError.message);
                    return;
                }

                // Cambiar el estado en la solicitud de registro original
                await this.actualizarEstadoSolicitud(solicitud.id, 'approved');
                
                // Disparar vista previa de notificación y refrescar lista reactiva
                this.mostrarSimulacionCorreo(solicitud);
                await this.cargarSolicitudes();

            } catch (err) {
                alert("Error crítico durante la aprobación: " + err.message);
            } finally {
                this.procesandoId = null;
            }
        },

        async rechazarSolicitud(idSolicitud) {
            this.procesandoId = idSolicitud;
            try {
                await this.actualizarEstadoSolicitud(idSolicitud, 'rechazado');
                await this.cargarSolicitudes();
            } catch (err) {
                alert("Error al intentar rechazar el registro: " + err.message);
            } finally {
                this.procesandoId = null;
            }
        },

        async actualizarEstadoSolicitud(id, nuevoEstado) {
            const { error } = await supabase
                .from('solicitudes_registro')
                .update({ estado: nuevoEstado })
                .eq('id', id);

            if (error) {
                console.error("Error al actualizar estado:", error);
                throw new Error(error.message);
            }
        },

        mostrarSimulacionCorreo(solicitud) {
            const fechaActual = new Date().toLocaleString();
            this.cuerpoEmail = `De: departamento.calidad@uleam.edu.ec\nPara: ${solicitud.correo}\nFecha: ${fechaActual}\nAsunto: ¡Acceso Habilitado - Seguimiento de Graduados ULEAM!\n\nEstimado(a) ${solicitud.nombres} ${solicitud.apellidos},\n\nTu registro ha sido aprobado exitosamente por las autoridades de la carrera de ${solicitud.carrera}.\n\nYa puedes ingresar a la plataforma de seguimiento utilizando tu número de cédula en el portal de acceso.\n\nAtentamente,\nDirección de Aseguramiento de la Calidad - ULEAM`;
            this.mostrarModalCorreo = true;
        },

        ejecutarLogout() {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../auth/login_admin.html"; 
        }
    },
    mounted() {
        this.cargarRolAdministrador();
        this.cargarSolicitudes();
    }
}).mount('#app');