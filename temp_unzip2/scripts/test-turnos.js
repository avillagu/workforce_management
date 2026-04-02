const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let token = '';

const login = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'Matt5593'
        });
        token = res.data.data.token;
        console.log('✅ Login exitoso');
        return token;
    } catch (error) {
        console.error('❌ Error en login:', error.response?.data || error.message);
        process.exit(1);
    }
};

const testCRUD = async () => {
    const empleadoId = '55557497-5a6f-4e61-b643-e462eac473cc'; // blabrado
    let turnoId = '';

    console.log('\n--- Test: Crear Turno ---');
    try {
        const res = await axios.post(`${API_URL}/turnos`, {
            usuario_id: empleadoId,
            hora_inicio: '2026-03-24T08:00:00Z',
            hora_fin: '2026-03-24T17:00:00Z'
        }, { headers: { Authorization: `Bearer ${token}` } });
        turnoId = res.data.data.id;
        console.log('✅ Turno creado:', turnoId);
    } catch (error) {
        console.error('❌ Error creando turno:', error.response?.data || error.message);
    }

    console.log('\n--- Test: Conflicto de Turno ---');
    try {
        await axios.post(`${API_URL}/turnos`, {
            usuario_id: empleadoId,
            hora_inicio: '2026-03-24T10:00:00Z',
            hora_fin: '2026-03-24T12:00:00Z'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('❌ Error: El conflicto debería haber fallado');
    } catch (error) {
        console.log('✅ Conflicto detectado (Esperado 409):', error.response?.status, error.response?.data?.error);
    }

    console.log('\n--- Test: Listar Turnos ---');
    try {
        const res = await axios.get(`${API_URL}/turnos?fecha_inicio=2026-03-24&fecha_fin=2026-03-25`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Turnos listados:', res.data.data.length);
    } catch (error) {
        console.error('❌ Error listando turnos:', error.response?.data || error.message);
    }

    console.log('\n--- Test: Programación Masiva ---');
    try {
        const res = await axios.post(`${API_URL}/turnos/masivo`, {
            empleado_ids: [empleadoId, 'c508512e-8669-4c8a-b07f-2d7fece73da3'],
            fecha_inicio: '2026-03-25',
            fecha_fin: '2026-03-26',
            hora_inicio: '09:00',
            hora_fin: '18:00'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Masivo exitoso:', res.data.data.detalle);
    } catch (error) {
        console.error('❌ Error en masivo:', error.response?.data || error.message);
    }

    console.log('\n--- Test: Eliminar Turno ---');
    try {
        await axios.delete(`${API_URL}/turnos/${turnoId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Turno eliminado');
    } catch (error) {
        console.error('❌ Error eliminando turno:', error.response?.data || error.message);
    }
};

const run = async () => {
    await login();
    await testCRUD();
};

run();
