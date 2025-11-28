const API_URL = 'https://urna-dh2i.onrender.com/api/votacao';

// Configuração da senha administrativa
const CONFIG_ADMIN = {
    SENHA: "eleicao2024", // Senha padrão - pode ser alterada
    TEMPO_SESSAO: 30 * 60 * 1000, // 30 minutos em milissegundos
    TENTATIVAS_MAXIMAS: 3
};

class AutenticacaoAdmin {
    constructor() {
        this.sessaoAtiva = false;
        this.tempoExpiracao = null;
        this.tentativas = 0;
        this.bloqueado = false;
    }

    verificarSenha(senha) {
        if (this.bloqueado) {
            throw new Error('Acesso bloqueado. Muitas tentativas falhas.');
        }

        if (senha === CONFIG_ADMIN.SENHA) {
            this.iniciarSessao();
            this.tentativas = 0;
            return true;
        } else {
            this.tentativas++;
            if (this.tentativas >= CONFIG_ADMIN.TENTATIVAS_MAXIMAS) {
                this.bloqueado = true;
                setTimeout(() => {
                    this.bloqueado = false;
                    this.tentativas = 0;
                }, 15 * 60 * 1000);
                throw new Error('Acesso bloqueado por 15 minutos devido a múltiplas tentativas falhas.');
            }
            throw new Error(`Senha incorreta. Tentativas restantes: ${CONFIG_ADMIN.TENTATIVAS_MAXIMAS - this.tentativas}`);
        }
    }

    iniciarSessao() {
        this.sessaoAtiva = true;
        this.tempoExpiracao = Date.now() + CONFIG_ADMIN.TEMPO_SESSAO;

        setTimeout(() => {
            this.encerrarSessao();
            if (window.urna) {
                window.urna.mostrarTela('telaBemVindo');
                alert('Sessão administrativa expirada. Faça login novamente.');
            }
        }, CONFIG_ADMIN.TEMPO_SESSAO);
    }

    encerrarSessao() {
        this.sessaoAtiva = false;
        this.tempoExpiracao = null;
    }

    sessaoValida() {
        if (!this.sessaoAtiva || !this.tempoExpiracao) {
            return false;
        }
        return Date.now() < this.tempoExpiracao;
    }

    tempoRestante() {
        if (!this.sessaoValida()) return 0;
        return Math.max(0, this.tempoExpiracao - Date.now());
    }

    formatarTempoRestante() {
        const tempo = this.tempoRestante();
        if (tempo === 0) return 'Expirada';

        const minutos = Math.floor(tempo / (60 * 1000));
        const segundos = Math.floor((tempo % (60 * 1000)) / 1000);

        return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }
}

class UrnaEletronica {
    constructor() {
        this.matriculaEstudante = '';
        this.tempoRestante = 300;
        this.timerInterval = null;
        this.ipSessao = '';
        this.idSessao = this.gerarIdSessao();
        this.autenticacaoAdmin = new AutenticacaoAdmin();

        this.inicializarEventListeners();
    }

    inicializarEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM carregado - Inicializando event listeners');

