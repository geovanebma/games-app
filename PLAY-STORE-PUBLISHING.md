# Google Play - Passo a Passo de Publicacao, Monetizacao e Recebimento

Este guia foi escrito para o app **Party Games** deste projeto Expo/React Native.

- Nome atual no `app.json`: `Party Games`
- Pacote Android atual: `com.geovane.partygames`
- Build de producao configurado: `npm run build:android:aab`
- Arquivos de loja ja existentes: `STORE-LISTING.md`, `PRIVACY-POLICY.md`, `TERMS-AND-CONDITIONS.md`, `STORE-ASSETS-PLAN.md`

Links principais:

- Google Play Console: https://play.google.com/console
- Criar conta de desenvolvedor Google Play: https://play.google.com/console/signup
- Ajuda oficial do Play Console: https://support.google.com/googleplay/android-developer
- Politicas do Google Play: https://play.google.com/about/developer-content-policy/
- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo EAS Submit: https://docs.expo.dev/submit/android/
- Google AdMob: https://admob.google.com/
- Central da AdMob: https://support.google.com/admob
- Google Play Billing: https://developer.android.com/google/play/billing

## 1. Antes de Comecar

Crie uma pasta com tudo que sera usado na publicacao:

- AAB final do app.
- Icone 512x512.
- Feature graphic 1024x500.
- Screenshots de celular.
- Politica de privacidade publicada em uma URL publica.
- Termos e condicoes publicados em uma URL publica, se quiser mostrar na loja ou no app.
- E-mail de suporte.
- Nome do desenvolvedor.
- Conta bancaria para receber valores.
- Dados fiscais/documentos exigidos no seu pais.

Checklist rapido do projeto:

- [x] Rodar testes locais.
- [x] Gerar AAB de producao.
- [x] Revisar `STORE-LISTING.md`.
- [x] Revisar `PRIVACY-POLICY.md`.
- [x] Revisar `TERMS-AND-CONDITIONS.md`.
- [x] Preparar screenshots (..apk\games-app\play-store-publication-pack\assets\screenshots).
- [x] Preparar URL publica da politica de privacidade.
- [x] Definir se o app tera anuncios, compras, assinatura ou tudo junto.

## 2. Criar a Conta Google Play Developer

1. Acesse: https://play.google.com/console/signup
2. Entre com a conta Google que sera dona do app.
3. Escolha o tipo de conta:
   - **Pessoal**: mais simples, mas pode exigir teste fechado antes de liberar producao.
   - **Organizacao/empresa**: melhor se voce tiver CNPJ/empresa e quiser publicar como empresa.
4. Pague a taxa unica de cadastro da Google Play.
5. Complete a verificacao de identidade.
6. Complete nome publico do desenvolvedor, e-mail, telefone e dados solicitados.

Links uteis:

- Como criar e gerenciar conta Play Console: https://support.google.com/googleplay/android-developer/answer/6112435
- Requisitos de verificacao do Play Console: https://support.google.com/googleplay/android-developer/answer/10788890
- Contrato de distribuicao do desenvolvedor: https://play.google.com/about/developer-distribution-agreement.html

Importante: use uma conta Google que voce pretende manter por muitos anos. Trocar propriedade depois e possivel, mas e burocratico.

## 3. Preparar o App no Projeto

Abra `app.json` e confirme:

- `expo.name`: nome publico do app.
- `expo.version`: versao visivel para usuario.
- `expo.android.package`: identificador unico do Android.
- `expo.icon`: icone do app.
- `expo.splash`: tela inicial.

Estado atual:

```json
"android": {
  "package": "com.geovane.partygames"
}
```

Atencao: depois de publicar, nao troque o `android.package`. Ele identifica o app para sempre na Play Store.

## 4. Rodar Testes e Build Local

No terminal, dentro da pasta do projeto:

```bash
cd C:\Users\geovane.assuncao\Documents\apk\games-app
npm test
```

Se quiser testar visualmente:

