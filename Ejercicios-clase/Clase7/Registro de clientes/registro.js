const registroForm = document.querySelector('#registroForm')
registroForm.addEventListener('submit', (e) => {
    e.preventDefault()

    const cedula = document.querySelector('#cedula').value
    const apellidos = document.querySelector('#apellidos').value
    const nombres = document.querySelector('#nombres').value
    const direccion = document.querySelector('#direccion').value
    const telefono = document.querySelector('#telefono').value
    const email = document.querySelector('#email').value

    const Clientes = JSON.parse(localStorage.getItem('Clientes')) || []
    const isClienteRegistered = Clientes.find(Clientes => Clientes.cedula === cedula)
    if (isClienteRegistered) {
        return alert('El cliente ya esta registrado!')
    }

    Clientes.push({ cedula: cedula, apellidos: apellidos, nombres: nombres, direccion: direccion, telefono: telefono, email: email })
    localStorage.setItem('Clientes', JSON.stringify(Clientes))
    alert('Registro Exitoso!')
    window.location.href = 'registro.html'
})