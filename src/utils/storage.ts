import type { Character, GameState, CharacterAttributes, Skill } from '@/types/game';
import { calculateDerivedAttributes, DEFAULT_SKILLS } from '@/utils/gameLogic';

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

// ── 导出角色为JSON文件 ──
export function exportCharactersToFile(): void {
  const list = getCharactersList();
  if (list.length === 0) return;
  
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coc_characters_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function extractText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function findCell(rows: string[][], predicate: (value: string) => boolean): [number, number] | null {
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    for (let c = 0; c < row.length; c += 1) {
      if (predicate(row[c])) return [r, c];
    }
  }
  return null;
}

function getNextValue(row: string[], start: number): string {
  for (let c = start + 1; c < row.length; c += 1) {
    if (row[c]) return row[c];
  }
  return '';
}

function parseCharacterFromRows(rows: string[][]): Character | null {
  const normalized = rows.map(r => r.map(extractText));
  const namePos = findCell(normalized, v => v === '姓名');
  const agePos = findCell(normalized, v => v === '年龄');
  const occupationPos = findCell(normalized, v => v === '职业');
  const backgroundPos = findCell(normalized, v => v === '背景');

  const attributes: CharacterAttributes = {
    STR: 50,
    CON: 50,
    SIZ: 50,
    DEX: 50,
    APP: 50,
    INT: 50,
    POW: 50,
    EDU: 50,
    LUCK: 50,
  };

  const attrLabels: Record<keyof CharacterAttributes, RegExp> = {
    STR: /^(STR|力量)$/i,
    CON: /^(CON|体质)$/i,
    SIZ: /^(SIZ|体型)$/i,
    DEX: /^(DEX|敏捷)$/i,
    APP: /^(APP|外貌)$/i,
    INT: /^(INT|智力)$/i,
    POW: /^(POW|意志)$/i,
    EDU: /^(EDU|教育)$/i,
    LUCK: /^(LUCK|幸运)$/i,
  };

  for (const [key, regex] of Object.entries(attrLabels) as Array<[keyof CharacterAttributes, RegExp]>) {
    const pos = findCell(normalized, value => regex.test(value));
    if (pos) {
      const [r, c] = pos;
      const raw = getNextValue(normalized[r], c);
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        attributes[key] = parsed;
      }
    }
  }

  const skillValues: Record<string, number> = {};
  const skillSet = new Set<string>(DEFAULT_SKILLS.map(s => s.name));
  for (const row of normalized) {
    for (let i = 0; i < row.length; i += 1) {
      const cell = row[i];
      if (skillSet.has(cell)) {
        const raw = getNextValue(row, i);
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) {
          skillValues[cell] = parsed;
        }
      }
    }
  }

  const name = namePos ? getNextValue(normalized[namePos[0]], namePos[1]) : '';
  const ageText = agePos ? getNextValue(normalized[agePos[0]], agePos[1]) : '';
  const occupation = occupationPos ? getNextValue(normalized[occupationPos[0]], occupationPos[1]) : '';
  const background = backgroundPos ? getNextValue(normalized[backgroundPos[0]], backgroundPos[1]) : '';

  if (!name) return null;

  const skills: Skill[] = DEFAULT_SKILLS.map(skill => ({
    name: skill.name,
    baseValue: skill.baseValue,
    currentValue: skillValues[skill.name] ?? skill.baseValue,
    occupationPoints: 0,
    interestPoints: 0,
    category: skill.category as Skill['category'],
  }));

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    age: Math.max(18, Number.parseInt(ageText, 10) || 18),
    sex: '男',
    occupation: occupation || '未知职业',
    creditRating: 20,
    background,
    attributes,
    derived: calculateDerivedAttributes(attributes),
    skills,
    weapons: [],
    items: [],
    createdAt: Date.now(),
  };
}

function importCharactersFromJsonFile(file: File): Promise<Character[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) throw new Error('格式错误：需要角色数组');
        // 合并到现有列表（以ID去重）
        const existing = getCharactersList();
        const existingIds = new Set(existing.map(c => c.id));
        const newChars = data.filter((c: Character) => !existingIds.has(c.id));
        const merged = [...existing, ...newChars];
        localStorage.setItem(STORAGE_KEYS.CHARACTERS_LIST, JSON.stringify(merged));
        if (merged.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CHARACTER, JSON.stringify(merged[merged.length - 1]));
        }
        resolve(merged);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

export function importCharactersFromFile(file: File): Promise<Character[]> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.json')) {
    return importCharactersFromJsonFile(file);
  }
  // XLSX 导入功能已封存，请先导出为 JSON 再导入
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return Promise.reject(new Error('XLSX 导入功能已封存。请先将角色卡导出为 JSON 格式再导入。'));
  }
  return Promise.reject(new Error('不支持的文件类型，请选择 .json 文件'));
}

async function loadXlsxModule(): Promise<any> {
  const dynamicImport = new Function('moduleName', 'return import(moduleName);') as (
    moduleName: string,
  ) => Promise<any>;

  const candidates = [
    'xlsx',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.mjs',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mjs',
    'https://esm.sh/xlsx@0.18.5',
  ];

  for (const moduleName of candidates) {
    const workbookModule = await dynamicImport(moduleName).catch(() => null);
    if (!workbookModule) continue;
    const module = workbookModule.default ?? workbookModule;
    if (module && typeof module.read === 'function') {
      return module;
    }
  }

  return null;
}

export async function importCharactersFromXlsxFile(file: File): Promise<Character[]> {
  const XLSX: any = await loadXlsxModule();
  if (!XLSX) {
    throw new Error('未安装 xlsx 库，无法导入 XLSX 文件。请先安装依赖后重试。');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const characters: Character[] = [];
        const sheets = workbook.SheetNames.filter((name: string) => ['人物卡', '简化卡'].some(keyword => name.includes(keyword)));
        const targetSheets = sheets.length > 0 ? sheets : workbook.SheetNames;

        for (const sheetName of targetSheets) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: true }) as string[][];
          const character = parseCharacterFromRows(rows);
          if (character) {
            characters.push(character);
          }
        }

        if (characters.length === 0) {
          reject(new Error('未在 XLSX 文件中解析到有效角色，请确认为COC人物卡格式。'));
          return;
        }

        const existing = getCharactersList();
        const existingIds = new Set(existing.map(c => c.id));
        const newChars = characters.filter(c => !existingIds.has(c.id));
        const merged = [...existing, ...newChars];
        localStorage.setItem(STORAGE_KEYS.CHARACTERS_LIST, JSON.stringify(merged));
        if (merged.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CHARACTER, JSON.stringify(merged[merged.length - 1]));
        }
        resolve(merged);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
