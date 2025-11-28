require('dotenv').config();
const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('✅ Usando conexão existente com MongoDB');
        return this.connection;
      }

      const MONGODB_URI = process.env.DB_URL;

      console.log('🔄 Conectando ao MongoDB...');

      // REMOVER opções descontinuadas
      const options = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(MONGODB_URI, options);
      this.isConnected = true;

      console.log('✅ MongoDB conectado com sucesso!');
      console.log(`📊 Banco de dados: ${mongoose.connection.db.databaseName}`);
      console.log(`🎯 Host: ${mongoose.connection.host}`);

      // Event listeners
      mongoose.connection.on('connected', () => {
        console.log('✅ Mongoose conectado ao MongoDB');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ Erro na conexão com MongoDB:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  Mongoose desconectado do MongoDB');
        this.isConnected = false;
      });

      process.on('SIGINT', this.closeConnection.bind(this));
      process.on('SIGTERM', this.closeConnection.bind(this));

      return this.connection;

    } catch (error) {
      console.error('❌ Erro ao conectar com MongoDB:', error);
      throw error;
    }
  }

  async closeConnection() {
    if (this.connection) {
      try {
        await mongoose.connection.close();
        console.log('✅ Conexão com MongoDB fechada');
        this.isConnected = false;
        this.connection = null;
      } catch (error) {
        console.error('❌ Erro ao fechar conexão com MongoDB:', error);
        throw error;
      }
    }
  }

  getConnection() {
    return mongoose.connection;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      dbName: mongoose.connection.db?.databaseName,
      host: mongoose.connection.host
    };
  }
}

module.exports = new Database();