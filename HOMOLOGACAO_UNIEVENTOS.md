# Solicitação de Ambiente de Homologação - UniEventos

**Bom dia,**

**Link repositório remoto branch(develop) :** [https://git.unimedmaceio.com.br/unimed-hub/apps/unieventos/-/tree/develop](https://git.unimedmaceio.com.br/unimed-hub/apps/unieventos/-/tree/develop)

Solicito a criação de um ambiente de homologação para a aplicação descrita abaixo.

## Visão Geral da Aplicação
O **UniEventos** é uma plataforma fullstack para gestão de eventos, controle de acesso em tempo real e reconhecimento facial. O sistema automatiza o check-in de participantes e acompanhantes, permitindo a integração com serviços de sincronização de dados de beneficiários.

## Stack Tecnológica
- **Linguagem:** Node.js (v18+)
- **Framework Backend:** Express.js
- **Framework Frontend:** React.js (Vite)
- **Banco de Dados:** SQLite (arquivo local `database.sqlite`)
- **Autenticação da API:** Bearer Token (JWT)
- **Natureza da Aplicação:** Fullstack (API + SPA)

## Requisitos de Infraestrutura
- **Servidor:** Windows Server ou Linux com **Node.js 18.x** ou superior instalado.
- **Conectividade:** 
    - Acesso externo via HTTPS (necessário para APIs de câmera e segurança).
- **Armazenamento:** Espaço em disco para o arquivo de banco de dados e logs.
- **Processamento:** Execução dos serviços de Backend (Porta 3000) e Frontend (Servidor Web Nginx/IIS ou Node).

## Observações
- A aplicação utiliza **SQLite**, não sendo necessária a instalação de servidores de banco de dados externos (como Oracle ou MySQL).
- A instalação é realizada diretamente no servidor Node.js (sem utilização de Docker).
- Requer a configuração das variáveis de ambiente no arquivo `.env` (segredos JWT e certificados SSL).

Fico à disposição para quaisquer esclarecimentos adicionais.
