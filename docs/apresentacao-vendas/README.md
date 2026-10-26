# Apresentação ROInfluencer — Reunião com Decisores

Slides interativos em HTML, baseados no roteiro do PDF "ROInfluencer – Reunião com Decisores", com demos dos dois apps rodando só com dados fictícios. Funciona sem internet e sem backend.

## Como abrir

- **`roinfluencer-apresentacao.html`**: arquivo único, com tudo embutido. É o que se manda por e-mail/WhatsApp ou se abre direto no navegador.
- **`index.html` + `assets/`**: versão editável, com o mesmo conteúdo.

Depois de editar, gere o arquivo único de novo:

```bash
python3 build-single.py
```

## Como apresentar

| Tecla | Ação |
|---|---|
| `→` `PageDown` `espaço` | próximo slide |
| `←` `PageUp` | slide anterior |
| `O` | visão geral dos slides |
| `F` | tela cheia |
| número + `Enter` | ir direto para o slide |
| `Esc` | sai do modo foco da demo |

Também dá para usar os botões da barra inferior ou passar o dedo (touch).

## Roteiro (12 slides)

1. Capa
2. **Primeiro, os seus números**: clique em cada pergunta e digite as respostas do cliente. Investimento e vendas mostram o retorno atual. O nº de influenciadores marca o plano indicado no slide 11.
3. Influência: aposta ou canal de vendas
4. **Quanto custa não saber quem vende**: passe o mouse nos cartões para ajustar horas e custo/hora. O resultado alimenta a frase do slide 11.
5. **Demo do painel da empresa**: Dashboard, Influencers, Notificações, Comunidade, Vendas, Ranking/Campanhas, Integrações e Configurações, tudo clicável.
   - "Simular venda" lança uma venda.
   - "Ao vivo" lança vendas sozinho.
   - O botão de expandir ocupa a tela toda.
6. **Demo do app do influenciador**: Dashboard, Business, Vendas (níveis), Campanhas (ranking e prêmios), Solicitações/Notificações e Perfil.
   - "Simular venda" gera o push e a venda nova.
   - Com 3 ou 4 vendas, a influenciadora sobe de Bronze para Prata.
7. **Uma venda, dois apps**: painel e celular lado a lado. A venda aparece nos dois ao mesmo tempo.
8. Case Olway
9. Case Team Ícaro
10. +10.000 influenciadores
11. Investimento
12. Próximos passos e contatos

**Dica:** uma notificação enviada em Notificações (slide 5) chega ao celular da influenciadora. Uma campanha criada em Ranking aparece na aba Campanhas do app.

## Personalizar para o cliente

Adicione `?empresa=Nome do Cliente` ao endereço para trocar o nome da empresa nas demos, por exemplo `roinfluencer-apresentacao.html?empresa=Loja Exemplo`.

## Dados

Os dados são fictícios e gerados no navegador com semente fixa, relativos à data de hoje: 12 meses de pedidos crescendo mês a mês, 10 influenciadores, campanhas e notificações. Nada acessa Supabase nem qualquer API. Ao recarregar a página, a demo volta ao estado inicial.

As telas replicam o painel (`app/main/` deste repositório) e o app do influenciador (roinfluencer-app, v2.1.0). Estes itens são licença de demo e não existem no produto:

- os botões "Simular venda" e "Ao vivo"
- o confete ao subir de nível
- o texto do push "Nova venda! 🎉"

O levantamento de telas usado como base está em `replica/`.
