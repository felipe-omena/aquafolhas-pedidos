# Publicação do AquaFolhas

## Hospedagem indicada

O AquaFolhas é um sistema completo: possui páginas, APIs, banco de pedidos, catálogo e integração com WhatsApp. Por isso, não deve ser publicado apenas no GitHub Pages, que é voltado a sites estáticos.

A opção mais compatível é **Cloudflare Workers + D1**. O projeto já usa esse formato e pode começar no plano gratuito. A contratação de plano pago pode ser feita depois, se o movimento superar os limites gratuitos.

## Endereços do sistema

- Cliente: `https://SEU-DOMINIO/pedido`
- Gerência: `https://SEU-DOMINIO/admin`
- Webhook futuro do WhatsApp: `https://SEU-DOMINIO/api/whatsapp/webhook`

## 1. Colocar no GitHub

Crie um repositório exclusivo chamado `aquafolhas-pedidos`, preferencialmente privado. Envie somente o conteúdo desta pasta AquaFolhas.

Nunca envie ao GitHub:

- `.dev.vars`;
- `.env` ou arquivos semelhantes;
- `wrangler.production.jsonc` preenchido;
- tokens da Meta, senhas ou segredos;
- `node_modules` e dados locais.

O fluxo `.github/workflows/check.yml` verifica automaticamente se o projeto continua compilando.

## 2. Criar o banco de produção

Na conta Cloudflare, crie um banco D1 chamado `aquafolhas-producao`. Copie o identificador do banco.

Depois:

1. copie `wrangler.production.example.jsonc` para `wrangler.production.jsonc`;
2. substitua `COLOQUE_AQUI_O_ID_DO_BANCO_D1` pelo identificador recebido;
3. execute `npm run build`;
4. execute `npm run db:migrate:cloudflare` para criar as tabelas.

As migrações versionadas ficam em `drizzle/`. Nunca apague migrações que já tenham sido aplicadas no banco publicado.

## 3. Configurar os segredos

Configure os valores abaixo como segredos da hospedagem, nunca dentro do código:

- `ADMIN_EMAIL`: e-mail autorizado no ambiente Sites, se utilizado;
- `ADMIN_PASSWORD`: senha da gerência, com pelo menos 12 caracteres;
- `ADMIN_SESSION_SECRET`: sequência aleatória com pelo menos 32 caracteres;
- `WHATSAPP_ENABLED`: mantenha `false` durante os testes sem disparos;
- `WHATSAPP_BUSINESS_NUMBER`: número comercial com país e DDD;
- demais variáveis `WHATSAPP_*` presentes em `.env.example` somente quando a Cloud API for ativada.

Para Cloudflare via terminal, use `wrangler secret put NOME_DA_VARIAVEL`. O valor será solicitado sem ser gravado no código.

## 4. Publicar

Com o banco e os segredos configurados:

```bash
npm run build
npm run db:migrate:cloudflare
npm run deploy:cloudflare
```

O Cloudflare fornecerá inicialmente um endereço `workers.dev`. Depois dos testes, conecte um domínio próprio pelo painel da Cloudflare.

## 5. Testes antes de divulgar

1. abra `/pedido` em celular e computador;
2. faça um pedido de teste e confira o protocolo;
3. entre em `/admin` com a senha de produção;
4. altere preço e disponibilidade de um produto;
5. teste os estados recebido, em separação, separado, entregue e cancelado;
6. confirme a impressão do pedido;
7. mantenha o WhatsApp automático desligado até concluir os testes manuais.

## 6. Ativação futura do WhatsApp

Depois que o número oficial estiver na Cloud API da Meta:

1. cadastre a URL `/api/whatsapp/webhook` no aplicativo da Meta;
2. configure os segredos `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET`;
3. configure um modelo aprovado para mensagens fora da janela de atendimento;
4. faça testes somente com números autorizados;
5. altere `WHATSAPP_ENABLED` para `true` apenas quando desejar iniciar os disparos automáticos.

Enquanto `WHATSAPP_ENABLED=false`, nenhuma mensagem automática paga é disparada.
