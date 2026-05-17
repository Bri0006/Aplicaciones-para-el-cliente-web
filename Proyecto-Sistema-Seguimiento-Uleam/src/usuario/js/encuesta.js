// src/usuario/js/encuesta.js
import { supabase } from '../../config/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const graduadoId = localStorage.getItem('session_graduado_id');
    const graduadoNombre = localStorage.getItem('session_graduado_nombre');

    // 1. Validar sesión inmediatamente
    if (!graduadoId) {
        window.location.href = '../auth/login.html';
        return;
    }

    // Colocar el nombre de usuario de forma segura
    document.getElementById('lbl-nombre-usuario').textContent = graduadoNombre || "Graduado ULEAM";

    // Elementos de las 3 Vistas
    const viewIntro = document.getElementById('view-intro');
    const viewForm = document.getElementById('view-form');
    const viewSuccess = document.getElementById('view-success');

    // Botones y Alertas
    const btnComenzar = document.getElementById('btn-comenzar-encuesta');
    const btnVolver = document.getElementById('btn-volver-inicio');
    const formCaces = document.getElementById('form-caces');
    const lblFechaEnvio = document.getElementById('lbl-fecha-envio');
    const alertMsg = document.getElementById('alert-caces');

    // Asegurar estado oculto inicial controlado por JS
    viewIntro.style.display = 'none';
    viewForm.style.display = 'none';
    viewSuccess.style.display = 'none';

    // 2. COMPROBAR SI YA EXISTE LA RESPUESTA EN SUPABASE
    async function verificarEstadoEncuesta() {
        try {
            const { data, error } = await supabase
                .from('encuestas_caces')
                .select('fecha_envio')
                .eq('graduado_id', graduadoId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Si ya la llenó: Salta directo a la pantalla de éxito (Imagen 1)
                const fecha = new Date(data.fecha_envio).toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                lblFechaEnvio.textContent = `Enviada con éxito el: ${fecha}.`;
                
                viewIntro.style.display = 'none';
                viewForm.style.display = 'none';
                viewSuccess.style.display = 'block';
            } else {
                // Si no la ha llenado: Muestra la presentación limpia (Imagen 2)
                viewIntro.style.display = 'block';
                viewForm.style.display = 'none';
                viewSuccess.style.display = 'none';
            }
        } catch (err) {
            console.error("Error al validar el estado inicial del CACES:", err);
            // Fallback seguro por si falla la red: mostrar intro
            viewIntro.style.display = 'block';
        }
    }

    // 3. ACCIÓN: BOTÓN "RESPONDER ENCUESTA" (Abre el cuestionario)
    btnComenzar.addEventListener('click', () => {
        viewIntro.style.display = 'none';
        viewSuccess.style.display = 'none';
        viewForm.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 4. ACCIÓN: ENVIAR FORMULARIO (INSERT EN BASE DE DATOS)
    formCaces.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertMsg.style.display = 'none';

        // CAPTURA SEGURA: Se realiza SOLO al dar clic en Enviar
        const radioP1 = document.querySelector('input[name="p1"]:checked');
        const radioP2 = document.querySelector('input[name="p2"]:checked');
        const radioP3 = document.querySelector('input[name="p3"]:checked');
        const radioP4 = document.querySelector('input[name="p4"]:checked');

        const p5_competencias_faltantes = document.getElementById('txt-p5').value.trim();
        const p6_sugerencias_mejora = document.getElementById('txt-p6').value.trim();

        // Validación extra por seguridad
        if (!radioP1 || !radioP2 || !radioP3 || !radioP4) {
            alert("Por favor, responda todas las preguntas del Bloque 1.");
            return;
        }

        if (confirm('¿Estás seguro de enviar la encuesta? No podrás modificar tus respuestas posteriormente.')) {
            try {
                const { error } = await supabase
                    .from('encuestas_caces')
                    .insert([{
                        graduado_id: graduadoId,
                        p1_aplicabilidad_conocimientos: parseInt(radioP1.value),
                        p2_actualizacion_malla: parseInt(radioP2.value),
                        p3_calidad_infraestructura: parseInt(radioP3.value),
                        p4_desempeno_docente: parseInt(radioP4.value),
                        p5_competencias_faltantes,
                        p6_sugerencias_mejora,
                        finalizada: true
                    }]);

                if (error) throw error;

                // Salto visual inmediato al estado de éxito (Imagen 1)
                lblFechaEnvio.textContent = `Procesado con éxito hoy de forma correcta.`;
                viewForm.style.display = 'none';
                viewIntro.style.display = 'none';
                viewSuccess.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (err) {
                console.error("Error al guardar en Supabase:", err);
                alertMsg.textContent = "Error al conectar con la base de datos. Vuelve a intentarlo.";
                alertMsg.style.backgroundColor = "#fef2f2";
                alertMsg.style.color = "#dc2626";
                alertMsg.style.display = 'block';
            }
        }
    });

    // 5. ACCIÓN: BOTÓN VOLVER AL INICIO
    btnVolver.addEventListener('click', () => {
        window.location.href = 'inicio.html';
    });

    // Arrancar la verificación
    verificarEstadoEncuesta();

    // Botón Cerrar Sesión
    document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../auth/login.html';
    });
});