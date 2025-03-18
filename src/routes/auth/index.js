import { Router } from 'express';
import { register, login, verifyEmail, forgotPassword, resetPassword } from '../../controllers/auth.controller.js';

const router = Router();

// Registro de usuario
router.post('/register', register);

// Inicio de sesión
router.post('/login', login);

// Verificación de correo (por ejemplo, al hacer clic en el enlace enviado)
router.get('/verify/:token', verifyEmail);

// Recuperación de contraseña
router.post('/forgot-password', forgotPassword);

// Cambio de contraseña
router.post('/reset-password/:token', resetPassword);

export default router;