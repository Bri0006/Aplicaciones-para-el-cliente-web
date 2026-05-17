import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuración de Supabase (Asegúrate de mapear tus credenciales correctas)
const SUPABASE_URL = "TU_SUPABASE_URL";
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tbody = document.getElementById('tabla-solicitudes');
const modal = document.getElementById('modal-correo');
const emailBody = document.getElementById('email-body');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

// Cargar solicitudes pendientes al iniciar la página
async function cargarSolicitudes() {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Cargando solicitudes...</td></tr>`;
    
    const { data, error } = await supabase
        .from('solicitudes_registro')
        .select('*')
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        return;
    }

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--texto-mutado);">No hay solicitudes pendientes por revisar.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    data.forEach(solicitud => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${solicitud.cedula}</td>
            <td>${solicitud.nombres} ${solicitud.apellidos}</td>
            <td>${solicitud.correo}</td>
            <td>${solicitud.carrera}</td>
            <td>${solicitud.anio_graduacion}</td>
            <td><span class="badge-pending">Pendiente</span></td>
            <td>
                <button class="btn-action btn-approve" data-id="${solicitud.id}">Aprobar</button>
                <button class="btn-action btn-reject" data-id="${solicitud.id}">Rechazar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    asignarEventosBotones(data);
}

function asignarEventosBotones(solicitudes) {
    // Eventos para el botón aprobar
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idSolicitud = e.target.getAttribute('data-id');
            const info = solicitudes.find(s => s.id == idSolicitud);
            if (info) await aprobarSolicitud(info);
        });
    });

    // Eventos para el botón rechazar
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idSolicitud = e.target.getAttribute('data-id');
            if (confirm("¿Está seguro de que desea rechazar esta solicitud de acceso?")) {
                await actualizarEstadoSolicitud(idSolicitud, 'rechazado');
                cargarSolicitudes();
            }
        });
    });
}

// LÓGICA PRINCIPAL: TRASPASO DE DATOS Y ACTIVACIÓN
async function aprobarSolicitud(solicitud) {
    // 1. Insertar en la tabla oficial de graduados que lee el login
    const { error: insertError } = await supabase
        .from('graduados')
        .insert([
            {
                cedula: solicitud.cedula,
                nombres: solicitud.nombres,
                apellidos: solicitud.apellidos,
                correo_institucional: solicitud.correo, // Se guarda en su cuenta institucional de acceso
                correo_personal: solicitud.correo, // Temporalmente igual hasta que el graduado actualice su perfil
                fecha_nacimiento: '2000-01-01', // Valor por defecto para cumplir la restricción NOT NULL
                ano_graduacion: solicitud.anio_graduacion,
                periodo_academico: `${solicitud.anio_graduacion}-1`, // Valor base inicial
                carrera: solicitud.carrera,
                estado_registro: 'aprobado'
            }
        ]);

    if (insertError) {
        alert("Error al traspasar al graduado: " + insertError.message);
        return;
    }

    // 2. Cambiar el estado de la solicitud para que desaparezca de pendientes
    await actualizarEstadoSolicitud(solicitud.id, 'aprobado');

    // 3. Mostrar la simulación del correo enviado de forma interactiva
    mostrarSimulacionCorreo(solicitud);
    
    // 4. Refrescar la tabla actual de la pantalla
    cargarSolicitudes();
}

async function actualizarEstadoSolicitud(id, nuevoEstado) {
    const { error } = await supabase
        .from('solicitudes_registro')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if (error) {
        alert("Error al actualizar la solicitud: " + error.message);
    }
}

// SIMULACIÓN DE INFRAESTRUCTURA DE CORREO (SMTP CLIENT-SIDE)
function mostrarSimulacionCorreo(solicitud) {
    const fechaActual = new Date().toLocaleString();
    
    emailBody.textContent = `De: departamento.calidad@uleam.edu.ec\nPara: ${solicitud.correo}\nFecha: ${fechaActual}\nAsunto: ¡Tu acceso al Sistema de Graduados ULEAM ha sido habilitado!\n\nEstimado(a) ${solicitud.nombres} ${solicitud.apellidos},\n\nNos complace informarte que la Secretaría Académica ha validado exitosamente tu estatus para la carrera de ${solicitud.carrera}.\n\nA partir de este momento, estás habilitado(a) para ingresar a la plataforma y responder los formularios obligatorios del CACES.\n\n📌 Pasos para ingresar:\n1. Dirígete a la página de inicio de sesión.\n2. Digita tu número de cédula: ${solicitud.cedula}\n3. Presiona 'Solicitar Código' para recibir tu token de acceso en este buzón.\n\nAtentamente,\nDirección de Aseguramiento de la Calidad - ULEAM`;
    
    modal.style.display = 'flex';
}

// Cerrar Modal de confirmación
btnCerrarModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Carga Inicial
document.addEventListener('DOMContentLoaded', cargarSolicitudes);