```bash
npm start
```

Para gerar APK interno de teste:

```bash
npm run build:android:apk
```

Para gerar AAB de producao para a Play Store:

```bash
npm run build:android:aab
```

Links uteis:

- EAS Build: https://docs.expo.dev/build/introduction/
- Build Android com EAS: https://docs.expo.dev/build/setup/
- Android App Bundle na Google Play: https://developer.android.com/guide/app-bundle

## 5. Criar o App no Play Console

1. Acesse: https://play.google.com/console
2. Clique em **Create app** / **Criar app**.
3. Preencha:
   - App name: `Party Games`
   - Default language: Portugues ou Ingles, conforme sua estrategia inicial.
   - App or game: **Game**, se quiser posicionar como jogo.
   - Free or paid: normalmente **Free**, se voce vai monetizar com anuncios/compras.
4. Aceite as declaracoes iniciais.

Link oficial:

- Criar e configurar app: https://support.google.com/googleplay/android-developer/answer/9859152

Observacao importante: se voce publicar como **gratis**, normalmente nao da para transformar o mesmo app em pago depois. Para este projeto, o caminho recomendado e app gratis com anuncios, premium, compra vitalicia ou assinatura.

## 6. Configurar a Ficha da Loja

No Play Console, entre no app e va em:

**Grow users > Store presence > Main store listing**

Preencha usando `STORE-LISTING.md`:

- App name.
- Short description.
- Full description.
- App icon.
- Feature graphic.
- Screenshots.
- Categoria.
- Tags.
- Dados de contato.
- URL da politica de privacidade.

Links uteis:

- Criar ficha da loja: https://support.google.com/googleplay/android-developer/answer/9859455
- Boas praticas de qualidade da ficha: https://support.google.com/googleplay/android-developer/answer/13393723
- Politicas de metadados da loja: https://support.google.com/googleplay/android-developer/answer/9898842

Sugestao para este app:

- Categoria: **Games > Casual** ou **Entertainment**, dependendo da classificacao que aparecer para sua conta.
- Publico: amigos, familia, casais, festas e encontros.
- Evite prometer "sem anuncios" se ainda pretende usar AdMob.
- Evite dizer que todo conteudo premium esta disponivel se ainda nao implementou compras reais.

## 7. Preparar Imagens da Loja

Obrigatorio/recomendado:

- Icone: 512x512 PNG.
- Feature graphic: 1024x500 JPG ou PNG.
- Screenshots: pelo menos 2, recomendado 6 a 8.
- Video: opcional, mas ajuda conversao.

Capturas sugeridas para `Party Games`:

1. Home com jogos.
2. Configuracao do jogo.
3. Revelacao individual.
4. Cidade Dorme com painel de narrador.
5. Passa a Bomba.
6. Verdade ou Desafio.
7. Historico/estatisticas.
8. Tela premium.

Links uteis:

- Requisitos de previews graficos e screenshots: https://support.google.com/googleplay/android-developer/answer/9866151
- Plano local deste projeto: `STORE-ASSETS-PLAN.md`

## 8. Publicar Politica de Privacidade e Termos

A Play Store exige URL publica de politica de privacidade quando o app coleta dados, usa SDKs de terceiros, anuncios, analytics, compras ou permissao sensivel.

Opcoes simples para publicar:

- GitHub Pages: https://pages.github.com/
- Google Sites: https://sites.google.com/
- Site proprio.
- Pagina estatica dentro do seu dominio.

Arquivos prontos neste projeto:

- `PRIVACY-POLICY.md`
- `TERMS-AND-CONDITIONS.md`

Links uteis:

- Politica de dados do usuario: https://support.google.com/googleplay/android-developer/answer/10144311
- Secao Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469

Importante: se voce usar AdMob, analytics ou compras, a politica deve declarar isso de forma clara.

## 9. Preencher App Content / Politicas

No Play Console, va em:

**Policy > App content**

Preencha todas as secoes obrigatorias:

