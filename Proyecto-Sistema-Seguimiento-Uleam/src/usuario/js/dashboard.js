const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        // --- ESTADO REACTIVO ---
        const nombreUsuario = ref('Cargando...');

        // --- GUARDIÁN DE LA SESIÓN ---
        onMounted(() => {
            const sessionID = localStorage.getItem('session_graduado_id');
            const sessionNombre = localStorage.getItem('session_graduado_nombre');

            // Si no hay datos en el localStorage, lo mandamos directo al login
            if (!sessionID || !sessionNombre) {
                alert("Acceso denegado. Por favor, inicia sesión.");
                window.location.href = '../auth/login.html';
                return;
            }

            // Si todo está bien, pintamos el nombre del graduado en la esquina superior
            nombreUsuario.value = sessionNombre;
        });

        // --- FUNCIÓN: CERRAR SESIÓN ---
        const cerrarSesion = () => {
            // Limpiamos los registros de la sesión actual
            localStorage.removeItem('session_graduado_id');
            localStorage.removeItem('session_graduado_nombre');

            // Redirigimos al Login original
            window.location.href = '../auth/login.html';
        };

        return {
            nombreUsuario,
            cerrarSesion
        };
    }
}).mount('#app');