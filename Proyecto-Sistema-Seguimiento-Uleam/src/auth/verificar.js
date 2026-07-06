const { createApp, ref } = Vue;

createApp({
    setup() {
        // --- ESTADOS REACTIVOS ---
        const token = ref('');        // El código de 6 dígitos que escribe el usuario
        const procesando = ref(false); // Bloqueo del botón
        const msgError = ref('');     // Mensajes de error
        const msgExito = ref('');     // Mensaje de éxito antes de redirigir

        // --- FUNCIÓN PRINCIPAL: COMPROBAR EL CÓDIGO ---
        const comprobarCodigo = async () => {
            msgError.value = '';
            msgExito.value = '';

            // 1. Recuperar el ID del graduado guardado previamente por login.html
            const graduadoId = localStorage.getItem('graduado_autenticando_id');

            if (!graduadoId) {
                msgError.value = "Sesión inválida o expirada. Por favor, regresa al login e ingresa tu cédula de nuevo.";
                return;
            }

            // Validación rápida de longitud
            if (token.value.length !== 6) {
                msgError.value = "El código debe tener exactamente 6 dígitos.";
                return;
            }

            procesando.value = true; // Cambia el botón a 'VERIFICANDO...'

            try {
                // 2. Traer el token real y los datos necesarios de Supabase
                const { data: graduado, error: queryError } = await window.supabase
                    .from('graduados')
                    .select('login_token, token_expiracion, nombres, apellidos')
                    .eq('id', graduadoId)
                    .maybeSingle();

                if (queryError || !graduado) {
                    msgError.value = "Error al validar tus credenciales o el usuario no existe.";
                    procesando.value = false;
                    return;
                }

                // 3. Validar si el token coincide
                if (graduado.login_token !== token.value.trim()) {
                    msgError.value = "El código ingresado es incorrecto. Verifica e intenta de nuevo.";
                    procesando.value = false;
                    return;
                }

                // 4. Validar si el token ya expiró
                const ahora = new Date();
                const fechaExpiracion = new Date(graduado.token_expiracion);

                if (ahora > fechaExpiracion) {
                    msgError.value = "Este código ya expiró. Por favor, regresa al inicio y solicita uno nuevo.";
                    procesando.value = false;
                    return;
                }

                // 5. ¡TODO CORRECTO! Creamos la sesión formal en el navegador
                localStorage.setItem('session_graduado_id', graduadoId);
                localStorage.setItem('session_graduado_nombre', `${graduado.nombres} ${graduado.apellidos}`);
                
                // Limpiamos la variable temporal de control para dejar todo limpio
                localStorage.removeItem('graduado_autenticando_id');

                msgExito.value = "¡Código verificado con éxito! Accediendo al sistema...";

                // Redirigimos al Dashboard Principal del Graduado tras 2 segundos
                setTimeout(() => {
                    window.location.href = '../usuario/inicio.html';
                }, 2000);

            } catch (err) {
                console.error("Error crítico en verificación:", err);
                msgError.value = "Hubo un error inesperado de red. Inténtalo otra vez.";
                procesando.value = false;
            }
        };

        // Exportamos las variables al HTML
        return {
            token,
            procesando,
            msgError,
            msgExito,
            comprobarCodigo
        };
    }
}).mount('#app');