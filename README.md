# UniEventos

Sistema profissional de gestão de eventos e controle de acesso com **Reconhecimento Facial** e Biometria.

---

## Tecnologias
- **Backend**: Node.js, Express, Sequelize (SQLite/Oracle)
- **Frontend**: React, Vite, face-api.js, react-webcam

---

## Arquitetura do Sistema

O sistema opera em uma arquitetura moderna, dividida em dois componentes principais:

1.  **Backend (`/backend`)**: API RESTful, gestão de participantes e integração com banco de dados.
2.  **Frontend (`/frontend`)**: Interface SPA para operadores, totens de acesso e relatórios.

---

<<<<<<< HEAD
=======
---

>>>>>>> main
## Fluxo e Resiliência

### Reconhecimento Facial
- **Fluxo**: Webcam -> Browser (face-api.js) -> Backend (Sync/Match).
- **Vantagem**: Funciona em qualquer dispositivo com câmera e HTTPS.
- **Resiliência**: O sistema processa a identificação offline no browser e sincroniza os logs com o servidor.
---

## Instalação e Execução

### 1. Pré-requisitos
- **Node.js**: v18 ou superior.
- **Webcam**: Necessária para o reconhecimento facial.

### 2. Instalação das Dependências
Execute o comando abaixo na pasta raiz para instalar as dependências de todos os módulos:
```bash
# Na raiz do projeto /UniEventos
cd backend && npm install
cd ../frontend && npm install
```

### 3. Execução Rápida
Utilize o script de inicialização interativo para rodar todo o ecossistema:
```bash
iniciar-servidores.bat
```
*Este script permite reiniciar os servidores rapidamente pressionando a tecla **R**.*

---

## Reconhecimento Facial (Nova Funcionalidade)
O sistema agora utiliza a webcam para identificação em tempo real.
- **Cadastro**: Realizado na tela de Gerenciamento de Participantes.
- **Identificação**: Automática nos totens de acesso e saída.
- **Vantagem**: Elimina a necessidade de hardware proprietário em muitos casos.

---

## Banco de Dados
O sistema utiliza **SQLite** por padrão (`database.sqlite`).
- Para resetar os dados, exclua o arquivo `.sqlite` e reinicie o backend.
- O sistema criará as tabelas e dados iniciais automaticamente.

---

## Autor e Suporte
Desenvolvido por **Kelvin Higino**.
[kelvinti.pages.dev](https://kelvinti.pages.dev)

---

## Documentação Adicional
- [Requisitos e Regras de Negócio](file:///c:/Users/kelvin.higino/Documents/UniEventos/REQUISITOS.md)
- [Documentação da API](file:///c:/Users/kelvin.higino/Documents/UniEventos/API.md)
- [Guia de Homologação](file:///c:/Users/kelvin.higino/Documents/UniEventos/HOMOLOGACAO.md)

---