            const matriculaInput = document.getElementById('matriculaEstudante');
            if (matriculaInput) {
                matriculaInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.iniciarVotacao();
                    }
                });
            }

            const senhaAdminInput = document.getElementById('senhaAdmin');
            if (senhaAdminInput) {
                senhaAdminInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.verificarSenhaAdmin();
                    }
                });
            }

            // Event listener para fechar modal clicando fora
            const modal = document.getElementById('modalConfirmacao');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.fecharModal();
                    }
                });
            }

            // Event listener para tecla ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.fecharModal();
                }
            });
        });
    }

    gerarIdSessao() {
        return 'sessao_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async obterIpSessao() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.log('Não foi possível obter o IP, usando IP local');
            return '127.0.0.1';
        }
    }

    mostrarTela(idTela) {
        document.querySelectorAll('.tela').forEach(tela => {
            tela.classList.remove('ativa');
        });
        const telaAlvo = document.getElementById(idTela);
        if (telaAlvo) {
            telaAlvo.classList.add('ativa');
        }
    }

    async iniciarVotacao() {
        const matriculaInput = document.getElementById('matriculaEstudante');
        if (!matriculaInput) {
            console.error('Elemento matriculaEstudante não encontrado');
            return;
        }

        const matricula = matriculaInput.value.trim();

        if (!matricula) {
            alert('Por favor, digite sua matrícula para continuar.');
            matriculaInput.focus();
            return;
        }

        if (matricula.length < 9 || matricula.length > 10) {
            alert('Por favor, digite uma matrícula válida.');
            matriculaInput.focus();
            return;
        }

        this.matriculaEstudante = matricula;
        this.ipSessao = await this.obterIpSessao();

        const matriculaAtual = document.getElementById('matriculaAtual');
        const matriculaConfirmacao = document.getElementById('matriculaConfirmacao');

        if (matriculaAtual) matriculaAtual.textContent = this.matriculaEstudante;
        if (matriculaConfirmacao) matriculaConfirmacao.textContent = this.matriculaEstudante;

        this.iniciarTimer();
        this.mostrarTela('telaVotacao');
    }

    iniciarTimer() {
        this.tempoRestante = 300;
        this.atualizarTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.tempoRestante--;
            this.atualizarTimerDisplay();

            if (this.tempoRestante <= 0) {
                this.tempoEsgotado();
            }
        }, 1000);
    }

    atualizarTimerDisplay() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            const minutos = Math.floor(this.tempoRestante / 60);
            const segundos = this.tempoRestante % 60;
            timerElement.textContent =
                `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        }
    }

    tempoEsgotado() {
        clearInterval(this.timerInterval);
        alert('Tempo esgotado! Sua sessão de votação foi encerrada.');
        this.voltarInicio();
    }

    // MODAL FUNCTIONS - VERSÃO CORRIGIDA
    mostrarModalConfirmacao() {
        console.log('Tentando mostrar modal...');
        const modal = document.getElementById('modalConfirmacao');
        const matriculaModal = document.getElementById('matriculaModal');

        if (!modal) {
            console.error('Modal não encontrado!');
            // Fallback: votar diretamente
            this.registrarVoto('chapa', 'Chapa 1', null);
            return;
        }

        if (!matriculaModal) {
            console.error('Elemento matriculaModal não encontrado!');
            return;
        }

        console.log('Matrícula atual:', this.matriculaEstudante);
        matriculaModal.textContent = this.matriculaEstudante;
        modal.style.display = 'block';
        console.log('Modal deve estar visível agora');
    }

    fecharModal() {
        console.log('Fechando modal...');
        const modal = document.getElementById('modalConfirmacao');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async confirmarVotoChapa1() {
        console.log('Confirmando voto na Chapa 1...');
        this.fecharModal();
        await this.registrarVoto('chapa', 'Chapa 1', null);
    }

    // MODIFICADA: Agora abre o modal em vez de votar diretamente
    async votarChapa1() {
        console.log('Clicou em votar Chapa 1 - Abrindo modal');
        this.mostrarModalConfirmacao();
    }

    async votarBranco() {
        await this.registrarVoto('branco', null, 'branco');
    }

    async votarNulo() {
        await this.registrarVoto('nulo', null, 'nulo');
    }

    async registrarVoto(tipoVoto, chapa, valorVoto) {
        try {
            const votoData = {
                tipoVoto: tipoVoto,
                eleitorId: this.matriculaEstudante,
                sessaoId: this.idSessao,
                ipSessao: this.ipSessao
            };

            if (chapa) {
                votoData.chapa = chapa;
            }

            if (valorVoto) {
                votoData.valorVoto = valorVoto;
            }

            const response = await fetch(`${API_URL}/votar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(votoData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao registrar voto');
            }

            this.mostrarConfirmacao(tipoVoto, data);

        } catch (error) {
            console.error('Erro:', error);

            if (error.message.includes('já realizou seu voto')) {
                alert('⚠️ Você já realizou seu voto! Cada estudante pode votar apenas uma vez.');
                this.voltarInicio();
            } else {
                alert('❌ Erro ao registrar voto: ' + error.message);
            }
        }
    }

    mostrarConfirmacao(tipoVoto, data) {
        clearInterval(this.timerInterval);

        const tipoVotoTexto = {
            'chapa': 'Chapa 1',
            'branco': 'Branco',
            'nulo': 'Nulo'
        }[tipoVoto];

        const tipoVotoConfirmacao = document.getElementById('tipoVotoConfirmacao');
        const horarioVoto = document.getElementById('horarioVoto');
        const ipSessao = document.getElementById('ipSessao');
        const idSessao = document.getElementById('idSessao');

        if (tipoVotoConfirmacao) tipoVotoConfirmacao.textContent = tipoVotoTexto;
        if (horarioVoto) horarioVoto.textContent = new Date().toLocaleString('pt-BR');
        if (ipSessao) ipSessao.textContent = this.ipSessao;
        if (idSessao) idSessao.textContent = this.idSessao;

        this.mostrarTela('telaConfirmacao');
    }

    voltarInicio() {
        clearInterval(this.timerInterval);
        this.matriculaEstudante = '';
        this.idSessao = this.gerarIdSessao();
        const matriculaInput = document.getElementById('matriculaEstudante');
        if (matriculaInput) matriculaInput.value = '';
        this.mostrarTela('telaBemVindo');
    }

    mostrarLoginAdmin() {
        this.mostrarTela('telaLoginAdmin');
        const senhaInput = document.getElementById('senhaAdmin');
        if (senhaInput) senhaInput.value = '';
    }

    acessarResultadosAdmin() {
        if (this.autenticacaoAdmin.sessaoValida()) {
            this.mostrarTela('telaResultados');
            this.carregarResultados();
            this.iniciarTimerSessaoAdmin();
        } else {
            this.mostrarLoginAdmin();
        }
    }

    iniciarTimerSessaoAdmin() {
        const atualizarTempoSessao = () => {
            if (this.autenticacaoAdmin.sessaoValida()) {
                const tempoRestante = this.autenticacaoAdmin.formatarTempoRestante();
                const elementoContador = document.getElementById('contadorSessao');
                if (elementoContador) {
                    elementoContador.textContent = `Sessão expira em: ${tempoRestante}`;
                }
            }
        };

        setInterval(atualizarTempoSessao, 1000);
        atualizarTempoSessao();
    }

    async carregarResultados() {
        try {
            const response = await fetch(`${API_URL}/resultados`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao carregar resultados');
            }

            if (data.success) {
                this.atualizarInterfaceResultados(data.data.resultados);
                this.atualizarHoraAtualizacao();
            }

        } catch (error) {
            console.error('Erro ao carregar resultados:', error);
            alert('❌ Erro ao carregar resultados: ' + error.message);
        }
    }

    atualizarInterfaceResultados(resultados) {
        document.getElementById('totalGeral').textContent = resultados.totais.totalGeral;
        document.getElementById('totalValidos').textContent = resultados.totais.votosValidos;
        document.getElementById('totalBrancos').textContent = resultados.totais.brancos;
        document.getElementById('totalNulos').textContent = resultados.totais.nulos;

        const listaChapas = document.getElementById('listaChapas');
        listaChapas.innerHTML = '';

        if (resultados.chapas && resultados.chapas.length > 0) {
            resultados.chapas.forEach(chapa => {
                const chapaItem = document.createElement('div');
                chapaItem.className = 'chapa-item';
                chapaItem.innerHTML = `
                    <span class="chapa-nome">${chapa.chapa}</span>
                    <span class="chapa-votos">${chapa.totalVotos} votos</span>
                `;
                listaChapas.appendChild(chapaItem);
            });
        } else {
            listaChapas.innerHTML = '<p style="text-align: center; color: #6c757d;">Nenhuma chapa recebeu votos</p>';
        }

        this.atualizarBarrasPercentuais(resultados.percentuais);
        document.getElementById('participacao').textContent = resultados.percentuais.votosValidos || '0%';
        document.getElementById('relacaoValidosBrancos').textContent =
            this.calcularRelacaoValidosBrancos(resultados.totais.votosValidos, resultados.totais.brancos);
    }

    atualizarBarrasPercentuais(percentuais) {
        const barraChapa = document.getElementById('barraChapa');
        const barraBranco = document.getElementById('barraBranco');
        const barraNulo = document.getElementById('barraNulo');

        const valorChapa = document.getElementById('valorChapa');
        const valorBranco = document.getElementById('valorBranco');
        const valorNulo = document.getElementById('valorNulo');

        const percentChapa = percentuais.votosValidos || '0';
        const percentBranco = percentuais.brancos || '0';
        const percentNulo = percentuais.nulos || '0';

        barraChapa.style.width = percentChapa + '%';
        barraBranco.style.width = percentBranco + '%';
        barraNulo.style.width = percentNulo + '%';

        valorChapa.textContent = percentChapa + '%';
        valorBranco.textContent = percentBranco + '%';
        valorNulo.textContent = percentNulo + '%';
    }

    calcularRelacaoValidosBrancos(validos, brancos) {
        if (validos === 0) return '0%';
        const total = validos + brancos;
        const percentual = ((validos / total) * 100).toFixed(1);
        return percentual + '%';
    }

    atualizarHoraAtualizacao() {
        const agora = new Date();
        const horaFormatada = agora.toLocaleString('pt-BR');
        document.getElementById('horaAtualizacao').textContent = `Última atualização: ${horaFormatada}`;
        document.getElementById('ultimaAtualizacao').textContent = horaFormatada;
    }

    verificarSenhaAdmin() {
        const senhaInput = document.getElementById('senhaAdmin');
        if (!senhaInput) return;

        const senha = senhaInput.value.trim();

        if (!senha) {
            alert('Por favor, digite a senha de acesso.');
            senhaInput.focus();
            return;
        }

        try {
            const sucesso = this.autenticacaoAdmin.verificarSenha(senha);

            if (sucesso) {
                this.mostrarTela('telaResultados');
                this.carregarResultados();
                this.iniciarTimerSessaoAdmin();
            }
        } catch (error) {
            alert('❌ ' + error.message);
            senhaInput.value = '';
            senhaInput.focus();
        }
    }

    sairAdmin() {
        this.autenticacaoAdmin.encerrarSessao();
        this.mostrarTela('telaBemVindo');
        alert('Sessão administrativa encerrada.');
    }
}

