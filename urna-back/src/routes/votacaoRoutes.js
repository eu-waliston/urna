const express = require('express');
const router = express.Router();

// IMPORT CORRETO - caminho relativo
const votacaoController = require('../controllers/votacaoController');

// POST /api/votacao/votar - Registrar um voto
router.post('/votar', votacaoController.registrarVoto);

// GET /api/votacao/resultados - Obter resultados completos da votação
router.get('/resultados', votacaoController.obterResultados);

// GET /api/votacao/estatisticas - Obter estatísticas básicas
router.get('/estatisticas', votacaoController.obterEstatisticas);

module.exports = router;