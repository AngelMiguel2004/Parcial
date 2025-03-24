require('dotenv').config(); // Cargar variables de entorno

const express = require('express');
const { Client } = require('@notionhq/client');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

// Middleware para manejo de errores
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Ruta de prueba
app.get('/', (req, res) => res.send('¡API en funcionamiento!'));

// Obtener lista de estudiantes
app.get('/estudiantes', asyncHandler(async (req, res) => {
    const response = await notion.databases.query({ database_id: databaseId });
    res.json(response.results);
}));

// Agregar un estudiante
app.post('/agregar', asyncHandler(async (req, res) => {
    const { matricula, nombre, proyecto = "", asistencia = 0, practicas = 0, parcial = 0, final = 0 } = req.body;
    if (!matricula || !nombre) return res.status(400).json({ error: "Matrícula y Nombre son obligatorios." });
    
    const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
            "Matrícula": { rich_text: [{ text: { content: matricula } }] },
            "Nombre": { title: [{ text: { content: nombre } }] },
            "Proyecto": { rich_text: [{ text: { content: proyecto } }] },
            "Asistencia": { number: asistencia },
            "Practicas": { number: practicas },
            "Pr. Parcial": { number: parcial },
            "Pr. Final": { number: final }
        }
    });
    res.json({ message: 'Estudiante agregado', id: response.id });
}));

// Editar un campo de un estudiante
app.patch('/editar', asyncHandler(async (req, res) => {
    const { id, campo, valor } = req.body;
    const camposValidos = ["Matrícula", "Asistencia", "Practicas", "Pr. Parcial", "Pr. Final"];
    if (!id || !campo || valor === undefined || !camposValidos.includes(campo)) {
        return res.status(400).json({ error: "Datos inválidos." });
    }
    
    await notion.pages.update({
        page_id: id,
        properties: { [campo]: campo === "Matrícula" ? { rich_text: [{ text: { content: String(valor) } }] } : { number: valor } }
    });
    res.json({ message: `Campo ${campo} actualizado`, id });
}));

// Eliminar (archivar) un estudiante
app.delete('/eliminar', asyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID es obligatorio." });
    
    await notion.pages.update({ page_id: id, archived: true });
    res.json({ message: 'Estudiante archivado' });
}));

// Eliminar un campo específico
app.patch('/eliminar-campo', asyncHandler(async (req, res) => {
    const { id, campo } = req.body;
    const camposValidos = ["Asistencia", "Practicas", "Pr. Parcial", "Pr. Final"];
    if (!id || !campo || !camposValidos.includes(campo)) {
        return res.status(400).json({ error: "Campo inválido." });
    }
    
    await notion.pages.update({ page_id: id, properties: { [campo]: { number: 0 } } });
    res.json({ message: `Campo ${campo} eliminado`, id });
}));

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
