# identity-access

Modulo dono de autenticacao de convidados e administradores.

Estrutura prevista:
- `application/`: casos de uso como login, revogacao e emissao de sessao.
- `contracts/`: DTOs e schemas HTTP.
- `domain/`: entidades, policies e regras de autenticacao.
- `infrastructure/`: repositorios, token providers e adapters.
- `routes/`: plugins Fastify e handlers HTTP.
