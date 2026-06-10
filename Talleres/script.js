const formulario = document.getElementById("formulario");
const tabla = document.getElementById("tablaEstudiantes");

let estudiantes =
JSON.parse(localStorage.getItem("estudiantes")) || [];

let indiceEditar = -1;

mostrarEstudiantes();

function limpiarErrores() {

    document.querySelectorAll(".error").forEach(error => {
        error.textContent = "";
    });

}

function mostrarError(id, mensaje) {
    document.getElementById(id).textContent = mensaje;
}

formulario.addEventListener("submit", function (e) {

    e.preventDefault();

    limpiarErrores();

    let cedula = document.getElementById("cedula").value.trim();
    let apellidos = document.getElementById("apellidos").value.trim();
    let nombres = document.getElementById("nombres").value.trim();
    let direccion = document.getElementById("direccion").value.trim();
    let telefono = document.getElementById("telefono").value.trim();
    let correo = document.getElementById("correo").value.trim();
    let facultad = document.getElementById("facultad").value;
    let nivel = document.getElementById("nivel").value;
    let paralelo = document.getElementById("paralelo").value;

    const regexCedula = /^\d{10}$/;
    const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    const regexTelefono = /^\d{10}$/;
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let valido = true;

    if (!regexCedula.test(cedula)) {
        mostrarError("errorCedula", "La cédula debe tener 10 dígitos");
        valido = false;
    }

    if (!regexNombre.test(apellidos)) {
        mostrarError("errorApellidos", "Ingrese solo letras");
        valido = false;
    }

    if (!regexNombre.test(nombres)) {
        mostrarError("errorNombres", "Ingrese solo letras");
        valido = false;
    }

    if (direccion.length < 5) {
        mostrarError("errorDireccion", "Ingrese una dirección válida");
        valido = false;
    }

    if (!regexTelefono.test(telefono)) {
        mostrarError("errorTelefono", "Teléfono inválido");
        valido = false;
    }

    if (!regexCorreo.test(correo)) {
        mostrarError("errorCorreo", "Correo inválido");
        valido = false;
    }

    if (facultad === "") {
        mostrarError("errorFacultad", "Seleccione una facultad");
        valido = false;
    }

    if (nivel === "") {
        mostrarError("errorNivel", "Seleccione un nivel");
        valido = false;
    }

    if (paralelo === "") {
        mostrarError("errorParalelo", "Seleccione un paralelo");
        valido = false;
    }

    if (!valido) {
        return;
    }

    const estudiante = {
        cedula,
        apellidos,
        nombres,
        direccion,
        telefono,
        correo,
        facultad,
        nivel,
        paralelo
    };

    if (indiceEditar === -1) {

        estudiantes.push(estudiante);

    } else {

        estudiantes[indiceEditar].telefono = telefono;
        estudiantes[indiceEditar].correo = correo;
        estudiantes[indiceEditar].facultad = facultad;
        estudiantes[indiceEditar].nivel = nivel;
        estudiantes[indiceEditar].paralelo = paralelo;

        indiceEditar = -1;

        document.getElementById("cedula").readOnly = false;
        document.getElementById("apellidos").readOnly = false;
        document.getElementById("nombres").readOnly = false;

        document.querySelector("button[type='submit']").textContent = "Guardar";
    }

    localStorage.setItem(
        "estudiantes",
        JSON.stringify(estudiantes)
    );

    mostrarEstudiantes();

    formulario.reset();

});

function mostrarEstudiantes() {

    tabla.innerHTML = "";

    estudiantes.forEach((estudiante, index) => {

        tabla.innerHTML += `
        <tr>
            <td>${estudiante.cedula}</td>
            <td>${estudiante.apellidos}</td>
            <td>${estudiante.nombres}</td>
            <td>${estudiante.direccion}</td>
            <td>${estudiante.telefono}</td>
            <td>${estudiante.correo}</td>
            <td>${estudiante.facultad}</td>
            <td>${estudiante.nivel}</td>
            <td>${estudiante.paralelo}</td>

            <td>

                <button
                    class="btnEditar"
                    onclick="editarEstudiante(${index})">
                    Editar
                </button>

                <button
                    class="btnEliminar"
                    onclick="eliminarEstudiante(${index})">
                    Eliminar
                </button>

            </td>
        </tr>
        `;
    });

}

function eliminarEstudiante(index) {

    if (confirm("¿Desea eliminar este estudiante?")) {

        estudiantes.splice(index, 1);

        localStorage.setItem(
            "estudiantes",
            JSON.stringify(estudiantes)
        );

        if(indiceEditar === index){

            formulario.reset();

            indiceEditar = -1;

            document.getElementById("cedula").readOnly = false;
            document.getElementById("apellidos").readOnly = false;
            document.getElementById("nombres").readOnly = false;

            document.querySelector("button[type='submit']")
            .textContent = "Guardar";
        }

        mostrarEstudiantes();
    }

}

function editarEstudiante(index) {

    const estudiante = estudiantes[index];

    document.getElementById("cedula").value =
    estudiante.cedula;

    document.getElementById("apellidos").value =
    estudiante.apellidos;

    document.getElementById("nombres").value =
    estudiante.nombres;

    document.getElementById("direccion").value =
    estudiante.direccion;

    document.getElementById("telefono").value =
    estudiante.telefono;

    document.getElementById("correo").value =
    estudiante.correo;

    document.getElementById("facultad").value =
    estudiante.facultad;

    document.getElementById("nivel").value =
    estudiante.nivel;

    document.getElementById("paralelo").value =
    estudiante.paralelo;

    document.getElementById("cedula").readOnly = true;
    document.getElementById("apellidos").readOnly = true;
    document.getElementById("nombres").readOnly = true;

    indiceEditar = index;

    document.querySelector("button[type='submit']").textContent = "Actualizar";

}

document.getElementById("cedula").addEventListener("input",function(){

    if(/^\d{10}$/.test(this.value)){
        document.getElementById("errorCedula").textContent="";
    }

});

document.getElementById("apellidos").addEventListener("input",function(){

    if(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(this.value)){
        document.getElementById("errorApellidos").textContent="";
    }

});

document.getElementById("nombres").addEventListener("input",function(){

    if(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(this.value)){
        document.getElementById("errorNombres").textContent="";
    }

});

document.getElementById("direccion").addEventListener("input",function(){

    if(this.value.length >= 5){
        document.getElementById("errorDireccion").textContent="";
    }

});

document.getElementById("telefono").addEventListener("input",function(){

    if(/^\d{10}$/.test(this.value)){
        document.getElementById("errorTelefono").textContent="";
    }

});

document.getElementById("correo").addEventListener("input",function(){

    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)){
        document.getElementById("errorCorreo").textContent="";
    }

});

document.getElementById("facultad").addEventListener("input",function(){

    if(this.value.trim()!==""){
        document.getElementById("errorFacultad").textContent="";
    }

});

document.getElementById("nivel").addEventListener("input",function(){

    if(this.value.trim()!==""){
        document.getElementById("errorNivel").textContent="";
    }

});

document.getElementById("paralelo").addEventListener("input",function(){

    if(this.value.trim()!==""){
        document.getElementById("errorParalelo").textContent="";
    }

});