import type { AnyGame } from '../engine/types';
import { chessGame } from './chess';
import { othelloGame } from './othello';
import { conversationGame } from './conversation';
import { storyGame } from './story';

export const GAMES: AnyGame[] = [chessGame, othelloGame, conversationGame, storyGame];

export const gameById = (id: string): AnyGame => GAMES.find((g) => g.id === id) ?? GAMES[0];
