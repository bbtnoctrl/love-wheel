import { GAME_CONFIG } from './config.js?v=mystery-20261018-1';
import { assertConfig, buildCategories } from './config-schema.js?v=mystery-20261018-1';

/** Browser-local draw records with editable rewards and sealed mystery gifts. */
// Shared static hosts may serve multiple games from one origin; scope records to this page.
const pageStorageScope = typeof location === 'undefined' ? '' : location.pathname + location.search;
export const STORAGE_KEY = 'little-love-lucky-wheel:first-edition:v1:' + encodeURIComponent(pageStorageScope);
const EVENT_ID = 'love-first-edition';
const NO_PRIZE_ID = 'thanks-try-again';

const validatedConfig = assertConfig(GAME_CONFIG);
export const SETTINGS = Object.freeze(validatedConfig.settings);
export const CATEGORIES = buildCategories(validatedConfig);
const prizeLocations = new Map(CATEGORIES.flatMap((category, categoryIndex) => category.prizes.map((prize, prizeIndex) => [prize.id, { categoryIndex, prizeIndex, prize }])));
const activeRewards = CATEGORIES.flatMap(category => category.prizes).filter(prize => prize.enabled && prize.id !== NO_PRIZE_ID);
export const PRIZE_COUNT = activeRewards.length;
export const OUTCOME_COUNT = PRIZE_COUNT + 1;
export const BLIND_PRIZE_COUNT = activeRewards.filter(prize => prize.blind).length;
export const ACTIVE_CATEGORY_COUNT = CATEGORIES.filter(category => category.weight > 0).length;
export const TOTAL_WEIGHT = CATEGORIES.reduce((sum, category) => sum + category.weight, 0);

export function formatProbability(weight) {
  return `${(weight * 100 / TOTAL_WEIGHT).toLocaleString('zh-CN', { maximumFractionDigits: 3, useGrouping: false })}%`;
}

export function isNoPrize(ticket) {
  return ticket?.prizeId === NO_PRIZE_ID;
}

/** The same weights drive both the lottery and the visible wheel geometry. */
export function getWheelSegments() {
  let startAngle = -90 - CATEGORIES[0].weight / TOTAL_WEIGHT * 180;
  return CATEGORIES.map((category, categoryIndex) => {
    const spanAngle = category.weight / TOTAL_WEIGHT * 360;
    const segment = { categoryIndex, startAngle, endAngle: startAngle + spanAngle,
      centerAngle: startAngle + spanAngle / 2, spanAngle, weight: category.weight };
    startAngle += spanAngle;
    return segment;
  });
}

export function createInitialState() {
  return { schemaVersion: 2, eventId: EVENT_ID, tickets: [], pendingTicketId: null };
}

function validString(value, maximum = 1000) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

function validTime(value) {
  return Number.isFinite(value) && value >= 0 && value <= 8640000000000000;
}

/** Preserve legacy tickets while migrating to draws without an edition limit. */
export function validateState(raw) {
  if (!raw || typeof raw !== 'object' || raw.eventId !== EVENT_ID
      || !Array.isArray(raw.tickets)) return null;
  if (raw.schemaVersion === 1) {
    // The original edition allowed three tickets; validate it before migration.
    if (raw.totalChances !== 3 || raw.tickets.length > 3) return null;
  } else if (raw.schemaVersion !== 2) return null;
  const ids = new Set();
  const tickets = [];
  for (const t of raw.tickets) {
    if (!t || !validString(t.id, 120) || ids.has(t.id)
        || !Number.isInteger(t.categoryIndex) || t.categoryIndex < 0
        || !Number.isInteger(t.prizeIndex) || t.prizeIndex < 0
        || !validString(t.prizeId, 80)) return null;
    // Stable IDs keep existing snapshots usable if configuration order changes.
    const position = prizeLocations.get(t.prizeId);
    if (!position) return null;
    const { prize, categoryIndex, prizeIndex } = position;
    const validStatuses = isNoPrize(t) ? ['unrevealed', 'missed'] : ['unrevealed', 'available', 'redeemed'];
    if (prize.id !== t.prizeId || !validStatuses.includes(t.status)
        || !validTime(t.createdAt)
        || !['title', 'detail', 'note', 'icon', 'categoryTitle'].every(key => validString(t[key]))) return null;
    if (t.blind !== undefined && typeof t.blind !== 'boolean') return null;
    const blind = t.blind === true;
    if (blind && (isNoPrize(t) || !validString(t.blindLabel, 40) || !validString(t.blindHint, 240))) return null;
    if (t.status === 'redeemed') {
      if (!validTime(t.redeemedAt) || t.redeemedAt < t.createdAt) return null;
    } else if (t.redeemedAt !== null) return null;
    ids.add(t.id);
    tickets.push({ id: t.id, prizeId: t.prizeId, categoryIndex, prizeIndex,
      title: t.title, detail: t.detail, note: t.note, icon: t.icon, categoryTitle: t.categoryTitle,
      blind, blindLabel: blind ? t.blindLabel : '', blindHint: blind ? t.blindHint : '',
      createdAt: t.createdAt, status: t.status, redeemedAt: t.redeemedAt });
  }
  const pending = tickets.filter(t => t.status === 'unrevealed');
  if (pending.length > 1 || (pending.length === 1 && raw.pendingTicketId !== pending[0].id)
      || (pending.length === 0 && raw.pendingTicketId !== null)) return null;
  return { ...createInitialState(), tickets, pendingTicketId: raw.pendingTicketId };
}

