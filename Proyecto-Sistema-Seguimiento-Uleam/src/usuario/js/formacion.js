// src/usuario/js/formacion.js
import { supabase } from '../../config/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const graduadoId = localStorage.getItem('session_graduado_id');
    const graduadoNombre = localStorage.getItem('session_graduado_nombre');

    // 1. Validar sesión de usuario
    if (!graduadoId) {
        window.location.href = '../auth/login.html';
        return;
    }

    document.getElementById('lbl-nombre-usuario').textContent = graduadoNombre;

    const form = document.getElementById('form-formacion');
    const tbodyFormacion = document.getElementById('tbody-formacion');
    const alertMsg = document.getElementById('alert-formacion');

    // 2. FUNCIÓN PARA CARGAR LA FORMACIÓN CONTINUA DESDE SUPABASE
    async function cargarFormacion() {
        tbodyFormacion.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando tus estudios...</td></tr>';
        
        try {
            const { data, error } = await supabase
                .from('formacion_continua')
                .select('*')
                .eq('graduado_id', graduadoId)
                .order('fecha_finalizacion', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                tbodyFormacion.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">No tienes registros de formación continua ingresados.</td></tr>';
                return;
            }

            tbodyFormacion.innerHTML = '';
            data.forEach(item => {
                const tr = document.createElement('tr');
                
                // Definir estilo de badge basado en el tipo
                let tipoClass = 'badge-curso';
                if (item.tipo === 'Maestría') tipoClass = 'badge-maestria';
                else if (item.tipo === 'Certificación') tipoClass = 'badge-certificacion';
                else if (item.tipo === 'Diplomado') tipoClass = 'badge-diplomado';
                else if (item.tipo === 'Doctorado') tipoClass = 'badge-doctorado';

                tr.innerHTML = `
                    <td><span class="badge ${tipoClass}">${item.tipo}</span></td>
                    <td><strong>${item.titulo_nombre}</strong></td>
                    <td>${item.institucion}</td>
                    <td>${item.fecha_inicio}</td>
                    <td>${item.fecha_finalizacion}</td>
                    <td><button class="btn-delete" data-id="${item.id}">❌ Eliminar</button></td>
                `;
                tbodyFormacion.appendChild(tr);
            });

            // Configurar botones de eliminación dinámicos
            const botonesEliminar = document.querySelectorAll('.btn-delete');
            botonesEliminar.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const idRegistro = e.target.getAttribute('data-id');
                    if (confirm('¿Estás seguro de eliminar este registro académico?')) {
                        await eliminarFormacion(idRegistro);
                    }
                });
            });

        } catch (err) {
            console.error("Error al cargar formación:", err);
            tbodyFormacion.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al recuperar los datos académicos.</td></tr>';
        }
    }

    // 3. FUNCIÓN PARA ELIMINAR UN REGISTRO
    async function eliminarFormacion(id) {
        try {
            const { error } = await supabase
                .from('formacion_continua')
                .delete()
                .eq('id', id);

            if (error) throw error;
            cargarFormacion(); // Recargar tabla
        } catch (err) {
            console.error("Error al eliminar:", err);
            alert("No se pudo eliminar el registro de formación.");
        }
    }

    // 4. EVENTO SUBMIT PARA INSERTAR EN SUPABASE
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertMsg.style.display = 'none';

        const tipo = document.getElementById('cmb-tipo').value;
        const titulo_nombre = document.getElementById('txt-titulo').value.trim();
        const institucion = document.getElementById('txt-institucion').value.trim();
        const fecha_inicio = document.getElementById('txt-fecha-inicio').value;
        const fecha_finalizacion = document.getElementById('txt-fecha-fin').value;

        // Validación lógica de fechas
        if (new Date(fecha_inicio) > new Date(fecha_finalizacion)) {
            mostrarAlerta("La fecha de inicio no puede ser posterior a la fecha de finalización.", "#fef2f2", "#dc2626");
            return;
        }

        try {
            const { error } = await supabase
                .from('formacion_continua')
                .insert([{
                    graduado_id: graduadoId,
                    tipo,
                    titulo_nombre,
                    institucion,
                    fecha_inicio,
                    fecha_finalizacion
                }]);

            if (error) throw error;

            mostrarAlerta("¡Formación académica guardada con éxito!", "#ecfdf5", "#059669");
            form.reset();
            cargarFormacion(); // Refrescar la lista inferior

        } catch (err) {
            console.error("Error al insertar formación:", err);
            mostrarAlerta("Hubo un error al intentar guardar los datos en Supabase.", "#fef2f2", "#dc2626");
        }
    });

    function mostrarAlerta(texto, fondo, colorTexto) {
        alertMsg.textContent = texto;
        alertMsg.style.backgroundColor = fondo;
        alertMsg.style.color = colorTexto;
        alertMsg.style.display = 'block';
    }

    // Carga inicial
    cargarFormacion();

    // Evento de Cerrar Sesión
    document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../auth/login.html';
    });
});