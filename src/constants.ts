import type { ListingCategory } from './types';

export const CATEGORIES: { value: ListingCategory; labelRu: string; labelKy: string; emoji: string }[] = [
  { value: 'vegetables', labelRu: 'Овощи', labelKy: 'Жашылча', emoji: '🥬' },
  { value: 'fruits', labelRu: 'Фрукты', labelKy: 'Мөмө', emoji: '🍎' },
  { value: 'grain', labelRu: 'Зерно', labelKy: 'Дан', emoji: '🌾' },
  { value: 'dairy', labelRu: 'Молочное', labelKy: 'Сүт', emoji: '🥛' },
  { value: 'meat', labelRu: 'Мясо', labelKy: 'Эт', emoji: '🥩' },
  { value: 'poultry', labelRu: 'Птица', labelKy: 'Тоок', emoji: '🐔' },
  { value: 'eggs', labelRu: 'Яйца', labelKy: 'Жумуртка', emoji: '🥚' },
  { value: 'honey', labelRu: 'Мёд', labelKy: 'Бал', emoji: '🍯' },
  { value: 'feed', labelRu: 'Корма', labelKy: 'Тоют', emoji: '🌿' },
  { value: 'fertilizer', labelRu: 'Удобрения', labelKy: 'Жер семирткич', emoji: '🪴' },
  { value: 'seeds', labelRu: 'Семена', labelKy: 'Үрөн', emoji: '🌱' },
  { value: 'livestock', labelRu: 'Животные', labelKy: 'Мал', emoji: '🐄' },
  { value: 'equipment', labelRu: 'Техника', labelKy: 'Техника', emoji: '🚜' },
  { value: 'irrigation', labelRu: 'Полив', labelKy: 'Сугаруу', emoji: '💧' },
  { value: 'greenhouse', labelRu: 'Теплицы', labelKy: 'Күнөскана', emoji: '🏗️' },
  { value: 'other', labelRu: 'Другое', labelKy: 'Башкалар', emoji: '📦' },
];

export const REGIONS = [
  'Чуйская область',
  'Иссык-Кульская область',
  'Ошская область',
  'Джалал-Абадская область',
  'Баткенская область',
  'Нарынская область',
  'Таласская область',
  'Бишкек',
  'Ош',
];

export const ROLE_LABELS: Record<string, string> = {
  farmer: 'Фермер',
  buyer: 'Сатып алуучу',
  cooperative: 'Кооператив',
  exporter: 'Экспорттоочу',
  transport: 'Транспорт',
  company: 'Компания',
  admin: 'Администратор',
};

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  new:       { label: 'Жаңы',      color: 'badge-blue' },
  confirmed: { label: 'Ырасталган', color: 'badge-green' },
  shipped:   { label: 'Жолдо',     color: 'badge-orange' },
  completed: { label: 'Аяктады',   color: 'badge-green' },
  cancelled: { label: 'Жокко чыгарылды', color: 'badge-gray' },
};

export const TRANSPORT_TYPES: Record<string, string> = {
  truck: 'Фура', kamaz: 'КамАЗ', gazelle: 'Газель', refrigerator: 'Рефрижератор', tractor: 'Трактор',
};

export const catLabel = (v: string, lang: 'ru' | 'ky' = 'ru') => {
  const c = CATEGORIES.find(x => x.value === v);
  return c ? (lang === 'ru' ? c.labelRu : c.labelKy) : v;
};
