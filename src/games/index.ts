import type { AnyGame } from '../engine/types';
import { chessGame } from './chess';
import { othelloGame } from './othello';
import { conversationGame } from './conversation';
import { storyGame } from './story';
import { connect4Game } from './connect4';

export const GAMES: AnyGame[] = [chessGame, othelloGame, connect4Game, conversationGame, storyGame];

export const gameById = (id: string): AnyGame => GAMES.find((g) => g.id === id) ?? GAMES[0];
