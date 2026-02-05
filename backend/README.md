# UniEventos - Backend 🚀

Este é o backend do sistema UniEventos, desenvolvido com Node.js, Express e Sequelize.

## 🏗️ Arquitetura do Projeto

O projeto foi refatorado para seguir uma arquitetura modular, facilitando a colaboração de múltiplos desenvolvedores e a manutenção a longo prazo.

### Estrutura de Pastas

```text
backend/
├── src/
│   ├── config/      # Configurações globais (Banco de Dados)
│   ├── controllers/ # Lógica de controle das rotas (HTTP Handlers)
│   ├── models/      # Definição das tabelas e relacionamentos (Sequelize)
│   ├── routes/      # Definição dos endpoints da API
│   └── services/    # Lógica de negócio pesada (opcional)
├── .env             # Variáveis de ambiente (Crie uma cópia do .env.example)
├── server.js        # Ponto de entrada da aplicação
└── package.json     # Dependências e scripts
```

## 🛠️ Tecnologias Utilizadas

*   **Express**: Framework web rápido e minimalista.
*   **Sequelize**: ORM para abstração do banco de dados (Suporta SQLite e Oracle).
*   **Dotenv**: Gerenciamento de segredos e configurações via ambiente.
*   **Cors**: Liberação de acesso para o frontend.

## ⚙️ Configuração

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Configure o arquivo `.env`:
    *   Para desenvolvimento local, o padrão é SQLite.
    *   Para produção/homologação, altere `DB_DIALECT=oracle` e preencha as credenciais.

3.  Inicie o servidor:
    ```bash
    node server.js
    ```

## 📝 Boas Práticas para Desenvolvedores

1.  **Novas Rotas**: Sempre adicione em `src/routes/index.js` (ou crie arquivos específicos de rota se a aplicação crescer muito).
2.  **Lógica de Banco**: Não coloque SQL puro nos controllers. Use as abstrações do Sequelize em `src/models`.
3.  **Controllers**: Mantenha os controllers focados em tratar a requisição e resposta. Regras de negócio complexas devem ir para `src/services`.
4.  **Variáveis de Ambiente**: Nunca coloque senhas ou IPs fixos no código. Use o `.env`.

---
Desenvolvido com ❤️ para UniEventos.
