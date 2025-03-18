
import express from 'express';
import routes from './src/routes/index.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json()); // para interpretar los datos que vienen en el body de las peticiones
app.use(express.urlencoded({ extended: true })); // Para interpretar datos de formularios (x-www-form-urlencoded)

app.use('/api', routes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});