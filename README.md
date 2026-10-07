# AquaFolhas — pedidos e gestão

Sistema de pedidos da AquaFolhas com catálogo semanal, carrinho, protocolo para o cliente, acompanhamento dos pedidos e preparação para integração oficial com o WhatsApp Business.

Este projeto é independente do aplicativo **Minha Carteira** e deve permanecer na pasta `apps/AquaFolhas`.

## Áreas do sistema

- `/pedido`: catálogo e finalização do pedido pelo cliente.
- `/admin`: painel de pedidos, alteração de status e manutenção do catálogo.

## Recursos disponíveis

- catálogo responsivo com categorias, preços e produtos visíveis;
- nome simples do cliente, aceitando primeiro nome ou apelido;
- carrinho, forma de recebimento, pagamento e protocolo do pedido;
- painel com pedidos e estados de separação, entrega e cancelamento;
- cadastro e edição semanal de produtos, preços, unidade, categoria, ordem e visibilidade;
- banco D1 com migrações versionadas;
- mensagens do WhatsApp preparadas para confirmação e mudança de status;
- modo manual gratuito enquanto a automação oficial estiver desligada.

## WhatsApp sem disparos durante os testes

A automação fica desativada por padrão com:

```env
WHATSAPP_ENABLED=false
```

Nesse modo, o sistema não faz disparos automáticos e oferece a abertura do WhatsApp para o atendimento manual. Para ativar a Cloud API posteriormente, copie `.env.example` para o arquivo de ambiente do serviço de hospedagem e preencha somente lá os dados oficiais. Tokens e segredos nunca devem ser enviados ao GitHub.

## Executar no computador

Requisitos: Node.js 22.13 ou superior e as dependências instaladas.

No Windows, também é possível abrir diretamente pelos atalhos da pasta:

- `ABRIR-CLIENTES.cmd`: inicia o sistema e abre a área de pedidos;
- `ABRIR-GERENCIA.cmd`: inicia o sistema e abre o painel administrativo.

Os dois atalhos reutilizam o mesmo servidor quando ele já estiver em funcionamento.
Se a pasta tiver sido copiada para um pendrive ou para outro computador, a primeira abertura verifica e repara automaticamente as dependências. Essa preparação pode levar alguns minutos e pode precisar de internet no novo computador.

```bash
npm install
npm run build
npm run dev
```

O endereço local normalmente será `http://127.0.0.1:5173`.

Para acessar o painel administrativo no modo local, defina `ADMIN_EMAIL` em `.dev.vars` e entre com o mesmo e-mail pelo acesso local de desenvolvimento.

## Banco de dados local

As migrações ficam em `drizzle/`. Depois de gerar a compilação, aplique somente as migrações ainda não executadas no banco local. O catálogo é criado com os produtos iniciais na primeira utilização e depois pode ser mantido diretamente no painel de gerência.

## Preparação para GitHub e hospedagem

- `.env.example` contém apenas os nomes das configurações, sem credenciais reais;
- `.dev.vars`, demais arquivos de ambiente, dados locais e dependências estão ignorados pelo Git;
- o projeto já possui configuração de compilação para hospedagem com banco D1;
- publicação, domínio e ativação do WhatsApp devem ser feitos somente depois de configurar as credenciais de produção.

Antes de enviar ao GitHub, revise os arquivos alterados, crie um repositório separado para o AquaFolhas e mantenha o repositório da Minha Carteira independente.