function assertState(state) {
  const valid = validateState(state);
  if (!valid) throw new Error('奖券记录暂时无法读取，请保留当前浏览器数据。');
  return valid;
}

export function loadState(storage = globalThis.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return createInitialState();
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('奖券记录暂时无法读取，请保留当前浏览器数据。'); }
  return assertState(parsed);
}

export function saveState(storage, state) {
  const valid = assertState(state);
  const serialized = JSON.stringify(valid);
  storage.setItem(STORAGE_KEY, serialized);
  if (storage.getItem(STORAGE_KEY) !== serialized) throw new Error('当前浏览器暂时无法保存奖券，请换到手机浏览器打开。');
  return valid;
}

export function getPendingTicket(state) {
  return state.tickets.find(t => t.id === state.pendingTicketId && t.status === 'unrevealed') ?? null;
}

function secureRandomBelow(upperBound) {
  if (!Number.isSafeInteger(upperBound) || upperBound < 1 || upperBound > 4294967296) throw new Error('抽奖权重超出支持范围，请检查配置。');
  const value = new Uint32Array(1);
  if (!globalThis.crypto?.getRandomValues) throw new Error('请通过安全的网页链接打开抽奖。');
  // Rejection sampling gives every integer weight unit exactly the same chance.
  const limit = Math.floor(4294967296 / upperBound) * upperBound;
  do { globalThis.crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % upperBound;
}

function newTicketId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint32Array(4);
  if (!globalThis.crypto?.getRandomValues) throw new Error('请通过安全的网页链接打开抽奖。');
  globalThis.crypto.getRandomValues(bytes);
  return `gift-${Array.from(bytes, n => n.toString(16).padStart(8, '0')).join('')}`;
}

export function drawTicket(state, options = {}) {
  const valid = assertState(state);
  if (getPendingTicket(valid)) throw new Error('还有一张好运等待刮开。');
  let cursor;
  if (options.random) {
    const value = options.random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('抽奖暂时没有准备好，请再试一次。');
    cursor = Math.floor(value * TOTAL_WEIGHT);
  } else cursor = secureRandomBelow(TOTAL_WEIGHT);
  let categoryIndex, prizeIndex;
  choose: for (let ci = 0; ci < CATEGORIES.length; ci += 1) {
    for (let pi = 0; pi < CATEGORIES[ci].prizes.length; pi += 1) {
      const weight = CATEGORIES[ci].prizes[pi].weight;
      if (cursor < weight) { categoryIndex = ci; prizeIndex = pi; break choose; }
      cursor -= weight;
    }
  }
  const category = CATEGORIES[categoryIndex];
  const prize = category.prizes[prizeIndex];
  const createdAt = options.now ?? Date.now();
  const id = options.id ?? newTicketId();
  if (!validString(id, 120) || valid.tickets.some(t => t.id === id) || !validTime(createdAt)) {
    throw new Error('本次奖券暂时无法保存，请重新尝试。');
  }
  const ticket = { id, prizeId: prize.id, categoryIndex, prizeIndex, title: prize.title,
    detail: prize.detail, note: prize.note, icon: category.icon, categoryTitle: category.title,
    blind: prize.blind, blindLabel: prize.blind ? prize.blindLabel : '', blindHint: prize.blind ? prize.blindHint : '',
    createdAt, status: 'unrevealed', redeemedAt: null };
  return { state: { ...valid, tickets: [...valid.tickets, ticket], pendingTicketId: id }, ticket };
}

export function revealTicket(state, ticketId) {
  const valid = assertState(state);
  const ticket = valid.tickets.find(t => t.id === ticketId);
  if (!ticket) throw new Error('这张奖券暂时没有找到。');
  if (ticket.status !== 'unrevealed') return valid;
  return { ...valid, pendingTicketId: null, tickets: valid.tickets.map(t => t.id === ticketId ? { ...t, status: isNoPrize(t) ? 'missed' : 'available' } : t) };
}

export function redeemTicket(state, ticketId, now = Date.now()) {
  const valid = assertState(state);
  const ticket = valid.tickets.find(t => t.id === ticketId);
  if (!ticket) throw new Error('这张奖券暂时没有找到。');
  if (isNoPrize(ticket)) throw new Error('谢谢惠顾是未中奖结果，无需兑现。');
  if (ticket.status === 'redeemed') return valid;
  if (ticket.status === 'unrevealed') throw new Error('先刮开这张好运，再一起兑现吧。');
  if (!validTime(now) || now < ticket.createdAt) throw new Error('请检查手机时间后再试。');
  return { ...valid, tickets: valid.tickets.map(t => t.id === ticketId ? { ...t, status: 'redeemed', redeemedAt: now } : t) };
}
