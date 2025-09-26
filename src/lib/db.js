// src/lib/db.js
import { Sequelize } from 'sequelize';

// Initialize Sequelize with your database configuration
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // Adjust the path to your database file
  logging: false, // Set to true if you want to see SQL queries in the console
});
