// src/config/supabaseClient.js
const supabaseUrl = 'https://qzorfhvrqvgcwedxekil.supabase.co';
const supabaseKey = 'sb_publishable_RefPqk6wa5QFtAGHFnJTiw_CvIHZx0M';
if (!window.supabase) {
    console.error("El SDK de Supabase desde la CDN no se ha cargado antes de este script.");
}
const supabaseInstance = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
window.supabase = supabaseInstance;