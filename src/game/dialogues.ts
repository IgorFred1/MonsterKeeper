import type { Dialogue } from "./types";

export const DIALOGUES: Record<string, Dialogue> = {
  corvin: {
    id: "corvin",
    start: "intro",
    branch: [
      { flag: "selo_entregue", node: "fim" },
      { flag: "selo_vendido", node: "traido" },
      { flag: "corvin_selo", node: "selo_pedido" },
      { flag: "corvin_lobos_feito", node: "lobos_feito" },
      { flag: "corvin_lobos", node: "lobos_pendente" },
    ],
    nodes: {
      intro: {
        text: "Corvin cospe no chão antes de te olhar. \"Você é o órfão dos campos. O que sobrou da casa dos Vane. Ainda respira, então serve pra alguma coisa. Os lobos-cinza estão comendo os meeiros vivos, e a Ordem não manda ninguém há dois invernos.\"",
        options: [
          {
            text: "Eu mato os lobos. Não por você — por quem ainda planta.",
            next: "aceita_bom",
            tone: "good",
            effect: { rep: 8, flag: "corvin_lobos", quest: { id: "lobos", stage: 1 } },
          },
          {
            text: "Quanto vale cada dente?",
            next: "aceita_frio",
            tone: "neutral",
            effect: { flag: "corvin_lobos", quest: { id: "lobos", stage: 1 } },
          },
          { text: "Morra com eles. Não é meu problema.", next: null, tone: "evil", effect: { rep: -6 } },
        ],
      },
      aceita_bom: {
        text: "\"Palavras bonitas de quem nunca viu uma matilha abrir um homem.\" Ele te empurra uma foice velha e uma poção. \"Traga cinco dentes. Os campos ficam ao sul.\"",
        options: [
          { text: "Cinco dentes.", next: null, effect: { item: "pocao_menor" } },
        ],
      },
      aceita_frio: {
        text: "\"Dois cobres cada. Cinco dentes e eu falo bem de você pra quem importa.\" Ele ri sem alegria. \"Ou finge falar.\"",
        options: [{ text: "Fechado.", next: null, effect: { item: "foice_enferrujada" } }],
      },
      lobos_pendente: {
        text: "\"Cinco dentes, garoto. Ainda não vi nenhum.\"",
        options: [
          {
            text: "(Entregar os dentes)",
            next: "lobos_feito",
            requireItem: "dente_de_lobo",
            effect: {
              removeItem: "dente_de_lobo",
              flag: "corvin_lobos_feito",
              gold: 40,
              xp: 60,
              quest: { id: "lobos", stage: 2 },
              rep: 5,
            },
          },
          { text: "Estou indo.", next: null },
        ],
      },
      lobos_feito: {
        text: "Ele conta os dentes duas vezes. \"Serve. Agora escute: os salteadores tomaram a cripta de Vhalmark e arrancaram o selo do túmulo do último cavaleiro. Sem o selo, a Ordem não reconhece esta aldeia. Sem reconhecimento, nós somos gado.\"",
        options: [
          {
            text: "Eu traço o selo de volta. Custe o que custar.",
            next: "selo_pedido",
            tone: "good",
            effect: { flag: "corvin_selo", quest: { id: "selo", stage: 1 }, rep: 6 },
          },
          {
            text: "E se eu preferir vender esse selo?",
            next: "ameaca",
            tone: "evil",
            effect: { flag: "corvin_selo", quest: { id: "selo", stage: 1 }, rep: -8 },
          },
        ],
      },
      ameaca: {
        text: "A mão dele fica no punho da espada. \"Então eu te enterro ao lado dele. Vá. Traga o selo e nós fingimos que essa frase não existiu.\"",
        options: [{ text: "Como quiser.", next: null }],
      },
      selo_pedido: {
        text: "\"O selo, garoto. Ossos brancos, sinete de cavaleiro. Está lá embaixo, com a coisa que os salteadores acordaram.\"",
        options: [
          {
            text: "(Entregar o Selo de Vhalmark)",
            next: "fim",
            requireItem: "selo_de_vhalmark",
            effect: {
              removeItem: "selo_de_vhalmark",
              flag: "selo_entregue",
              gold: 120,
              xp: 220,
              rep: 25,
              quest: { id: "selo", stage: 3 },
              item: "cota_de_malha",
            },
          },
          { text: "Ainda não.", next: null },
        ],
      },
      fim: {
        text: "Corvin ergue o selo contra a luz cinzenta e, por um instante, parece jovem. \"Cinzavale tem nome outra vez. Você deixou de ser o órfão dos campos, e virou algo que os outros vão temer ou seguir. Escolha bem qual.\"",
        options: [{ text: "Eu escolho.", next: null }],
      },
      traido: {
        text: "\"Jareth me contou o que você fez com o selo, achando que eu pagaria mais pela informação. Saia de Cinzavale antes que eu decida que sua cabeça vale o preço.\"",
        options: [{ text: "Saio quando terminar.", next: null }],
      },
    },
  },

  ysolde: {
    id: "ysolde",
    start: "intro",
    branch: [{ flag: "ysolde_faisca", node: "curar" }],
    nodes: {
      intro: {
        text: "A mulher lava panos em água já vermelha. \"Você tem o cheiro de quem vai morrer longe de casa. Sente. Eu vi seu sangue subir quando você era criança — há éter em você, mal costurado, mas há.\"",
        options: [
          {
            text: "Me ensine a usar isso.",
            next: "ensina",
            tone: "neutral",
            effect: { flag: "ysolde_faisca", learnSpark: true, xp: 30 },
          },
          {
            text: "Magia é coisa de nobre. Eu tenho braços.",
            next: "recusa",
            tone: "neutral",
          },
          {
            text: "Se há éter em mim, então há em você. Quanto vale seu sangue?",
            next: "ameaca",
            tone: "evil",
            effect: { rep: -12, flag: "ysolde_temor" },
          },
        ],
      },
      ensina: {
        text: "Ela aperta seu polegar até sair sangue e desenha um sinal na sua palma. \"Faísca. Custa 6 de éter e queima o que toca. Não é dom, é dívida. Tudo que arde cobra depois.\" (Tecla 2 ou o botão de magia)",
        options: [{ text: "Vou pagar quando chegar a hora.", next: null }, ],
      },
      recusa: {
        text: "\"Braços quebram.\" Ela te dá duas poções de qualquer forma. \"Volte quando estiver com medo.\"",
        options: [{ text: "Obrigado.", next: null, effect: { item: "pocao_menor", rep: 3 } }],
      },
      ameaca: {
        text: "Ela não recua, mas algo nela se fecha para sempre. \"Então você já escolheu o que vai ser. Vá embora, criatura.\"",
        options: [{ text: "Vou.", next: null }],
      },
      curar: {
        text: "\"Sente-se. Eu fecho o que der pra fechar.\"",
        options: [
          { text: "(Deixar Ysolde te curar)", next: null, effect: { heal: true } },
          { text: "Depois.", next: null },
        ],
      },
    },
  },

  jareth: {
    id: "jareth",
    start: "intro",
    branch: [
      { flag: "selo_vendido", node: "depois" },
      { flag: "selo_entregue", node: "tarde" },
    ],
    nodes: {
      intro: {
        text: "Ele está sentado sobre um caixote de mercadoria que não é dele. \"Órfão. Eu compro o que ninguém deveria vender, e vendo o que ninguém deveria comprar. Se você descer na cripta, traga o selo do cavaleiro. Corvin quer ele por honra. Eu pago em prata.\"",
        options: [
          {
            text: "(Vender o Selo de Vhalmark — 260 moedas)",
            next: "vendido",
            requireItem: "selo_de_vhalmark",
            tone: "evil",
            effect: {
              removeItem: "selo_de_vhalmark",
              gold: 260,
              rep: -30,
              flag: "selo_vendido",
              xp: 120,
              item: "machado_carniceiro",
              quest: { id: "selo", stage: 4 },
            },
          },
          {
            text: "Compro uma faca. Nada de conversa.",
            next: "compra",
            tone: "neutral",
            requireFlag: "nunca",
          },
          {
            text: "A honra de Corvin alimenta a aldeia. Sua prata não.",
            next: "recusa",
            tone: "good",
            effect: { rep: 6 },
          },
          { text: "Vou pensar.", next: null },
        ],
      },
      vendido: {
        text: "A prata pesa mais que o selo. \"Sábio. A Ordem nunca vem, e homens como Corvin morrem esperando bandeiras.\" Ele te entrega um machado que ainda tem sangue seco no cabo. \"Você vai precisar.\"",
        options: [{ text: "Isso me torna o quê?", next: "moral" }],
      },
      moral: {
        text: "\"Rico. E odiado. As duas coisas duram mais que gratidão.\"",
        options: [{ text: "Então que dure.", next: null }],
      },
      recusa: {
        text: "\"Honra.\" Ele saboreia a palavra como vinho estragado. \"Volte quando tiver fome de novo. Eu não julgo, só espero.\"",
        options: [{ text: "Não vou voltar.", next: null }],
      },
      depois: {
        text: "\"Todo mundo já sabe o que você vendeu. Isso tem seu preço em cada porta desta aldeia.\"",
        options: [{ text: "Eu sei.", next: null }],
      },
      tarde: {
        text: "\"Você entregou o selo ao velho. Espero que a honra dele aqueça você no inverno.\"",
        options: [{ text: "Aquece mais que prata.", next: null }],
      },
      compra: { text: "...", options: [{ text: "...", next: null }] },
    },
  },

  harlan: {
    id: "harlan",
    start: "intro",
    branch: [{ flag: "harlan_resolvido", node: "depois" }],
    nodes: {
      intro: {
        text: "Um homem magro, com meia armadura da Ordem enterrada na lama ao lado. \"Não grite. Eu desertei. Vi um dragão de cinzas comer minha companhia inteira em Vhalmark e corri. Se você me entregar ao Corvin, eu enforco.\"",
        options: [
          {
            text: "Suma daqui. Nunca te vi.",
            next: "poupa",
            tone: "good",
            effect: { rep: 10, flag: "harlan_resolvido", xp: 40, item: "tonico_azul" },
          },
          {
            text: "Sua armadura vale mais que sua vida.",
            next: "mata",
            tone: "evil",
            effect: { rep: -20, flag: "harlan_resolvido", xp: 40, item: "gibao_de_couro", gold: 25 },
          },
          {
            text: "Me conte o que dorme lá embaixo. Depois eu decido.",
            next: "conta",
            tone: "neutral",
          },
        ],
      },
      conta: {
        text: "\"Uma serpe. Filhote de dragão, do tamanho de um boi, e cega de fome. Ela respira brasa. E os salteadores a alimentam com gente pra guardar o selo do capitão.\"",
        options: [
          {
            text: "Então vá. Você já pagou o suficiente.",
            next: "poupa",
            tone: "good",
            effect: { rep: 10, flag: "harlan_resolvido", xp: 40, item: "tonico_azul" },
          },
          {
            text: "Obrigado pela informação. (Puxar a arma)",
            next: "mata",
            tone: "evil",
            effect: { rep: -20, flag: "harlan_resolvido", xp: 40, item: "gibao_de_couro", gold: 25 },
          },
        ],
      },
      poupa: {
        text: "Ele chora de um jeito feio, sem dignidade. Te dá um frasco azul. \"Se ela abrir a boca, corra pro lado, nunca pra trás.\"",
        options: [{ text: "Vou lembrar.", next: null }],
      },
      mata: {
        text: "É rápido. Ele não luta. Você tira o gibão do corpo e a lama fecha em cima do resto, como se nunca tivesse existido um Harlan.",
        options: [{ text: "(Seguir em frente)", next: null }],
      },
      depois: {
        text: "O lugar onde Harlan estava é só lama e uma marca de armadura.",
        options: [{ text: "...", next: null }],
      },
    },
  },
};