// Inicializar a urna quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== INICIALIZANDO SISTEMA DE URNA ===');
    window.urna = new UrnaEletronica();
    console.log('Sistema de urna inicializado com sucesso!');
});

// ===== FUNÇÕES GLOBAIS =====
// Estas funções são chamadas pelos botões HTML

function iniciarVotacao() {
    console.log('Função global iniciarVotacao chamada');
    if (window.urna) {
        window.urna.iniciarVotacao();
    } else {
        console.error('Urna não inicializada!');
    }
}

function votarChapa1() {
    console.log('Função global votarChapa1 chamada');
    if (window.urna) {
        window.urna.votarChapa1();
    } else {
        console.error('Urna não inicializada!');
    }
}

function votarBranco() {
    if (window.urna) {
        window.urna.votarBranco();
    }
}

function votarNulo() {
    if (window.urna) {
        window.urna.votarNulo();
    }
}

function voltarInicio() {
    if (window.urna) {
        window.urna.voltarInicio();
    }
}

function acessarAreaAdmin() {
    if (window.urna) {
        window.urna.mostrarLoginAdmin();
    }
}

function verificarSenhaAdmin() {
    if (window.urna) {
        window.urna.verificarSenhaAdmin();
    }
}

function carregarResultados() {
    if (window.urna) {
        window.urna.carregarResultados();
    }
}

function sairAdmin() {
    if (window.urna) {
        window.urna.sairAdmin();
    }
}

function fecharModal() {
    console.log('Função global fecharModal chamada');
    if (window.urna) {
        window.urna.fecharModal();
    }
}

function confirmarVotoChapa1() {
    console.log('Função global confirmarVotoChapa1 chamada');
    if (window.urna) {
        window.urna.confirmarVotoChapa1();
    }
}

// Evento de tecla ESC global
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && window.urna) {
        window.urna.fecharModal();
    }
});

// Atualização automática a cada 30 segundos
setInterval(() => {
    const telaResultados = document.getElementById('telaResultados');
    if (telaResultados && telaResultados.classList.contains('ativa') && window.urna) {
        window.urna.carregarResultados();
    }
}, 30000);

// DEBUG: Verificar se o modal existe
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== VERIFICAÇÃO DO MODAL ===');
    const modal = document.getElementById('modalConfirmacao');
    console.log('Modal encontrado:', !!modal);

    if (modal) {
        console.log('Modal está no DOM');
    } else {
        console.error('❌ Modal não encontrado no DOM!');
    }
});