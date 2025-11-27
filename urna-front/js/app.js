const API_URL = 'http://localhost:3000/api/votacao';

class UrnaEletronica {
    constructor() {
        this.nomeEleitor = '';
        this.tempoRestante = 300; // 5 minutos em segundos
        this.timerInterval = null;
    }

    // Mostrar tela específica
    mostrarTela(idTela) {
        document.querySelectorAll('.tela').forEach(tela => {
            tela.classList.remove('ativa');
        });
        document.getElementById(idTela).classList.add('ativa');
    }

    // Iniciar votação
    iniciarVotacao() {
        const nomeInput = document.getElementById('nomeEleitor');
        const nome = nomeInput.value.trim();

        if (!nome) {
            alert('Por favor, digite seu primeiro nome para continuar.');
            nomeInput.focus();
            return;
        }

        if (nome.length < 2) {
            alert('Por favor, digite um nome válido (mínimo 2 caracteres).');
            nomeInput.focus();
            return;
        }

        this.nomeEleitor = nome;

        // Atualizar nome nas telas
        document.getElementById('nomeEleitorAtual').textContent = this.nomeEleitor;
        document.getElementById('nomeEleitorConfirmacao').textContent = this.nomeEleitor;

        // Iniciar timer
        this.iniciarTimer();

        // Ir para tela de votação
        this.mostrarTela('telaVotacao');
    }

    // Timer de 5 minutos
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
        const minutos = Math.floor(this.tempoRestante / 60);
        const segundos = this.tempoRestante % 60;
        document.getElementById('timer').textContent =
            `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }

    tempoEsgotado() {
        clearInterval(this.timerInterval);
        alert('Tempo esgotado! Sua sessão de votação foi encerrada.');
        this.voltarInicio();
    }

    // Funções de voto
    async votarChapa1() {
        await this.registrarVoto('chapa', 'Chapa 1', null);
    }

    async votarBranco() {
        await this.registrarVoto('branco', null, 'branco');
    }

    async votarNulo() {
        await this.registrarVoto('nulo', null, 'nulo');
    }

    // Registrar voto na API
    async registrarVoto(tipoVoto, chapa, valorVoto) {
        try {
            const votoData = {
                tipoVoto: tipoVoto,
                eleitorId: this.nomeEleitor.toLowerCase()
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

            // Sucesso - mostrar tela de confirmação
            this.mostrarConfirmacao(tipoVoto, data);

        } catch (error) {
            console.error('Erro:', error);

            if (error.message.includes('já realizou seu voto')) {
                alert('⚠️ Você já realizou seu voto! Cada pessoa pode votar apenas uma vez.');
                this.voltarInicio();
            } else {
                alert('❌ Erro ao registrar voto: ' + error.message);
            }
        }
    }

    // Mostrar tela de confirmação
    mostrarConfirmacao(tipoVoto, data) {
        clearInterval(this.timerInterval);

        // Atualizar informações na tela de confirmação
        const tipoVotoTexto = {
            'chapa': 'Chapa 1',
            'branco': 'Branco',
            'nulo': 'Nulo'
        }[tipoVoto];

        document.getElementById('tipoVotoConfirmacao').textContent = tipoVotoTexto;
        document.getElementById('horarioVoto').textContent = new Date().toLocaleString('pt-BR');

        this.mostrarTela('telaConfirmacao');

        // Iniciar contador regressivo para voltar ao início
        this.iniciarContadorRegressivo();
    }

    // Contador regressivo de 5 segundos
    iniciarContadorRegressivo() {
        let contador = 5;
        const elementoContador = document.getElementById('contador');

        const interval = setInterval(() => {
            contador--;
            elementoContador.textContent = contador;

            if (contador <= 0) {
                clearInterval(interval);
                this.voltarInicio();
            }
        }, 1000);
    }

    // Voltar para tela inicial
    voltarInicio() {
        clearInterval(this.timerInterval);

        // Limpar campos
        this.nomeEleitor = '';
        document.getElementById('nomeEleitor').value = '';

        // Voltar para tela inicial
        this.mostrarTela('telaBemVindo');
    }
}

// Inicializar a urna
const urna = new UrnaEletronica();

// Funções globais para os botões HTML
function iniciarVotacao() {
    urna.iniciarVotacao();
}

function votarChapa1() {
    urna.votarChapa1();
}

function votarBranco() {
    urna.votarBranco();
}

function votarNulo() {
    urna.votarNulo();
}

function voltarInicio() {
    urna.voltarInicio();
}

// Enter no campo de nome
document.getElementById('nomeEleitor').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        iniciarVotacao();
    }
});