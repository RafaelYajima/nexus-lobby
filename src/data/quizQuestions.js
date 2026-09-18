/**
 * ⚡ Banco de perguntas do Quiz Relâmpago.
 * Cada partida sorteia 8 destas (ids gravados na linha quiz_games do Supabase —
 * todo mundo da sala vê o mesmo baralho). Respostas fixas: manter os ids estáveis.
 * q = pergunta · options = 4 alternativas · a = índice da correta (0-3)
 */
export const QUESTIONS = [
  { id: 'q01', q: 'Qual estúdio criou o jogo Minecraft?', options: ['Mojang', 'Valve', 'Epic Games', 'Blizzard'], a: 0 },
  { id: 'q02', q: 'Qual é a capital da Austrália?', options: ['Sydney', 'Melbourne', 'Camberra', 'Perth'], a: 2 },
  { id: 'q03', q: 'Quanto é 7 × 8?', options: ['54', '63', '48', '56'], a: 3 },
  { id: 'q04', q: 'Qual é o maior planeta do Sistema Solar?', options: ['Júpiter', 'Saturno', 'Netuno', 'Terra'], a: 0 },
  { id: 'q05', q: 'Em que ano o Brasil conquistou a 5ª Copa do Mundo?', options: ['1994', '1998', '2002', '2006'], a: 2 },
  { id: 'q06', q: 'Qual destes NÃO é um gás em temperatura ambiente?', options: ['Oxigênio', 'Hélio', 'Ferro', 'Nitrogênio'], a: 2 },
  { id: 'q07', q: 'Quem é o herói jogável da série The Legend of Zelda?', options: ['Zelda', 'Ganondorf', 'Tingle', 'Link'], a: 3 },
  { id: 'q08', q: 'Quantos minutos tem um jogo de futebol, sem acréscimos?', options: ['80', '100', '90', '120'], a: 2 },
  { id: 'q09', q: 'O rio tradicionalmente considerado o mais extenso do mundo fica no…', options: ['Brasil', 'Egito', 'China', 'Estados Unidos'], a: 0 },
  { id: 'q10', q: 'Qual console híbrido a Nintendo lançou em 2017?', options: ['Wii U', 'Switch', '3DS', 'GameCube'], a: 1 },
  { id: 'q11', q: 'Qual é a raiz quadrada de 144?', options: ['12', '14', '16', '24'], a: 0 },
  { id: 'q12', q: 'Qual elemento químico tem o símbolo O?', options: ['Ósmio', 'Prata', 'Ouro', 'Oxigênio'], a: 3 },
  { id: 'q13', q: 'Quem pintou a Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], a: 2 },
  { id: 'q14', q: 'No xadrez, qual peça anda em formato de "L"?', options: ['Bispo', 'Torre', 'Cavalo', 'Rainha'], a: 2 },
  { id: 'q15', q: 'Qual é o maior estado do Brasil em extensão territorial?', options: ['Minas Gerais', 'Amazonas', 'São Paulo', 'Pará'], a: 1 },
  { id: 'q16', q: 'Em que ano foi lançado o primeiro iPhone?', options: ['2005', '2009', '2010', '2007'], a: 3 },
  { id: 'q17', q: 'Quanto é 15% de 200?', options: ['20', '25', '30', '45'], a: 2 },
  { id: 'q18', q: 'Quem formulou a teoria da relatividade?', options: ['Isaac Newton', 'Albert Einstein', 'Charles Darwin', 'Nikola Tesla'], a: 1 },
  { id: 'q19', q: 'No futebol, quantos jogadores cada time mantém em campo?', options: ['10', '12', '9', '11'], a: 3 },
  { id: 'q20', q: 'Qual empresa desenvolve o Windows?', options: ['Apple', 'Google', 'Microsoft', 'IBM'], a: 2 },
  { id: 'q21', q: 'Quantos lados tem um hexágono?', options: ['5', '6', '8', '7'], a: 1 },
  { id: 'q22', q: 'Qual país sediou a Copa do Mundo de 2014?', options: ['África do Sul', 'Rússia', 'Catar', 'Brasil'], a: 3 },
  { id: 'q23', q: 'Qual é o estado físico da água em temperatura ambiente?', options: ['Líquido', 'Gasoso', 'Sólido', 'Plasma'], a: 0 },
  { id: 'q24', q: 'Qual destes animais é um mamífero?', options: ['Tubarão', 'Golfinho', 'Crocodilo', 'Água-viva'], a: 1 },
  { id: 'q25', q: '1000 centímetros equivalem a…', options: ['1 km', '10 metros', '100 metros', '1 metro'], a: 1 },
  { id: 'q26', q: 'Qual é a moeda oficial do Japão?', options: ['Won', 'Yuan', 'Dólar', 'Iene'], a: 3 },
  { id: 'q27', q: 'Qual herói da Marvel carrega um escudo circular?', options: ['Thor', 'Homem de Ferro', 'Capitão América', 'Homem-Aranha'], a: 2 },
  { id: 'q28', q: 'No plano cartesiano, como se chama o eixo horizontal?', options: ['Eixo y', 'Eixo x', 'Eixo z', 'Eixo w'], a: 1 },
  { id: 'q29', q: 'Qual é o planeta mais próximo do Sol?', options: ['Terra', 'Marte', 'Mercúrio', 'Vênus'], a: 2 },
  { id: 'q30', q: 'Em que continente fica o Egito?', options: ['Ásia', 'Europa', 'América', 'África'], a: 3 },
  { id: 'q31', q: 'Em que ano a internet comercial chegou oficialmente ao Brasil?', options: ['1989', '1991', '1995', '1998'], a: 2 },
  { id: 'q32', q: 'Quantas cores tem o arco-íris tradicional?', options: ['5', '9', '6', '7'], a: 3 },
]

export const QUESTION_TIME_S = 10
export const ROUND_COUNT = 8
