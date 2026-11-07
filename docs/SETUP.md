# Configuração: Meta + 1win Partners

O PR não deve ser mesclado antes de validar o Deploy Preview e o recebimento em Testar eventos da Meta. A main publica automaticamente. O conteúdo principal, o canal do WhatsApp e o arquivo _redirects permanecem intactos. O aviso de consentimento em espanhol e o controle de privacidade no rodapé foram autorizados pelo responsável.

## Variáveis no Netlify
Em Project configuration → Environment variables, cadastre com escopo Functions. Use valores próprios de preview e produção; não copie segredos para o GitHub ou para mensagens.

| Variável | Uso |
| --- | --- |
| META_PIXEL_ID | ID numérico público do Pixel. tracking-config o fornece ao navegador. |
| META_CAPI_TOKEN | Token secreto da CAPI. Somente no servidor. |
| META_GRAPH_VERSION | Opcional, versão Graph API suportada pela sua conta. Padrão v25.0. |
| META_TEST_EVENT_CODE | Somente Deploy Preview: código exibido em Testar eventos da Meta. Ignorado em produção. |
| ONEWIN_POSTBACK_SECRET | Segredo aleatório, pelo menos 32 caracteres, para autenticar callbacks da 1win. |
| TRACKING_REPORT_TOKEN | Outro segredo aleatório de pelo menos 32 caracteres, para consultar o relatório por Bearer token. |

Faça um novo deploy após configurar as variáveis. Ausência de credenciais não gera sucesso falso. Não são necessários siteID/token de Blobs no código: a função usa o contexto fornecido pelo Netlify. Confirme a disponibilidade de Netlify Blobs na conta. Os nomes dos stores separam produção de cada preview usando context.deploy.context/id fornecidos pelo Netlify (com fallback para variáveis apenas em testes locais).

## Consentimento na página
O aviso nativo em espanhol (`assets/consent.js` e `assets/consent.css`) começa com a coleta desativada e oferece **Aceptar medición** e **Rechazar medición** com o mesmo destaque. A recusa não bloqueia o canal do WhatsApp. O botão **Privacidad y cookies** no rodapé permite reabrir a escolha e revogar.

A preferência é armazenada neste navegador como `brujo_marketing_consent_v1`, com versão e validade de 90 dias, sem identificador de publicidade. Uma aceitação ainda válida restaura PageView na visita seguinte; recusa, preferência ausente, inválida ou expirada mantêm Pixel/CAPI desativados. Após expirar, o aviso solicita nova escolha. Se o armazenamento estiver indisponível, a escolha vale apenas para a página atual e será solicitada novamente na próxima visita.

A revogação bloqueia novos eventos, esvazia a fila e interrompe retentativas ainda não iniciadas. Envia consent revoke ao Pixel já carregado e remove _fbp/_fbc acessíveis em Path=/ no host e domínios ancestrais permitidos pelo navegador. Isso não desfaz requisições já enviadas nem remove cookies HttpOnly/terceiros. Alterações da preferência são propagadas entre abas da mesma origem. Hooks de gtag/dataLayer no CTA também respeitam a escolha.

O gancho `window.brujoSetTrackingConsent(true/false)` permanece disponível para integração técnica, mas não é necessário usá-lo pelo Console para visitantes. A antiga autorização automática `BRUJO_TRACKING_CONSENT` foi removida para evitar passar por cima da preferência salva. Aviso e preferência não são compartilhados entre o domínio do preview e o domínio de produção.

Teste o aviso sem atalhos de Console: abra uma janela anônima, recuse e confirme ausência de chamadas Meta/CAPI; reabra pelo rodapé, aceite e confirme PageView; clique no WhatsApp e confirme Lead; revogue e confirme que novos cliques não enviam eventos. Recarregue a página para validar a preferência salva.

## Meta: o que é enviado
PageView após consentimento. Lead no clique no botão do canal: esse evento significa intenção de abrir o WhatsApp, não entrada confirmada, cadastro ou depósito. Cada ação gera um UUID compartilhado pelo `eventID` do Pixel e `event_id` da CAPI. O payload CAPI inclui `action_source: website`, URL da página sem query/hash, horário, `_fbp`/`_fbc` quando disponíveis, IP do contexto confiável Netlify e user agent do request. Não hashamos os campos que a Meta espera sem hash. Não inventamos fbc sem fbclid real. Nenhum IP, UA, fbc, fbp ou token é persistido pelo receptor de postbacks.

A função pública capi aceita somente PageView/Lead, exige Origin da própria página e consentimento declarado, e limita os campos/tamanho/horário. Isso reduz erros e abuso básico, mas não é um sistema antifraude. A origem HTTP pode ser forjada por clientes externos; configure proteções/limites da conta conforme o tráfego.

Bloqueadores, navegação e retirada de consentimento podem causar perda de eventos. Retentativas CAPI de erros 5xx reutilizam o mesmo event_id. No botão, usamos keepalive sem atrasar a navegação. A Meta faz a deduplicação entre Browser/Server; não mantenha uma segunda instalação do mesmo evento pelo GTM.

