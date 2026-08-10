# CAP — Landing page institucional

Landing page independente construída com HTML5, CSS3 e JavaScript puro. O visual e as interações ficam nos arquivos estáticos; somente o processamento dos formulários é feito pelo WordPress.

## Estrutura

```text
Site_CAP_corrigido/
├── assets/images/                 # imagens locais do projeto
├── css/styles.css                 # estilos globais e responsivos
├── js/main.js                     # interações, validações e AJAX
├── index.html                     # página institucional
└── wordpress-plugin/cap-forms/    # plugin PHP dos formulários
```

## Publicação no WordPress

1. Publique os arquivos estáticos no **mesmo domínio** da instalação WordPress. O JavaScript usa automaticamente `/wp-admin/admin-ajax.php` do domínio atual; não há endereço de produção fixo no código.
2. Copie a pasta `wordpress-plugin/cap-forms` para `wp-content/plugins/` e ative **CAP Forms** no painel WordPress.
3. Em **Configurações > Geral**, confirme o e-mail administrativo do WordPress. Ele é o destinatário padrão dos dois formulários e precisa ser confirmado pela empresa antes da publicação.
4. Configure e teste o envio de e-mails do WordPress (SMTP, se necessário). O site só mostra sucesso se `wp_mail()` confirmar o envio ao servidor de e-mail.
5. Publique o site somente por HTTPS, especialmente porque o formulário de direitos LGPD recebe CPF e outros dados pessoais.

O plugin aplica nonce, validação e sanitização no servidor, campo anti-spam invisível, tempo mínimo de preenchimento e limite de cinco envios válidos por IP/formulário a cada hora. As mensagens não são gravadas no banco de dados pelo plugin; elas são enviadas ao e-mail administrativo configurado no WordPress.

## Testes antes da entrega

- Envie uma mensagem de contato válida e confirme o recebimento do e-mail.
- Teste campos vazios, e-mail inválido e telefone incompleto.
- No formulário LGPD, teste CPF inválido, motivação não selecionada e mensagem curta.
- Teste o menu, as abas de madeira, os modais e os formulários em celular e desktop.

## Observação sobre privacidade

O formulário de solicitações de direitos foi revisado tecnicamente, mas isso não substitui a revisão jurídica da política de privacidade, dos prazos de retenção e do canal responsável pelo atendimento.
