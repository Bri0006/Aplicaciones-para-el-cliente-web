// Configuración de Supabase
const SUPABASE_URL = 'https://qzorfhvrqvgcwedxekil.supabase.co'; // Tu URL de la captura
const SUPABASE_ANON_KEY = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Cargar Carreras al iniciar
async function cargarCarreras() {
    const selectCarreras = document.getElementById('id_carrera');
    
    try {
        const { data, error } = await supabase
            .from('carreras')
            .select('id_carrera, nombre_carrera')
            .order('nombre_carrera', { ascending: true });

        if (error) throw error;

        selectCarreras.innerHTML = '<option value="">Seleccione una carrera</option>';
        data.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id_carrera;
            option.textContent = carrera.nombre_carrera;
            selectCarreras.appendChild(option);
        });
    } catch (err) {
        console.error("Error cargando carreras:", err.message);
        selectCarreras.innerHTML = '<option value="">Error al cargar carreras</option>';
    }
}

// 2. Manejar el Registro
document.getElementById('formRegistro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnEnviar');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    // Capturar datos
    const datosGraduado = {
        cedula: document.getElementById('cedula').value,
        nombres: document.getElementById('nombres').value,
        apellidos: document.getElementById('apellidos').value,
        id_carrera: parseInt(document.getElementById('id_carrera').value),
        año_graduacion: parseInt(document.getElementById('año_graduacion').value),
        genero: document.getElementById('genero').value,
        // Nota: id_graduado debería ser el UUID del usuario logueado en una app real.
        // Por ahora, para esta prueba, usaremos un UUID generado o el auth manual.
    };

    try {
        // Enviar a la tabla 'graduados'
        const { error } = await supabase
            .from('graduados')
            .insert([datosGraduado]);

        if (error) throw error;

        alert('¡Registro exitoso! Información enviada correctamente.');
        document.getElementById('formRegistro').reset();
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'REGISTRAR INFORMACIÓN';
    }
});

// Inicializar
cargarCarreras();