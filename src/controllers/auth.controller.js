import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { transporter } from "./nodeMailerController.js";
import jwt from 'jsonwebtoken';
import { comparePassword, hashPassword } from "../utils/bcryptUtils.js";
import { generateRandomToken } from "../utils/cryptoUtils.js";
import { generateJWT } from "../utils/jwtUtils.js";

const prisma = new PrismaClient();

// register a new user
export const register = async (req, res) => {

    const { email, password, name, lastName, phoneNumber, address, location } = req.body;

    if (!email || !password || !name || !lastName || !phoneNumber || !address || !location) {
        return res.status(400).json({ message: 'Please fill all fields' });
    }


    try {
        
        // Verificar que el email no esté registrado
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });
        
        // Verificar que el número de teléfono no esté registrado
        const existingPhoneNumber = await prisma.user.findUnique({
            where: {
                phoneNumber
            }
        });
        if (existingPhoneNumber) return res.status(400).json({ message: 'Phone number already exists' });

        // Encriptar la contraseña
        const hashedPassword = await hashPassword(password);

        // Generar token de verificación
        const verificationToken = generateRandomToken();

        // Establecer la expiración del token (por ejemplo, 24 horas)
        const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Crear el usuario em la base de datos
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                lastName,
                phoneNumber,
                address,
                location,
                roleId: 1,
                verificationToken: verificationToken,
                tokenExpiration: tokenExpiration
            }
        });

        // Enviar un email de verificación

        // Construir el enlace de verificación (ajusta APP_URL según tu entorno)
        const verificationLink = `${process.env.API_URL}/auth/verify/${verificationToken}`;

        // Enviar un email de verificación
        try {
            await transporter.sendMail({
                to: email,
                from: process.env.SMTP_EMAIL,
                subject: 'Please verify your account',
                html: `<p>Hello <strong>${name} ${lastName}</strong>,</p>
                       <p>Thank you for registering. Please verify your account by clicking the link below:</p>
                       <p><a href="${verificationLink}">Verify Account</a></p>
                       <p>This link will expire in 24 hours.</p>`
            });
        } catch (emailError) {
            console.error('Error sending registration email:', emailError);
        }

        // Retornar el usuario creado (sin la contraseña)
        return res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            user: newUser
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }

};

// login a user
export const login = async (req, res) => {

    const { email, password } = req.body;

    // Validar que se proporcione un email y una contraseña
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Comprar la contraseña proporcionada con la almacenada en la base de datos
        const passwordMatch = await comparePassword(password, user.password);

        if (!passwordMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verificar si el usuario ha verificado su cuenta
        if (!user.verificationStatus) {
            return res.status(400).json({ message: 'Please verify your account' });
        }

        // Verificar si el usuario está activo
        if (!user.isActive) {
            return res.status(400).json({ message: 'Account is inactive' });
        }

        // Crear un token de autenticación
        // const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        const token = generateJWT({ id: user.id });

        // Opcional: Establecer el token en una cookie httpOnly
        // res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        // Retornar el token y el usuario (sin la contraseña)
        return res.status(200).json({ message: 'Login successful', token});

    } catch (error) {
        
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }

};

// verify email
export const verifyEmail = async (req, res) => {

    const { token } = req.params;

    try {
        // Buscar el usuario con el token de verificación y que no haya expirado
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                tokenExpiration: {
                    gte: new Date()
                }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Actualizar el usuario
        const updatedUser = await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                verificationStatus: true,  // Actualizamos el campo correcto
                isActive: true,            // Opcional: activamos la cuenta
                verificationToken: null,
                tokenExpiration: null
            }
        });

        return res.status(200).json({ message: 'Account verified successfully', user: updatedUser });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }

};

// forgot password
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
  
    // Validar que se proporcione un email
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
  
    try {
      // Buscar el usuario por email
      const user = await prisma.user.findUnique({
        where: { email }
      });
  
      if (!user) {
        // Por seguridad, podrías devolver un mensaje genérico para no revelar si el usuario existe o no.
        return res.status(200).json({ message: 'Si existe una cuenta asociada a este correo, recibirás instrucciones para restablecer tu contraseña.' });
      }
  
      // Generar un token para resetear la contraseña
        const resetToken = generateRandomToken();
      // Establecer la expiración del token, por ejemplo, 1 hora
        const resetTokenExpiration = new Date(Date.now() + 60 * 60 * 1000);
  
      // Actualizar el usuario con el token y su expiración
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiration
        }
      });
  
      // Construir el enlace de reseteo (asegúrate de tener definido APP_URL en tus variables de entorno)
      const resetLink = `${process.env.API_URL}/auth/reset-password/${resetToken}`;
  
      // Enviar el email de reseteo de contraseña
      await transporter.sendMail({
        to: email,
        from: process.env.SMTP_EMAIL,
        subject: 'Password Reset Request',
        html: `<p>You have requested a password reset.</p>
               <p>Please click the link below to reset your password:</p>
               <p><a href="${resetLink}">Reset Password</a></p>
               <p>This link will expire in 1 hour.</p>`
      });
  
      return res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

    // reset password

export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
    
        // Validar que se proporcione una nueva contraseña
        if (!password) {
        return res.status(400).json({ message: 'Password is required' });
        }
    
        // Buscar el usuario que tenga el token de reseteo y cuyo token aún no haya expirado
        const user = await prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiration: {
            gte: new Date() // gte: Greater Than or Equal, es decir, token válido si la expiración es mayor o igual a la fecha actual
            }
        }
        });
    
        if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
        }
    
        // Encriptar la nueva contraseña
        const hashedPassword = await hashPassword(password);
    
        // Actualizar la contraseña del usuario y limpiar el token y su expiración.
        // Opcionalmente, se actualiza lastPasswordChange para registrar el cambio.
        const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiration: null,
            lastPasswordChange: new Date()
        }
        });
    
        return res.status(200).json({ message: 'Password reset successfully', user: updatedUser });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};