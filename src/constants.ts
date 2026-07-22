import type { ListingCategory } from './types';

export const CATEGORIES: { value: ListingCategory; labelRu: string; labelKy: string; emoji: string }[] = [
  { value: 'vegetables', labelRu: 'Овощи', labelKy: 'Овощи', emoji: '🥬' },
  { value: 'fruits', labelRu: 'Фрукты', labelKy: 'Фрукты', emoji: '🍎' },
  { value: 'grain', labelRu: 'Зерно', labelKy: 'Зерно', emoji: '🌾' },
  { value: 'dairy', labelRu: 'Молочное', labelKy: 'Молочное', emoji: '🥛' },
  { value: 'meat', labelRu: 'Мясо', labelKy: 'Мясо', emoji: '🥩' },
  { value: 'poultry', labelRu: 'Птица', labelKy: 'Птица', emoji: '🐔' },
  { value: 'eggs', labelRu: 'Яйца', labelKy: 'Яйца', emoji: '🥚' },
  { value: 'honey', labelRu: 'Мёд', labelKy: 'Мёд', emoji: '🍯' },
  { value: 'feed', labelRu: 'Корма', labelKy: 'Корма', emoji: '🌿' },
  { value: 'fertilizer', labelRu: 'Удобрения', labelKy: 'Удобрения', emoji: '🪴' },
  { value: 'seeds', labelRu: 'Семена', labelKy: 'Семена', emoji: '🌱' },
  { value: 'livestock', labelRu: 'Животные', labelKy: 'Животные', emoji: '🐄' },
  { value: 'equipment', labelRu: 'Техника', labelKy: 'Техника', emoji: '🚜' },
  { value: 'irrigation', labelRu: 'Полив', labelKy: 'Полив', emoji: '💧' },
  { value: 'greenhouse', labelRu: 'Теплицы', labelKy: 'Теплицы', emoji: '🏗️' },
  { value: 'other', labelRu: 'Другое', labelKy: 'Другое', emoji: '📦' },
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
  buyer: 'Покупатель',
  cooperative: 'Кооператив',
  exporter: 'Экспортёр',
  transport: 'Транспорт',
  company: 'Компания',
  admin: 'Администратор',
};

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  new:       { label: 'Новый',      color: 'badge-blue' },
  confirmed: { label: 'Подтверждён', color: 'badge-green' },
  shipped:   { label: 'В пути',     color: 'badge-orange' },
  completed: { label: 'Завершён',   color: 'badge-green' },
  cancelled: { label: 'Отменён', color: 'badge-gray' },
};

export const TRANSPORT_TYPES: Record<string, string> = {
  truck: 'Фура', kamaz: 'КамАЗ', gazelle: 'Газель', refrigerator: 'Рефрижератор', tractor: 'Трактор',
};

export const catLabel = (v: string, lang: 'ru' | 'ky' = 'ru') => {
  const c = CATEGORIES.find(x => x.value === v);
  return c ? (lang === 'ru' ? c.labelRu : c.labelKy) : v;
};
