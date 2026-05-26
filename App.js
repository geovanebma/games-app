import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameCard } from './src/components/GameCard';
import { HeaderBar } from './src/components/HeaderBar';
import { BASE_GAMES, localizeGames } from './src/data/games';
import { BOMB_CATEGORIES, CHARADES_PACKS, DARE_PACKS, DEEP_QUESTIONS_PACKS, MOST_LIKELY_PACKS, NEVER_PACKS, PICKUP_BATTLE_THEMES, pickRandom, TABOO_PACKS, TRUTH_PACKS, WHAT_WOULD_YOU_DO_PACKS, WHO_AM_I_PACKS, WHO_AT_TABLE_PACKS } from './src/data/gamePacks';
import { IMPOSTOR_CATEGORIES, IMPOSTOR_WORD_BANK } from './src/data/impostorWords';
import { getRoomName } from './src/data/roomNames';
import { createTranslator, getDeviceLanguage, getLocalizedContent, isRtlLanguage, SUPPORTED_LANGUAGE_ORDER } from './src/i18n';
import { buildAssignments, buildPlayerStats, createRoleConfig, getTotalRoles, pickImpostorWord } from './src/utils/gameLogic';

const STORAGE_KEY = 'noite-de-jogos-state-v4';
const DIAGNOSTICS_KEY = 'party-games-diagnostics-v1';
const ANALYTICS_KEY = 'party-games-analytics-v1';
const FONT_REGULAR = 'Sora_400Regular';
const FONT_SEMIBOLD = 'Sora_600SemiBold';
const FONT_BOLD = 'Sora_700Bold';
const FONT_EXTRABOLD = 'Sora_800ExtraBold';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const defaultPlayerLabel = (language, index) => {
  const labels = { pt: 'Jogador', en: 'Player', zh: 'çŽ©å®¶', hi: 'à¤–à¤¿à¤²à¤¾à¤¡à¤¼à¥€', es: 'Jugador', fr: 'Joueur', ar: 'Ù„Ø§Ø¹Ø¨', bn: 'à¦–à§‡à¦²à§‹à§Ÿà¦¾à§œ', ru: 'Ð˜Ð³Ñ€Ð¾Ðº', ur: 'Ú©Ú¾Ù„Ø§Ú‘ÛŒ' };
  return `${labels[language] ?? labels.en} ${index + 1}`;
};
const createPlayer = (index) => ({ id: `player-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`, name: defaultPlayerLabel(getDeviceLanguage(), index) });
const createPlayers = (total) => Array.from({ length: total }, (_, index) => createPlayer(index));
const createDefaultGameOptions = () => ({
  impostor: { wordMode: 'normal' },
  'cidade-dorme': { startingPhase: 'noite' },
  'mimica-relampago': { timer: '60', rounds: '6', category: 'livre' },
  'passa-a-bomba': { timer: '30' },
  'palavra-proibida': { category: 'geral', timer: '45' },
  'quem-sou-eu': { category: 'personagens' },
  'eu-nunca': { mode: 'misto' },
  'verdade-ou-desafio': { type: 'verdade', intensity: 'leve', audience: 'misto', timer: '30' },
  'batalha-de-frases': { theme: 'cantada brega', rounds: '5' },
  'se-fosse-voce': { mode: 'misto' },
  'quem-da-mesa': { mode: 'divertido' },
  'pergunta-pesada': { intensity: 'leve' },
  'quem-mais-provavel': { mode: 'amigos' },
});
const AUTO_SYNC_ROLE_GAMES = ['impostor', 'cidade-dorme', 'passa-a-bomba', 'verdade-ou-desafio'];
const createDefaultAppSettings = () => ({
  haptics: true,
  reducedMotion: false,
  soundEnabled: true,
  highContrast: false,
  onboardingSeen: false,
  analyticsConsent: false,
});

