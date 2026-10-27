# UEFY LIVE — versão 2

Central gratuita para Windows + OBS. Não requer API do X, banco de dados ou assinatura.

## Iniciar
1. Na pasta entregue UEFY-LIVE, abra **Iniciar.vbs**. Ele inicia a central de forma oculta e abre o painel. O iniciador usa diretamente o Python leve já disponível neste computador, com alternativa em Node.js; nada é instalado. Não depende de PowerShell.
2. Painel: http://127.0.0.1:17831/painel.html
3. Fonte Navegador: http://127.0.0.1:17831/obs.html — 1080 × 1920, 30 FPS, controlar áudio via OBS. Não desligar fonte quando invisível nem atualizar ao ativar cena.
4. Cole o YouTube no painel, carregue e confirme “YouTube reproduzindo”. Cole a incorporação do X, importe, confira e exiba. Retirar comentário e Tela de espera são controles separados. A espera silencia o áudio, mantendo o player carregado.

O painel pode ser adicionado em OBS → Painéis → Painéis de navegador personalizados. Assim toda a operação acontece dentro do OBS. Fechar o Brave não interrompe a fonte ou a central.

Para iniciar por terminal: `python server.py` (Python 3.10+) ou `node server.mjs` (Node.js 20+). Para encerrar, finalize somente o processo Python ou Node da central; reiniciar o computador também o encerra. Nada é instalado na inicialização do Windows. Mantenha a pasta no lugar.

## Instalação pelo repositório público
Baixe o ZIP do repositório público, extraia e abra `uefy-live/Iniciar.vbs`. A marca é lida do arquivo `uefyerryeni-logo.png` existente na raiz do repositório. O tom de teste é gerado localmente na primeira inicialização. No repositório privado, use o pacote entregue ou coloque a marca original em `public/logo.png`.

## Arquitetura e segurança
Servidor HTTP somente em 127.0.0.1:17831. Estado único enviado por Server-Sent Events; reconexão automática e persistência local em `data/state.json`. Painel e fonte não dependem de localStorage/BroadcastChannel. O servidor é um processo independente do navegador.

Mutações exigem cookie HttpOnly/SameSite Strict, origem exata e JSON. O Host é validado contra DNS rebinding. Não há CORS público, encaminhamento de porta ou acesso pela rede local. O estado contém apenas vídeo, comentário e controles. Não cole chaves do Instagram no painel. A fonte não mostra controles de edição; os endereços públicos são pontos de entrada, sem API administrativa remota. Cookies de sessão são aleatórios e não vão ao disco ou ao repositório.

Código do X é interpretado em documento separado; scripts não são inseridos na saída, que usa textContent. Domínio e perfil são validados; a referência deve ser de @Uefyerryeni. URLs isoladas não recuperam texto. Até 1000 caracteres, divididos em páginas para leitura sem cortes. O exemplo é explicitamente fictício.

A identidade do vídeo é independente do comentário: alterar comentário não cria iframe, não carrega outro vídeo e não redefine o tempo. A prévia do painel não carrega um segundo player, evitando som duplicado. O volume é aplicado à fonte real. Em espera, o vídeo fica silenciado.

## YouTube e alternativas
A incorporação usa a API oficial, origem real e política de Referer compatível. Erros 100, 101/150 e 153 são apresentados no painel e na saída. Não há desbloqueio de restrições, download do YouTube ou extração de URLs internas.

Se a incorporação for proibida, peça à emissora um sinal/arquivo autorizado. Opções implementadas:
- MP4/WebM HTTPS autorizado, reproduzido na mesma fonte e controlado pelo painel.
- Fonte de mídia nativa no OBS, abaixo da composição. Selecione “Vídeo por fonte de mídia do OBS” no painel. A área transparente fica em **x=90, y=444, largura=900, altura=506,25 (16:9)** na base 1080×1920. Configure o arquivo ou sinal autorizado nessa fonte. Controle seu áudio no mixer; a central não controla uma fonte de mídia externa.

## Instagram e teste sem público
Use base 1080×1920, saída 720×1280, 30 FPS, H.264, CBR 4000 kbps, quadro-chave de 2 segundos e AAC estéreo 128–192 kbps. Confirme os limites mostrados pelo Live Producer da própria conta antes do evento. A configuração deve seguir a interface oficial caso os requisitos mudem.

A disponibilidade de Live Producer e da audiência **Prática/Practice** depende da conta e deve ser confirmada na interface oficial: https://www.instagram.com/live/producer/ . Se houver Prática, selecione-a ANTES de iniciar o envio e confirme a audiência indicada. Não se presume uma live privada. Se a opção não aparecer, use **gravação local do OBS**; ela foi a modalidade de teste usada nesta execução. Nenhuma transmissão pública foi iniciada.

Acesso autenticado à conta, aceitação do sinal pelo Instagram, latência da rede e autorização da TVU não são validados por um teste local. As páginas oficiais da Meta consultadas exigiram login/limitaram a consulta; não declaramos elegibilidade da conta. Ajuda oficial: https://www.facebook.com/help/instagram/537518769659039 .

## Referências técnicas
- OBS Fonte Navegador: https://obsproject.com/kb/browser-source
- YouTube IFrame API e eventos: https://developers.google.com/youtube/iframe_api_reference
- Identificação do player incorporado: https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity

Revisão: 27/10/2026. Sem serviços pagos novos.


## Enquadramento seguro — atualização de 27/10/2026

A composição continua em 1080×1920. A fonte e a conexão usam os mesmos endereços. A saída confirmada do OBS permanece 720×1280 a 30 FPS; áudio e controles de reprodução foram preservados.

As informações essenciais estão dentro de x=90..990 e y=300..1516: margem lateral de 8,33%, reserva superior mínima de 15% e inferior de 20%. O vídeo mantém 16:9, com 900×506,25, sem recorte ou esticamento. A área do vídeo foi redimensionada individualmente; o texto não foi reduzido junto com a página. Comentários usam 56 px e são paginados por medição do espaço disponível, preservando o texto inteiro.

No painel há “Simular interface do Instagram” e “Mostrar área segura”. Essas opções afetam apenas a prévia silenciosa. A fonte normal do OBS não recebe as marcações nem os controles simulados. Uma demonstração independente está em:
http://127.0.0.1:17831/obs.html?preview=1&sim=1&guides=1&demo=1

A simulação aproxima a interface e não representa todos os aparelhos. Confirme o resultado no Instagram em um celular antes do evento. A recompressão do Instagram e a resolução do vídeo original podem reduzir a nitidez; renderizar texto a 1080p não recupera detalhe ausente na fonte.

OBS: fonte 1080×1920, posição 0,0, escala proporcional, recortes 0. Faça apenas uma redução para 720×1280 na saída. Não use “Esticar à tela”. Não é necessário alterar URL, chave, áudio ou bitrate atual de 6000 kbps. Para reaplicar o layout em uma fonte já carregada, atualize-a fora da transmissão. Em Modo Estúdio, a cena UEFY precisa estar em Programa.

Se estiver usando uma Fonte de mídia externa abaixo da composição, ajuste somente essa fonte para x=90, y=444, largura=900, altura=506,25, mantendo 16:9. O YouTube integrado é ajustado automaticamente.

