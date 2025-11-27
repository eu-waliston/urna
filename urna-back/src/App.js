const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Importar configurações
const database = require('./config/database');
const constants = require('./config/constants');

// Importar rotas
const votacaoRoutes = require('./routes/votacaoRoutes');

class App {
  constructor() {
    this.app = express();
    this.port = constants.APP.PORT;

    this.initializeMiddlewares();
    this.initializeDatabase();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  async initializeDatabase() {
    try {
      await database.connect();
      console.log('📦 Banco de dados inicializado');
    } catch (error) {
      console.error('❌ Falha ao conectar com o banco de dados:', error);
      process.exit(1);
    }
  }

  initializeRoutes() {
    // Rota raiz
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: `Bem-vindo à ${constants.APP.NAME}`,
        version: constants.APP.VERSION,
        environment: constants.APP.NODE_ENV,
        endpoints: {
          health: 'GET /health',
          votar: 'POST /api/votacao/votar',
          resultados: 'GET /api/votacao/resultados',
          estatisticas: 'GET /api/votacao/estatisticas'
        }
      });
    });

    // Rota de saúde
    this.app.get('/health', async (req, res) => {
      const dbStatus = database.getStatus();

      res.status(200).json({
        status: 'OK',
        app: constants.APP.NAME,
        version: constants.APP.VERSION,
        timestamp: new Date().toISOString(),
        database: dbStatus,
        environment: constants.APP.NODE_ENV
      });
    });

    // Rotas da API
    this.app.use('/api/votacao', votacaoRoutes);
  }

  initializeErrorHandling() {
    // Middleware de erro
    this.app.use((err, req, res, next) => {
      console.error('💥 Erro não tratado:', err);

      const errorResponse = {
        error: 'Erro interno do servidor',
        message: constants.APP.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
      };

      if (constants.APP.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
      }

      res.status(err.status || 500).json(errorResponse);
    });

    // Rota não encontrada
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method,
        availableEndpoints: [
          'GET /',
          'GET /health',
          'POST /api/votacao/votar',
          'GET /api/votacao/resultados',
          'GET /api/votacao/estatisticas'
        ]
      });
    });
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log('\n🚀 ' + constants.APP.NAME + ' iniciado com sucesso!');
      console.log('📍 Porta:', this.port);
      console.log('🌍 Ambiente:', constants.APP.NODE_ENV);
      console.log('⏰ Iniciado em:', new Date().toISOString());
      console.log('📊 Endpoints disponíveis:');
      console.log('   👉 http://localhost:' + this.port);
      console.log('   👉 http://localhost:' + this.port + '/health');
      console.log('   👉 http://localhost:' + this.port + '/api/votacao/votar');
      console.log('   👉 http://localhost:' + this.port + '/api/votacao/resultados\n');
    });

    return this.server;
  }

  async stop() {
    if (this.server) {
      await database.closeConnection();
      this.server.close();
      console.log('🛑 Servidor parado');
    }
  }
}

// Inicializar aplicação
const app = new App();

// Iniciar servidor
app.start();

// Exportar para testes
module.exports = app;