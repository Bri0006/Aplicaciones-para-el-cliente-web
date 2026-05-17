// src/auth/verificar.js
import { supabase } from '../config/supabaseClient.js';

document.getElementById('btn-verificar').addEventListener('click', async () => {
    const tokenIngresado = document.getElementById('token-input').value.trim();
    const msgError = document.getElementById('msg-error-verify');
    
    msgError.style.display = 'none';

    // 1. Recuperar el ID del graduado que inició el proceso en login.html
    const graduadoId = localStorage.getItem('graduado_autenticando_id');

    if (!graduadoId) {
        msgError.textContent = "Sesión inválida o expirada. Regresa al inicio e ingresa tu cédula.";
        msgError.style.display = 'block';
        return;
    }

    if (tokenIngresado.length !== 6) {
        msgError.textContent = "El código debe tener exactamente 6 dígitos.";
        msgError.style.display = 'block';
        return;
    }

    try {
        // 2. Traer el token real y la fecha de expiración desde la base de datos
        const { data: graduado, error } = await supabase
            .from('graduados')
            .select('login_token, token_expiracion, nombres, apellidos')
            .eq('id', graduadoId)
            .single();

        if (error || !graduado) {
            msgError.textContent = "Error al validar las credenciales.";
            msgError.style.display = 'block';
            return;
        }

        // 3. Validar si el token coincide
        if (graduado.login_token !== tokenIngresado) {
            msgError.textContent = "El código ingresado es incorrecto. Verifica e intenta de nuevo.";
            msgError.style.display = 'block';
            return;
        }

        // 4. Validar si el token ya expiró
        const ahora = new Date();
        const fechaExpiracion = new Date(graduado.token_expiracion);

        if (ahora > fechaExpiracion) {
            msgError.textContent = "Este código ya expiró. Por favor, regresa y solicita uno nuevo.";
            msgError.style.display = 'block';
            return;
        }

        // 5. ¡ÉXITO! Guardamos la sesión formal en el navegador para simular el login permanente
        localStorage.setItem('session_graduado_id', graduadoId);
        localStorage.setItem('session_graduado_nombre', `${graduado.nombres} ${graduado.apellidos}`);
        
        // Limpiamos la variable temporal de control
        localStorage.removeItem('graduado_autenticando_id');

        // Redirigimos al Dashboard Principal del Graduado
        window.location.href = '../usuario/inicio.html';

    } catch (err) {
        console.error(err);
        msgError.textContent = "Ocurrió un inconveniente de red al validar tu código.";
        msgError.style.display = 'block';
    }
});