## 1win: medição por canal/campanha
Escolha uma etiqueta estável, por exemplo `canal-es-campanha-01`, e passe-a em `sub1` NOS LINKS DA OFERTA publicados no canal. O arquivo _redirects não é alterado: /a/:code continua como antes, sem sub1 adicionado por esta implementação. Links atuais sem sub1 não permitem esse relatório e são rejeitados pelos receptores com erro de validação.

Para testar sub1 sem mexer nos links curtos existentes, use um link 1win completo com os mesmos parâmetros atuais e acrescente `&sub1=canal-es-campanha-01`. Confirme no painel da 1win que a etiqueta foi capturada antes de divulgar. Não basta colocar a etiqueta na URL de entrada da landing. A sessão original não atravessa o canal do WhatsApp.

No menu Configurar postbacks do link 1win, configure os eventos abaixo. Troque DOMINIO pelo Deploy Preview durante os testes e pelo domínio de produção somente após a aprovação. Troque SEGREDO pelo valor de ONEWIN_POSTBACK_SECRET. As macros foram confirmadas nas telas fornecidas pelo usuário; valide a expansão com o suporte da rede.

Registre-se:

```text
https://DOMINIO/.netlify/functions/postback-registration?secret=SEGREDO&event_id={event_id}&sub1={sub1}&date={date}&country={country}
```

Primeiro depósito:

```text
https://DOMINIO/.netlify/functions/postback-ftd?secret=SEGREDO&event_id={event_id}&sub1={sub1}&date={date}&transaction_id={transaction_id}&amount={amount}&country={country}
```

Não publique essas URLs em anúncios/grupos: elas contêm o segredo do callback. Não as coloque em Renda/Todos os depósitos/Depósito recorrente. GET ou POST autenticado são aceitos. date é UNIX em milissegundos. event_id é obrigatório e deduplica reenvios de forma atômica (onlyIfNew). A soma de valor depositado não é comissão; a moeda do amount não foi confirmada e permanece null. Macros não substituídas, sub1 vazio, data em segundos e payloads inválidos são rejeitados. Não é coletado user_id.

Os callbacks autenticados são a informação recebida da rede, não uma verificação criptográfica de procedência 1win. Proteja/rotacione o segredo e concilie os resultados no painel de afiliados. Use links/eventos de teste oferecidos pela rede; não é necessário realizar um depósito financeiro para um teste técnico.

## Armazenamento e relatório
Netlify Blobs mantém um registro imutável por tipo/event_id. Produção: store brujo-1win-production; previews: brujo-1win-preview-DEPLOY_ID. Isso isola testes das contagens reais e preserva produção entre deploys. Falha ao salvar retorna 503 para permitir reenvio pela rede. Não há armazenamento temporário em memória como fonte de verdade.

GET `/.netlify/functions/report?from=2026-11-01&to=2026-11-30`, com cabeçalho `Authorization: Bearer <TRACKING_REPORT_TOKEN>`, retorna JSON com contagens por sub1 e eventos normalizados. As datas do relatório são UTC. O token não é aceito na query string. Não há relatório público, download de tokens ou ligação automática com o painel Parlay Track anterior: este endpoint é o relatório desta implantação. O leitor limita a varredura a 10.000 eventos e retorna 422 em vez de exibir totais parciais; volumes maiores exigem exportação/banco apropriado.

FTD NÃO é enviado para a Meta nesta implementação. O relatório contém `attribution_scope: channel_campaign`, `ad_id: null` e `ad_attribution_available: false`. A otimização da campanha é por Lead na landing. Um link comum do canal não recupera fbclid do anúncio.

## Validação antes de merge
1. No Deploy Preview, confira a landing no desktop/celular e compare o botão e os textos com a produção.
2. Abra /a/TESTCODE e confirme o 302 para https://r1wquow.com/betting?p=q0ls&sharebet=TESTCODE. Não siga até a casa para esse teste.
3. Configure variáveis de preview e META_TEST_EVENT_CODE. Use o aviso da página para aceitar ou recusar, sem comandos de Console.
4. Em Testar eventos da Meta, abra a URL de preview. Autorize o consentimento: deve haver PageView; clique no botão: Lead. Confira Browser/Server, event_id e a deduplicação; confirme que não existe outro Lead pelo GTM/instalação anterior. O código de teste no servidor não controla eventos de teste do Pixel: siga também o fluxo de teste do navegador do Gerenciador de Eventos.
5. Peça à 1win teste de postback com sub1 e event_id conhecidos. Confirme cadastro e FTD no relatório de preview. Reenvie o mesmo event_id: total deve permanecer igual. Teste segredo errado e ausência de sub1: devem ser rejeitados.
6. Concilie o resultado com a 1win. Revise variáveis de produção e fluxo de consentimento. Só então autorize o merge do PR. Retire/ignore o código de teste na configuração de produção.

Testes automatizados mockam Meta/Blobs e NÃO comprovam credenciais, ingestão real Meta, encaminhamento 1win ou deploy Netlify. A validação ao vivo deve ser registrada no PR.
