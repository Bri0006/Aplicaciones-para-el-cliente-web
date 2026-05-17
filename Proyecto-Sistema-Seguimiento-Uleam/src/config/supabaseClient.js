const supabaseUrl = 'https://qzorfhvrqvgcwedxekil.supabase.co'; 
const supabaseKey = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';

// Verificamos que la CDN haya cargado el script antes de usarlo
if (!window.supabase) {
    console.error("Supabase SDK no está cargado correctamente desde la CDN.");
} else {
    // Creamos la instancia y la hacemos global para que la vea cualquier script de tu HTML
    window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
}