1. Privacy policy.
2. Ads.
3. App access.
4. Content ratings.
5. Target audience and content.
6. Data safety.
7. Financial features, se aparecer.
8. Health, news, government ou outras secoes, se aparecerem.

Links oficiais:

- App content: https://support.google.com/googleplay/android-developer/answer/9859455
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Classificacao indicativa: https://support.google.com/googleplay/android-developer/answer/188189
- Publico-alvo e conteudo: https://support.google.com/googleplay/android-developer/answer/9867159
- Declaracao de anuncios: https://support.google.com/googleplay/android-developer/answer/9857753

Sugestao para este app:

- Se tiver anuncios: marque que contem anuncios.
- Se tiver conteudo de festa/casal/perguntas intensas: seja conservador na classificacao indicativa.
- Se nao for feito para criancas pequenas, nao posicione a loja como app infantil.
- Se incluir familias/escolas/igrejas, mantenha conteudos moderados e configure corretamente as idades.

## 10. Gerar e Enviar o AAB

Gere o AAB:

```bash
npm run build:android:aab
```

Depois, no Play Console:

1. Va em **Test and release > Testing > Internal testing**.
2. Clique em **Create new release**.
3. Envie o arquivo `.aab` gerado pelo EAS.
4. Preencha as release notes.
5. Salve e envie para revisao.

Links uteis:

- Preparar e publicar release: https://support.google.com/googleplay/android-developer/answer/9859348
- Testes no Play Console: https://support.google.com/googleplay/android-developer/answer/9845334
- EAS Submit Android: https://docs.expo.dev/submit/android/

Com EAS Submit, voce tambem pode automatizar o envio depois de configurar uma service account:

```bash
npx eas-cli submit -p android --latest
```

## 11. Teste Interno

Use teste interno para instalar pelo Google Play antes de publicar.

1. Va em **Test and release > Testing > Internal testing**.
2. Crie uma lista de testadores por e-mail.
3. Adicione seu e-mail e e-mails de pessoas de confianca.
4. Publique a release de teste interno.
5. Copie o link de opt-in.
6. Instale o app pelo link.
7. Teste compra, anuncios, telas principais e politicas.

Link oficial:

- Configurar teste aberto, fechado ou interno: https://support.google.com/googleplay/android-developer/answer/9845334

## 12. Teste Fechado e Regra dos Testadores

Contas pessoais novas podem precisar cumprir requisitos de teste fechado antes de publicar em producao.

Roteiro recomendado:

1. Va em **Test and release > Testing > Closed testing**.
2. Crie uma trilha de teste fechado.
3. Adicione testadores reais por lista de e-mails ou Google Groups.
4. Envie uma release AAB.
5. Compartilhe o link de opt-in.
6. Peca para os testadores instalarem, abrirem e usarem o app.
7. Colete feedback real.
8. Corrija bugs e envie novas builds se necessario.
9. Quando a Play Console liberar, solicite acesso a producao.

Links uteis:

- Testar app no Play Console: https://support.google.com/googleplay/android-developer/answer/9845334
- Requisitos de teste para contas pessoais: https://support.google.com/googleplay/android-developer/answer/14151465

## 13. Publicar em Producao

Quando tudo estiver aprovado:

1. Va em **Test and release > Production**.
2. Clique em **Create new release**.
3. Use o AAB aprovado ou envie um novo.
4. Escreva notas da versao.
5. Revise paises/disponibilidade.
6. Revise precos se houver app pago, produtos ou assinaturas.
7. Envie para revisao.

Links uteis:

- Preparar e publicar release: https://support.google.com/googleplay/android-developer/answer/9859348
- Paises e distribuicao: https://support.google.com/googleplay/android-developer/answer/7550024
- Precos do app: https://support.google.com/googleplay/android-developer/answer/138412

## 14. Monetizacao com Anuncios AdMob

Para ganhar com anuncios:

