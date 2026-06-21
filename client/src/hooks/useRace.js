import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientEvents, ServerEvents } from '@shared/constants/socketEvents.js';
import { connectSocket } from '../socket/socket.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * Race phases:
 *  idle -> queuing -> matched -> countdown -> racing -> finished
 *  (or -> aborted at any point if a player is left alone)
 */
export function useRace() {
  const [phase, setPhase] = useState('idle');
  const [roomId, setRoomId] = useState(null);
  const [words, setWords] = useState([]);
  const [duration, setDuration] = useState(30000);
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [results, setResults] = useState(null);
  const [liveOpponents, setLiveOpponents] = useState({}); // userId -> {wpm, correctChars}
  const [raceStartedAt, setRaceStartedAt] = useState(0); // local epoch ms
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [error, setError] = useState(null);

  // Refs for high-frequency data so caret movement never triggers re-renders.
  const positionsRef = useRef({}); // userId -> cursorPosition (opponents)
  const liveRef = useRef({}); // userId -> {wpm, correctChars}
  const roomIdRef = useRef(null);
  const endedRef = useRef(false);

  const selfId = useAuthStore((s) => s.user?.id);
  const refreshProfile = useAuthStore((s) => s.refresh);

  const reset = useCallback(() => {
    setPhase('idle');
    setRoomId(null);
    setWords([]);
    setPlayers([]);
    setCountdown(null);
    setResults(null);
    setLiveOpponents({});
    setRaceStartedAt(0);
    setOpponentLeft(false);
    setError(null);
    positionsRef.current = {};
    liveRef.current = {};
    roomIdRef.current = null;
    endedRef.current = false;
  }, []);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return undefined;
    const socket = connectSocket(token);

    const onQueueJoined = () => setPhase('queuing');

    const onMatchFound = ({ roomId: id, words: w, duration: d, players: roster }) => {
      roomIdRef.current = id;
      // Seed every opponent at position 0 so their caret is visible from the
      // start, even before they have typed (and thus sent an update).
      positionsRef.current = {};
      roster.forEach((p) => {
        if (p.userId !== selfId) positionsRef.current[p.userId] = 0;
      });
      liveRef.current = {};
      endedRef.current = false;
      setRoomId(id);
      setWords(w);
      setDuration(d);
      setPlayers(roster);
      setResults(null);
      setOpponentLeft(false);
      setLiveOpponents({});
      setPhase('matched');
    };

    const onCountdown = (payload) => {
      setCountdown(payload);
      setPhase('countdown');
    };

    const onRaceStarted = ({ duration: d }) => {
      if (d) setDuration(d);
      setRaceStartedAt(Date.now());
      setCountdown(null);
      setPhase('racing');
    };

    const onPlayerUpdate = ({ userId, cursorPosition, wpm, correctChars }) => {
      if (userId === selfId) return;
      positionsRef.current[userId] = cursorPosition;
      liveRef.current[userId] = { wpm, correctChars };
    };

    const onRaceEnded = ({ results: r }) => {
      endedRef.current = true;
      setResults(r);
      setPhase('finished');
      refreshProfile();
    };

    // Opponent left → race is aborted, NO results recorded. End immediately.
    const onOpponentLeft = () => {
      if (endedRef.current) return; // race already finished normally
      endedRef.current = true;
      setOpponentLeft(true);
      setPhase('aborted');
    };

    const onError = (e) => {
      setError(e?.message || 'Something went wrong');
      setPhase('idle');
    };

    socket.on(ServerEvents.QUEUE_JOINED, onQueueJoined);
    socket.on(ServerEvents.MATCH_FOUND, onMatchFound);
    socket.on(ServerEvents.COUNTDOWN, onCountdown);
    socket.on(ServerEvents.RACE_STARTED, onRaceStarted);
    socket.on(ServerEvents.PLAYER_UPDATE, onPlayerUpdate);
    socket.on(ServerEvents.RACE_ENDED, onRaceEnded);
    socket.on(ServerEvents.OPPONENT_LEFT, onOpponentLeft);
    socket.on(ServerEvents.ERROR, onError);

    return () => {
      socket.off(ServerEvents.QUEUE_JOINED, onQueueJoined);
      socket.off(ServerEvents.MATCH_FOUND, onMatchFound);
      socket.off(ServerEvents.COUNTDOWN, onCountdown);
      socket.off(ServerEvents.RACE_STARTED, onRaceStarted);
      socket.off(ServerEvents.PLAYER_UPDATE, onPlayerUpdate);
      socket.off(ServerEvents.RACE_ENDED, onRaceEnded);
      socket.off(ServerEvents.OPPONENT_LEFT, onOpponentLeft);
      socket.off(ServerEvents.ERROR, onError);
    };
  }, [selfId, refreshProfile]);

  // Flush opponent live stats to React state at ~10fps (carets come from the
  // ref-driven RAF; the progress bars don't need 60fps).
  useEffect(() => {
    if (phase !== 'racing') return undefined;
    const id = setInterval(() => setLiveOpponents({ ...liveRef.current }), 100);
    return () => clearInterval(id);
  }, [phase]);

  const joinQueue = useCallback(async () => {
    setError(null);
    setResults(null);
    await useAuthStore.getState().ensureGuest();
    const token = useAuthStore.getState().token;
    const socket = connectSocket(token);
    setPhase('queuing');
    const emit = () => socket.emit(ClientEvents.JOIN_QUEUE);
    if (socket.connected) emit();
    else socket.once('connect', emit);
  }, []);

  const leaveQueue = useCallback(() => {
    const socket = connectSocket(useAuthStore.getState().token);
    socket.emit(ClientEvents.LEAVE_QUEUE);
    reset();
  }, [reset]);

  const sendTypingUpdate = useCallback(
    (stats) => {
      if (endedRef.current || !roomIdRef.current) return;
      const socket = connectSocket(useAuthStore.getState().token);
      socket.emit(ClientEvents.TYPING_UPDATE, {
        roomId: roomIdRef.current,
        userId: selfId,
        cursorPosition: stats.caretIndex,
        correctChars: stats.correctChars,
        mistakes: stats.mistakes,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
      });
    },
    [selfId]
  );

  const opponents = players.filter((p) => p.userId !== selfId);
  const selfPlayer = players.find((p) => p.userId === selfId);

  return {
    phase,
    roomId,
    words,
    duration,
    players,
    opponents,
    selfPlayer,
    countdown,
    results,
    liveOpponents,
    raceStartedAt,
    opponentLeft,
    error,
    positionsRef,
    selfId,
    joinQueue,
    leaveQueue,
    sendTypingUpdate,
    reset,
  };
}
