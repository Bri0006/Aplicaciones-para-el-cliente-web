// src/usuario/dashboard.js
import { supabase } from '../../config/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("¡dashboard.js cargado correctamente!");

    const graduadoId = localStorage.getItem('session_graduado_id');
    const graduadoNombre = localStorage.getItem('session_graduado_nombre');

    // 1. Verificar si hay sesión activa
    if (!graduadoId) {
        console.log("No se encontró ID de sesión, redirigiendo al login...");
        window.location.href = '../auth/login.html';
        return;
    }

    // 2. Intento rápido: si el nombre ya existía en el localStorage, lo pintamos de una
    if (graduadoNombre && graduadoNombre !== "null" && graduadoNombre.trim() !== "") {
        const lblNombre = document.getElementById('lbl-nombre-usuario');
        if (lblNombre) lblNombre.textContent = graduadoNombre;
    }

    // 3. Intento seguro: Vamos a Supabase a traer los datos reales
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('graduados')
                .select('nombres, apellidos')
                .eq('id', graduadoId)
                .single();
            
            if (data && !error) {
                const nombreCompleto = `${data.nombres} ${data.apellidos}`;
                localStorage.setItem('session_graduado_nombre', nombreCompleto);
                
                const lblNombre = document.getElementById('lbl-nombre-usuario');
                if (lblNombre) lblNombre.textContent = nombreCompleto;
            } else {
                console.error("Supabase no devolvió datos o hubo un error:", error);
            }
        }
    } catch (err) {
        console.error("Error crítico al conectar con Supabase:", err);
        // Rescate: Si Supabase falla por rutas, al menos ponemos un texto genérico para que no diga 'Cargando...'
        const lblNombre = document.getElementById('lbl-nombre-usuario');
        if (lblNombre && lblNombre.textContent === "Cargando...") {
            lblNombre.textContent = "Graduado ULEAM";
        }
    }

    // 4. Activar el botón de Cerrar Sesión pase lo que pase
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '../auth/login.html';
        });
    }
});