1. Crie conta na AdMob: https://admob.google.com/
2. Complete dados da conta.
3. Crie o app na AdMob.
4. Se o app ainda nao estiver publicado, marque que ele ainda nao esta na loja.
5. Copie o **AdMob App ID**.
6. Crie blocos de anuncio:
   - Banner.
   - Interstitial.
   - Rewarded.
7. Integre o SDK de anuncios no app.
8. Use IDs de teste durante desenvolvimento.
9. Troque para IDs reais somente na build de producao.
10. Declare anuncios no Play Console.
11. Atualize politica de privacidade.

Links oficiais:

- AdMob: https://admob.google.com/
- Comecar com AdMob Android: https://developers.google.com/admob/android/quick-start
- Politicas da AdMob: https://support.google.com/admob/answer/6128543
- IDs de teste AdMob: https://developers.google.com/admob/android/test-ads
- App-ads.txt: https://support.google.com/admob/answer/9363762

Estrategia recomendada para este app:

- Banner: somente em telas paradas, como home, historico ou configuracoes.
- Interstitial: apenas entre rodadas, nunca durante a revelacao de papeis.
- Rewarded: para liberar pacote temporario, tema, categoria ou jogo premium por uma rodada.
- Nao mostrar anuncio quando alguem esta segurando para revelar o papel.

## 15. Configurar app-ads.txt

O `app-ads.txt` ajuda a AdMob verificar que voce e dono do inventario de anuncios.

1. Tenha um site do desenvolvedor.
2. Adicione o site na ficha da loja do Google Play.
3. Na AdMob, copie a linha do seu `app-ads.txt`.
4. Publique em:

```text
https://seudominio.com/app-ads.txt
```

5. Aguarde a verificacao da AdMob.

Link oficial:

- Configurar app-ads.txt: https://support.google.com/admob/answer/9363762

## 16. Monetizacao com Compras no App

Para vender premium vitalicio, remover anuncios ou desbloquear packs, use Google Play Billing.

Produtos recomendados:

- `premium_lifetime`: compra unica para premium vitalicio.
- `remove_ads`: compra unica para remover anuncios.
- `party_pack`: compra unica para pacote de festa.
- `couples_pack`: compra unica para pacote casal.
- `family_pack`: compra unica para pacote familia.

Passos no Play Console:

1. Va em **Monetize with Play > Products > One-time products**.
2. Crie um produto.
3. Defina Product ID.
4. Defina nome, descricao e preco.
5. Ative o produto.
6. Integre Google Play Billing no app.
7. Teste com testadores de licenca.

Links oficiais:

- Google Play Billing: https://developer.android.com/google/play/billing
- Criar produto no app: https://support.google.com/googleplay/android-developer/answer/1153481
- Tipos de produtos: https://support.google.com/googleplay/android-developer/answer/14590082
- Testar Google Play Billing: https://developer.android.com/google/play/billing/test

Para Expo/React Native, pesquise/avalie uma biblioteca mantida para compras:

- React Native IAP: https://github.com/hyochan/react-native-iap
- RevenueCat: https://www.revenuecat.com/docs

Observacao: o projeto hoje tem tela premium/paywall, mas ainda precisa da integracao real de compra antes de vender.

## 17. Monetizacao com Assinaturas

Para premium mensal/anual:

IDs sugeridos:

- `premium_monthly`
- `premium_yearly`

Passos:

1. Va em **Monetize with Play > Products > Subscriptions**.
2. Crie a assinatura.
3. Configure base plan mensal/anual.
4. Configure preco.
5. Configure periodo de teste, se quiser.
6. Escreva beneficios claros.
7. Integre a compra no app.
8. Deixe claro como cancelar.

Links oficiais:

- Criar e gerenciar assinaturas: https://support.google.com/googleplay/android-developer/answer/140504
- Entender assinaturas: https://support.google.com/googleplay/android-developer/answer/12154973
- Politica de assinaturas: https://support.google.com/googleplay/android-developer/answer/9900533

