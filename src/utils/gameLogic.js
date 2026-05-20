export const getTotalRoles = (config) => Object.values(config).reduce((total, count) => total + Number(count || 0), 0);

export const createRoleConfig = (game) =>
  game.roles.reduce((acc, role) => ({ ...acc, [role.id]: role.defaultCount }), {});

function shuffle(list) {
  const copied = [...list];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[target]] = [copied[target], copied[index]];
  }
  return copied;
}

export function buildAssignments({ players, game, config, secretWord, defaultPlayerLabel }) {
  const roles = [];
  game.roles.forEach((role) => {
    const count = Number(config[role.id] ?? 0);
    for (let index = 0; index < count; index += 1) roles.push(role.label);
  });

  const shuffledRoles = shuffle(roles);
  return players.map((player, index) => ({
    id: `${player.id}-${index}`,
    name: player.name.trim() || defaultPlayerLabel(index),
    role: shuffledRoles[index],
    secretWord: game.id === 'impostor' && shuffledRoles[index] !== 'Impostor' ? secretWord : null,
  }));
}

export function pickImpostorWord({ categoryId, wordMode = 'normal', categories, wordBank }) {
  if (!categoryId || categoryId === 'todos') {
    return wordBank[Math.floor(Math.random() * wordBank.length)];
  }

  const category = categories.find((item) => item.id === categoryId);
  const bank = category?.words?.length ? category.words : wordBank;
  if (wordMode === 'dificil') {
    const harderWords = bank.filter((word) => word.length >= 8);
    const difficultBank = harderWords.length >= 20 ? harderWords : bank;
    return difficultBank[Math.floor(Math.random() * difficultBank.length)];
  }

  return bank[Math.floor(Math.random() * bank.length)];
}

export function buildPlayerStats(roundHistory, t, fallbackPlayerName) {
  const statsMap = new Map();

  roundHistory.forEach((round) => {
    (round.participants ?? []).forEach((participant) => {
      const name = participant.name?.trim?.() || fallbackPlayerName;
      const existing = statsMap.get(name) ?? { name, rounds: 0, roles: new Set(), impostorCount: 0 };
      existing.rounds += 1;
      if (participant.role) existing.roles.add(participant.role);
      if (String(participant.role).toLowerCase().includes('impost')) existing.impostorCount += 1;
      statsMap.set(name, existing);
    });
  });

  return [...statsMap.values()]
    .map((item) => ({
      ...item,
      uniqueRoles: item.roles.size,
      badges: [
        item.rounds >= 5 ? t('veteranBadge') : null,
        item.impostorCount >= 2 ? t('bluffBadge') : null,
        item.roles.size >= 3 ? t('versatileBadge') : null,
      ].filter(Boolean),
    }))
    .sort((a, b) => b.rounds - a.rounds || b.uniqueRoles - a.uniqueRoles || b.impostorCount - a.impostorCount || a.name.localeCompare(b.name));
}
