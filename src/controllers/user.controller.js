import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/bcryptUtils';

const prisma = new PrismaClient();

// Create a new user
export const createUser = async (req, res) => {
    const { email, password, name, lastName, phoneNumber, address, location } = req.body;
  
    // Validar que se proporcionen todos los campos
    if (!email || !password || !name || !lastName || !phoneNumber || !address || !location) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }
  
    try {
      // Verificar que el email no esté registrado
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ message: 'Email already in use' });
  
      // Verificar que el número de teléfono no esté registrado
      const existingPhone = await prisma.user.findUnique({ where: { phoneNumber } });
      if (existingPhone) return res.status(400).json({ message: 'Phone number already in use' });
  
      // Encriptar la contraseña usando la función utilitaria
      const passwordHashed = await hashPassword(password);
  
      // Crear el usuario en la base de datos con el password encriptado
      const newUser = await prisma.user.create({
        data: {
          email,
          password: passwordHashed,
          name,
          lastName,
          phoneNumber,
          address,
          location,
          roleId: 1, // Asumiendo que 1 es el rol de usuario básico
        }
      });
  
      // Filtrar campos sensibles antes de retornar el usuario
      const { password: _, ...userWithoutPassword } = newUser;
  
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Error creating user" });
    }
  };

// Get all users
export const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
    } catch (error) {
        console.log('Error getting users: ', error);
        res.status(500).json({ message: 'Error getting users' });
    }
};

// Get user by id
export const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(id),
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.log('Error getting user: ', error);
        res.status(500).json({ message: 'Error getting user' });
    }
};

// Update user
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, password, name, lastName, phoneNumber, address, location, roleId } = req.body;
  
    try {
      // Construir el objeto de datos a actualizar
      const dataToUpdate = {
        email,
        name,
        lastName,
        phoneNumber,
        address,
        location,
        roleId,
      };
  
      // Si se envía una nueva contraseña, hashearla antes de actualizar
      if (password) {
        dataToUpdate.password = await hashPassword(password);
      }
  
      const updatedUser = await prisma.user.update({
        where: { id: parseInt(id) },
        data: dataToUpdate,
      });
  
      // Filtrar la contraseña antes de retornar el usuario actualizado
      const { password: _, ...userWithoutPassword } = updatedUser;
  
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ message: "Error updating user" });
    }
  };

  
// Delete user
export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedUser = await prisma.user.delete({
            where: {
                id: parseInt(id),
            },
        });

        res.status(200).json(deletedUser);
    } catch (error) {
        console.log('Error deleting user: ', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};
