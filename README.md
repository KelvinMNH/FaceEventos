# UniEventos - Sistema de Controle de Acesso Biomérico (Frontend Serverless)

Este projeto foi migrado para uma arquitetura **Serverless (Frontend Only)**. Ele utiliza o `localStorage` do navegador para persistência de dados, eliminando a necessidade de um backend Node.js e banco de dados SQLite para fins de demonstração em portfólio.

## Tecnologias

- **Frontend**: React, Vite
- **Biometria**: face-api.js (Detecção e reconhecimento facial no navegador)
- **Persistência**: LocalStorage (Dados salvos no navegador)
- **Estilização**: CSS Modules / Vanilla CSS

## Estrutura do Projeto

- **frontend/**: Código fonte da aplicação.
  - **src/services/LocalStorageService.js**: Serviço que simula o backend, gerenciando dados no `localStorage`.
  - **src/services/SeedData.js**: Dados iniciais para popular o sistema na primeira execução.

## Como Rodar

### Pré-requisitos
- Node.js instalado.

### Passos

1. Abra o terminal na pasta `frontend`:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse a aplicação no navegador (geralmente em `http://localhost:5173`).

## Funcionalidades

- **Gestão de Eventos**: Criar, listar e ativar eventos.
- **Controle de Acesso**:
  - **Reconhecimento Facial**: Simulado usando `face-api.js`.
  - **Validação**: Verifica se o participante está cadastrado e registra o acesso.
  - **Simulação**: Modo de teste que gera acessos aleatórios para visualizar o dashboard.
- **Gestão de Participantes**: Cadastrar, listar, editar e remover participantes (com foto e biometria).
- **Dashboard**: Estatísticas em tempo real de participantes presentes, gênero e faixa etária.
- **Relatórios**: Visualização e exportação (CSV) dos logs de acesso.

## Notas Importantes

- **Persistência**: Como os dados são salvos no `localStorage`, limpar o cache do navegador removerá todos os registros criados.
- **Biometria**: A validação biométrica é realizada localmente no navegador comparando descritores faciais.

## Autor

Desenvolvido por Kelvin Higino.
