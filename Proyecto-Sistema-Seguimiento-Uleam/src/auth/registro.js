const { createApp, ref, onMounted } = Vue;

const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';

// Inicialización garantizada del cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

createApp({
    setup() {
        const maxFecha = new Date().toISOString().split('T')[0];

        // --- ESTADOS REACTIVOS ---
        const form = ref({
            cedula: '',
            nombres: '',
            apellidos: '',
            correo: '',
            carrera: '',
            anio_graduacion: '',
            fecha_nacimiento: '',
            celular: ''
        });

        const listaCarreras = ref([]); 
        const procesando = ref(false); 
        const msgTexto = ref('');      
        const msgClase = ref('');      
        const cedulaError = ref(''); 

        // --- CARGAR CARRERAS DESDE SUPABASE ---
        const obtenerCarreras = async () => {
            try {
                const { data, error } = await supabaseClient
                    .from('carreras')
                    .select('id, nombre')
                    .order('nombre', { ascending: true });

                if (!error && data) {
                    listaCarreras.value = data; 
                } else {
                    console.error("Error al obtener carreras de la BD:", error);
                }
            } catch (err) {
                console.error("Error crítico de conexión:", err);
            }
        };

        // --- ALGORITMO INTEGRAL: VALIDACIÓN CÉDULA ECUATORIANA (MÓDULO 10) ---
        const validarCedulaEcuatoriana = (cedula) => {
            if (cedula.length !== 10) return false;

            const provincia = parseInt(cedula.substring(0, 2), 10);
            if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;

            const tercerDigito = parseInt(cedula.substring(2, 3), 10);
            if (tercerDigito >= 6) return false;

            const digitoVerificador = parseInt(cedula.substring(9, 10), 10);
            let suma = 0;

            for (let i = 0; i < 9; i++) {
                let valor = parseInt(cedula.substring(i, i + 1), 10);
                if (i % 2 === 0) { 
                    valor = valor * 2;
                    if (valor > 9) valor -= 9;
                }
                suma += valor;
            }

            const totalChequeo = 10 - (suma % 10);
            const resultadoEsperado = totalChequeo === 10 ? 0 : totalChequeo;

            return resultadoEsperado === digitoVerificador;
        };

        // --- VERIFICACIÓN EN TIEMPO REAL ---
        const verificarCedulaEnTiempoReal = () => {
            if (form.value.cedula.length === 0) {
                cedulaError.value = '';
                return;
            }
            if (form.value.cedula.length < 10) {
                cedulaError.value = 'La cédula debe tener 10 dígitos.';
                return;
            }
            if (!validarCedulaEcuatoriana(form.value.cedula)) {
                cedulaError.value = 'Esta cédula es inválida o inexistente en Ecuador.';
            } else {
                cedulaError.value = ''; 
            }
        };

        // --- VALIDACIONES FINALES ANTES DE ENVIAR ---
        const validarFormulario = () => {
            const celularRegex = /^09[0-9]{8}$/; 
            const anioActual = new Date().getFullYear(); 
            const anioNum = parseInt(form.value.anio_graduacion, 10);

            verificarCedulaEnTiempoReal();
            if (cedulaError.value) {
                msgTexto.value = cedulaError.value;
                msgClase.value = "error";
                return false;
            }

            if (form.value.fecha_nacimiento > maxFecha) {
                msgTexto.value = "La fecha de nacimiento no puede ser una fecha futura.";
                msgClase.value = "error";
                return false;
            }

            if (!celularRegex.test(form.value.celular)) {
                msgTexto.value = "El celular debe tener exactamente 10 dígitos y empezar con 09.";
                msgClase.value = "error";
                return false;
            }

            if (isNaN(anioNum) || anioNum < 1985 || anioNum > anioActual) {
                msgTexto.value = `Por favor, ingresa un año de graduación válido entre 1985 y ${anioActual}.`;
                msgClase.value = "error";
                return false;
            }

            return true;
        };

        // --- ENVIAR FORMULARIO ---
        // --- ENVIAR FORMULARIO CORREGIDO CON NOMBRE REAL DE COLUMNAS ---
const enviarSolicitud = async () => {
    msgTexto.value = '';
    if (!validarFormulario()) return;

    procesando.value = true; 
    const anioNum = parseInt(form.value.anio_graduacion, 10);

    try {
        const { error } = await supabaseClient
            .from('solicitudes_registro') // Revisa si es graduados o solicitudes_registro la tabla de la imagen
            .insert([
                {
                    cedula: form.value.cedula.trim(),
                    nombres: form.value.nombres.trim(),
                    apellidos: form.value.apellidos.trim(),
                    correo: form.value.correo.trim(),
                    carrera: form.value.carrera,
                    anio_graduacion: anioNum,
                    fecha_nacimiento: form.value.fecha_nacimiento,
                    celular: form.value.celular.trim(), // <--- Asegurando el envío limpio
                    estado: 'pendiente'
                }
            ]);

        if (error) {
            msgClase.value = "error";
            if (error.code === '23505' || error.message.includes('unique')) {
                msgTexto.value = "Esta cédula ya tiene una solicitud registrada o en proceso.";
            } else {
                msgTexto.value = "Error al registrar: " + error.message;
            }
        } else {
            msgClase.value = "success";
            msgTexto.value = "¡Solicitud enviada con éxito!";
            
            form.value = { 
                cedula: '', nombres: '', apellidos: '', correo: '', 
                carrera: '', anio_graduacion: '', fecha_nacimiento: '', celular: '' 
            };
        }
    } catch (err) {
        msgClase.value = "error";
        msgTexto.value = "Error inesperado: " + err.message;
    } finally {
        procesando.value = false; 
    }
};

        onMounted(() => {
            obtenerCarreras();
        });

        return {
            form,
            maxFecha,
            listaCarreras,
            procesando,
            msgTexto,
            msgClase,
            cedulaError,
            verificarCedulaEnTiempoReal,
            enviarSolicitud
        };
    }
}).mount('#app');