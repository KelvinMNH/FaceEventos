const express = require('express');
const router = express.Router();

const EventoController = require('../controllers/EventoController');
const AcessoController = require('../controllers/AcessoController');
const ParticipanteController = require('../controllers/ParticipanteController');

// Rotas de Eventos
router.get('/eventos', EventoController.listar);
router.post('/eventos', EventoController.criar);
router.post('/eventos/:id/ativar', EventoController.ativar);
router.post('/eventos/:id/finalizar', EventoController.finalizar);
router.get('/evento-ativo', EventoController.getAtivo);

// Rotas de Acesso
router.post('/scan', AcessoController.scan);
router.post('/simulate', AcessoController.simulate);
router.post('/manual-entry', AcessoController.manualEntry);
router.post('/cadastrar-entrada', AcessoController.cadastrarEntrada);
router.post('/registrar-saida', AcessoController.registrarSaida);
router.get('/logs', AcessoController.getLogs);

// Rotas de Participantes
router.get('/participantes/busca', ParticipanteController.buscar);
router.get('/participantes', ParticipanteController.listar);
router.post('/registrar-acompanhante', ParticipanteController.registrarAcompanhante);

// Status
router.get('/status', (req, res) => res.json({ online: true, time: new Date() }));

module.exports = router;