Sugestao para comecar:

- Primeiro lance `premium_lifetime` ou `remove_ads`.
- Depois adicione assinatura quando houver conteudo novo frequente, packs premium e temas sazonais.

## 18. Configurar Conta para Receber Valores

Voce precisa de um perfil de pagamentos/merchant account no Google Play.

No Play Console:

1. Acesse: https://play.google.com/console
2. Va em **Setup > Payments profile** ou **Monetize with Play > Monetization setup**.
3. Crie ou vincule um perfil de pagamentos.
4. Preencha:
   - Nome legal.
   - Endereco.
   - Tipo de conta.
   - Dados fiscais.
   - Conta bancaria.
5. Verifique a conta bancaria, se o Google solicitar.
6. Complete todos os alertas pendentes.

Links oficiais:

- Criar perfil de pagamentos: https://support.google.com/googleplay/android-developer/answer/7161426
- Vincular conta de desenvolvedor ao perfil de pagamentos: https://support.google.com/googleplay/android-developer/answer/3092739
- Configuracao de monetizacao: https://support.google.com/googleplay/android-developer/answer/1169947
- Relatorios e ganhos: https://support.google.com/googleplay/android-developer/answer/6135870
- Central de pagamentos Google: https://payments.google.com/

Atencao:

- O nome legal e os dados bancarios precisam bater com os documentos exigidos.
- Pode haver retencao de impostos, taxas, cambio e prazos de pagamento.
- Confira os requisitos especificos do seu pais dentro do proprio Play Console.
- Para duvidas fiscais, fale com contador. O Play Console muda conforme pais, tipo de conta e documento.

## 19. Receber Valores da AdMob

Recebimento da AdMob fica no painel da AdMob/Google Payments.

Passos:

1. Acesse: https://admob.google.com/
2. Va em **Payments**.
3. Complete dados do beneficiario.
4. Adicione forma de pagamento.
5. Complete verificacao de identidade/endereco, se aparecer.
6. Complete dados fiscais.
7. Aguarde atingir o limite minimo de pagamento.

Links oficiais:

- Pagamentos da AdMob: https://support.google.com/admob/answer/2772208
- Verificacao de pagamentos: https://support.google.com/admob/answer/3198657
- Limites de pagamento: https://support.google.com/admob/answer/2772189
- Central de pagamentos Google: https://payments.google.com/

## 20. Impostos, Taxas e Comissoes

Verifique no Play Console e Google Payments:

- Informacoes fiscais.
- Pais de residencia fiscal.
- Tratados fiscais, se aplicavel.
- Retencoes.
- Moeda de pagamento.
- Dados bancarios.
- Calendario de pagamento.

Links uteis:

- Ajuda de pagamentos para desenvolvedores: https://support.google.com/googleplay/android-developer/topic/3452890
- Ajuda Google Payments: https://support.google.com/paymentscenter
- Taxas de servico Google Play: https://support.google.com/googleplay/android-developer/answer/112622

## 21. Checklist Final Antes de Enviar para Revisao

- [ ] `android.package` definitivo: `com.geovane.partygames`.
- [ ] Nome final revisado.
- [ ] Politica de privacidade publicada em URL publica.
- [ ] E-mail de suporte funcionando.
- [ ] App Content completo.
- [ ] Data Safety coerente com AdMob, analytics e compras.
- [ ] Declaracao de anuncios marcada corretamente.
- [ ] Classificacao indicativa respondida com cuidado.
- [ ] Screenshots reais e bonitas.
- [ ] Feature graphic pronta.
- [ ] AAB gerado por `npm run build:android:aab`.
- [ ] Teste interno instalado pela Play Store.
- [ ] Compras testadas, se existirem.
- [ ] Anuncios com IDs reais somente na producao.
- [ ] app-ads.txt publicado, se usar AdMob.
- [ ] Perfil de pagamentos completo.
- [ ] Dados fiscais completos.
- [ ] Conta bancaria verificada.

