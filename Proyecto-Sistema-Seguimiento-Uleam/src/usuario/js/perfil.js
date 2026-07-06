// src/usuario/js/perfil.js
import { createApp, ref, reactive, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
const supabase = window.supabase;

createApp({
    setup() {
        // Obtenemos el ID del graduado que inició sesión guardado en el navegador
        const graduadoId = localStorage.getItem('session_graduado_id');
        
        // --- ESTADO REACTIVO ---
        const lblNombreUsuario = ref('Cargando...');
        const editando = ref(false);

        const form = reactive({
            nombre_completo: '',
            cedula: '',
            fecha_nacimiento: '',
            ano_graduacion: '',
            periodo_academico: '',
            correo_institucional: '',
            correo_personal: '',
            celular: ''
        });

        const alerta = reactive({
            visible: false,
            texto: '',
            bg: '',
            color: ''
        });

        // --- MÉTODOS ---
        const mostrarAlerta = (texto, tipo) => {
            alerta.texto = texto;
            alerta.visible = true;
            if (tipo === 'error') {
                alerta.bg = '#fef2f2';
                alerta.color = '#dc2626';
            } else {
                alerta.bg = '#ecfdf5';
                alerta.color = '#059669';
            }
        };

        // NUEVA FUNCIÓN: Trae la información real del graduado desde Supabase
        const cargarDatosPerfil = async () => {
            if (!graduadoId) {
                mostrarAlerta("No se detectó una sesión activa. Redirigiendo...", "error");
                setTimeout(() => cerrarSesion(), 2000);
                return;
            }

            try {
                const { data: graduado, error } = await supabase
                    .from('graduados')
                    .select('*')
                    .eq('id', graduadoId)
                    .single(); // Trae un único objeto en lugar de un arreglo

                if (error) throw error;

                if (graduado) {
                    // Unimos nombres y apellidos para la visualización estética
                    const nombreCompleto = `${graduado.nombres} ${graduado.apellidos}`.trim();
                    
                    localStorage.setItem('session_graduado_nombre', nombreCompleto);
                    lblNombreUsuario.value = nombreCompleto;
                    
                    // Asignación directa al estado reactivo del formulario
                    form.nombre_completo = nombreCompleto;
                    form.cedula = graduado.cedula;
                    form.fecha_nacimiento = graduado.fecha_nacimiento;
                    form.ano_graduacion = graduado.ano_graduacion;
                    form.periodo_academico = graduado.periodo_academico;
                    form.correo_personal = graduado.correo_personal;
                    form.celular = graduado.celular || '';

                    // Generación dinámica de su correo institucional según tu regla de negocio
                    form.correo_institucional = graduado.correo_institucional || `e${graduado.cedula}@live.uleam.edu.ec`;
                }
            } catch (err) {
                console.error("Error cargando perfil:", err);
                mostrarAlerta("Error al conectar con el servidor para obtener tus datos.", "error");
            }
        };

        const activarEdicion = () => {
            editando.value = true;
            alerta.visible = false;
        };

        const guardarCambios = async () => {
            const nuevoCorreoPers = form.correo_personal.trim();
            const nuevoCelular = form.celular.trim();

            alerta.visible = false;

            if (!nuevoCorreoPers || !nuevoCelular) {
                mostrarAlerta("El correo personal y el celular no pueden estar vacíos.", "error");
                return;
            }

            try {
                const { error } = await supabase
                    .from('graduados')
                    .update({
                        correo_personal: nuevoCorreoPers,
                        celular: nuevoCelular
                    })
                    .eq('id', graduadoId);

                if (error) throw error;

                mostrarAlerta("¡Datos guardados y actualizados con éxito!", "exito");
                editando.value = false;

            } catch (err) {
                console.error(err);
                mostrarAlerta("Error al intentar guardar los cambios.", "error");
            }
        };

        const cerrarSesion = () => {
            localStorage.clear();
            window.location.href = '../auth/login.html';
        };

        // CICLO DE VIDA: Gatilla la consulta inmediatamente al cargar la página
        onMounted(() => {
            cargarDatosPerfil();
        });

        // Retornamos todo al HTML
        return {
            lblNombreUsuario,
            editando,
            form,
            alerta,
            activarEdicion,
            guardarCambios,
            cerrarSesion
        };
    }
}).mount('#app');