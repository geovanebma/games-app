import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssignments, buildPlayerStats, createRoleConfig, getTotalRoles, pickImpostorWord } from './gameLogic.js';

test('createRoleConfig and getTotalRoles keep default role counts aligned', () => {
  const game = {
    roles: [
      { id: 'civis', defaultCount: 4 },
      { id: 'impostores', defaultCount: 1 },
    ],
  };

  const config = createRoleConfig(game);

  assert.deepEqual(config, { civis: 4, impostores: 1 });
  assert.equal(getTotalRoles(config), 5);
});

test('buildAssignments gives the secret word only to non-impostors', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const assignments = buildAssignments({
      players: [
        { id: '1', name: 'Ana' },
        { id: '2', name: 'Bia' },
        { id: '3', name: 'Caio' },
      ],
      game: {
        id: 'impostor',
        roles: [
          { id: 'civis', label: 'Civil' },
          { id: 'impostores', label: 'Impostor' },
        ],
      },
      config: { civis: 2, impostores: 1 },
      secretWord: 'capivara',
      defaultPlayerLabel: (index) => `Jogador ${index + 1}`,
    });

    const impostor = assignments.find((item) => item.role === 'Impostor');
    const civilians = assignments.filter((item) => item.role === 'Civil');

    assert.ok(impostor);
    assert.equal(impostor.secretWord, null);
    assert.equal(civilians.length, 2);
    assert.ok(civilians.every((item) => item.secretWord === 'capivara'));
  } finally {
    Math.random = originalRandom;
  }
});

test('pickImpostorWord uses the selected category and respects hard mode fallback', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const categories = [
      { id: 'animais', words: ['gato', 'elefantecomprido', 'rinoceronteazul', 'papagaiomisterioso', 'formigagigante', 'abelhatrabalhadora', 'tartarugamarinha', 'golfinhocurioso', 'hipopotamocinza', 'crocodiloantigo', 'orangotangoselvagem', 'camaleaocurioso', 'canguruaustraliano', 'tamanduabandeira', 'porcoespinhoforte', 'borboletacolorida', 'gafanhotosaltador', 'pinguimagelado', 'mariposanoturna', 'vagalumebrilhante', 'escaravelhobranco'] },
    ];
    const normalWord = pickImpostorWord({ categoryId: 'animais', wordMode: 'normal', categories, wordBank: ['x'] });
    const hardWord = pickImpostorWord({ categoryId: 'animais', wordMode: 'dificil', categories, wordBank: ['x'] });

    assert.equal(normalWord, 'gato');
    assert.equal(hardWord, 'elefantecomprido');
  } finally {
    Math.random = originalRandom;
  }
});

test('buildPlayerStats ranks players and counts impostor appearances', () => {
  const t = (key) =>
    ({
      veteranBadge: 'Veteran',
      bluffBadge: 'Bluff Master',
      versatileBadge: 'Role Chameleon',
    })[key];

  const stats = buildPlayerStats(
    [
      { participants: [{ name: 'Ana', role: 'Impostor' }, { name: 'Bia', role: 'Civil' }] },
      { participants: [{ name: 'Ana', role: 'Civil' }, { name: 'Bia', role: 'Impostor' }] },
      { participants: [{ name: 'Ana', role: 'Detetive' }] },
      { participants: [{ name: 'Ana', role: 'Civil' }] },
      { participants: [{ name: 'Ana', role: 'Impostor' }] },
    ],
    t,
    'Jogador',
  );

  assert.equal(stats[0].name, 'Ana');
  assert.equal(stats[0].rounds, 5);
  assert.equal(stats[0].impostorCount, 2);
  assert.ok(stats[0].badges.includes('Veteran'));
  assert.ok(stats[0].badges.includes('Bluff Master'));
});