## 22. Ordem Recomendada para Este Projeto

1. Finalizar screenshots e feature graphic.
2. Publicar politica de privacidade.
3. Criar conta Play Console.
4. Criar app `Party Games`.
5. Preencher ficha da loja.
6. Preencher App Content.
7. Gerar AAB com `npm run build:android:aab`.
8. Enviar para teste interno.
9. Corrigir problemas encontrados.
10. Fazer teste fechado, se a conta exigir.
11. Publicar em producao.
12. Criar conta AdMob e integrar anuncios.
13. Configurar app-ads.txt.
14. Implementar compra premium/remover anuncios.
15. Configurar pagamentos, banco e dados fiscais.
16. Acompanhar relatorios, crashes, reviews e receita.

## 23. Links Diretos, Um por Um

- Play Console: https://play.google.com/console
- Cadastro Play Console: https://play.google.com/console/signup
- Ajuda Play Console: https://support.google.com/googleplay/android-developer
- Criar app: https://support.google.com/googleplay/android-developer/answer/9859152
- Configurar dashboard do app: https://support.google.com/googleplay/android-developer/answer/9859454
- Ficha da loja: https://support.google.com/googleplay/android-developer/answer/9859455
- Requisitos de imagens: https://support.google.com/googleplay/android-developer/answer/9866151
- Politicas Google Play: https://play.google.com/about/developer-content-policy/
- Politica de dados do usuario: https://support.google.com/googleplay/android-developer/answer/10144311
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Classificacao indicativa: https://support.google.com/googleplay/android-developer/answer/188189
- Publico-alvo: https://support.google.com/googleplay/android-developer/answer/9867159
- Declaracao de anuncios: https://support.google.com/googleplay/android-developer/answer/9857753
- Testes no Play Console: https://support.google.com/googleplay/android-developer/answer/9845334
- Requisitos de teste para contas pessoais: https://support.google.com/googleplay/android-developer/answer/14151465
- Publicar release: https://support.google.com/googleplay/android-developer/answer/9859348
- Paises e distribuicao: https://support.google.com/googleplay/android-developer/answer/7550024
- Precos: https://support.google.com/googleplay/android-developer/answer/138412
- Perfil de pagamentos: https://support.google.com/googleplay/android-developer/answer/7161426
- Vincular perfil de pagamentos: https://support.google.com/googleplay/android-developer/answer/3092739
- Ganhos e relatorios: https://support.google.com/googleplay/android-developer/answer/6135870
- Taxas de servico: https://support.google.com/googleplay/android-developer/answer/112622
- Google Payments: https://payments.google.com/
- Ajuda Google Payments: https://support.google.com/paymentscenter
- AdMob: https://admob.google.com/
- Ajuda AdMob: https://support.google.com/admob
- AdMob Android quick start: https://developers.google.com/admob/android/quick-start
- Politicas AdMob: https://support.google.com/admob/answer/6128543
- Test ads AdMob: https://developers.google.com/admob/android/test-ads
- app-ads.txt: https://support.google.com/admob/answer/9363762
- Google Play Billing: https://developer.android.com/google/play/billing
- Criar produto no app: https://support.google.com/googleplay/android-developer/answer/1153481
- Tipos de produtos: https://support.google.com/googleplay/android-developer/answer/14590082
- Testar Billing: https://developer.android.com/google/play/billing/test
- Criar assinaturas: https://support.google.com/googleplay/android-developer/answer/140504
- Entender assinaturas: https://support.google.com/googleplay/android-developer/answer/12154973
- Politica de assinaturas: https://support.google.com/googleplay/android-developer/answer/9900533
- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo Android build: https://docs.expo.dev/build/setup/
- Expo EAS Submit Android: https://docs.expo.dev/submit/android/
- Android App Bundle: https://developer.android.com/guide/app-bundle
- GitHub Pages: https://pages.github.com/
- Google Sites: https://sites.google.com/
