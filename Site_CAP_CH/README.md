# CAP — versão estática para GitHub Pages

Este site funciona apenas com HTML, CSS e JavaScript. Não usa PHP, WordPress, banco de dados nem plugin.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie **o conteúdo desta pasta** para a raiz do repositório. O arquivo `index.html` deve ficar na raiz.
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**, a branch `main` e a pasta `/(root)`.
5. Salve. O GitHub mostrará o endereço público do site em alguns minutos.

## Formulários

Sem um servidor, os formulários abrem o aplicativo de e-mail do visitante já com a mensagem preenchida para `israel@capisrael.com.br`. Isso mantém o site compatível com GitHub Pages sem enviar dados a um serviço externo.

Para trocar o e-mail que recebe os contatos, edite a constante `STATIC_FORM_RECIPIENT` no início de `js/main.js`.
