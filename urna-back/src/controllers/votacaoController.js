const Voto = require('../models/Voto');
const constants = require('../config/constants');

// Desestruturar as constantes
const { TIPOS_VOTO, CHAPAS, VALORES_VOTO } = constants;

// Registrar voto
exports.registrarVoto = async (req, res) => {
  try {
    const { tipoVoto, chapa, valorVoto, eleitorId } = req.body;

    // Validar dados obrigatórios
    if (!eleitorId) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'ID do eleitor é obrigatório'
      });
    }

    // Validar tipo de voto
    if (!tipoVoto || !Object.values(TIPOS_VOTO).includes(tipoVoto)) {
      return res.status(400).json({
        error: 'Tipo de voto inválido',
        message: `Tipo de voto deve ser: ${Object.values(TIPOS_VOTO).join(', ')}`
      });
    }

    // Validações específicas por tipo de voto
    if (tipoVoto === TIPOS_VOTO.CHAPA) {
      if (!chapa) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Chapa é obrigatória para voto em chapa'
        });
      }
      if (!Object.values(CHAPAS).includes(chapa)) {
        return res.status(400).json({
          error: 'Chapa inválida',
          message: `Chapas válidas: ${Object.values(CHAPAS).join(', ')}`
        });
      }
    } else {
      if (!valorVoto) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'Valor do voto é obrigatório para votos brancos/nulos'
        });
      }
      if (!Object.values(VALORES_VOTO).includes(valorVoto)) {
        return res.status(400).json({
          error: 'Valor de voto inválido',
          message: `Valores válidos: ${Object.values(VALORES_VOTO).join(', ')}`
        });
      }
    }

    // Verificar se o eleitor já votou
    const votoExistente = await Voto.findOne({ eleitorId });
    if (votoExistente) {
      return res.status(409).json({
        error: 'Voto já registrado',
        message: 'Este eleitor já realizou seu voto'
      });
    }

    // Criar novo voto
    const novoVoto = new Voto({
      tipoVoto,
      chapa: tipoVoto === TIPOS_VOTO.CHAPA ? chapa : null,
      valorVoto: tipoVoto !== TIPOS_VOTO.CHAPA ? valorVoto : null,
      eleitorId,
      ip: req.ip || req.connection.remoteAddress
    });

    await novoVoto.save();

    res.status(201).json({
      success: true,
      message: 'Voto registrado com sucesso',
      data: {
        tipoVoto: novoVoto.tipoVoto,
        chapa: novoVoto.chapa,
        valorVoto: novoVoto.valorVoto,
        timestamp: novoVoto.timestamp
      }
    });

  } catch (error) {
    console.error('Erro ao registrar voto:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Voto duplicado',
        message: 'Este eleitor já realizou seu voto'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Dados de voto inválidos',
        messages: errors
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível registrar o voto'
    });
  }
};

// Obter resultados completos
exports.obterResultados = async (req, res) => {
  try {
    // Agregação para votos em chapas
    const votosChapa = await Voto.aggregate([
      {
        $match: { tipoVoto: TIPOS_VOTO.CHAPA }
      },
      {
        $group: {
          _id: '$chapa',
          totalVotos: { $sum: 1 }
        }
      },
      {
        $project: {
          tipo: 'chapa',
          chapa: '$_id',
          totalVotos: 1,
          _id: 0
        }
      }
    ]);

    // Agregação para votos brancos/nulos
    const votosEspeciais = await Voto.aggregate([
      {
        $match: { tipoVoto: { $in: [TIPOS_VOTO.BRANCO, TIPOS_VOTO.NULO] } }
      },
      {
        $group: {
          _id: '$valorVoto',
          totalVotos: { $sum: 1 }
        }
      },
      {
        $project: {
          tipo: '$_id',
          totalVotos: 1,
          _id: 0
        }
      }
    ]);

    // Calcular totais
    const totalVotosChapa = votosChapa.reduce((total, resultado) => total + resultado.totalVotos, 0);
    const totalBrancos = votosEspeciais.find(v => v.tipo === VALORES_VOTO.BRANCO)?.totalVotos || 0;
    const totalNulos = votosEspeciais.find(v => v.tipo === VALORES_VOTO.NULO)?.totalVotos || 0;
    const totalGeral = totalVotosChapa + totalBrancos + totalNulos;

    // Formatar resultados
    const resultados = {
      chapas: votosChapa,
      brancos: totalBrancos,
      nulos: totalNulos,
      totais: {
        votosValidos: totalVotosChapa,
        brancos: totalBrancos,
        nulos: totalNulos,
        totalGeral: totalGeral
      },
      percentuais: {
        votosValidos: totalGeral > 0 ? ((totalVotosChapa / totalGeral) * 100).toFixed(2) : 0,
        brancos: totalGeral > 0 ? ((totalBrancos / totalGeral) * 100).toFixed(2) : 0,
        nulos: totalGeral > 0 ? ((totalNulos / totalGeral) * 100).toFixed(2) : 0
      }
    };

    res.status(200).json({
      success: true,
      data: {
        resultados,
        atualizadoEm: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao obter resultados:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter os resultados'
    });
  }
};

// Estatísticas básicas
exports.obterEstatisticas = async (req, res) => {
  try {
    const totalVotos = await Voto.countDocuments();
    const porTipo = await Voto.aggregate([
      {
        $group: {
          _id: '$tipoVoto',
          total: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalVotos,
        distribuicao: porTipo,
        atualizadoEm: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter as estatísticas'
    });
  }
};