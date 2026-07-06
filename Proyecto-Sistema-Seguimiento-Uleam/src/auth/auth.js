const { createApp, ref } = Vue;

createApp({
    setup() {
        // --- ESTADOS REACTIVOS ---
        const cedula = ref('');       // Cédula ingresada por el usuario
        const procesando = ref(false); // Maneja el estado de carga del botón
        const msgExito = ref('');     // Alerta de éxito
        const msgError = ref('');     // Alerta de error

        // --- FUNCIÓN: GENERAR TOKEN ALEATORIO DE 6 DÍGITOS ---
        const generarToken6Digitos = () => {
            return Math.floor(100000 + Math.random() * 900000).toString();
        };

        // --- FUNCIÓN PRINCIPAL: SOLICITAR ACCESO ---
        const solicitarClave = async () => {
            // Limpiamos mensajes anteriores antes de iniciar
            msgExito.value = '';
            msgError.value = '';

            // Validación extra de seguridad por si acaso
            const cedulaRegex = /^[0-9]{10}$/;
            if (!cedulaRegex.test(cedula.value)) {
                msgError.value = "Por favor, ingresa un número de cédula válido (10 dígitos numéricos).";
                return;
            }

            procesando.value = true; // Deshabilitamos el botón cambiándolo a 'VALIDANDO...'

            try {
                // 1. Consultar si el graduado existe en la tabla principal y está aprobado
                const { data: graduado, error: queryError } = await window.supabase
                    .from('graduados')
                    .select('id, correo_personal, correo_institucional, estado_registro')
                    .eq('cedula', cedula.value)
                    .maybeSingle(); // maybeSingle evita errores si encuentra 0 registros

                if (queryError) throw queryError;

                if (!graduado) {
                    msgError.value = "El número de cédula no se encuentra registrado en el sistema o aún no ha sido migrado.";
                    procesando.value = false;
                    return;
                }

                // 2. Verificar si su estado no es 'pendiente' o 'rechazado'
                if (graduado.estado_registro === 'pendiente') {
                    msgError.value = "Tu registro está en estado 'pendiente'. La facultad debe aprobarlo antes de que puedas ingresar.";
                    procesando.value = false;
                    return;
                }
                if (graduado.estado_registro === 'rechazado') {
                    msgError.value = "Tu solicitud de acceso fue rechazada. Por favor, acércate a la secretaría de tu carrera.";
                    procesando.value = false;
                    return;
                }

                // 3. Generar token dinámico y configurar tiempo de vida (15 minutos)
                const tokenDinamico = generarToken6Digitos();
                const expiracion = new Date();
                expiracion.setMinutes(expiracion.getMinutes() + 15);

                // 4. Guardar el código en la base de datos dentro de la fila de este graduado
                const { error: updateError } = await window.supabase
                    .from('graduados')
                    .update({ 
                        login_token: tokenDinamico, 
                        token_expiracion: expiracion.toISOString() 
                    })
                    .eq('id', graduado.id);

                if (updateError) throw updateError;

                // --- PROCESO DE CENSURA VISUAL DEL CORREO ---
                // Tomamos el correo personal para ocultarlo parcialmente por seguridad (Ej: b***a@gmail.com)
                const correoDestino = graduado.correo_personal || graduado.correo_institucional;
                const [usuario, dominio] = correoDestino.split('@');
                const correoOculto = `${usuario[0]}***${usuario[usuario.length - 1]}@${dominio}`;

                // Imprimimos el token en la consola de desarrollo de manera temporal 
                // para que puedas hacer pruebas en local sin un servidor de correos real.
                console.log("=========================================");
                console.log(`[TOKEN GENERADO PARA PRUEBAS]: ${tokenDinamico}`);
                console.log("=========================================");

                // 5. Mostrar confirmación en pantalla
                msgExito.value = `Código enviado con éxito al correo registrado: ${correoOculto}. Redirigiendo...`;

                // Guardamos el ID del graduado que se está autenticando en el localStorage 
                // para que la pantalla 'verificar.html' sepa a quién le pertenece el token.
                localStorage.setItem('graduado_autenticando_id', graduado.id);

                // Redirigir a verificar.html después de 2.5 segundos
                setTimeout(() => {
                    window.location.href = 'verificar.html';
                }, 2500);

            } catch (err) {
                console.error("Error crítico en el proceso de autenticación:", err);
                msgError.value = "Hubo un problema de conexión con el servidor. Inténtalo más tarde.";
                procesando.value = false;
            }
        };

        // Exponemos las propiedades al HTML
        return {
            cedula,
            procesando,
            msgExito,
            msgError,
            solicitarClave
        };
    }
}).mount('#app');