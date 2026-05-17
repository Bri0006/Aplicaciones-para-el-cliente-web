// src/usuario/js/profesional.js
import { supabase } from '../../config/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const graduadoId = localStorage.getItem('session_graduado_id');
    const graduadoNombre = localStorage.getItem('session_graduado_nombre');

    if (!graduadoId) {
        window.location.href = '../auth/login.html';
        return;
    }

    document.getElementById('lbl-nombre-usuario').textContent = graduadoNombre;

    const form = document.getElementById('form-laboral');
    const chkActual = document.getElementById('chk-actual');
    const txtFechaFin = document.getElementById('txt-fecha-fin');
    const tbodyHistorial = document.getElementById('tbody-historial');
    const alertMsg = document.getElementById('alert-profesional');
    const lblRelacion = document.getElementById('lbl-relacion-carrera');

    // ==========================================
    // NUEVO: OBTENER LA CARRERA REAL DEL USUARIO
    // ==========================================
    try {
        const { data: usuario, error: errUser } = await supabase
            .from('graduados')
            .select('carrera')
            .eq('id', graduadoId)
            .single();

        if (usuario && usuario.carrera) {
            // Reemplaza dinámicamente el texto del checkbox con su carrera real
            lblRelacion.textContent = `¿Tiene relación con tu carrera de ${usuario.carrera}?`;
        }
    } catch (e) {
        console.error("No se pudo personalizar el texto de la carrera:", e);
    }

    // 1. CONTROL DE FECHA FINALIZACIÓN
    chkActual.addEventListener('change', () => {
        if (chkActual.checked) {
            txtFechaFin.value = '';
            txtFechaFin.disabled = true;
            txtFechaFin.removeAttribute('required');
        } else {
            txtFechaFin.disabled = false;
        }
    });

    // 2. FUNCIÓN PARA CARGAR EL HISTORIAL DESDE SUPABASE
    async function cargarHistorial() {
        tbodyHistorial.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando historial...</td></tr>';
        
        try {
            const { data, error } = await supabase
                .from('historial_laboral')
                .select('*')
                .eq('graduado_id', graduadoId)
                .order('fecha_inicio', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                tbodyHistorial.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">No tienes registros laborales ingresados.</td></tr>';
                return;
            }

            tbodyHistorial.innerHTML = '';
            data.forEach(item => {
                const tr = document.createElement('tr');
                
                const finStr = item.es_trabajo_actual ? '<span class="badge badge-actual">Actualidad</span>' : item.fecha_finalizacion;
                const duracion = `${item.fecha_inicio} a ${finStr}`;
                
                const relacionBadge = item.relacion_con_carrera 
                    ? '<span class="badge badge-relacion">Sí</span>' 
                    : '<span class="badge badge-no-relacion">No</span>';

                tr.innerHTML = `
                    <td><strong>${item.cargo}</strong></td>
                    <td>${item.empresa}</td>
                    <td>${item.area_desarrollo}</td>
                    <td>${duracion}</td>
                    <td>${relacionBadge}</td>
                    <td><button class="btn-delete" data-id="${item.id}">❌ Eliminar</button></td>
                `;
                tbodyHistorial.appendChild(tr);
            });

            const botonesEliminar = document.querySelectorAll('.btn-delete');
            botonesEliminar.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const idRegistro = e.target.getAttribute('data-id');
                    if (confirm('¿Estás seguro de eliminar este registro laboral?')) {
                        await eliminarRegistro(idRegistro);
                    }
                });
            });

        } catch (err) {
            console.error("Error al cargar historial:", err);
            tbodyHistorial.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al recuperar los datos.</td></tr>';
        }
    }

    // 3. FUNCIÓN PARA ELIMINAR UN REGISTRO
    async function eliminarRegistro(id) {
        try {
            const { error } = await supabase
                .from('historial_laboral')
                .delete()
                .eq('id', id);

            if (error) throw error;
            cargarHistorial();
        } catch (err) {
            console.error("Error al eliminar:", err);
            alert("No se pudo eliminar el registro.");
        }
    }

    // 4. EVENTO SUBMIT PARA GUARDAR
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertMsg.style.display = 'none';

        const cargo = document.getElementById('txt-cargo').value.trim();
        const empresa = document.getElementById('txt-empresa').value.trim();
        const area_desarrollo = document.getElementById('cmb-area').value;
        const salario_aproximado = document.getElementById('cmb-salario').value;
        const fecha_inicio = document.getElementById('txt-fecha-inicio').value;
        const es_trabajo_actual = chkActual.checked;
        const relacion_con_carrera = document.getElementById('chk-relacion').checked;
        const fecha_finalizacion = es_trabajo_actual ? null : txtFechaFin.value;

        if (!es_trabajo_actual && !fecha_finalizacion) {
            mostrarAlerta("Por favor, ingresa una fecha de finalización o marca que es tu trabajo actual.", "#fef2f2", "#dc2626");
            return;
        }

        try {
            const { error } = await supabase
                .from('historial_laboral')
                .insert([{
                    graduado_id: graduadoId,
                    cargo,
                    empresa,
                    area_desarrollo, // Guarda el área corporativa seleccionada
                    salario_aproximado,
                    fecha_inicio,
                    fecha_finalizacion,
                    es_trabajo_actual,
                    relacion_con_carrera
                }]);

            if (error) throw error;

            mostrarAlerta("¡Experiencia laboral guardada exitosamente!", "#ecfdf5", "#059669");
            form.reset();
            txtFechaFin.disabled = false;
            cargarHistorial();

        } catch (err) {
            console.error("Error al insertar:", err);
            mostrarAlerta("Ocurrió un error al intentar guardar los datos en Supabase.", "#fef2f2", "#dc2626");
        }
    });

    function mostrarAlerta(texto, fondo, colorTexto) {
        alertMsg.textContent = texto;
        alertMsg.style.backgroundColor = fondo;
        alertMsg.style.color = colorTexto;
        alertMsg.style.display = 'block';
    }

    cargarHistorial();

    document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../auth/login.html';
    });
});