# Documento de Requisitos - UniEventos (Versão 1.0)

Este documento descreve as funcionalidades e requisitos técnicos do projeto **UniEventos** em sua primeira versão estável (V1), consolidando a transição para biometria facial.

---

## 1. Escopo do Sistema
O **UniEventos** é uma plataforma de gestão de eventos focada em controle de acesso de alta performance, utilizando reconhecimento facial em tempo real como método principal de identificação.

---

## 2. Requisitos Funcionais (RF)

### 📊 Gestão de Eventos
- **RF01**: Cadastro de eventos (Nome, Local, Data, Hora, Descrição).
- **RF02**: Suporte a múltiplos eventos simultâneos. A identificação e o registro de acesso são vinculados ao ID único (UUID/ID) de cada evento, garantindo a integridade dos dados sem conflitos entre sessões.
- **RF03**: Finalização de evento (Bloqueio de novas entradas).
- **RF04**: Exibição de estatísticas básicas (Participantes esperados vs. Participantes presentes).

### 👥 Gestão de Participantes
- **RF05**: Cadastro de participantes com CRM, Especialidade e Gênero.
- **RF06**: Busca rápida por Nome, CPF ou CRM.
- **RF07**: Registro de acompanhantes vinculados a um titular.

### 🎭 Biometria e Reconhecimento Facial
- **RF08**: Captura de face em tempo real via Webcam no navegador.
- **RF09**: Identificação local (Local Matching) utilizando o modelo de distância Euclidiana da `face-api.js` (< 0.6 para reconhecimento).
- **RF10**: Armazenamento de foto (Base64) e descritores faciais (JSON) no banco de dados.
- **RF11**: Opção de "Limpar Biometria" para recadastro ou remoção de acesso facial.

### 🚪 Controle de Acesso (Operador)
- **RF12**: Tela de monitoramento com feed de vídeo em tempo real.
- **RF13**: Overlay de sucesso premium (Verde 50%) com saudação personalizada por gênero ("Bem-vindo/a") e exibição do CRM.
- **RF14**: Balões de alerta exclusivos para "Já Identificado" (Amarelo) e falha de reconhecimento (Vermelho).
- **RF15**: Registro manual de entrada para casos de falha técnica ou falta de biometria.

### 🤖 Terminais de Autoatendimento (Totens)
- **RF16**: **Totem de Acesso**: Interface simplificada com feedback facial e mensagens de boas-vindas automáticas.
- **RF17**: **Totem de Saída (Checkout)**: Interface personalizada com mensagens em 1ª pessoa ("Deseja confirmar minha Saída?"), botão destacado "Sair do Evento" e saudação de despedida por gênero ("Até logo, Dr./Dra.").

---

## 3. Requisitos Não Funcionais (RNF)

### 📦 Arquitetura
- **RNF01**: **Monorepo**: Backend (API), Frontend (UI) e Bridge (Hardware) no mesmo repositório.
- **RNF02**: **Portabilidade**: Aplicação web acessível via navegador Chrome/Edge.
- **RNF03**: **Segurança**: Autenticação via JWT (JSON Web Tokens) e controle de CORS.

### ⚡ Performance e Interface
- **RNF04**: **Latência**: Identificação facial processada em menos de 1 segundo localmente.
- **RNF05**: **Limpeza Visual**: Interface "Premium" com uso de desfoque de fundo (blur), bordas arredondadas e overlays translúcidos.
- **RNF06**: **Identidade Visual**: Uso consistente das cores institucionais (Azul e Verde Unimed).

---

## 4. Requisitos de Hardware (Opcional)
- **RNF07**: Suporte legado para leitores de impressão digital **Futronic FS80H** via serviço `Bridge` local (Windows).

---
**Data de Emissão**: 20 de Março de 2026  
**Autor**: Kelvin Higino
