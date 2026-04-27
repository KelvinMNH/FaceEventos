# Guia de Implantação - Ambiente de Homologação (UniEventos)

Este documento fornece as instruções necessárias para o analista de infraestrutura configurar e subir o ambiente de UniEventos utilizando Docker.

## Pré-requisitos
- Docker e Docker Compose instalados.
- Acesso à internet para baixar as imagens base (Node, Nginx, Oracle).

## Estrutura de Arquivos Críticos
O ambiente é controlado por dois arquivos principais na raiz do projeto:
- `docker-compose.yml`: Orquestração dos serviços.
- `.env`: Configurações sensíveis e de ambiente.

## Passo a Passo para Implantação

### 1. Configuração do Arquivo de Ambiente (.env)
Edite o arquivo `.env` na raiz do projeto. As variáveis cruciais são:

> [!IMPORTANT]
> **JWT_SECRET**: Altere este valor para uma chave aleatória e complexa no `.env`.
> **DB_PASS**: Senha do usuário `unieventos` no Oracle. 
> **DB_ROOT_PASS**: Senha do usuário `SYS` no Oracle.
> **FRONTEND_URL**: URL completa de onde o frontend será acessado (ex: `https://unieventos.empresa.com.br`). Necessário para a configuração de segurança do CORS.

---

### 2. Inicialização do Ambiente
Execute o seguinte comando no terminal (dentro da pasta raiz do projeto):

```bash
docker-compose up -d --build
```

Este comando irá:
1. Construir a imagem do **Frontend** (Multi-stage build).
2. Construir a imagem do **Backend** (Debian-slim com drivers Oracle).
3. Subir o container **Oracle Database** (Gvenzl Oracle Free).
4. Configurar a rede isolada `unieventos-net`.

---

### 3. Monitoramento e Logs
Para facilitar o diagnóstico sem precisar entrar nos containers, configuramos volumes de log:

- **Logs de Biometria**: `./backend/biometria_debug.log` (Mapeado no host para acompanhamento em tempo real).
- **Pasta de Logs Geral**: `./backend/logs/` (Para logs de sistema arquivados).

Para ver os logs do Docker em tempo real:
```bash
docker-compose logs -f backend
```

---

## Requisitos de Infraestrutura (Nuvem - AWS/OCI)
- **Portas de Acesso (Firewall)**: O **Frontend** roda na porta `80` (HTTP padrão). Certifique-se de liberar a porta **80** no Security Group / Security List para permitir o acesso web dos testadores. O **Backend** não precisa de porta externa exposta diretamente para o público, pois o frontend (Nginx) atua como proxy reverso para as requisições na rota `/api`.
- **Permissão de Pastas de Log**: O sistema salva logs via volumes mapeados em `./backend/logs/`. Dependendo da distro Linux (Ubuntu/Amazon Linux), pode ser necessário garantir permissão de escrita (`chmod 777 -R ./backend/logs/`) caso ocorra "Permission Denied" no container do backend.

## Observações de Segurança (Homologação)
- O **Banco de Dados** NÃO está exposto para o host (porta 1521 fechada). A comunicação ocorre apenas via rede interna do Docker.
- **Headers de Segurança**: Foram implementados via `Helmet` no backend e diretivas `add_header` no Nginx.
- **Rate Limit**: O login está limitado a 10 tentativas a cada 15 minutos por IP.

---

## Troubleshooting
Se o backend falhar ao conectar no banco na primeira execução, verifique o `healthcheck` do Oracle. O backend está configurado para aguardar o banco ficar "Healthy" antes de iniciar.
