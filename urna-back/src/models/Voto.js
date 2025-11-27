const mongoose = require('mongoose');
const constants = require('../config/constants');

const { TIPOS_VOTO, CHAPAS, VALORES_VOTO } = constants;

const votoSchema = new mongoose.Schema({
  tipoVoto: {
    type: String,
    required: [true, 'O tipo de voto é obrigatório'],
    enum: {
      values: Object.values(TIPOS_VOTO),
      message: 'Tipo de voto inválido'
    }
  },
  chapa: {
    type: String,
    required: function() {
      return this.tipoVoto === TIPOS_VOTO.CHAPA;
    },
    validate: {
      validator: function(v) {
        if (this.tipoVoto === TIPOS_VOTO.CHAPA) {
          return Object.values(CHAPAS).includes(v);
        }
        return true;
      },
      message: 'Chapa inválida'
    }
  },
  valorVoto: {
    type: String,
    required: function() {
      return this.tipoVoto !== TIPOS_VOTO.CHAPA;
    },
    validate: {
      validator: function(v) {
        if (this.tipoVoto !== TIPOS_VOTO.CHAPA) {
          return Object.values(VALORES_VOTO).includes(v);
        }
        return true;
      },
      message: 'Valor de voto inválido'
    }
  },
  eleitorId: {
    type: String,
    required: [true, 'O ID do eleitor é obrigatório'],
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    required: true
  },
    sessaoId: {
    type: String,
    required: false
  },
  ipSessao: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Índice único para garantir que um eleitor vote apenas uma vez
votoSchema.index({ eleitorId: 1 }, { unique: true });

// Índice para consultas por tipo de voto
votoSchema.index({ tipoVoto: 1 });

// Método para limpar campos desnecessários antes de salvar
votoSchema.methods.limparCampos = function() {
  if (this.tipoVoto === TIPOS_VOTO.CHAPA) {
    this.valorVoto = null;
  }
  if (this.tipoVoto !== TIPOS_VOTO.CHAPA) {
    this.chapa = null;
  }
};

// Middleware simplificado sem next
votoSchema.pre('save', function() {
  this.limparCampos();
});

module.exports = mongoose.model('Voto', votoSchema);