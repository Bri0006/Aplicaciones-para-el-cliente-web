const supabaseUrl = 'https://qzorfhvrqvgcwedxekil.supabase.co'; 
const supabaseKey = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';

if (!window.supabase) {
    console.error("Supabase SDK no está cargado correctamente.");
}

export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);