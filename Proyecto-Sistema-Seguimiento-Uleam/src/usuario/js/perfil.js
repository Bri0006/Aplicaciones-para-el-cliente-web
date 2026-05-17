// src/usuario/js/perfil.js
import { supabase } from '../../config/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const graduadoId = localStorage.getItem('session_graduado_id');
    let graduadoNombre = localStorage.getItem('session_graduado_nombre');

    if (!graduadoId) {
        window.location.href = '../auth/login.html';
        return;
    }

    // Elementos del formulario
    const txtNombreCompleto = document.getElementById('txt-nombre-completo');
    const txtCedula = document.getElementById('txt-cedula');
    const txtFechaNac = document.getElementById('txt-fecha-nac');
    const txtAnoGrad = document.getElementById('txt-ano-grad');
    const txtPeriodo = document.getElementById('txt-periodo');
    const txtCorreoInst = document.getElementById('txt-correo-inst');
    const txtCorreoPers = document.getElementById('txt-correo-pers');
    const txtCelular = document.getElementById('txt-celular');

    const btnEditar = document.getElementById('btn-editar');
    const btnGuardar = document.getElementById('btn-guardar');
    const alertPerfil = document.getElementById('alert-perfil');

    // CARGAR DATOS DESDE SUPABASE
    try {
        const { data: graduado, error } = await supabase
            .from('graduados')
            .select('*')
            .eq('id', graduadoId)
            .single();

        if (error) throw error;

        if (graduado) {
            const nombreCompleto = `${graduado.nombres} ${graduado.apellidos}`;
            
            // Actualizar la sesión si antes estaba vacía
            localStorage.setItem('session_graduado_nombre', nombreCompleto);
            document.getElementById('lbl-nombre-usuario').textContent = nombreCompleto;
            
            // Asignar a los inputs
            txtNombreCompleto.value = nombreCompleto;
            txtCedula.value = graduado.cedula;
            txtFechaNac.value = graduado.fecha_nacimiento;
            txtAnoGrad.value = graduado.ano_graduacion;
            txtPeriodo.value = graduado.periodo_academico;
            txtCorreoInst.value = graduado.correo_institucional;
            txtCorreoPers.value = graduado.correo_personal;
            txtCelular.value = graduado.celular || '';
        }
    } catch (err) {
        console.error("Error cargando perfil:", err);
    }

    // BOTÓN EDITAR
    btnEditar.addEventListener('click', () => {
        txtCorreoPers.disabled = false;
        txtCelular.disabled = false;
        btnEditar.style.display = 'none';
        btnGuardar.style.display = 'block';
    });

    // BOTÓN GUARDAR
    btnGuardar.addEventListener('click', async () => {
        const nuevoCorreoPers = txtCorreoPers.value.trim();
        const nuevoCelular = txtCelular.value.trim();

        alertPerfil.style.display = 'none';

        if (!nuevoCorreoPers || !nuevoCelular) {
            alertPerfil.textContent = "El correo personal y celular no pueden estar vacíos.";
            alertPerfil.style.backgroundColor = "#fef2f2";
            alertPerfil.style.color = "#dc2626";
            alertPerfil.style.display = 'block';
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

            alertPerfil.textContent = "¡Datos guardados y actualizados con éxito!";
            alertPerfil.style.backgroundColor = "#ecfdf5";
            alertPerfil.style.color = "#059669";
            alertPerfil.style.display = 'block';

            txtCorreoPers.disabled = true;
            txtCelular.disabled = true;
            btnGuardar.style.display = 'none';
            btnEditar.style.display = 'block';

        } catch (err) {
            console.error(err);
            alertPerfil.textContent = "Error al intentar guardar los cambios.";
            alertPerfil.style.backgroundColor = "#fef2f2";
            alertPerfil.style.color = "#dc2626";
            alertPerfil.style.display = 'block';
        }
    });

    // CERRAR SESIÓN
    document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../auth/login.html';
    });
});