// Configurações da aplicação
module.exports = {
  APP: {
    NAME: 'Urna Eletrônica',
    VERSION: '1.0.0',
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development'
  },

  DATABASE: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    POOL_SIZE: 10
  },

  VOTACAO: {
    HORARIO_ABERTURA: '08:00',
    HORARIO_FECHAMENTO: '17:00'
  },

  // CONSTANTES PARA VOTAÇÃO - ADICIONADAS AQUI
  TIPOS_VOTO: {
    CHAPA: 'chapa',
    BRANCO: 'branco',
    NULO: 'nulo'
  },

  CHAPAS: {
    CHAPA1: 'Chapa 1'
  },

  VALORES_VOTO: {
    BRANCO: 'branco',
    NULO: 'nulo'
  }
};