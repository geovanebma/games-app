export const ROOM_NAMES = {
  impostor: ['Sala Neon', 'Mesa Farsa', 'Codigo Laranja', 'Palavra Fantasma'],
  'cidade-dorme': ['Rua Silenciosa', 'Beco da Lua', 'Vigilia Central', 'Cidade Velada'],
  'mímica-relampago': ['Palco Neon', 'Cena Aberta', 'Turno de Ouro', 'Riso em Cena'],
  'passa-a-bomba': ['Faísca Curta', 'Cronometro Quente', 'Sala Vermelha', 'Explosao de Palavras'],
  'palavra-proibida': ['Codigo Mudo', 'Setor Silencio', 'Mesa Tabu', 'Arquivo Censurado'],
  'quem-sou-eu': ['Cracha Secreto', 'Espelho Torto', 'Identidade Oculta', 'Nome na Testa'],
  'eu-nunca': ['Arquivo Vergonha', 'Mesa Confissao', 'Copo Vazio', 'Sem Filtro'],
  'verdade-ou-desafio': ['Carta Rosa', 'Modo Coragem', 'Roda Nervosa', 'Sem Escapatoria'],
  'batalha-de-frases': ['Microfone Dourado', 'Arena de Cantadas', 'Palco Brega', 'Verso Fatal'],
  'se-fosse-você': ['Modo Hipotese', 'Sala E Se', 'Resposta Instantanea', 'Plano Imaginario'],
  'quem-da-mesa': ['Mesa em Julgamento', 'Roda da Escolha', 'Quem Aponta', 'Votacao Improvisada'],
  'pergunta-pesada': ['Zona Sincera', 'Pergunta Funda', 'Modo Verdade Crua', 'Mesa Profunda'],
  'quem-mais-provável': ['Radar da Mesa', 'Voto Raro', 'Quem Tem Cara', 'Probabilidade Maxima'],
};

export function getRoomName(gameId, seed = 0) {
  const names = ROOM_NAMES[gameId] ?? [];
  if (!names.length) return '';
  return names[Math.abs(seed) % names.length];
}
