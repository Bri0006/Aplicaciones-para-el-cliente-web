// src/auth/auth.js
import { supabase } from '../config/supabaseClient.js';

document.getElementById('btn-solicitar').addEventListener('click', async () => {
    const cedula = document.getElementById('cedula-input').value.trim();
    const msgExito = document.getElementById('msg-exito');
    const msgError = document.getElementById('msg-error');
    
    // Ocultar mensajes previos
    msgExito.style.display = 'none';
    msgError.style.display = 'none';

    if (cedula.length !== 10) {
        msgError.textContent = "Por favor, ingresa un número de cédula válido (10 dígitos).";
        msgError.style.display = 'block';
        return;
    }

    try {
        // 1. Consultar si el graduado existe en Supabase y está aprobado
        const { data: graduado, error } = await supabase
            .from('graduados')
            .select('id, correo_personal, correo_institucional, estado_registro')
            .eq('cedula', cedula)
            .single();

        if (error || !graduado) {
            msgError.textContent = "El número de cédula no se encuentra registrado en el sistema.";
            msgError.style.display = 'block';
            return;
        }

        if (graduado.estado_registro === 'pendiente') {
            msgError.textContent = "Tu registro está guardado pero aún está pendiente de aprobación por el Administrador.";
            msgError.style.display = 'block';
            return;
        }

        // 2. Generar un código dinámico aleatorio de 6 dígitos
        const tokenDinamico = Math.floor(100000 + Math.random() * 900000).toString();
        
        // El token expirará en 15 minutos
        const expiracion = new Date();
        expiracion.setMinutes(expiracion.getMinutes() + 15);

        // 3. Guardar el código generado en la fila del graduado en Supabase
        const { updateError } = await supabase
            .from('graduados')
            .update({ 
                login_token: tokenDinamico, 
                token_expiracion: expiracion.toISOString() 
            })
            .eq('id', graduado.id);

        // Censurar el correo para proteger datos en pantalla (Ej: j***z@gmail.com)
        const correoDestino = graduado.correo_personal;
        const [usuario, dominio] = correoDestino.split('@');
        const correoOculto = `${usuario[0]}***${usuario[usuario.length - 1]}@${dominio}`;

        // 4. Mostrar confirmación en pantalla y redirigir
        msgExito.textContent = `Código enviado con éxito al correo registrado: ${correoOculto}. Redirigiendo...`;
        msgExito.style.display = 'block';

        // Guardamos el ID del graduado temporalmente en el navegador para validarlo en el siguiente paso
        localStorage.setItem('graduado_autenticando_id', graduado.id);

        // Simulamos la redirección a verificar.html después de 3 segundos
        setTimeout(() => {
            window.location.href = 'verificar.html';
        }, 3000);

    } catch (err) {
        console.error(err);
        msgError.textContent = "Ocurrió un error inesperado al procesar la solicitud.";
        msgError.style.display = 'block';
    }
});