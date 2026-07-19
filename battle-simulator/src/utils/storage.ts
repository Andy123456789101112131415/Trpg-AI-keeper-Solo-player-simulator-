import type { Character, GameState } from '@/types/game';

const STORAGE_KEYS = {
  CHARACTER: 'coc_character',
  GAME_STATE: 'coc_game_state',
  CHARACTERS_LIST: 'coc_characters_list'
};

// 保存角色
export function saveCharacter(character: Character): void {
  localStorage.setItem(STORAGE_KEYS.CHARACTER, JSON.stringify(character));
  
  // 更新角色列表
  const list = getCharactersList();
  const index = list.findIndex(c => c.id === character.id);
  if (index >= 0) {
    list[index] = character;
  } else {
    list.push(character);
  }
  localStorage.setItem(STORAGE_KEYS.CHARACTERS_LIST, JSON.stringify(list));
}

// 获取当前角色
export function getCurrentCharacter(): Character | null {
  const data = localStorage.getItem(STORAGE_KEYS.CHARACTER);
  return data ? JSON.parse(data) : null;
}

// 获取角色列表
export function getCharactersList(): Character[] {
  const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS_LIST);
  return data ? JSON.parse(data) : [];
}

// 删除角色
export function deleteCharacter(id: string): void {
  const list = getCharactersList().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CHARACTERS_LIST, JSON.stringify(list));
  
  const current = getCurrentCharacter();
  if (current?.id === id) {
    localStorage.removeItem(STORAGE_KEYS.CHARACTER);
  }
}

// 保存游戏状态
export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
}

// 获取游戏状态
export function getGameState(): GameState | null {
  const data = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
  return data ? JSON.parse(data) : null;
}

// 清除游戏状态
export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
}
