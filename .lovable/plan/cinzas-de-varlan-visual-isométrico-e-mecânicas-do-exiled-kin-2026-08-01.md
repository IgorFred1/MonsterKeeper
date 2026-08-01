# Cinzas de Varlan — visual isométrico e mecânicas do Exiled Kingdoms

Objetivo: trocar a visão de cima (top-down) por uma perspectiva isométrica 3/4 como nas imagens de referência, com ambiente mais rico (casas com telhado, muros de pedra, barris, caixas, tochas, árvores, grama alta) e completar o conjunto de mecânicas do Exiled Kingdoms.

## Parte 1 — Perspectiva e gráficos

- Novo renderizador isométrico: cada tile do mapa passa a ser um losango (diamante) de 32x16 px, desenhado do fundo para a frente, com ordenação por profundidade para que personagens fiquem corretamente atrás/na frente de paredes e objetos.
- Tiles de chão pintados à mão em pixel art (pedra de calçada, terra, grama, lama, laje de cripta), com variações aleatórias por posição para evitar repetição visível.
- Objetos com altura real: paredes com face lateral e topo, casas com telhado inclinado, muros baixos, poços, barris, caixas, tendas, tochas com luz pulsante, árvores e arbustos.
- Personagens desenhados como sprites em 4 direções (frente/costas/lados) com animação de caminhada, ataque e dano.
- Iluminação: escurecimento ambiente por mapa (vila clara, pântano acinzentado, cripta escura) com halos de luz em tochas e fogueiras.
- Câmera segue o jogador em coordenadas isométricas; clique no chão converte pixel → tile isométrico para o movimento.
- Nome do inimigo e nível flutuando acima dele ao passar o mouse/tocar, como nas referências.

## Parte 2 — Mecânicas estilo Exiled Kingdoms

- Classes na criação de personagem: Guerreiro, Mago, Clérigo e Ladino, cada uma com vida/éter, dano e habilidades próprias.
- Atributos e evolução: pontos por nível distribuídos entre Força, Destreza, Constituição, Mente; árvore simples de habilidades por classe.
- Equipamento por slot: arma, escudo, armadura, elmo, botas, anel/amuleto — com raridades e requisitos de atributo.
- Combate: ataque físico com alcance/velocidade da arma, chance de crítico, esquiva, bloqueio de escudo, resistências; habilidades ativas em barra de ação com recarga e custo de éter.
- Poções e frascos em atalhos rápidos com contador (como o "x2" da referência).
- Loja/comércio com NPC mercador: comprar, vender e reparar; ouro como moeda.
- Diário de quests com quests principais e secundárias, múltiplas resoluções e efeito na reputação.
- Baús e saques com item aleatório por tabela de loot; itens no chão com nome flutuante.
- Ciclo de dia e noite com contador "Dia N, hora" no rodapé, afetando iluminação e inimigos noturnos.
- Viagem entre mapas por saídas nas bordas, mapa-múndi simples e ponto de descanso/santuário que restaura vida e salva.
- Morte com retorno ao último santuário e penalidade de ouro.
- Save/carregar mantido em múltiplos slots locais.

## Ordem de execução

1. Renderizador isométrico + tiles e objetos com altura (base visual).
2. Sprites animados de personagem e inimigos + ordenação de profundidade.
3. Reescrita da geração de mapas para o novo formato, com os três mapas atuais reconstruídos e mais decoração.
4. HUD estilo Exiled Kingdoms: retrato, barra de vida no topo, botões de ação, atalhos e rodapé com dia/hora.
5. Classes, atributos, slots de equipamento e habilidades.
6. Comércio, baús, ciclo dia/noite, santuários e ajustes de quests.

## Notas técnicas

Tudo continua em Canvas 2D, sem backend, sem dependências novas. A engine (`src/game/engine.ts`) ganha módulos separados para classes/atributos e para o relógio do mundo; `src/game/render.ts` é substituído por um renderizador isométrico com camadas. Os saves antigos serão invalidados por mudança de formato.