function getRoleIcon(roleId) {
  const iconMap = {
    civis: 'account-group-outline',
    impostores: 'incognito-circle',
    cidadaos: 'account-heart-outline',
    assassinos: 'knife-military',
    anjos: 'angel-outline',
    detetives: 'magnify',
    mafiosos: 'target-account',
    xerife: 'badge-account-horizontal-outline',
    agentes: 'shield-account-outline',
    infiltrados: 'briefcase-search-outline',
    observadores: 'eye-outline',
    participantes: 'account-group-outline',
  };

  return iconMap[roleId] ?? 'account-outline';
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState('auto');
  const [screen, setScreen] = useState('home');
  const [history, setHistory] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [roleConfigs, setRoleConfigs] = useState(() => BASE_GAMES.reduce((acc, game) => ({ ...acc, [game.id]: createRoleConfig(game) }), {}));
  const [playersByGame, setPlayersByGame] = useState(() => BASE_GAMES.reduce((acc, game) => ({ ...acc, [game.id]: createPlayers(getTotalRoles(createRoleConfig(game))) }), {}));
  const [playerTargetByGame, setPlayerTargetByGame] = useState(() => BASE_GAMES.reduce((acc, game) => ({ ...acc, [game.id]: String(getTotalRoles(createRoleConfig(game))) }), {}));
  const [impostorCategoryByGame, setImpostorCategoryByGame] = useState({ impostor: 'todos' });
  const [gameOptions, setGameOptions] = useState(createDefaultGameOptions);
  const [appSettings, setAppSettings] = useState(createDefaultAppSettings);
  const [appReady, setAppReady] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [cardPressed, setCardPressed] = useState(false);
  const [revealedIds, setRevealedIds] = useState({});
  const [showFinalRoles, setShowFinalRoles] = useState(false);
  const [impostorWord, setImpostorWord] = useState('');
  const [cityRound, setCityRound] = useState({ phase: 'noite', cycle: 1, eliminatedIds: {} });
  const [roundHistory, setRoundHistory] = useState([]);
  const [currentRoundKey, setCurrentRoundKey] = useState(null);
  const [missionOutcome, setMissionOutcome] = useState('success');
  const [scoreBoard, setScoreBoard] = useState({});
  const [scoreRound, setScoreRound] = useState({ current: 1, letter: 'A', prompt: 'Animais', detail: '', type: '' });
  const [roundSecondsLeft, setRoundSecondsLeft] = useState(null);
  const [activeScorePlayerIndex, setActiveScorePlayerIndex] = useState(0);
  const [impostorStarterName, setImpostorStarterName] = useState('');
  const [bombExploded, setBombExploded] = useState(false);
  const [bombPassCount, setBombPassCount] = useState(0);
  const [truthOrDareTimedOut, setTruthOrDareTimedOut] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [notice, setNotice] = useState(null);
  const [gameHelpVisible, setGameHelpVisible] = useState(false);
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const [rouletteState, setRouletteState] = useState({ visible: false, title: '', items: [], currentIndex: 0, accent: '#fb4ecb' });
  const revealScale = useRef(new Animated.Value(1)).current;
  const revealOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslate = useRef(new Animated.Value(0)).current;
  const rouletteOpacity = useRef(new Animated.Value(0)).current;
  const rouletteTranslate = useRef(new Animated.Value(10)).current;
  const bombPulseScale = useRef(new Animated.Value(1)).current;
  const rouletteRunRef = useRef(0);
  const bombPulseLoopRef = useRef(null);

  const resolvedLanguage = language === 'auto' ? getDeviceLanguage() : language;
  const isRTL = isRtlLanguage(resolvedLanguage);
  const t = useMemo(() => createTranslator(resolvedLanguage), [resolvedLanguage]);
  const content = useMemo(() => getLocalizedContent(resolvedLanguage), [resolvedLanguage]);
  const games = useMemo(() => localizeGames(t), [t]);
  const visibleGames = useMemo(() => games.filter((game) => ['impostor', 'cidade-dorme', 'passa-a-bomba', 'verdade-ou-desafio'].includes(game.id)), [games]);
  const selectedGame = useMemo(() => (selectedGameId ? games.find((game) => game.id === selectedGameId) ?? games[0] : null), [selectedGameId, games]);
  const selectedConfig = selectedGameId ? roleConfigs[selectedGameId] : null;
  const selectedPlayers = selectedGameId ? playersByGame[selectedGameId] : [];
  const selectedGameOptions = selectedGameId ? gameOptions[selectedGameId] ?? {} : {};
  const currentAssignment = assignments[currentRevealIndex];
  const currentScorePlayer = assignments[activeScorePlayerIndex] ?? null;
  const totalRoles = selectedConfig ? getTotalRoles(selectedConfig) : 0;
  const roomLabel = useMemo(() => (selectedGame ? getRoomName(selectedGame.id, roundHistory.length + assignments.length + currentRevealIndex) : ''), [selectedGame, roundHistory.length, assignments.length, currentRevealIndex]);
  const gameHelpItems = useMemo(() => getGameHelpItems(), [selectedGame?.id, selectedGameOptions.mode, selectedGameOptions.infiltratedMode, t]);
  const localizedImpostorCategories = useMemo(
    () => IMPOSTOR_CATEGORIES.map((category) => ({ ...category, localizedLabel: t(`categoryNames.${category.id}`) })),
    [t],
  );
  const languageOptions = useMemo(
    () => [
      { value: 'auto', label: t('automatic') },
      ...SUPPORTED_LANGUAGE_ORDER.map((code) => ({
        value: code,
        label: t(
          {
            pt: 'portuguese',
            en: 'english',
            zh: 'chinese',
            hi: 'hindi',
            es: 'spanish',
            fr: 'french',
            ar: 'arabic',
            bn: 'bengali',
            ru: 'russian',
            ur: 'urdu',
          }[code],
        ),
      })),
    ],
    [t],
  );
  const playerStats = useMemo(() => buildPlayerStats(roundHistory, t, t('player')), [roundHistory, t]);
  const rankedScoreEntries = useMemo(
    () =>
      assignments
        .map((item, index) => ({
          ...item,
          originalIndex: index,
          score: Number(scoreBoard[item.id] ?? 0),
        }))
        .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex || a.name.localeCompare(b.name)),
    [assignments, scoreBoard],
  );
  const scoreLeaders = useMemo(() => {
    if (!rankedScoreEntries.length) return [];
    const topScore = rankedScoreEntries[0].score;
    return rankedScoreEntries.filter((item) => item.score === topScore);
  }, [rankedScoreEntries]);
  const analyticsSummary = useMemo(
    () => ({
      opens: getAnalyticsCount('open_game'),
      starts: getAnalyticsCount('draw_started'),
      finishes: getAnalyticsCount('round_finished'),
      premium: getAnalyticsCount('premium_open') + getAnalyticsCount('premium_cta'),
      onboarding: getAnalyticsCount('finish_onboarding'),
    }),
    [analytics],
  );
  const [fontsLoaded] = useFonts({
    [FONT_REGULAR]: Sora_400Regular,
    [FONT_SEMIBOLD]: Sora_600SemiBold,
    [FONT_BOLD]: Sora_700Bold,
    [FONT_EXTRABOLD]: Sora_800ExtraBold,
  });

  function pushDiagnostic(level, event, details = '') {
    setDiagnostics((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          level,
          event,
          details,
          timestamp: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 40),
    );
  }

  function trackEvent(event, details = '') {
    if (!appSettings.analyticsConsent) return;
    setAnalytics((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          event,
          details,
          timestamp: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 120),
    );
  }

  function getAnalyticsCount(event) {
    return analytics.filter((item) => item.event === event).length;
  }

  function showNotice(message, tone = 'info') {
    setNotice({ message, tone });
  }

  function handleAppError(event, error, tone = 'error') {
    const details = error instanceof Error ? error.message : String(error ?? '');
    pushDiagnostic(tone, event, details);
    showNotice(t('errorGeneric'), tone);
  }

  useEffect(() => {
    async function loadSavedState() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.language) setLanguage(saved.language);
          if (saved.roleConfigs) setRoleConfigs(saved.roleConfigs);
          if (saved.playersByGame) setPlayersByGame(saved.playersByGame);
          if (saved.playerTargetByGame) setPlayerTargetByGame(saved.playerTargetByGame);
          if (saved.impostorCategoryByGame) setImpostorCategoryByGame(saved.impostorCategoryByGame);
          if (saved.gameOptions) setGameOptions({ ...createDefaultGameOptions(), ...saved.gameOptions });
          if (saved.appSettings) setAppSettings({ ...createDefaultAppSettings(), ...saved.appSettings });
          if (saved.roundHistory) setRoundHistory(saved.roundHistory);
          if (saved.analytics) setAnalytics(saved.analytics);
        }
      } catch (error) {
        pushDiagnostic('error', 'load-state', error instanceof Error ? error.message : String(error ?? ''));
        showNotice(t('errorLoadState'));
      }

      try {
        const savedDiagnostics = await AsyncStorage.getItem(DIAGNOSTICS_KEY);
        if (savedDiagnostics) {
          setDiagnostics(JSON.parse(savedDiagnostics));
        }
      } catch { }
      setAppReady(true);
    }
    loadSavedState();
  }, []);

  useEffect(() => {
    if (!appReady) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ language, roleConfigs, playersByGame, playerTargetByGame, impostorCategoryByGame, gameOptions, appSettings, roundHistory, analytics }),
    ).catch((error) => {
      pushDiagnostic('warn', 'save-state', error instanceof Error ? error.message : String(error ?? ''));
    });
  }, [appReady, language, roleConfigs, playersByGame, playerTargetByGame, impostorCategoryByGame, gameOptions, appSettings, roundHistory, analytics]);

  useEffect(() => {
    if (!appReady) return;
    AsyncStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(diagnostics)).catch(() => { });
  }, [appReady, diagnostics]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (screen !== 'reveal') return;
    if (appSettings.reducedMotion) {
      revealOpacity.setValue(1);
      revealScale.setValue(1);
      return;
    }
    revealOpacity.setValue(0);
    revealScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(revealOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(revealScale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 70 }),
    ]).start();
  }, [screen, currentRevealIndex, appSettings.reducedMotion, revealOpacity, revealScale]);

  useEffect(() => {
    if (!appReady) return;
    trackEvent('screen_view', screen);
  }, [appReady, screen]);

  useEffect(() => {
    if (appSettings.reducedMotion) {
      screenOpacity.setValue(1);
      screenTranslate.setValue(0);
      return;
    }

    screenOpacity.setValue(0);
    screenTranslate.setValue(18);
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(screenTranslate, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
    ]).start();
  }, [screen, appSettings.reducedMotion, screenOpacity, screenTranslate]);

  useEffect(() => {
    if (screen === 'final' && !isBoardGame(selectedGame?.id)) saveRoundToHistory();
  }, [screen]);

  useEffect(() => {
    const gameId = selectedGame?.id;
    const timedRound = gameId === 'passa-a-bomba' || gameId === 'verdade-ou-desafio';
    if (screen !== 'final' || !timedRound || !currentRoundKey || rouletteState.visible) {
      setRoundSecondsLeft(null);
      setTruthOrDareTimedOut(false);
      return undefined;
    }

    const totalSeconds = Number(selectedGameOptions.timer ?? '30');
    const activePlayerId = currentScorePlayer?.id ?? null;
    let endedByTimer = false;

    setBombExploded(false);
    setTruthOrDareTimedOut(false);
    setRoundSecondsLeft(totalSeconds);

    const intervalId = setInterval(() => {
      setRoundSecondsLeft((current) => {
        if (current == null) return null;
        if (current <= 1) {
          clearInterval(intervalId);
          if (!endedByTimer) {
            endedByTimer = true;
            triggerHaptic('impact');
            if (gameId === 'passa-a-bomba') {
              setBombExploded(true);
            } else {
              setTruthOrDareTimedOut(true);
              if (activePlayerId) {
                setScoreBoard((currentBoard) => ({
                  ...currentBoard,
                  [activePlayerId]: Number(currentBoard[activePlayerId] ?? 0) - 1,
                }));
              }
            }
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [screen, selectedGame?.id, selectedGameOptions.timer, currentRoundKey, rouletteState.visible]);

  useEffect(() => {
    const shouldPulseBomb =
      selectedGame?.id === 'passa-a-bomba' &&
      screen === 'final' &&
      Boolean(currentRoundKey) &&
      !bombExploded &&
      !rouletteState.visible &&
      !appSettings.reducedMotion;

    if (!shouldPulseBomb) {
      bombPulseLoopRef.current?.stop?.();
      bombPulseLoopRef.current = null;
      Animated.spring(bombPulseScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 90,
      }).start();
      return undefined;
    }

    bombPulseScale.setValue(1);
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bombPulseScale, { toValue: 1.12, duration: 520, useNativeDriver: true }),
        Animated.timing(bombPulseScale, { toValue: 0.94, duration: 520, useNativeDriver: true }),
      ]),
    );
    bombPulseLoopRef.current = pulseLoop;
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      bombPulseLoopRef.current = null;
      bombPulseScale.setValue(1);
    };
  }, [screen, selectedGame?.id, currentRoundKey, bombExploded, rouletteState.visible, appSettings.reducedMotion, bombPulseScale]);

  useEffect(() => {
    if (selectedGame?.id !== 'passa-a-bomba' || !bombExploded || appSettings.reducedMotion) return;
    bombPulseLoopRef.current?.stop?.();
    bombPulseLoopRef.current = null;
    Animated.sequence([
      Animated.timing(bombPulseScale, { toValue: 1.22, duration: 120, useNativeDriver: true }),
      Animated.spring(bombPulseScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
    ]).start();
  }, [selectedGame?.id, bombExploded, appSettings.reducedMotion, bombPulseScale]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setBackgroundColorAsync('#000000').catch(() => { });
    NavigationBar.setButtonStyleAsync('light').catch(() => { });
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => { });
    const hidden = screen === 'reveal';
    NavigationBar.setVisibilityAsync(hidden ? 'hidden' : 'visible').catch(() => { });
  }, [screen]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (history.length === 0 || screen === 'home') return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [history, screen]);

  function triggerHaptic(kind = 'selection') {
    if (!appSettings.haptics) return;
    if (kind === 'success') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    if (kind === 'impact') return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    return Haptics.selectionAsync().catch(() => { });
  }

  function goTo(nextScreen) {
    triggerHaptic('selection');
    setGameHelpVisible(false);
    setHomeMenuOpen(false);
    trackEvent('navigate', `${screen}->${nextScreen}`);
    setHistory((current) => [...current, screen]);
    setScreen(nextScreen);
  }

  function goBack() {
    triggerHaptic('selection');
    setGameHelpVisible(false);
    setHomeMenuOpen(false);
    setHistory((current) => {
      const nextHistory = [...current];
      const previous = nextHistory.pop();
      if (previous) setScreen(previous);
      return nextHistory;
    });
  }

  function resetRoundState() {
    setAssignments([]);
    setCurrentRevealIndex(0);
    setCardPressed(false);
    setRevealedIds({});
    setShowFinalRoles(false);
    setImpostorWord('');
    setImpostorStarterName('');
    setCityRound({ phase: 'noite', cycle: 1, eliminatedIds: {} });
    setMissionOutcome('success');
    setScoreBoard({});
    setScoreRound({ current: 1, letter: 'A', prompt: 'Animais', detail: '', type: '' });
    setActiveScorePlayerIndex(0);
    setBombExploded(false);
    setBombPassCount(0);
    setTruthOrDareTimedOut(false);
    setRoundSecondsLeft(null);
    setCurrentRoundKey(null);
  }

  function goHome() {
    setHistory([]);
    setScreen('home');
    setSelectedGameId(null);
    setGameHelpVisible(false);
    setHomeMenuOpen(false);
    resetRoundState();
  }

  async function clearSavedData() {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, DIAGNOSTICS_KEY]);
      setRoleConfigs(BASE_GAMES.reduce((acc, game) => ({ ...acc, [game.id]: createRoleConfig(game) }), {}));
      setPlayersByGame(BASE_GAMES.reduce((acc, game) => ({ ...acc, [game.id]: createPlayers(getTotalRoles(createRoleConfig(game))) }), {}));
      setPlayerTargetByGame(BASE_GAMES.reduce((acc, game) => ({ ...acc, [game.id]: String(getTotalRoles(createRoleConfig(game))) }), {}));
      setImpostorCategoryByGame({ impostor: 'todos' });
      setGameOptions(createDefaultGameOptions());
      setAppSettings(createDefaultAppSettings());
      setRoundHistory([]);
      setAnalytics([]);
      setDiagnostics([]);
      setCurrentRoundKey(null);
      showNotice(t('dataCleared'), 'success');
      goHome();
    } catch (error) {
      handleAppError('clear-data', error);
    }
  }

  function openGame(gameId) {
    trackEvent('open_game', gameId);
    setSelectedGameId(gameId);
    setGameHelpVisible(false);
    resetRoundState();
    goTo('config');
  }

  function syncPlayersWithRoleTotal(gameId, nextTotal) {
    setPlayersByGame((current) => {
      const currentPlayers = current[gameId] ?? [];
      const nextPlayers = Array.from({ length: nextTotal }, (_, index) => currentPlayers[index] ?? createPlayer(index)).map((player, index) => ({
        ...player,
        name: player.name?.trim?.() ? player.name : defaultPlayerLabel(resolvedLanguage, index),
      }));
      return { ...current, [gameId]: nextPlayers };
    });
    setPlayerTargetByGame((current) => ({ ...current, [gameId]: String(nextTotal) }));
  }

  function updateRoleCount(roleId, value) {
    if (!selectedGame) return;
    const role = selectedGame.roles.find((item) => item.id === roleId);
    const parsed = Number(value);
    const safeValue = Number.isNaN(parsed) ? role.min : clamp(parsed, role.min, role.max);
    const nextConfig = { ...selectedConfig, [roleId]: safeValue };
    setRoleConfigs((current) => ({ ...current, [selectedGame.id]: nextConfig }));
    if (AUTO_SYNC_ROLE_GAMES.includes(selectedGame.id)) {
      syncPlayersWithRoleTotal(selectedGame.id, getTotalRoles(nextConfig));
    }
  }

  function incrementRole(roleId) {
    if (!selectedGame) return;
    triggerHaptic('selection');
    const role = selectedGame.roles.find((item) => item.id === roleId);
    updateRoleCount(roleId, String(clamp((selectedConfig?.[roleId] ?? role.defaultCount) + 1, role.min, role.max)));
  }

  function decrementRole(roleId) {
    if (!selectedGame) return;
    triggerHaptic('selection');
    const role = selectedGame.roles.find((item) => item.id === roleId);
    updateRoleCount(roleId, String(clamp((selectedConfig?.[roleId] ?? role.defaultCount) - 1, role.min, role.max)));
  }

  function setPlayerTarget(value) {
    if (!selectedGame) return;
    setPlayerTargetByGame((current) => ({ ...current, [selectedGame.id]: value.replace(/[^0-9]/g, '') }));
  }

  function syncPlayersToTarget() {
    if (!selectedGame) return;
    triggerHaptic('selection');
    const rawValue = Number(playerTargetByGame[selectedGame.id] || 0);
    const safeTarget = Math.max(rawValue, selectedGame.minPlayers);
    if (safeTarget !== rawValue) showNotice(`${t('minPlayersNotice')} ${safeTarget}`, 'info');
    setPlayersByGame((current) => {
      const nextPlayers = [...current[selectedGame.id]];
      if (safeTarget > nextPlayers.length) for (let index = nextPlayers.length; index < safeTarget; index += 1) nextPlayers.push(createPlayer(index));
      else nextPlayers.length = safeTarget;
      return { ...current, [selectedGame.id]: nextPlayers };
    });
    setPlayerTargetByGame((current) => ({ ...current, [selectedGame.id]: String(safeTarget) }));
  }

  function updatePlayerName(playerId, value) {
    if (!selectedGame) return;
    setPlayersByGame((current) => ({ ...current, [selectedGame.id]: current[selectedGame.id].map((player) => player.id === playerId ? { ...player, name: value } : player) }));
  }

  function addPlayer() {
    if (!selectedGame) return;
    triggerHaptic('selection');
    setPlayersByGame((current) => {
      const nextPlayers = [...current[selectedGame.id], createPlayer(current[selectedGame.id].length)];
      setPlayerTargetByGame((targetCurrent) => ({ ...targetCurrent, [selectedGame.id]: String(nextPlayers.length) }));
      return { ...current, [selectedGame.id]: nextPlayers };
    });
  }

  function removePlayer(playerId) {
    if (!selectedGame) return;
    triggerHaptic('selection');
    setPlayersByGame((current) => {
      const filteredPlayers = current[selectedGame.id].filter((player) => player.id !== playerId);
      const nextPlayers = filteredPlayers.length > 0 ? filteredPlayers : [createPlayer(0)];
      setPlayerTargetByGame((targetCurrent) => ({ ...targetCurrent, [selectedGame.id]: String(nextPlayers.length) }));
      return { ...current, [selectedGame.id]: nextPlayers };
    });
  }

  function restorePreset() {
    if (!selectedGame) return;
    triggerHaptic('selection');
    const presetConfig = createRoleConfig(selectedGame);
    const total = getTotalRoles(presetConfig);
    setRoleConfigs((current) => ({ ...current, [selectedGame.id]: presetConfig }));
    setPlayersByGame((current) => ({ ...current, [selectedGame.id]: createPlayers(total) }));
    setPlayerTargetByGame((current) => ({ ...current, [selectedGame.id]: String(total) }));
  }

  function restoreRolesOnly() {
    if (!selectedGame) return;
    triggerHaptic('selection');
    const presetConfig = createRoleConfig(selectedGame);
    const total = getTotalRoles(presetConfig);
    setRoleConfigs((current) => ({ ...current, [selectedGame.id]: presetConfig }));
    syncPlayersWithRoleTotal(selectedGame.id, total);
  }

  function setGameOption(gameId, key, value) {
    triggerHaptic('selection');
    setGameOptions((current) => ({ ...current, [gameId]: { ...(current[gameId] ?? {}), [key]: value } }));
  }

  function isBoardGame(gameId) {
    return ['mimica-relampago', 'passa-a-bomba', 'palavra-proibida', 'eu-nunca', 'verdade-ou-desafio', 'batalha-de-frases', 'se-fosse-voce', 'quem-da-mesa', 'pergunta-pesada', 'quem-mais-provavel'].includes(gameId);
  }

  function isBombGame(gameId) {
    return gameId === 'passa-a-bomba';
  }

  function isSoloScoreGame(gameId) {
    return gameId === 'verdade-ou-desafio';
  }

  function isIdentityGame(gameId) {
    return gameId === 'quem-sou-eu';
  }

  function buildScorePlayers(players) {
    return players.map((player, index) => ({
      id: `${player.id}-${index}`,
      name: player.name.trim() || defaultPlayerLabel(resolvedLanguage, index),
      role: t('role.participant'),
      secretWord: null,
    }));
  }

  function createScoreBoardFromAssignments(items) {
    return Object.fromEntries(items.map((item) => [item.id, 0]));
  }

  function pickCharadesPrompt() {
    return CHARADES_PROMPTS[Math.floor(Math.random() * CHARADES_PROMPTS.length)];
  }

  function shuffleSample(list, limit = 8) {
    return [...list].sort(() => Math.random() - 0.5).slice(0, limit);
  }

  function getRouletteCandidates(gameId) {
    if (gameId === 'impostor') {
      const categoryId = impostorCategoryByGame.impostor;
      if (!categoryId || categoryId === 'todos') return shuffleSample(IMPOSTOR_WORD_BANK, 10);
      const category = IMPOSTOR_CATEGORIES.find((item) => item.id === categoryId);
      return shuffleSample(category?.words?.length ? category.words : IMPOSTOR_WORD_BANK, 10);
    }
    if (gameId === 'mimica-relampago') return shuffleSample(CHARADES_PACKS[selectedGameOptions.category ?? 'livre'] ?? CHARADES_PACKS.livre, 10);
    if (gameId === 'passa-a-bomba') return shuffleSample(BOMB_CATEGORIES, 8);
    if (gameId === 'palavra-proibida') {
      const pack = TABOO_PACKS[selectedGameOptions.category ?? 'geral'] ?? TABOO_PACKS.geral;
      return shuffleSample(pack.map((item) => item.word), 8);
    }
    if (gameId === 'eu-nunca') return shuffleSample(NEVER_PACKS[selectedGameOptions.mode ?? 'misto'] ?? NEVER_PACKS.misto, 8);
    if (gameId === 'verdade-ou-desafio') {
      const intensity = selectedGameOptions.intensity ?? 'leve';
      const type = selectedGameOptions.type ?? 'verdade';
      const audience = selectedGameOptions.audience ?? 'misto';
      const truthPool = TRUTH_PACKS[audience] ?? TRUTH_PACKS[intensity] ?? TRUTH_PACKS.leve;
      const darePool = DARE_PACKS[audience] ?? DARE_PACKS[intensity] ?? DARE_PACKS.leve;
      return shuffleSample(type === 'desafio' ? darePool : truthPool, 8);
    }
    if (gameId === 'batalha-de-frases') return shuffleSample(PICKUP_BATTLE_THEMES, 6);
    if (gameId === 'se-fosse-voce') return shuffleSample(WHAT_WOULD_YOU_DO_PACKS[selectedGameOptions.mode ?? 'misto'] ?? WHAT_WOULD_YOU_DO_PACKS.misto, 8);
    if (gameId === 'quem-da-mesa') return shuffleSample(WHO_AT_TABLE_PACKS[selectedGameOptions.mode ?? 'divertido'] ?? WHO_AT_TABLE_PACKS.divertido, 8);
    if (gameId === 'pergunta-pesada') return shuffleSample(DEEP_QUESTIONS_PACKS[selectedGameOptions.intensity ?? 'leve'] ?? DEEP_QUESTIONS_PACKS.leve, 8);
    if (gameId === 'quem-mais-provavel') return shuffleSample(MOST_LIKELY_PACKS[selectedGameOptions.mode ?? 'amigos'] ?? MOST_LIKELY_PACKS.amigos, 8);
    return [];
  }

  async function runRoulette(title, winner, accent, items = []) {
    const safeWinner = String(winner ?? '').trim();
    const baseItems = items.filter(Boolean).map((item) => String(item));
    const pool = baseItems.includes(safeWinner) ? baseItems : [...baseItems, safeWinner].filter(Boolean);
    if (!safeWinner || pool.length === 0) return;

    if (appSettings.reducedMotion) {
      setRouletteState({ visible: true, title, items: pool, currentIndex: pool.indexOf(safeWinner), accent });
      rouletteOpacity.setValue(1);
      rouletteTranslate.setValue(0);
      await new Promise((resolve) => setTimeout(resolve, 350));
      setRouletteState((current) => ({ ...current, visible: false }));
      return;
    }

    const runId = Date.now();
    rouletteRunRef.current = runId;
    rouletteOpacity.setValue(0);
    rouletteTranslate.setValue(10);
    setRouletteState({ visible: true, title, items: pool, currentIndex: 0, accent });

    Animated.parallel([
      Animated.timing(rouletteOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(rouletteTranslate, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    const steps = pool.length * 2 + Math.floor(Math.random() * pool.length);
    for (let step = 0; step < steps; step += 1) {
      if (rouletteRunRef.current !== runId) return;
      setRouletteState((current) => ({ ...current, currentIndex: step % pool.length }));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 70 + step * 6));
    }

    const winnerIndex = pool.indexOf(safeWinner);
    if (rouletteRunRef.current !== runId) return;
    setRouletteState((current) => ({ ...current, currentIndex: winnerIndex >= 0 ? winnerIndex : 0 }));
    await new Promise((resolve) => setTimeout(resolve, 520));
    if (rouletteRunRef.current !== runId) return;

    await new Promise((resolve) =>
      Animated.parallel([
        Animated.timing(rouletteOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(rouletteTranslate, { toValue: -8, duration: 180, useNativeDriver: true }),
      ]).start(() => resolve()),
    );

    if (rouletteRunRef.current === runId) {
      setRouletteState((current) => ({ ...current, visible: false }));
    }
  }

  function buildIdentityAssignments(players) {
    const category = selectedGameOptions.category ?? 'personagens';
    const source = WHO_AM_I_PACKS[category] ?? WHO_AM_I_PACKS.personagens;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return players.map((player, index) => ({
      id: `${player.id}-${index}`,
      name: player.name.trim() || defaultPlayerLabel(resolvedLanguage, index),
      role: t('role.participant'),
      secretWord: shuffled[index % shuffled.length],
    }));
  }

  function getBoardPromptState(gameId) {
    if (gameId === 'mimica-relampago') {
      return {
        prompt: pickCharadesPrompt(),
        detail: `${selectedGameOptions.timer ?? '60'}s`,
        type: selectedGameOptions.category ?? 'livre',
      };
    }
    if (gameId === 'passa-a-bomba') {
      return {
        prompt: pickRandom(BOMB_CATEGORIES),
        detail: '',
        type: '',
      };
    }
    if (gameId === 'palavra-proibida') {
      const pack = TABOO_PACKS[selectedGameOptions.category ?? 'geral'] ?? TABOO_PACKS.geral;
      const picked = pickRandom(pack);
      return {
        prompt: picked.word,
        detail: picked.forbidden.join(' - '),
        type: selectedGameOptions.category ?? 'geral',
      };
    }
    if (gameId === 'eu-nunca') {
      const mode = selectedGameOptions.mode ?? 'misto';
      return {
        prompt: pickRandom(NEVER_PACKS[mode] ?? NEVER_PACKS.misto),
        detail: mode,
        type: mode,
      };
    }
    if (gameId === 'verdade-ou-desafio') {
      const intensity = selectedGameOptions.intensity ?? 'leve';
      const type = selectedGameOptions.type ?? 'verdade';
      const audience = selectedGameOptions.audience ?? 'misto';
      const audienceAwareTruth = TRUTH_PACKS[audience] ?? TRUTH_PACKS[intensity] ?? TRUTH_PACKS.leve;
      const audienceAwareDare = DARE_PACKS[audience] ?? DARE_PACKS[intensity] ?? DARE_PACKS.leve;
      const list = type === 'desafio' ? audienceAwareDare : audienceAwareTruth;
      return {
        prompt: pickRandom(list),
        detail: '',
        type,
      };
    }
    if (gameId === 'batalha-de-frases') {
      return {
        prompt: selectedGameOptions.theme ?? pickRandom(PICKUP_BATTLE_THEMES),
        detail: `${selectedGameOptions.rounds ?? '5'} ${t('round')}`,
        type: 'battle',
      };
    }
    if (gameId === 'se-fosse-voce') {
      const mode = selectedGameOptions.mode ?? 'misto';
      return {
        prompt: pickRandom(WHAT_WOULD_YOU_DO_PACKS[mode] ?? WHAT_WOULD_YOU_DO_PACKS.misto),
        detail: mode,
        type: mode,
      };
    }
    if (gameId === 'quem-da-mesa') {
      const mode = selectedGameOptions.mode ?? 'divertido';
      return {
        prompt: pickRandom(WHO_AT_TABLE_PACKS[mode] ?? WHO_AT_TABLE_PACKS.divertido),
        detail: mode,
        type: mode,
      };
    }
    if (gameId === 'pergunta-pesada') {
      const intensity = selectedGameOptions.intensity ?? 'leve';
      return {
        prompt: pickRandom(DEEP_QUESTIONS_PACKS[intensity] ?? DEEP_QUESTIONS_PACKS.leve),
        detail: intensity,
        type: intensity,
      };
    }
    if (gameId === 'quem-mais-provavel') {
      const mode = selectedGameOptions.mode ?? 'amigos';
      return {
        prompt: pickRandom(MOST_LIKELY_PACKS[mode] ?? MOST_LIKELY_PACKS.amigos),
        detail: mode,
        type: mode,
      };
    }
    return { prompt: 'Animais', detail: '', type: '' };
  }

  function updateScore(playerId, delta) {
    triggerHaptic('selection');
    setScoreBoard((current) => ({
      ...current,
      [playerId]:
        selectedGame?.id === 'verdade-ou-desafio'
          ? Number(current[playerId] ?? 0) + delta
          : Math.max(0, Number(current[playerId] ?? 0) + delta),
    }));
  }

  function passBombToNextPlayer() {
    if (selectedGame?.id !== 'passa-a-bomba' || bombExploded || assignments.length === 0) return;
    triggerHaptic('selection');
    setActiveScorePlayerIndex((current) => (current + 1) % assignments.length);
    setRoundSecondsLeft((current) => (current == null ? current : current + 6));
    setBombPassCount((current) => current + 1);
  }

  async function advanceScoreRound() {
    if (!currentRoundKey && selectedGame?.id === 'verdade-ou-desafio') return;
    triggerHaptic('selection');
    if (currentRoundKey) saveRoundToHistory();
    setRoundSecondsLeft(null);
    setTruthOrDareTimedOut(false);
    const nextBoardState = getBoardPromptState(selectedGame?.id);
    await runRoulette(t('draw'), nextBoardState.prompt, selectedGame?.themeColor ?? '#fb4ecb', getRouletteCandidates(selectedGame?.id));
    setCurrentRoundKey(`${selectedGame?.id ?? 'score'}-${Date.now()}`);
    setBombExploded(false);
    if (selectedGame?.id === 'passa-a-bomba') setBombPassCount(0);
    if (selectedGame?.id === 'verdade-ou-desafio' && assignments.length) {
      setActiveScorePlayerIndex((current) => (current + 1) % assignments.length);
    }
    setScoreRound((current) => ({
      ...current,
      ...nextBoardState,
      current: current.current + 1,
    }));
  }

  function toggleSetting(key) {
    triggerHaptic('selection');
    trackEvent('toggle_setting', key);
    setAppSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  function finishTruthOrDareRound() {
    if (selectedGame?.id !== 'verdade-ou-desafio' || !currentRoundKey) return;
    triggerHaptic('success');
    saveRoundToHistory();
    setRoundSecondsLeft(null);
    setTruthOrDareTimedOut(false);
  }

  function finishOnboarding() {
    triggerHaptic('selection');
    trackEvent('finish_onboarding', resolvedLanguage);
    setAppSettings((current) => ({ ...current, onboardingSeen: true }));
  }

  function advanceCityPhase() {
    triggerHaptic('selection');
    setCityRound((current) => ({
      ...current,
      phase: current.phase === 'noite' ? 'dia' : 'noite',
      cycle: current.phase === 'dia' ? current.cycle + 1 : current.cycle,
    }));
  }

  function toggleEliminatedPlayer(playerId) {
    triggerHaptic('selection');
    setCityRound((current) => ({
      ...current,
      eliminatedIds: {
        ...current.eliminatedIds,
        [playerId]: !current.eliminatedIds[playerId],
      },
    }));
  }

  async function startDraw() {
    if (!selectedGame || !selectedConfig) return;
    const cleanPlayers = selectedPlayers.map((player, index) => ({ ...player, name: player.name.trim() || defaultPlayerLabel(resolvedLanguage, index) }));
    if (cleanPlayers.length < selectedGame.minPlayers) {
      showNotice(t('errorNotEnoughPlayers'));
      pushDiagnostic('warn', 'start-draw-not-enough-players', `${selectedGame.id}:${cleanPlayers.length}`);
      trackEvent('draw_blocked', `${selectedGame.id}:players`);
      return;
    }
    const needsRoleMatch = !isBoardGame(selectedGame.id) && !isIdentityGame(selectedGame.id);
    if (needsRoleMatch && cleanPlayers.length !== totalRoles) {
      showNotice(t('errorRoleMismatch'));
      pushDiagnostic('warn', 'start-draw-role-mismatch', `${selectedGame.id}:${cleanPlayers.length}/${totalRoles}`);
      trackEvent('draw_blocked', `${selectedGame.id}:roles`);
      return;
    }
    if (isBoardGame(selectedGame.id)) {
      const scoreAssignments = buildScorePlayers(cleanPlayers);
      const boardState = getBoardPromptState(selectedGame.id);
      await runRoulette(t('draw'), boardState.prompt, selectedGame.themeColor, getRouletteCandidates(selectedGame.id));
      triggerHaptic('impact');
      trackEvent('draw_started', `${selectedGame.id}:${cleanPlayers.length}`);
      setAssignments(scoreAssignments);
      setScoreBoard(createScoreBoardFromAssignments(scoreAssignments));
      setScoreRound({
        current: 1,
        letter: 'A',
        prompt: boardState.prompt,
        detail: boardState.detail,
        type: boardState.type,
      });
      setActiveScorePlayerIndex(0);
      setBombExploded(false);
      if (selectedGame.id === 'passa-a-bomba') setBombPassCount(0);
      setCurrentRoundKey(`${selectedGame.id}-${Date.now()}`);
      setShowFinalRoles(false);
      goTo('final');
      return;
    }
    if (isIdentityGame(selectedGame.id)) {
      triggerHaptic('impact');
      trackEvent('draw_started', `${selectedGame.id}:${cleanPlayers.length}`);
      setAssignments(buildIdentityAssignments(cleanPlayers));
      setCurrentRoundKey(`${selectedGame.id}-${Date.now()}`);
      setCurrentRevealIndex(0);
      setCardPressed(false);
      setRevealedIds({});
      setShowFinalRoles(false);
      goTo('reveal');
      return;
    }
    const selectedWord =
      selectedGame.id === 'impostor'
        ? pickImpostorWord({
          categoryId: impostorCategoryByGame.impostor,
          wordMode: 'normal',
          categories: IMPOSTOR_CATEGORIES,
          wordBank: IMPOSTOR_WORD_BANK,
        })
        : '';
    const nextAssignments = buildAssignments({
      players: cleanPlayers,
      game: selectedGame,
      config: selectedConfig,
      secretWord: selectedWord,
      defaultPlayerLabel: (index) => defaultPlayerLabel(resolvedLanguage, index),
    });
    triggerHaptic('impact');
    trackEvent('draw_started', `${selectedGame.id}:${cleanPlayers.length}`);
    setImpostorWord(selectedWord);
    setAssignments(nextAssignments);
    if (selectedGame.id === 'impostor') {
      const starterPool = nextAssignments.filter((item) => item.secretWord);
      const pickedStarter = starterPool[Math.floor(Math.random() * starterPool.length)] ?? starterPool[0] ?? null;
      setImpostorStarterName(pickedStarter?.name ?? '');
    }
    setCurrentRoundKey(`${selectedGame.id}-${Date.now()}`);
    if (selectedGame.id === 'cidade-dorme') {
      setCityRound({
        phase: selectedGameOptions.startingPhase === 'dia' ? 'dia' : 'noite',
        cycle: 1,
        eliminatedIds: {},
      });
    }
    setCurrentRevealIndex(0);
    setCardPressed(false);
    setRevealedIds({});
    setShowFinalRoles(false);
    goTo('reveal');
  }

  function saveRoundToHistory() {
    if (!selectedGame || !currentRoundKey || assignments.length === 0) return;

    const eliminatedCount =
      selectedGame.id === 'cidade-dorme'
        ? Object.values(cityRound.eliminatedIds).filter(Boolean).length
        : 0;

    const historyItem = {
      id: currentRoundKey,
      gameId: selectedGame.id,
      title: selectedGame.title,
      summary: getFinalSummary(),
      players: assignments.length,
      timestamp: new Date().toISOString(),
      eliminatedCount,
      notable:
        selectedGame.id === 'cidade-dorme'
          ? `${cityRound.phase === 'dia' ? t('day') : t('night')} ${cityRound.cycle}`
          : isBoardGame(selectedGame.id)
            ? scoreRound.detail || scoreRound.type || ''
            : selectedGame.id === 'quem-sou-eu'
              ? selectedGameOptions.category ?? 'personagens'
              : selectedGame.id === 'impostor'
                ? impostorWord
                : '',
      participants: assignments.map((item) => ({ name: item.name, role: item.role, score: scoreBoard[item.id] ?? 0 })),
    };

    setRoundHistory((current) => [historyItem, ...current.filter((item) => item.id !== historyItem.id)].slice(0, 20));
    pushDiagnostic('info', 'round-finished', `${selectedGame.id}:${assignments.length}`);
    trackEvent('round_finished', `${selectedGame.id}:${assignments.length}`);
    setCurrentRoundKey(null);
  }

  function markCurrentAsSeen() {
    if (!currentAssignment) return;
    triggerHaptic('success');
    setRevealedIds((current) => ({ ...current, [currentAssignment.id]: true }));
  }

  function handlePressIn() {
    setCardPressed(true);
    if (!appSettings.reducedMotion) Animated.spring(revealScale, { toValue: 1.03, useNativeDriver: true, friction: 7, tension: 90 }).start();
  }

  function handlePressOut() {
    setCardPressed(false);
    if (!appSettings.reducedMotion) Animated.spring(revealScale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }).start();
    markCurrentAsSeen();
  }

  function goToNextReveal() {
    if (!currentAssignment || !revealedIds[currentAssignment.id]) {
      showNotice(t('errorRevealFirst'), 'info');
      return;
    }
    triggerHaptic('selection');
    setCardPressed(false);
    if (currentRevealIndex === assignments.length - 1) {
      goTo('final');
      return;
    }
    setCurrentRevealIndex((current) => current + 1);
  }

  function getFinalSummary() {
    if (!selectedGame) return '';
    const hasLiveBoardRound = screen === 'final' && Boolean(currentRoundKey);
    if (selectedGame.id === 'cidade-dorme') return `${t('start')} - ${selectedGameOptions.startingPhase === 'dia' ? t('day') : t('night')}`;
    if (selectedGame.id === 'passa-a-bomba') return hasLiveBoardRound ? scoreRound.prompt : `${selectedGameOptions.timer ?? '30'}s`;
    if (selectedGame.id === 'verdade-ou-desafio') {
      return hasLiveBoardRound ? `${scoreRound.type ? `${scoreRound.type} | ` : ''}${scoreRound.prompt}` : `${selectedGameOptions.type ?? 'verdade'} | ${selectedGameOptions.timer ?? '30'}s`;
    }
    if (isBoardGame(selectedGame.id)) return `${scoreRound.detail || selectedGameOptions.timer || selectedGameOptions.rounds || ''} | ${scoreRound.prompt}`;
    if (selectedGame.id === 'quem-sou-eu') return selectedGameOptions.category ?? 'personagens';
    if (selectedGame.id === 'impostor') {
      const categoryLabel = impostorCategoryByGame.impostor === 'todos' ? t('all') : t(`categoryNames.${impostorCategoryByGame.impostor}`);
      return categoryLabel;
    }
    return '';
  }

  function getGameBrief() {
    if (!selectedGame) return '';
    if (selectedGame.id === 'impostor') return t('gameBrief.impostor');
    if (selectedGame.id === 'cidade-dorme') return t('gameBrief.cityClassic');
    if (selectedGame.id === 'passa-a-bomba') return `${t('gameBrief.bomb')} ${selectedGameOptions.timer ?? '30'}s.`;
    if (selectedGame.id === 'palavra-proibida') return `${t('gameBrief.taboo')} ${selectedGameOptions.timer ?? '45'}s.`;
    if (selectedGame.id === 'quem-sou-eu') return t('gameBrief.identity');
    if (selectedGame.id === 'eu-nunca') return t('gameBrief.never');
    if (selectedGame.id === 'verdade-ou-desafio') return t('gameBrief.truthdare');
    if (selectedGame.id === 'batalha-de-frases') return t('gameBrief.pickup');
    if (selectedGame.id === 'se-fosse-voce') return t('gameBrief.whatif');
    if (selectedGame.id === 'quem-da-mesa') return t('gameBrief.tablewho');
    if (selectedGame.id === 'pergunta-pesada') return t('gameBrief.deepq');
    if (selectedGame.id === 'quem-mais-provavel') return t('gameBrief.likely');
    if (selectedGame.id === 'mimica-relampago') return `${t('gameBrief.charades')} ${selectedGameOptions.timer ?? '60'}s.`;
    return '';
  }

  function getIntroLine() {
    if (!selectedGame) return '';
    if (selectedGame.id === 'impostor') return t('intro.impostor');
    if (selectedGame.id === 'cidade-dorme') return cityRound.phase === 'dia' ? t('intro.cityDay') : t('intro.cityNight');
    if (selectedGame.id === 'passa-a-bomba') return t('intro.bomb');
    if (selectedGame.id === 'palavra-proibida') return t('intro.taboo');
    if (selectedGame.id === 'quem-sou-eu') return t('intro.identity');
    if (selectedGame.id === 'eu-nunca') return t('intro.never');
    if (selectedGame.id === 'verdade-ou-desafio') return t('intro.truthdare');
    if (selectedGame.id === 'batalha-de-frases') return t('intro.pickup');
    if (selectedGame.id === 'se-fosse-voce') return t('intro.whatif');
    if (selectedGame.id === 'quem-da-mesa') return t('intro.tablewho');
    if (selectedGame.id === 'pergunta-pesada') return t('intro.deepq');
    if (selectedGame.id === 'quem-mais-provavel') return t('intro.likely');
    if (selectedGame.id === 'mimica-relampago') return t('intro.charades');
    return '';
  }

  function getImpostorStatsLabel() {
    const topImpostor = [...playerStats].sort((a, b) => b.impostorCount - a.impostorCount || b.rounds - a.rounds || a.name.localeCompare(b.name))[0];
    if (!topImpostor || topImpostor.impostorCount === 0) return t('noImpostorStats');
    return `${topImpostor.name} - ${topImpostor.impostorCount}x`;
  }

  function getCityRoleSignal(roleId) {
    const map = {
      assassinos: t('citySignals.assassins'),
      anjos: t('citySignals.angels'),
      detetives: t('citySignals.detectives'),
      cidadaos: t('citySignals.citizens'),
    };
    return map[roleId] ?? '';
  }

  function getGameHelpItems() {
    if (!selectedGame) return [];
    if (selectedGame.id === 'impostor') {
      return [
        t('gameHelp.impostor.one'),
        t('gameHelp.impostor.two'),
        t('gameHelp.impostor.three'),
      ];
    }
    if (selectedGame.id === 'cidade-dorme') {
      return [
        t('gameHelp.city.one'),
        t('gameHelp.city.two'),
        t('gameHelp.city.three'),
      ];
    }
    if (selectedGame.id === 'passa-a-bomba') return [t('gameHelp.bomb.one'), t('gameHelp.bomb.two'), t('gameHelp.bomb.three')];
    if (selectedGame.id === 'palavra-proibida') return [t('gameHelp.taboo.one'), t('gameHelp.taboo.two'), t('gameHelp.taboo.three')];
    if (selectedGame.id === 'quem-sou-eu') return [t('gameHelp.identity.one'), t('gameHelp.identity.two'), t('gameHelp.identity.three')];
    if (selectedGame.id === 'eu-nunca') return [t('gameHelp.never.one'), t('gameHelp.never.two'), t('gameHelp.never.three')];
    if (selectedGame.id === 'verdade-ou-desafio') return [t('gameHelp.truthdare.one'), t('gameHelp.truthdare.two'), t('gameHelp.truthdare.three')];
    if (selectedGame.id === 'batalha-de-frases') return [t('gameHelp.pickup.one'), t('gameHelp.pickup.two'), t('gameHelp.pickup.three')];
    if (selectedGame.id === 'se-fosse-voce') return [t('gameHelp.whatif.one'), t('gameHelp.whatif.two'), t('gameHelp.whatif.three')];
    if (selectedGame.id === 'quem-da-mesa') return [t('gameHelp.tablewho.one'), t('gameHelp.tablewho.two'), t('gameHelp.tablewho.three')];
    if (selectedGame.id === 'pergunta-pesada') return [t('gameHelp.deepq.one'), t('gameHelp.deepq.two'), t('gameHelp.deepq.three')];
    if (selectedGame.id === 'quem-mais-provavel') return [t('gameHelp.likely.one'), t('gameHelp.likely.two'), t('gameHelp.likely.three')];
    if (selectedGame.id === 'mimica-relampago') {
      return [
        t('gameHelp.charades.one'),
        t('gameHelp.charades.two'),
        t('gameHelp.charades.three'),
      ];
    }
    return [];
  }

  const palette = appSettings.highContrast
    ? {
      screen: '#000814',
      surface: '#0b1220',
      surfaceAlt: '#000000',
      control: '#000000',
      border: '#334155',
      text: '#ffffff',
      textMuted: '#dbeafe',
    }
    : {
      screen: '#000000',
      surface: '#000000',
      surfaceAlt: '#000000',
      control: '#000000',
      border: '#000000',
      text: '#f8fafc',
      textMuted: '#cbd5e1',
    };

  const playerCountMatchesRoles = selectedPlayers.length === totalRoles;
  const enoughPlayers = selectedGame ? selectedPlayers.length >= selectedGame.minPlayers : false;
  const usesFlexibleParticipants = selectedGame ? isBoardGame(selectedGame.id) || isIdentityGame(selectedGame.id) : false;
  const canStart = selectedGame && enoughPlayers && (usesFlexibleParticipants || playerCountMatchesRoles);

  function restartSelectedGame() {
    triggerHaptic('selection');
    if (currentRoundKey) saveRoundToHistory();
    resetRoundState();
    setScreen('config');
  }

  if (!appReady || !fontsLoaded) {
    return (
      <View style={[styles.safeArea, { backgroundColor: palette.screen, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <StatusBar style="light" />
        <View style={[styles.container, styles.centeredScreen, { backgroundColor: palette.screen }]}>
          <Image resizeMode="contain" source={require('./assets/party-games-logo.png')} style={styles.loadingLogo} />
          <Text style={[styles.loadingText, { color: palette.text }]}>{t('loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: palette.screen, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, screen === 'reveal' ? 20 : 12) }]}>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: palette.screen }]}>
        {notice ? (
          <View style={[styles.noticeBanner, notice.tone === 'success' ? styles.noticeSuccess : notice.tone === 'error' ? styles.noticeError : styles.noticeInfo]}>
            <MaterialCommunityIcons color="#fff7ed" name={notice.tone === 'success' ? 'check-circle-outline' : notice.tone === 'error' ? 'alert-circle-outline' : 'information-outline'} size={16} />
            <Text style={styles.noticeText}>{notice.message}</Text>
          </View>
        ) : null}
        {rouletteState.visible ? (
          <Animated.View style={[styles.rouletteOverlay, { opacity: rouletteOpacity, transform: [{ translateY: rouletteTranslate }] }]}>
            <View style={[styles.rouletteCard, { borderColor: rouletteState.accent }]}>
              <Text style={styles.rouletteTitle}>{rouletteState.title}</Text>
              <View style={[styles.rouletteTrack, { borderColor: `${rouletteState.accent}44` }]}>
                {rouletteState.items.map((item, index) => (
                  <Text
                    key={`${item}-${index}`}
                    numberOfLines={1}
                    style={[styles.rouletteItem, index === rouletteState.currentIndex && [styles.rouletteItemActive, { color: rouletteState.accent }]]}
                  >
                    {item}
                  </Text>
                ))}
              </View>
            </View>
          </Animated.View>
        ) : null}
        <Animated.View style={{ flex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslate }] }}>
          {screen === 'home' && (
            <ScrollView contentContainerStyle={[styles.homeScrollContent, { paddingBottom: Math.max(insets.bottom + 28, 40) }]}>
              <View style={[styles.homeTopActions, isRTL && styles.rowReverse]}>
                <SmallMenuButton icon="diamond-stone" label={t('premium')} onPress={() => { trackEvent('premium_open', 'home'); goTo('premium'); }} isRTL={isRTL} compact />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Menu"
                  accessibilityState={{ expanded: homeMenuOpen }}
                  style={styles.hamburgerButton}
                  onPress={() => {
                    triggerHaptic('selection');
                    setHomeMenuOpen((current) => !current);
                  }}
                >
                  <MaterialCommunityIcons color="#f8fafc" name={homeMenuOpen ? 'close' : 'menu'} size={24} />
                </Pressable>
              </View>

              {homeMenuOpen ? (
                <View style={[styles.homeMenuPanel, isRTL && styles.homeMenuPanelRTL]}>
                  <SmallMenuButton icon="diamond-stone" label={t('premium')} onPress={() => { trackEvent('premium_open', 'home_menu'); goTo('premium'); }} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="chart-line" label={t('analytics')} onPress={() => goTo('analytics')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="help-circle-outline" label={t('help')} onPress={() => goTo('help')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="file-document-outline" label={t('terms')} onPress={() => goTo('terms')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="shield-check-outline" label={t('privacy')} onPress={() => goTo('privacy')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="cog-outline" label={t('settings')} onPress={() => goTo('settings')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="information-outline" label={t('about')} onPress={() => goTo('about')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="history" label={t('history')} onPress={() => goTo('history')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="trophy-outline" label={t('stats')} onPress={() => goTo('stats')} isRTL={isRTL} menuItem />
                  <SmallMenuButton icon="stethoscope" label={t('diagnostics')} onPress={() => goTo('diagnostics')} isRTL={isRTL} menuItem />
                </View>
              ) : null}

              <View style={styles.homeHeroLogoWrap}>
                <Image resizeMode="contain" source={require('./assets/party-games-logo.png')} style={styles.homeHeroLogo} />
              </View>

              <View style={styles.homeGameGrid}>
                {visibleGames.map((game) => (
                  <GameCard key={game.id} game={game} isRTL={isRTL} variant="grid" onPress={() => openGame(game.id)} />
                ))}
              </View>

              {!appSettings.onboardingSeen && (
                <View style={[styles.onboardingCard, styles.onboardingCardNeon]}>
                  <Text style={styles.blockTitle}>{t('homeHowTo')}</Text>
                  <View style={[styles.onboardingRow, isRTL && styles.rowReverse]}>
                    <OnboardingMini icon="cards-playing-outline" title={content.onboarding[0]} isRTL={isRTL} />
                    <OnboardingMini icon="account-group-outline" title={content.onboarding[1]} isRTL={isRTL} />
                    <OnboardingMini icon="gesture-tap-hold" title={content.onboarding[2]} isRTL={isRTL} />
                  </View>
                  <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
                    <IconLabelButton icon="skip-next" label={t('skip')} onPress={finishOnboarding} isRTL={isRTL} />
                    <Pressable style={styles.primaryButton} onPress={finishOnboarding}>
                      <MaterialCommunityIcons color="#fff7ed" name="check" size={18} />
                      <Text style={styles.primaryButtonText}>{t('understood')}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {screen === 'config' && selectedGame && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 28, 36) }]}>
              <HeaderBar title={selectedGame.title} onBack={goBack} onHome={goHome} onHelp={() => setGameHelpVisible((current) => !current)} isRTL={isRTL} helpLabel={t('help')} />
              {gameHelpVisible ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('howToPlay')}</Text>
                  {gameHelpItems.map((item) => (
                    <View key={item} style={[styles.infoRow, isRTL && styles.rowReverse]}>
                      <MaterialCommunityIcons color={selectedGame.themeColor} name="help-circle-outline" size={18} />
                      <Text style={[styles.infoText, isRTL && styles.textRight]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={[styles.focusCard, isRTL && styles.rowReverse, { borderColor: selectedGame.themeColor, backgroundColor: palette.surface }]}>
                <View style={[styles.focusIcon, { backgroundColor: selectedGame.themeColor }]}>
                  <MaterialCommunityIcons color="#fff7ed" name={selectedGame.icon} size={22} />
                </View>
                <View style={styles.focusText}>
                  <Text style={[styles.focusTitle, isRTL && styles.textRight, { color: palette.text }]}>{selectedGame.shortTitle}</Text>
                  <Text style={[styles.focusMeta, isRTL && styles.textRight, { color: palette.textMuted }]}>{selectedPlayers.length} {t('playersCount')}</Text>
                </View>
              </View>

              {selectedGame.id === 'impostor' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('category')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryRow}>
                      <CategoryChip active={impostorCategoryByGame.impostor === 'todos'} label={t('all')} onPress={() => setImpostorCategoryByGame((current) => ({ ...current, impostor: 'todos' }))} isRTL={isRTL} />
                      {localizedImpostorCategories.map((category) => <CategoryChip key={category.id} active={impostorCategoryByGame.impostor === category.id} label={category.localizedLabel} onPress={() => setImpostorCategoryByGame((current) => ({ ...current, impostor: category.id }))} isRTL={isRTL} />)}
                    </View>
                  </ScrollView>
                </View>
              )}
              {selectedGame.id === 'cidade-dorme' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('start')}</Text>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('start')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      <ChoiceChip active={selectedGameOptions.startingPhase === 'noite'} label={t('night')} onPress={() => setGameOption('cidade-dorme', 'startingPhase', 'noite')} isRTL={isRTL} />
                      <ChoiceChip active={selectedGameOptions.startingPhase === 'dia'} label={t('day')} onPress={() => setGameOption('cidade-dorme', 'startingPhase', 'dia')} isRTL={isRTL} />
                    </View>
                  </View>
                  <View style={[styles.inlineList, isRTL && styles.rowReverseWrap]}>
                    {selectedGame.roles.map((role) => (
                      <View key={role.id} style={[styles.signalChip, styles.signalChipCity, isRTL && styles.rowReverse]}>
                        <MaterialCommunityIcons color="#c084fc" name={getRoleIcon(role.id)} size={16} />
                        <Text style={[styles.signalChipText, isRTL && styles.textRight]}>{getCityRoleSignal(role.id)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {selectedGame.id === 'passa-a-bomba' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('timer')}</Text>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('timer')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['20', '30', '45'].map((time) => <ChoiceChip key={time} active={selectedGameOptions.timer === time} label={`${time}s`} onPress={() => setGameOption('passa-a-bomba', 'timer', time)} isRTL={isRTL} />)}
                    </View>
                  </View>
                </View>
              )}
              {selectedGame.id === 'palavra-proibida' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('category')}</Text>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('category')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['geral', 'festa', 'familia'].map((category) => <ChoiceChip key={category} active={selectedGameOptions.category === category} label={category} onPress={() => setGameOption('palavra-proibida', 'category', category)} isRTL={isRTL} />)}
                    </View>
                  </View>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('timer')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['30', '45', '60'].map((time) => <ChoiceChip key={time} active={selectedGameOptions.timer === time} label={`${time}s`} onPress={() => setGameOption('palavra-proibida', 'timer', time)} isRTL={isRTL} />)}
                    </View>
                  </View>
                </View>
              )}
              {selectedGame.id === 'quem-sou-eu' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('category')}</Text>
                  <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                    {['personagens', 'animais', 'profissoes'].map((category) => <ChoiceChip key={category} active={selectedGameOptions.category === category} label={category} onPress={() => setGameOption('quem-sou-eu', 'category', category)} isRTL={isRTL} />)}
                  </View>
                </View>
              )}
              {selectedGame.id === 'eu-nunca' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('mode')}</Text>
                  <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                    {['misto', 'familia', 'amigos', 'casal', 'festa'].map((mode) => <ChoiceChip key={mode} active={selectedGameOptions.mode === mode} label={mode} onPress={() => setGameOption('eu-nunca', 'mode', mode)} isRTL={isRTL} />)}
                  </View>
                </View>
              )}
              {selectedGame.id === 'verdade-ou-desafio' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('mode')}</Text>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('mode')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['verdade', 'desafio'].map((type) => <ChoiceChip key={type} active={selectedGameOptions.type === type} label={type} onPress={() => setGameOption('verdade-ou-desafio', 'type', type)} isRTL={isRTL} />)}
                    </View>
                  </View>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('category')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['leve', 'medio'].map((intensity) => <ChoiceChip key={intensity} active={selectedGameOptions.intensity === intensity} label={intensity} onPress={() => setGameOption('verdade-ou-desafio', 'intensity', intensity)} isRTL={isRTL} />)}
                    </View>
                  </View>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('players')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['misto', 'amigos', 'familia', 'casal'].map((audience) => <ChoiceChip key={audience} active={selectedGameOptions.audience === audience} label={audience} onPress={() => setGameOption('verdade-ou-desafio', 'audience', audience)} isRTL={isRTL} />)}
                    </View>
                  </View>
                </View>
              )}
              {selectedGame.id === 'batalha-de-frases' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('round')}</Text>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('category')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.categoryRow}>
                        {PICKUP_BATTLE_THEMES.map((theme) => <CategoryChip key={theme} active={selectedGameOptions.theme === theme} label={theme} onPress={() => setGameOption('batalha-de-frases', 'theme', theme)} isRTL={isRTL} />)}
                      </View>
                    </ScrollView>
                  </View>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('round')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['3', '5', '7'].map((rounds) => <ChoiceChip key={rounds} active={selectedGameOptions.rounds === rounds} label={rounds} onPress={() => setGameOption('batalha-de-frases', 'rounds', rounds)} isRTL={isRTL} />)}
                    </View>
                  </View>
                </View>
              )}
              {selectedGame.id === 'se-fosse-voce' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('mode')}</Text>
                  <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                    {['misto', 'festa', 'casal', 'familia'].map((mode) => <ChoiceChip key={mode} active={selectedGameOptions.mode === mode} label={mode} onPress={() => setGameOption('se-fosse-voce', 'mode', mode)} isRTL={isRTL} />)}
                  </View>
                </View>
              )}
              {selectedGame.id === 'quem-da-mesa' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('mode')}</Text>
                  <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                    {['divertido', 'caotico', 'familia'].map((mode) => <ChoiceChip key={mode} active={selectedGameOptions.mode === mode} label={mode} onPress={() => setGameOption('quem-da-mesa', 'mode', mode)} isRTL={isRTL} />)}
                  </View>
                </View>
              )}
              {selectedGame.id === 'pergunta-pesada' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('category')}</Text>
                  <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                    {['leve', 'intensa'].map((intensity) => <ChoiceChip key={intensity} active={selectedGameOptions.intensity === intensity} label={intensity} onPress={() => setGameOption('pergunta-pesada', 'intensity', intensity)} isRTL={isRTL} />)}
                  </View>
                </View>
              )}
              {selectedGame.id === 'quem-mais-provavel' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('mode')}</Text>
                  <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                    {['amigos', 'familia', 'casal'].map((mode) => <ChoiceChip key={mode} active={selectedGameOptions.mode === mode} label={mode} onPress={() => setGameOption('quem-mais-provavel', 'mode', mode)} isRTL={isRTL} />)}
                  </View>
                </View>
              )}
              {selectedGame.id === 'mimica-relampago' && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('timer')}</Text>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('timer')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['45', '60', '90'].map((time) => <ChoiceChip key={time} active={selectedGameOptions.timer === time} label={`${time}s`} onPress={() => setGameOption('mimica-relampago', 'timer', time)} isRTL={isRTL} />)}
                    </View>
                  </View>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('round')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['4', '6', '8'].map((rounds) => <ChoiceChip key={rounds} active={selectedGameOptions.rounds === rounds} label={rounds} onPress={() => setGameOption('mimica-relampago', 'rounds', rounds)} isRTL={isRTL} />)}
                    </View>
                  </View>
                  <View style={styles.optionLine}>
                    <Text style={styles.optionLabel}>{t('category')}</Text>
                    <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                      {['livre', 'animais', 'objetos'].map((category) => <ChoiceChip key={category} active={selectedGameOptions.category === category} label={category} onPress={() => setGameOption('mimica-relampago', 'category', category)} isRTL={isRTL} />)}
                    </View>
                  </View>
                </View>
              )}
              {selectedGame.roles.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('roles')}</Text>
                  {selectedGame.roles.map((role) => (
                    <View key={role.id} style={[styles.roleRow, isRTL && styles.rowReverse]}>
                      <View style={[styles.roleLabelRow, isRTL && styles.rowReverse]}>
                        <MaterialCommunityIcons color={selectedGame.themeColor} name={getRoleIcon(role.id)} size={18} />
                        <Text style={[styles.roleLabel, isRTL && styles.textRight]}>{role.label}</Text>
                      </View>
                      <View style={[styles.stepperRow, isRTL && styles.rowReverse]}>
                        <IconCircleButton icon="minus" onPress={() => decrementRole(role.id)} />
                        <TextInput keyboardType="number-pad" value={String(selectedConfig[role.id] ?? role.defaultCount)} onChangeText={(value) => updateRoleCount(role.id, value)} style={styles.smallInput} />
                        <IconCircleButton icon="plus" onPress={() => incrementRole(role.id)} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {!AUTO_SYNC_ROLE_GAMES.includes(selectedGame.id) ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('quantity')}</Text>
                  <View style={[styles.targetRow, isRTL && styles.rowReverse]}>
                    <TextInput keyboardType="number-pad" value={playerTargetByGame[selectedGame.id]} onChangeText={setPlayerTarget} style={[styles.targetInput, isRTL && styles.textRight]} />
                    <IconLabelButton icon="sync" label={t('update')} onPress={syncPlayersToTarget} isRTL={isRTL} />
                  </View>
                </View>
              ) : null}
              <View style={styles.block}>
                <Text style={styles.blockTitle}>{t('players')}</Text>
                {selectedPlayers.map((player, index) => (
                  <View key={player.id} style={[styles.playerRow, isRTL && styles.rowReverse]}>
                    <TextInput value={player.name} onChangeText={(value) => updatePlayerName(player.id, value)} placeholder={`${t('player')} ${index + 1}`} placeholderTextColor="#64748b" style={[styles.playerInput, isRTL && styles.textRight]} />
                    <IconLabelButton destructive icon="trash-can-outline" label={t('delete')} onPress={() => removePlayer(player.id)} isRTL={isRTL} />
                  </View>
                ))}
                {!AUTO_SYNC_ROLE_GAMES.includes(selectedGame.id) ? <IconLabelButton icon="account-plus-outline" label={t('add')} onPress={addPlayer} isRTL={isRTL} /> : null}
              </View>
              <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
                <IconLabelButton icon="backup-restore" label={t('restore')} onPress={restorePreset} isRTL={isRTL} />
                <IconLabelButton icon="account-switch-outline" label={t('restoreRoles')} onPress={restoreRolesOnly} isRTL={isRTL} />
              </View>
              <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${t('startDrawA11y')} ${selectedGame.title}`} accessibilityHint={t('draw')} style={[styles.primaryButton, !canStart && styles.buttonDisabled]} onPress={startDraw} disabled={!canStart}>
                  <MaterialCommunityIcons color="#fff7ed" name="cards-playing-outline" size={18} />
                  <Text style={styles.primaryButtonText}>{t('draw')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {screen === 'reveal' && currentAssignment && (
            <View style={[styles.revealScreen, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
              <HeaderBar title={selectedGame?.title ?? t('draw')} onBack={goBack} onHome={goHome} onHelp={() => setGameHelpVisible((current) => !current)} isRTL={isRTL} helpLabel={t('help')} />
              {gameHelpVisible ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('howToPlay')}</Text>
                  {gameHelpItems.map((item) => (
                    <View key={item} style={[styles.infoRow, isRTL && styles.rowReverse]}>
                      <MaterialCommunityIcons color={selectedGame?.themeColor ?? '#fb4ecb'} name="help-circle-outline" size={18} />
                      <Text style={[styles.infoText, isRTL && styles.textRight]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={[styles.revealCounter, isRTL && styles.rowReverse]}>
                <MiniStat label={t('turn')} value={`${currentRevealIndex + 1}/${assignments.length}`} isRTL={isRTL} />
              </View>
              <Animated.View style={[styles.revealCard, { borderColor: selectedGame?.themeColor ?? '#fb4ecb' }, { opacity: revealOpacity, transform: [{ scale: revealScale }] }]}>
                <View style={[styles.revealCardGlow, { backgroundColor: `${selectedGame?.themeColor ?? '#fb4ecb'}22` }]} />
                <View style={[styles.revealBadge, isRTL && styles.rowReverse, { backgroundColor: selectedGame?.accentColor ?? '#000000' }]}>
                  <MaterialCommunityIcons color="#e2e8f0" name={selectedGame?.icon ?? 'cards-playing-outline'} size={16} />
                  <Text style={styles.revealBadgeText}>{selectedGame?.shortTitle}</Text>
                </View>
                <Text style={[styles.revealPlayerName, isRTL && styles.textRight]}>{currentAssignment.name}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${t('revealRoleOf')} ${currentAssignment.name}`} accessibilityHint={t('revealHoldHint')} style={[styles.holdButton, selectedGame?.id === 'impostor' && styles.holdButtonImpostor]} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                  <Text style={[styles.holdButtonText, isRTL && styles.textRight]}>{selectedGame?.revealHint ?? t('revealHintButton')}</Text>
                  <Text style={[styles.holdButtonSubtext, isRTL && styles.textRight]}>{cardPressed ? t('reveal') : t('revealHintButton')}</Text>
                  {cardPressed ? (
                    <View style={styles.revealContent}>
                      {selectedGame?.id === 'quem-sou-eu' ? (
                        <Text style={[styles.revealRoleText, isRTL && styles.textRight]}>{currentAssignment.secretWord}</Text>
                      ) : (
                        <>
                          <Text style={[styles.revealRoleText, isRTL && styles.textRight]}>{currentAssignment.role}</Text>
                          {currentAssignment.secretWord ? <Text style={[styles.secretWordText, isRTL && styles.textRight]}>{currentAssignment.secretWord}</Text> : null}
                        </>
                      )}
                    </View>
                  ) : (
                    <MaterialCommunityIcons color="#94a3b8" name="gesture-tap-hold" size={40} />
                  )}
                </Pressable>
              </Animated.View>
              <Pressable accessibilityRole="button" accessibilityLabel={currentRevealIndex === assignments.length - 1 ? t('finishReveal') : t('nextPlayer')} style={[styles.nextButton, (!revealedIds[currentAssignment.id] || cardPressed) && styles.buttonDisabled]} onPress={goToNextReveal} disabled={!revealedIds[currentAssignment.id] || cardPressed}>
                <MaterialCommunityIcons color="#fff7ed" name={isRTL ? 'arrow-left' : 'arrow-right'} size={18} />
                <Text style={styles.nextButtonText}>{currentRevealIndex === assignments.length - 1 ? t('finish') : t('next')}</Text>
              </Pressable>
            </View>
          )}

          {screen === 'final' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
              <HeaderBar title={selectedGame?.title ?? t('finish')} onBack={goBack} onHome={goHome} onHelp={() => setGameHelpVisible((current) => !current)} isRTL={isRTL} helpLabel={t('help')} />
              {gameHelpVisible ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{t('howToPlay')}</Text>
                  {gameHelpItems.map((item) => (
                    <View key={item} style={[styles.infoRow, isRTL && styles.rowReverse]}>
                      <MaterialCommunityIcons color={selectedGame?.themeColor ?? '#fb4ecb'} name="help-circle-outline" size={18} />
                      <Text style={[styles.infoText, isRTL && styles.textRight]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {!isBombGame(selectedGame?.id) ? (
                <View style={[styles.finishActions, isRTL && styles.rowReverse]}>
                  {!isBoardGame(selectedGame?.id) ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={t('showAllRoles')} accessibilityHint={t('showAllRolesHint')} style={styles.primaryButton} onPress={() => setShowFinalRoles(true)}>
                      <MaterialCommunityIcons color="#fff7ed" name="eye-outline" size={18} />
                      <Text style={styles.primaryButtonText}>{t('reveal')}</Text>
                    </Pressable>
                  ) : selectedGame?.id === 'verdade-ou-desafio' && !currentRoundKey ? (
                    <Pressable style={styles.primaryButton} onPress={restartSelectedGame}>
                      <MaterialCommunityIcons color="#fff7ed" name="restart" size={18} />
                      <Text style={styles.primaryButtonText}>{t('playAgain')}</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.primaryButton} onPress={advanceScoreRound}>
                      <MaterialCommunityIcons color="#fff7ed" name="skip-next-circle-outline" size={18} />
                      <Text style={styles.primaryButtonText}>{t('next')}</Text>
                    </Pressable>
                  )}
                  {selectedGame?.id === 'verdade-ou-desafio' && currentRoundKey ? (
                    <IconLabelButton icon="flag-checkered" label={t('finish')} onPress={finishTruthOrDareRound} isRTL={isRTL} />
                  ) : !isBombGame(selectedGame?.id) && !(selectedGame?.id === 'verdade-ou-desafio' && !currentRoundKey) ? (
                    <IconLabelButton icon="restart" label={t('playAgain')} onPress={restartSelectedGame} isRTL={isRTL} />
                  ) : null}
                </View>
              ) : null}
              {selectedGame?.id === 'cidade-dorme' && (
                <View style={[styles.block, styles.cityBoardBlock]}>
                  <Text style={styles.blockTitle}>{t('board')}</Text>
                  <View style={[styles.footerBlock, isRTL && styles.rowReverse]}>
                    <MiniStat label={t('phase')} value={`${cityRound.phase === 'dia' ? t('day') : t('night')} ${cityRound.cycle}`} isRTL={isRTL} />
                    <MiniStat label={t('eliminated')} value={String(Object.values(cityRound.eliminatedIds).filter(Boolean).length)} isRTL={isRTL} />
                    <MiniStat label={t('start')} value={selectedGameOptions.startingPhase === 'dia' ? t('day') : t('night')} isRTL={isRTL} />
                  </View>
                  <IconLabelButton
                    icon={cityRound.phase === 'noite' ? 'weather-sunny' : 'weather-night'}
                    label={cityRound.phase === 'noite' ? t('toDay') : t('toNight')}
                    onPress={advanceCityPhase}
                    isRTL={isRTL}
                  />
                  <View style={[styles.inlineList, isRTL && styles.rowReverseWrap]}>
                    {assignments.map((item) => (
                      <ChoiceChip
                        key={item.id}
                        active={!!cityRound.eliminatedIds[item.id]}
                        label={item.name}
                        onPress={() => toggleEliminatedPlayer(item.id)}
                        isRTL={isRTL}
                      />
                    ))}
                  </View>
                </View>
              )}
              {isBoardGame(selectedGame?.id) && (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>{selectedGame.title}</Text>
                  {selectedGame?.id === 'passa-a-bomba' ? (
                    <View style={styles.bombStageCard}>
                      {bombExploded && currentScorePlayer ? (
                        <View style={styles.bombOutcomeHeader}>
                          <Text style={[styles.promptSpotlightLabel, isRTL && styles.textRight]}>{t('bombExplodedBy')}</Text>
                          <Text style={[styles.bombExplodedPlayerName, isRTL && styles.textRight]}>{currentScorePlayer.name}</Text>
                        </View>
                      ) : null}
                      {scoreRound.prompt ? <Text style={[styles.promptSpotlightLabel, styles.bombPulseLabel, isRTL && styles.textRight]}>{t('category')}</Text> : null}
                      {scoreRound.prompt ? <Text style={[styles.promptSpotlightValue, styles.bombCategoryValue, isRTL && styles.textRight]}>{scoreRound.prompt}</Text> : null}
                      {roundSecondsLeft != null && !bombExploded ? (
                        <View style={[styles.countdownPill, styles.countdownPillCentered, isRTL && styles.rowReverse]}>
                          <MaterialCommunityIcons color="#fbbf24" name="timer-outline" size={18} />
                          <Text style={[styles.countdownText, isRTL && styles.textRight]}>{`${roundSecondsLeft}s`}</Text>
                        </View>
                      ) : null}
                      <Animated.View style={[styles.bombVisualShell, bombExploded && styles.bombVisualShellExploded, { transform: [{ scale: bombExploded ? 1.5 : Math.min(1 + (bombPassCount * 0.08), 1.42) }, { scale: bombPulseScale }] }]}>
                        <MaterialCommunityIcons color={bombExploded ? '#fff7ed' : selectedGame.themeColor} name={bombExploded ? 'fire' : 'bomb'} size={96} />
                      </Animated.View>
                      {bombExploded ? (
                        <>
                          <Text style={styles.bombBoomText}>BOOM!</Text>
                          <Text style={[styles.promptSpotlightValue, styles.bombLostText, isRTL && styles.textRight]}>{t('bombLost')}</Text>
                          <Pressable style={styles.cardActionButton} onPress={restartSelectedGame}>
                            <MaterialCommunityIcons color="#fff7ed" name="restart" size={18} />
                            <Text style={styles.primaryButtonText}>{t('playAgain')}</Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          {currentScorePlayer ? (
                            <View style={styles.bombHolderCard}>
                              <Text style={[styles.promptSpotlightLabel, isRTL && styles.textRight]}>{t('turnOf')}</Text>
                              <Text style={[styles.bombHolderName, isRTL && styles.textRight]}>{currentScorePlayer.name}</Text>
                            </View>
                          ) : null}
                          <Pressable style={styles.cardActionButton} onPress={passBombToNextPlayer} disabled={!currentScorePlayer}>
                            <MaterialCommunityIcons color="#fff7ed" name={isRTL ? 'arrow-left-bold-circle-outline' : 'arrow-right-bold-circle-outline'} size={18} />
                            <Text style={styles.primaryButtonText}>{t('passBomb')}</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  ) : selectedGame?.id === 'verdade-ou-desafio' ? (
                    <>
                      {currentRoundKey ? (
                        <View style={[styles.promptSpotlightCard, styles.truthDareCard, scoreRound.type?.toLowerCase() === 'desafio' && styles.truthDareCardDare]}>
                          {currentScorePlayer ? <Text style={[styles.promptSpotlightLabel, styles.truthDareTurnLabel, isRTL && styles.textRight]}>{t('turnOf')} {currentScorePlayer.name}</Text> : null}
                          {scoreRound.type ? (
                            <View style={[styles.truthDareModeBadge, isRTL && styles.rowReverse, scoreRound.type?.toLowerCase() === 'desafio' && styles.truthDareModeBadgeDare]}>
                              <MaterialCommunityIcons color={scoreRound.type?.toLowerCase() === 'desafio' ? '#ffd6e7' : '#d9fbff'} name={scoreRound.type?.toLowerCase() === 'desafio' ? 'lightning-bolt' : 'chat-processing-outline'} size={14} />
                              <Text style={[styles.truthDareModeBadgeText, isRTL && styles.textRight]}>{scoreRound.type}</Text>
                            </View>
                          ) : null}
                          <Text style={[styles.promptSpotlightValue, styles.truthDarePromptValue, isRTL && styles.textRight]}>{scoreRound.prompt}</Text>
                          {roundSecondsLeft != null ? (
                            <View style={[styles.countdownPill, styles.countdownPillCentered, isRTL && styles.rowReverse]}>
                              <MaterialCommunityIcons color="#fbbf24" name="timer-outline" size={18} />
                              <Text style={[styles.countdownText, isRTL && styles.textRight]}>{`${String(roundSecondsLeft)}s`}</Text>
                            </View>
                          ) : null}
                          {truthOrDareTimedOut ? (
                            <Text style={[styles.promptSpotlightHint, styles.promptSpotlightHintAlert, isRTL && styles.textRight]}>{t('truthDareTimeUp')}</Text>
                          ) : null}
                          <View style={[styles.stepperRow, isRTL && styles.rowReverse]}>
                            <IconCircleButton disabled={truthOrDareTimedOut || !currentScorePlayer} icon="minus" onPress={() => currentScorePlayer ? updateScore(currentScorePlayer.id, -1) : null} />
                            <Text style={[styles.scoreValue, isRTL && styles.textRight, { color: selectedGame?.themeColor ?? '#fb4ecb' }]}>{currentScorePlayer ? scoreBoard[currentScorePlayer.id] ?? 0 : 0}</Text>
                            <IconCircleButton disabled={truthOrDareTimedOut || !currentScorePlayer} icon="plus" onPress={() => currentScorePlayer ? updateScore(currentScorePlayer.id, 1) : null} />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.block}>
                          <Text style={styles.blockTitle}>{t('scoreboard')}</Text>
                          {scoreLeaders.length ? (
                            <Text style={[styles.infoText, isRTL && styles.textRight]}>
                              {scoreLeaders.length > 1 ? t('leadersTied') : t('currentLeader')}: {scoreLeaders.map((item) => item.name).join(', ')} - {scoreLeaders[0].score}
                            </Text>
                          ) : null}
                          {rankedScoreEntries.map((item) => (
                            <View key={item.id} style={[styles.finalRow, scoreLeaders.some((leader) => leader.id === item.id) && styles.finalRowActive, isRTL && styles.rowReverse]}>
                              <Text style={[styles.finalName, isRTL && styles.textRight]}>{item.name}</Text>
                              <Text style={[styles.finalRole, isRTL && styles.textRight, { color: selectedGame?.themeColor ?? '#fb4ecb' }]}>{item.score}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.promptSpotlightCard}>
                      <Text style={[styles.promptSpotlightLabel, isRTL && styles.textRight]}>{t('draw')}</Text>
                      <Text style={[styles.promptSpotlightValue, isRTL && styles.textRight]}>{scoreRound.prompt}</Text>
                      {scoreRound.type ? <Text style={[styles.promptSpotlightMeta, isRTL && styles.textRight]}>{scoreRound.type}</Text> : null}
                      {scoreRound.detail ? <Text style={[styles.promptSpotlightHint, isRTL && styles.textRight]}>{scoreRound.detail}</Text> : null}
                      {roundSecondsLeft != null ? (
                        <View style={[styles.countdownPill, isRTL && styles.rowReverse]}>
                          <MaterialCommunityIcons color="#fbbf24" name="timer-outline" size={18} />
                          <Text style={[styles.countdownText, isRTL && styles.textRight]}>{String(roundSecondsLeft)}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              )}
              {selectedGame?.id === 'impostor' && impostorStarterName ? (
                <View style={styles.starterSpotlightCard}>
                  <Text style={[styles.starterSpotlightEyebrow, isRTL && styles.textRight]}>{t('starterLabel')}</Text>
                  <Text style={[styles.starterSpotlightName, isRTL && styles.textRight]}>{impostorStarterName}</Text>
                  <Text style={[styles.starterSpotlightBody, isRTL && styles.textRight]}>{t('starterLine')} {impostorStarterName}</Text>
                </View>
              ) : null}
              {showFinalRoles && (
                <View style={styles.block}>
                  {selectedGame?.id === 'impostor' && impostorWord ? <View style={[styles.wordBanner, isRTL && styles.rowReverse]}><MaterialCommunityIcons color="#fbbf24" name="lightbulb-on-outline" size={18} /><Text style={[styles.wordBannerText, isRTL && styles.textRight]}>{impostorWord}</Text></View> : null}
                  {isBoardGame(selectedGame?.id) ? null : (
                    assignments.map((item) => (
                      <View key={item.id} style={[styles.finalRow, isRTL && styles.rowReverse]}>
                        <Text style={[styles.finalName, isRTL && styles.textRight]}>{item.name}</Text>
                        <Text style={[styles.finalRole, isRTL && styles.textRight, { color: selectedGame?.themeColor ?? '#fb4ecb' }]}>{selectedGame?.id === 'quem-sou-eu' ? item.secretWord : item.role}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}
          {screen === 'help' && <InfoScreen title={t('help')} items={content.helpItems} onBack={goBack} onHome={goHome} isRTL={isRTL} />}
          {screen === 'about' && <InfoScreen title={t('about')} items={[...content.aboutItems, ...content.contactItems]} onBack={goBack} onHome={goHome} isRTL={isRTL} />}
          {screen === 'terms' && <InfoScreen title={t('terms')} items={content.termsItems} onBack={goBack} onHome={goHome} isRTL={isRTL} />}
          {screen === 'privacy' && <InfoScreen title={t('privacy')} items={content.privacyItems} onBack={goBack} onHome={goHome} isRTL={isRTL} extraAction={<IconLabelButton icon="trash-can-outline" label={t('clearData')} destructive onPress={clearSavedData} isRTL={isRTL} />} />}
          {screen === 'premium' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
              <HeaderBar title={t('premium')} onBack={goBack} onHome={goHome} isRTL={isRTL} />
              <View style={styles.premiumHero}>
                <View style={styles.premiumHeroGlowPink} />
                <View style={styles.premiumHeroGlowBlue} />
                <View style={[styles.premiumHeroTop, isRTL && styles.rowReverse]}>
                  <View style={styles.premiumBadge}>
                    <MaterialCommunityIcons color="#fdf4ff" name="diamond-stone" size={16} />
                    <Text style={styles.premiumBadgeText}>{t('premiumAccess')}</Text>
                  </View>
                  <View style={styles.premiumSoonPill}>
                    <Text style={styles.premiumSoonText}>{t('premiumStatusSoon')}</Text>
                  </View>
                </View>
                <Text style={[styles.premiumHeroTitle, isRTL && styles.textRight]}>{t('premiumHeadline')}</Text>
                <Text style={[styles.premiumHeroText, isRTL && styles.textRight]}>{t('premiumSubhead')}</Text>
              </View>

              <View style={[styles.premiumPlans, isRTL && styles.rowReverse]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('premiumMonthly')} R$ 9,90`}
                  style={[styles.premiumPlanCard, styles.premiumPlanFeatured]}
                  onPress={() => {
                    trackEvent('premium_cta', 'monthly');
                    showNotice(t('premiumComingSoon'), 'info');
                  }}
                >
                  <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                    <Text style={styles.priceLabel}>{t('premiumMonthly')}</Text>
                    <Text style={styles.priceTag}>{t('premiumPopular')}</Text>
                  </View>
                  <Text style={styles.priceValue}>R$ 9,90</Text>
                  <Text style={[styles.priceTagMuted, isRTL && styles.textRight]}>{t('premiumPlanMonthlyNote')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('premiumLifetime')} R$ 29,90`}
                  style={styles.premiumPlanCard}
                  onPress={() => {
                    trackEvent('premium_cta', 'lifetime');
                    showNotice(t('premiumComingSoon'), 'info');
                  }}
                >
                  <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                    <Text style={styles.priceLabel}>{t('premiumLifetime')}</Text>
                    <Text style={[styles.priceTag, styles.priceTagBlue]}>{t('premiumBestValue')}</Text>
                  </View>
                  <Text style={styles.priceValue}>R$ 29,90</Text>
                  <Text style={[styles.priceTagMuted, isRTL && styles.textRight]}>{t('premiumPlanLifetimeNote')}</Text>
                </Pressable>
              </View>

              <View style={styles.block}>
                <Text style={[styles.blockTitle, isRTL && styles.textRight]}>{t('premiumUnlockTitle')}</Text>
                {[
                  ['cards-playing-outline', t('premiumFeatureGames')],
                  ['palette-outline', t('premiumFeatureThemes')],
                  ['format-letter-case', t('premiumFeatureWords')],
                  ['volume-high', t('premiumFeatureSounds')],
                  ['chart-timeline-variant', t('premiumFeatureHistory')],
                  ['shield-check-outline', t('premiumFeatureAds')],
                ].map(([icon, label]) => (
                  <View key={label} style={[styles.premiumBenefitRow, isRTL && styles.rowReverse]}>
                    <View style={styles.premiumBenefitIcon}>
                      <MaterialCommunityIcons color="#fdf4ff" name={icon} size={18} />
                    </View>
                    <Text style={[styles.premiumBenefitText, isRTL && styles.textRight]}>{label}</Text>
                    <MaterialCommunityIcons color="#67e8f9" name="check-circle" size={18} />
                  </View>
                ))}
              </View>

              <View style={styles.premiumRewardCard}>
                <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                  <Text style={[styles.blockTitle, isRTL && styles.textRight]}>{t('rewardedAccess')}</Text>
                  <MaterialCommunityIcons color="#67e8f9" name="gift-outline" size={22} />
                </View>
                <Text style={[styles.infoText, isRTL && styles.textRight]}>{t('rewardedAccessHint')}</Text>
              </View>

              <View style={styles.block}>
                <Text style={[styles.infoText, isRTL && styles.textRight]}>{t('premiumReadyNote')}</Text>
                <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                      trackEvent('premium_cta', 'plans');
                      showNotice(t('premiumComingSoon'), 'info');
                    }}
                  >
                    <MaterialCommunityIcons color="#fff7ed" name="crown-outline" size={18} />
                    <Text style={styles.primaryButtonText}>{t('premiumCta')}</Text>
                  </Pressable>
                  <IconLabelButton
                    icon="chart-line"
                    label={t('analytics')}
                    onPress={() => {
                      trackEvent('premium_cta', 'analytics');
                      goTo('analytics');
                    }}
                    isRTL={isRTL}
                  />
                </View>
              </View>
            </ScrollView>
          )}
          {screen === 'analytics' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
              <HeaderBar title={t('analytics')} onBack={goBack} onHome={goHome} isRTL={isRTL} />
              <View style={styles.block}>
                <Text style={[styles.blockTitle, isRTL && styles.textRight]}>{t('analyticsOverview')}</Text>
                <Text style={[styles.infoText, isRTL && styles.textRight]}>{t('analyticsNote')}</Text>
              </View>
              <View style={[styles.footerBlock, isRTL && styles.rowReverse]}>
                <MiniStat label={t('analyticsGames')} value={String(analyticsSummary.opens)} isRTL={isRTL} />
                <MiniStat label={t('analyticsStarts')} value={String(analyticsSummary.starts)} isRTL={isRTL} />
                <MiniStat label={t('analyticsFinishes')} value={String(analyticsSummary.finishes)} isRTL={isRTL} />
              </View>
              <View style={[styles.footerBlock, isRTL && styles.rowReverse]}>
                <MiniStat label={t('analyticsPremium')} value={String(analyticsSummary.premium)} isRTL={isRTL} />
                <MiniStat label={t('analyticsOnboarding')} value={String(analyticsSummary.onboarding)} isRTL={isRTL} />
                <MiniStat label={t('analyticsEvents')} value={String(analytics.length)} isRTL={isRTL} />
              </View>
              <View style={styles.block}>
                <Text style={[styles.blockTitle, isRTL && styles.textRight]}>{t('analyticsEvents')}</Text>
                {analytics.length === 0 ? (
                  <Text style={[styles.infoText, isRTL && styles.textRight]}>{t('noDiagnostics')}</Text>
                ) : (
                  analytics.slice(0, 12).map((item) => (
                    <View key={item.id} style={[styles.historyCard, styles.analyticsCard]}>
                      <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                        <Text style={[styles.historyTitle, isRTL && styles.textRight]}>{item.event}</Text>
                        <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                      </View>
                      {item.details ? <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{item.details}</Text> : null}
                    </View>
                  ))
                )}
              </View>
              <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
                <IconLabelButton icon="diamond-stone" label={t('premiumSecondary')} onPress={() => { trackEvent('premium_open', 'analytics'); goTo('premium'); }} isRTL={isRTL} />
                <IconLabelButton icon="trash-can-outline" label={t('clearAnalytics')} destructive onPress={() => setAnalytics([])} isRTL={isRTL} />
              </View>
            </ScrollView>
          )}
          {screen === 'settings' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
              <HeaderBar title={t('settings')} onBack={goBack} onHome={goHome} isRTL={isRTL} />
              <View style={styles.block}>
                <Text style={styles.blockTitle}>{t('language')}</Text>
                <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                  {languageOptions.map((option) => (
                    <ChoiceChip key={option.value} active={language === option.value} label={option.label} onPress={() => setLanguage(option.value)} isRTL={isRTL} />
                  ))}
                </View>
              </View>
              <View style={styles.block}>
                <SettingRow active={appSettings.haptics} icon="vibrate" label={t('vibration')} onPress={() => toggleSetting('haptics')} isRTL={isRTL} />
                <SettingRow active={appSettings.soundEnabled} icon="volume-high" label={t('sound')} onPress={() => toggleSetting('soundEnabled')} isRTL={isRTL} />
                <SettingRow active={appSettings.reducedMotion} icon="motion-outline" label={t('hideMotion')} onPress={() => toggleSetting('reducedMotion')} isRTL={isRTL} />
                <SettingRow active={appSettings.highContrast} icon="circle-half-full" label={t('contrast')} onPress={() => toggleSetting('highContrast')} isRTL={isRTL} />
                <SettingRow active={appSettings.analyticsConsent} icon="chart-line" label={t('analyticsConsent')} onPress={() => toggleSetting('analyticsConsent')} isRTL={isRTL} />
              </View>
              <View style={styles.block}>
                <Text style={[styles.infoText, isRTL && styles.textRight]}>{t('analyticsConsentHint')}</Text>
                <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
                  <IconLabelButton icon="chart-line" label={t('analytics')} onPress={() => goTo('analytics')} isRTL={isRTL} />
                  <IconLabelButton icon="diamond-stone" label={t('premium')} onPress={() => { trackEvent('premium_open', 'settings'); goTo('premium'); }} isRTL={isRTL} />
                </View>
              </View>
              <IconLabelButton icon="trash-can-outline" label={t('clearData')} destructive onPress={clearSavedData} isRTL={isRTL} />
            </ScrollView>
          )}
          {screen === 'history' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
              <HeaderBar title={t('history')} onBack={goBack} onHome={goHome} isRTL={isRTL} />
              {roundHistory.length === 0 ? (
                <View style={styles.block}>
                  <Text style={styles.infoText}>{t('emptyHistory')}</Text>
                </View>
              ) : (
                roundHistory.map((item) => (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                      <Text style={[styles.historyTitle, isRTL && styles.textRight]}>{item.title}</Text>
                      <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{item.players} {t('playersCount')}</Text>
                    </View>
                    <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{item.summary}</Text>
                    {item.notable ? <Text style={[styles.historyNote, isRTL && styles.textRight]}>{item.notable}</Text> : null}
                  </View>
                ))
              )}
            </ScrollView>
          )}
          {screen === 'stats' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
              <HeaderBar title={t('stats')} onBack={goBack} onHome={goHome} isRTL={isRTL} />
              {playerStats.length === 0 ? (
                <View style={styles.block}>
                  <Text style={[styles.infoText, isRTL && styles.textRight]}>{t('noStats')}</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.block, styles.spotlightBlock]}>
                    <Text style={[styles.blockTitle, isRTL && styles.textRight]}>{t('topPlayer')}</Text>
                    <View style={[styles.rankingTop, isRTL && styles.rowReverse]}>
                      <MaterialCommunityIcons color="#fbbf24" name="trophy-award" size={28} />
                      <View style={styles.rankingTopText}>
                        <Text style={[styles.rankingTopName, isRTL && styles.textRight]}>{playerStats[0].name}</Text>
                        <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{playerStats[0].rounds} {t('roundsPlayed')}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.historyCard}>
                    <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                      <Text style={[styles.historyTitle, isRTL && styles.textRight]}>{t('impostorLead')}</Text>
                      <MaterialCommunityIcons color="#fb4ecb" name="incognito" size={20} />
                    </View>
                    <Text style={[styles.historyNote, isRTL && styles.textRight]}>{getImpostorStatsLabel()}</Text>
                  </View>
                  {playerStats.map((item, index) => (
                    <View key={item.name} style={styles.historyCard}>
                      <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                        <Text style={[styles.historyTitle, isRTL && styles.textRight]}>{index + 1}. {item.name}</Text>
                        <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{item.rounds} {t('roundsPlayed')}</Text>
                      </View>
                      <View style={[styles.footerBlock, isRTL && styles.rowReverse]}>
                        <MiniStat label={t('roundsPlayed')} value={String(item.rounds)} isRTL={isRTL} />
                        <MiniStat label={t('uniqueRoles')} value={String(item.uniqueRoles)} isRTL={isRTL} />
                        <MiniStat label={t('impostorTimes')} value={String(item.impostorCount)} isRTL={isRTL} />
                      </View>
                      {item.badges.length ? (
                        <View style={[styles.inlineOptions, isRTL && styles.rowReverseWrap]}>
                          {item.badges.map((badge) => <ChoiceChip key={`${item.name}-${badge}`} active label={badge} onPress={() => { }} isRTL={isRTL} />)}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
          {screen === 'diagnostics' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
              <HeaderBar title={t('diagnostics')} onBack={goBack} onHome={goHome} isRTL={isRTL} />
              {diagnostics.length === 0 ? (
                <View style={styles.block}>
                  <Text style={[styles.infoText, isRTL && styles.textRight]}>{t('noDiagnostics')}</Text>
                </View>
              ) : (
                diagnostics.map((item) => (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={[styles.historyTop, isRTL && styles.rowReverse]}>
                      <Text style={[styles.historyTitle, isRTL && styles.textRight]}>{item.event}</Text>
                      <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{item.level}</Text>
                    </View>
                    {item.details ? <Text style={[styles.historyMeta, isRTL && styles.textRight]}>{item.details}</Text> : null}
                    <Text style={[styles.historyNote, isRTL && styles.textRight]}>{new Date(item.timestamp).toLocaleString()}</Text>
                  </View>
                ))
              )}
              <IconLabelButton icon="trash-can-outline" label={t('clearDiagnostics')} destructive onPress={() => setDiagnostics([])} isRTL={isRTL} />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function CategoryChip({ active, label, onPress, isRTL = false }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label} style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={onPress}><Text style={[styles.categoryChipText, active && styles.categoryChipTextActive, isRTL && styles.textRight]}>{label}</Text></Pressable>;
}

function formatChipLabel(label) {
  const map = {
    familia: 'família',
    profissoes: 'profissões',
    medio: 'médio',
    caotico: 'caótico',
    mimica: 'mímica',
    relampago: 'relâmpago',
  };
  return map[label] ?? label;
}

function ChoiceChip({ active, label, onPress, isRTL = false }) {
  const displayLabel = formatChipLabel(label);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={displayLabel} style={[styles.choiceChip, active && styles.choiceChipActive]} onPress={onPress}><Text style={[styles.choiceChipText, active && styles.choiceChipTextActive, isRTL && styles.textRight]}>{displayLabel}</Text></Pressable>;
}

function IconCircleButton({ icon, onPress, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={icon === 'plus' ? 'plus' : 'minus'} style={[styles.stepperButton, disabled && styles.stepperButtonDisabled]} onPress={onPress} disabled={disabled}><MaterialCommunityIcons color={disabled ? '#64748b' : '#f8fafc'} name={icon} size={18} /></Pressable>;
}

function IconLabelButton({ destructive, icon, label, onPress, isRTL = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} style={[styles.secondaryButton, destructive && styles.destructiveButton, isRTL && styles.rowReverse]} onPress={onPress}><MaterialCommunityIcons color={destructive ? '#fee2e2' : '#f8fafc'} name={icon} size={18} /><Text style={[styles.secondaryButtonText, destructive && styles.destructiveButtonText, isRTL && styles.textRight]}>{label}</Text></Pressable>;
}

function MiniStat({ label, value, isRTL = false }) {
  return <View style={styles.statPill}><Text style={[styles.statLabel, isRTL && styles.textRight]}>{label}</Text><Text style={[styles.statValue, isRTL && styles.textRight]} numberOfLines={1}>{value}</Text></View>;
}

function SmallMenuButton({ icon, label, onPress, isRTL = false, compact = false, menuItem = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} style={[styles.smallMenuButton, compact && styles.smallMenuButtonCompact, menuItem && styles.smallMenuButtonMenuItem, (menuItem || isRTL) && isRTL && styles.rowReverse]} onPress={onPress}><MaterialCommunityIcons color="#cbd5e1" name={icon} size={18} /><Text style={[styles.smallMenuButtonText, menuItem && styles.smallMenuButtonMenuText, isRTL && styles.textRight]}>{label}</Text></Pressable>;
}

function OnboardingMini({ icon, title, isRTL = false }) {
  return <View style={styles.onboardingMini}><MaterialCommunityIcons color="#fb4ecb" name={icon} size={20} /><Text style={[styles.onboardingMiniText, isRTL && styles.textRight]}>{title}</Text></View>;
}

function InfoScreen({ title, items, onBack, onHome, extraAction, isRTL = false }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <HeaderBar title={title} onBack={onBack} onHome={onHome} isRTL={isRTL} />
      <View style={styles.block}>
        {items.map((item) => <View key={item} style={[styles.infoRow, isRTL && styles.rowReverse]}><MaterialCommunityIcons color="#fb4ecb" name="check-circle-outline" size={18} /><Text style={[styles.infoText, isRTL && styles.textRight]}>{item}</Text></View>)}
      </View>
      {extraAction ? extraAction : null}
    </ScrollView>
  );
}

function SettingRow({ active, icon, label, onPress, isRTL = false }) {
  return <Pressable style={[styles.settingRow, isRTL && styles.rowReverse]} onPress={onPress}><View style={[styles.settingLeft, isRTL && styles.rowReverse]}><MaterialCommunityIcons color={active ? '#fb4ecb' : '#94a3b8'} name={icon} size={18} /><Text style={[styles.settingLabel, isRTL && styles.textRight]}>{label}</Text></View><MaterialCommunityIcons color={active ? '#67e8f9' : '#475569'} name={active ? 'toggle-switch' : 'toggle-switch-off-outline'} size={34} /></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  container: { flex: 1, backgroundColor: '#000000' },
  centeredScreen: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingLogo: { width: 112, height: 112 },
  loadingText: { color: '#f8fafc', fontSize: 16, fontFamily: FONT_BOLD },
  scrollContent: { padding: 18, paddingBottom: 32, gap: 16 },
  homeScrollContent: { padding: 18, paddingBottom: 36, gap: 16 },
  rowReverse: { flexDirection: 'row-reverse' },
  rowReverseWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  textRight: { textAlign: 'right' },
  noticeBanner: { marginHorizontal: 18, marginTop: 6, marginBottom: 4, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rouletteOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: 'rgba(2, 6, 23, 0.96)' },
  rouletteCard: { width: '100%', maxWidth: 380, backgroundColor: '#000000', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10, shadowColor: '#000000', shadowOpacity: 0.26, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  rouletteTitle: { color: '#f8fafc', fontSize: 13, fontFamily: FONT_BOLD, textAlign: 'center' },
  rouletteTrack: { backgroundColor: '#000000', borderRadius: 16, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, gap: 6 },
  rouletteItem: { color: '#64748b', fontSize: 14, fontFamily: FONT_SEMIBOLD, textAlign: 'center' },
  rouletteItemActive: { color: '#f8fafc', fontSize: 18, fontFamily: FONT_EXTRABOLD },
  noticeInfo: { backgroundColor: '#1d4ed8' },
  noticeSuccess: { backgroundColor: '#15803d' },
  noticeError: { backgroundColor: '#b91c1c' },
  noticeText: { color: '#fff7ed', fontSize: 13, fontFamily: FONT_BOLD, flex: 1 },
  heroCard: { backgroundColor: '#000000', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#000000', gap: 6 },
  homeHeroCard: { position: 'relative', overflow: 'hidden', borderRadius: 32, padding: 20, gap: 14, backgroundColor: '#0d0b17', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  homeHeroGlowPink: { position: 'absolute', top: -40, left: -36, width: 150, height: 150, borderRadius: 999, backgroundColor: 'rgba(255,56,184,0.18)' },
  homeHeroGlowBlue: { position: 'absolute', right: -44, top: 38, width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(34,211,238,0.12)' },
  homeHeroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeHeroBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(17,24,39,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  homeHeroBadgeText: { color: '#74ebff', fontSize: 11, letterSpacing: 1.6, fontFamily: FONT_BOLD },
  homeHeroGiftButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  homeHeroLogoWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  homeHeroLogo: { width: 128, height: 128 },
  homeHeroTitle: { color: '#fff2fb', fontSize: 38, lineHeight: 38, fontFamily: FONT_EXTRABOLD, textTransform: 'uppercase', textShadowColor: 'rgba(255,56,184,0.24)', textShadowRadius: 16 },
  screenTitle: { color: '#f8fafc', fontSize: 30, fontFamily: FONT_EXTRABOLD },
  heroSubtitle: { color: '#94a3b8', fontSize: 14, fontFamily: FONT_SEMIBOLD },
  homeHeroSubtitle: { color: '#d4cbee', fontSize: 14, lineHeight: 21, fontFamily: FONT_SEMIBOLD },
  homePartyModeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 999, backgroundColor: 'rgba(10,10,18,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  homePartyModeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homePartyModeIconWrap: { width: 34, height: 34, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  homePartyModeTextWrap: { gap: 2 },
  homePartyModeTitle: { color: '#fff5ff', fontSize: 18, fontFamily: FONT_EXTRABOLD },
  homePartyModeCaption: { color: '#ff92d6', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: FONT_BOLD },
  homeTopActions: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, zIndex: 20 },
  hamburgerButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#11111a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  homeMenuPanel: { position: 'absolute', top: 70, right: 18, width: 230, zIndex: 25, backgroundColor: '#0d0b17', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 10, gap: 8, shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  homeMenuPanelRTL: { left: 18, right: undefined },
  homeGameGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  quickLinks: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  onboardingCard: { backgroundColor: '#000000', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#000000', gap: 14 },
  onboardingCardNeon: { backgroundColor: '#0d0b17', borderColor: 'rgba(255,255,255,0.08)' },
  onboardingRow: { flexDirection: 'row', gap: 10 },
  onboardingMini: { flex: 1, backgroundColor: '#000000', borderRadius: 18, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  onboardingMiniText: { color: '#e2e8f0', fontSize: 13, fontFamily: FONT_BOLD },
  smallMenuButton: { minWidth: '22%', flexGrow: 1, backgroundColor: '#11111a', borderRadius: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  smallMenuButtonCompact: { minWidth: 0, flexGrow: 0, flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  smallMenuButtonMenuItem: { minWidth: 0, width: '100%', flexGrow: 0, flexDirection: 'row', justifyContent: 'flex-start', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12 },
  smallMenuButtonText: { color: '#d6d0ec', fontSize: 12, fontFamily: FONT_BOLD },
  smallMenuButtonMenuText: { flex: 1, fontSize: 13 },
  focusCard: { backgroundColor: '#000000', borderRadius: 24, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  focusIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  focusText: { flex: 1, gap: 2 },
  focusTitle: { color: '#f8fafc', fontSize: 19, fontFamily: FONT_BOLD },
  focusMeta: { color: '#94a3b8', fontSize: 13, fontFamily: FONT_SEMIBOLD },
  gameModeBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  gameModeBadgeText: { color: '#e2e8f0', fontSize: 11, fontFamily: FONT_BOLD },
  block: { backgroundColor: '#000000', borderRadius: 24, padding: 16, gap: 12, borderWidth: 1, borderColor: '#000000' },
  blockTitle: { color: '#f8fafc', fontSize: 18, fontFamily: FONT_BOLD },
  categoryRow: { flexDirection: 'row', gap: 8 },
  signalChip: { backgroundColor: '#000000', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalChipText: { color: '#e2e8f0', fontSize: 12, fontFamily: FONT_SEMIBOLD },
  categoryChip: { backgroundColor: '#000000', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  categoryChipActive: { backgroundColor: '#fb4ecb' },
  categoryChipText: { color: '#cbd5e1', fontSize: 13, fontFamily: FONT_SEMIBOLD },
  categoryChipTextActive: { color: '#fff7ed', fontFamily: FONT_SEMIBOLD },
  optionLine: { gap: 10 },
  optionLabel: { color: '#cbd5e1', fontSize: 13, fontFamily: FONT_SEMIBOLD },
  inlineOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  inlineList: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  narrativeCard: { backgroundColor: '#000000', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  narrativeText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, fontFamily: FONT_SEMIBOLD },
  choiceChip: { backgroundColor: '#000000', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  choiceChipActive: { backgroundColor: '#334155' },
  choiceChipText: { color: '#cbd5e1', fontSize: 13, fontFamily: FONT_BOLD },
  choiceChipTextActive: { color: '#f8fafc', fontFamily: FONT_BOLD },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#000000', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  roleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  roleLabel: { color: '#e2e8f0', fontSize: 16, fontFamily: FONT_SEMIBOLD },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  stepperButtonDisabled: { backgroundColor: '#1f2937' },
  smallInput: { width: 58, backgroundColor: '#000000', color: '#f8fafc', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center', fontFamily: FONT_BOLD, fontSize: 16 },
  targetRow: { flexDirection: 'row', gap: 10 },
  targetInput: { flex: 1, backgroundColor: '#000000', color: '#f8fafc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontFamily: FONT_SEMIBOLD },
  playerRow: { flexDirection: 'row', gap: 10 },
  playerInput: { flex: 1, backgroundColor: '#000000', color: '#f8fafc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontFamily: FONT_SEMIBOLD },
  footerBlock: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statPill: { flex: 1, backgroundColor: '#000000', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#000000', gap: 4 },
  promptSpotlightCard: { backgroundColor: '#000000', borderRadius: 24, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 18, paddingVertical: 20, gap: 8 },
  promptSpotlightLabel: { color: '#94a3b8', fontSize: 12, fontFamily: FONT_SEMIBOLD, textTransform: 'uppercase', letterSpacing: 0.6 },
  promptSpotlightValue: { color: '#f8fafc', fontSize: 28, lineHeight: 34, fontFamily: FONT_EXTRABOLD },
  promptSpotlightMeta: { color: '#fb4ecb', fontSize: 13, fontFamily: FONT_BOLD, textTransform: 'capitalize' },
  promptSpotlightHint: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, fontFamily: FONT_SEMIBOLD },
  promptSpotlightHintAlert: { color: '#fecaca' },
  bombStageCard: { backgroundColor: '#000000', borderRadius: 28, borderWidth: 1, borderColor: '#312e81', padding: 24, alignItems: 'center', justifyContent: 'center', gap: 18, minHeight: 420 },
  bombCategoryValue: { textAlign: 'center', fontSize: 22, lineHeight: 28 },
  bombVisualShell: { width: 180, height: 180, borderRadius: 999, backgroundColor: '#1f172a', borderWidth: 1, borderColor: '#4c0519', alignItems: 'center', justifyContent: 'center', shadowColor: '#f43f5e', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  bombVisualShellExploded: { backgroundColor: '#7f1d1d', borderColor: '#fb7185' },
  bombBoomText: { color: '#fff7ed', fontSize: 42, fontFamily: FONT_EXTRABOLD, letterSpacing: 1.2 },
  bombLostText: { textAlign: 'center' },
  bombOutcomeHeader: { width: '100%', alignItems: 'center', gap: 6 },
  bombExplodedPlayerName: { color: '#fff7ed', fontSize: 30, lineHeight: 34, fontFamily: FONT_EXTRABOLD, textAlign: 'center' },
  bombHolderCard: { width: '100%', backgroundColor: '#000000', borderRadius: 18, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 16, paddingVertical: 14, gap: 6, alignItems: 'center' },
  bombHolderName: { color: '#f8fafc', fontSize: 24, lineHeight: 30, fontFamily: FONT_EXTRABOLD, textAlign: 'center' },
  countdownPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, backgroundColor: '#1f2937', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#374151' },
  countdownPillCentered: { alignSelf: 'center' },
  countdownText: { color: '#f8fafc', fontSize: 16, fontFamily: FONT_EXTRABOLD },
  statLabel: { color: '#94a3b8', fontSize: 12, fontFamily: FONT_SEMIBOLD },
  statValue: { color: '#f8fafc', fontSize: 16, fontFamily: FONT_BOLD },
  actionRow: { flexDirection: 'row', gap: 10 },
  priceCard: { flex: 1, backgroundColor: '#000000', borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: '#000000', gap: 6 },
  priceCardFeatured: { borderColor: '#fb4ecb', shadowColor: '#fb4ecb', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  priceLabel: { color: '#cbd5e1', fontSize: 13, fontFamily: FONT_BOLD },
  priceValue: { color: '#f8fafc', fontSize: 26, fontFamily: FONT_EXTRABOLD },
  priceTag: { color: '#fed7aa', fontSize: 12, fontFamily: FONT_BOLD },
  priceTagMuted: { color: '#94a3b8', fontSize: 12, fontFamily: FONT_BOLD },
  premiumHero: { position: 'relative', overflow: 'hidden', borderRadius: 28, padding: 20, gap: 14, backgroundColor: '#100617', borderWidth: 1, borderColor: '#fb4ecb' },
  premiumHeroGlowPink: { position: 'absolute', top: -42, left: -30, width: 150, height: 150, borderRadius: 999, backgroundColor: 'rgba(251,78,203,0.22)' },
  premiumHeroGlowBlue: { position: 'absolute', right: -48, bottom: -46, width: 170, height: 170, borderRadius: 999, backgroundColor: 'rgba(103,232,249,0.16)' },
  premiumHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  premiumBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(251,78,203,0.24)', borderWidth: 1, borderColor: 'rgba(251,78,203,0.48)' },
  premiumBadgeText: { color: '#fdf4ff', fontSize: 11, fontFamily: FONT_BOLD, textTransform: 'uppercase' },
  premiumSoonPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(103,232,249,0.14)', borderWidth: 1, borderColor: 'rgba(103,232,249,0.38)' },
  premiumSoonText: { color: '#a5f3fc', fontSize: 11, fontFamily: FONT_BOLD, textTransform: 'uppercase' },
  premiumHeroTitle: { color: '#fff7ff', fontSize: 30, lineHeight: 34, fontFamily: FONT_EXTRABOLD },
  premiumHeroText: { color: '#e9d5ff', fontSize: 14, lineHeight: 21, fontFamily: FONT_SEMIBOLD },
  premiumPlans: { flexDirection: 'row', gap: 12 },
  premiumPlanCard: { flex: 1, minHeight: 150, backgroundColor: '#070711', borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(103,232,249,0.34)', gap: 9 },
  premiumPlanFeatured: { borderColor: '#fb4ecb', shadowColor: '#fb4ecb', shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  priceTagBlue: { color: '#a5f3fc' },
  premiumBenefitRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#070711', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  premiumBenefitIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,78,203,0.18)', borderWidth: 1, borderColor: 'rgba(251,78,203,0.32)' },
  premiumBenefitText: { flex: 1, color: '#f8fafc', fontSize: 14, lineHeight: 19, fontFamily: FONT_SEMIBOLD },
  premiumRewardCard: { backgroundColor: '#071827', borderRadius: 24, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(103,232,249,0.32)' },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#000000', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 },
  compareLabel: { flex: 1, color: '#e2e8f0', fontSize: 13, fontFamily: FONT_SEMIBOLD },
  compareValue: { minWidth: 74, color: '#94a3b8', fontSize: 12, fontFamily: FONT_BOLD, textAlign: 'center' },
  compareValueHighlight: { color: '#f8fafc' },
  secondaryButton: { flex: 1, backgroundColor: '#000000', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },
  secondaryButtonText: { color: '#f8fafc', fontFamily: FONT_BOLD },
  destructiveButton: { backgroundColor: '#7f1d1d' },
  destructiveButtonText: { color: '#fee2e2' },
  primaryButton: { flex: 1, backgroundColor: '#fb4ecb', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row', shadowColor: '#fb4ecb', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  cardActionButton: { minWidth: 180, alignSelf: 'stretch', backgroundColor: '#fb4ecb', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row', shadowColor: '#fb4ecb', shadowOpacity: 0.26, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  primaryButtonText: { color: '#fff7ed', fontFamily: FONT_BOLD, fontSize: 16 },
  buttonDisabled: { opacity: 0.45 },
  revealScreen: { flex: 1, padding: 18, gap: 18, justifyContent: 'space-between' },
  revealCounter: { alignItems: 'center' },
  revealCard: { flex: 1, backgroundColor: '#10182d', borderRadius: 28, borderWidth: 2, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 24, shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  revealBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  revealBadgeText: { color: '#e2e8f0', fontSize: 12, fontFamily: FONT_BOLD },
  revealPlayerName: { color: '#f8fafc', fontSize: 28, fontFamily: FONT_EXTRABOLD, textAlign: 'center' },
  holdButton: { width: '100%', backgroundColor: '#000000', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 32, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1f2a44' },
  holdButtonText: { color: '#cbd5e1', fontSize: 15, fontFamily: FONT_SEMIBOLD },
  revealContent: { alignItems: 'center', gap: 10 },
  revealRoleText: { color: '#f8fafc', fontSize: 32, fontFamily: FONT_EXTRABOLD, textAlign: 'center' },
  secretWordText: { color: '#fbbf24', fontSize: 24, fontFamily: FONT_BOLD, textAlign: 'center', textTransform: 'capitalize' },
  nextButton: { alignSelf: 'center', minWidth: 170, backgroundColor: '#fb4ecb', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row', shadowColor: '#fb4ecb', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  nextButtonText: { color: '#fff7ed', fontSize: 15, fontFamily: FONT_BOLD },
  finishActions: { flexDirection: 'row', gap: 10 },
  wordBanner: { backgroundColor: '#000000', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },
  wordBannerText: { color: '#fbbf24', fontSize: 18, fontFamily: FONT_BOLD, textTransform: 'capitalize' },
  finalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000000', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14 },
  finalRowActive: { borderWidth: 1, borderColor: '#ec4899' },
  finalName: { color: '#f8fafc', fontSize: 16, fontFamily: FONT_SEMIBOLD },
  finalRole: { fontSize: 16, fontFamily: FONT_BOLD },
  scoreValue: { minWidth: 32, color: '#f8fafc', fontSize: 20, fontFamily: FONT_EXTRABOLD, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, color: '#e2e8f0', fontSize: 14, lineHeight: 20, fontFamily: FONT_REGULAR },
  settingRow: { backgroundColor: '#000000', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { color: '#f8fafc', fontSize: 15, fontFamily: FONT_SEMIBOLD },
  historyCard: { backgroundColor: '#000000', borderRadius: 22, padding: 16, gap: 8, borderWidth: 1, borderColor: '#000000' },
  analyticsCard: { backgroundColor: '#000000' },
  spotlightBlock: { borderColor: '#fb4ecb' },
  rankingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankingTopText: { flex: 1, gap: 2 },
  rankingTopName: { color: '#f8fafc', fontSize: 20, fontFamily: FONT_EXTRABOLD },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  historyTitle: { color: '#f8fafc', fontSize: 16, fontFamily: FONT_BOLD, flex: 1 },
  historyMeta: { color: '#94a3b8', fontSize: 13, fontFamily: FONT_SEMIBOLD },
  historyNote: { color: '#e2e8f0', fontSize: 14, fontFamily: FONT_SEMIBOLD },
  homeSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 2 },
  homeSectionTitleWrap: { gap: 4 },
  homeSectionEyebrow: { color: '#70e8ff', fontSize: 11, letterSpacing: 1.6, fontFamily: FONT_BOLD },
  homeSectionTitle: { color: '#fff5ff', fontSize: 24, fontFamily: FONT_EXTRABOLD },
  homeSectionCountPill: { minWidth: 38, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#11111a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  homeSectionCountText: { color: '#ff9cdc', fontSize: 13, fontFamily: FONT_EXTRABOLD },
  quickLinksMuted: { opacity: 0.96 },
  signalChipCity: { backgroundColor: '#160b2d', borderWidth: 1, borderColor: '#8b5cf6' },
  revealCardGlow: { position: 'absolute', top: -20, right: -20, width: 140, height: 140, borderRadius: 999, opacity: 0.75 },
  holdButtonImpostor: { borderColor: '#38bdf8', backgroundColor: '#071827' },
  holdButtonSubtext: { color: '#94a3b8', fontSize: 12, fontFamily: FONT_BOLD, textTransform: 'uppercase', letterSpacing: 1.2 },
  starterSpotlightCard: { borderRadius: 24, padding: 18, gap: 8, backgroundColor: '#071827', borderWidth: 1, borderColor: '#38bdf8' },
  starterSpotlightEyebrow: { color: '#7dd3fc', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: FONT_BOLD },
  starterSpotlightName: { color: '#fff7ed', fontSize: 28, fontFamily: FONT_EXTRABOLD },
  starterSpotlightBody: { color: '#bae6fd', fontSize: 14, lineHeight: 20, fontFamily: FONT_SEMIBOLD },
  cityBoardBlock: { backgroundColor: '#12091f', borderColor: '#8b5cf6' },
  bombPulseLabel: { color: '#fda4af' },
  truthDareCard: { backgroundColor: '#0f2230', borderColor: '#155e75' },
  truthDareCardDare: { backgroundColor: '#331220', borderColor: '#9d174d' },
  truthDareTurnLabel: { color: '#f8fafc' },
  truthDareModeBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#103246', borderWidth: 1, borderColor: '#155e75' },
  truthDareModeBadgeDare: { backgroundColor: '#4a102b', borderColor: '#9d174d' },
  truthDareModeBadgeText: { color: '#f8fafc', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: FONT_BOLD },
  truthDarePromptValue: { marginTop: 4 },
});
