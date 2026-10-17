/** Browser-local draw records: 48 rewards plus a no-prize result. */
// Shared static hosts may serve multiple games from one origin; scope records to this page.
const pageStorageScope = typeof location === 'undefined' ? '' : location.pathname + location.search;
export const STORAGE_KEY = 'little-love-lucky-wheel:first-edition:v1:' + encodeURIComponent(pageStorageScope);
const EVENT_ID = 'love-first-edition';
const NO_PRIZE_ID = 'thanks-try-again';

export const CATEGORIES = [
  {
    id: 'sweet', title: '甜蜜补给', icon: '🧋', color: '#f8c7ce',
    prizes: [
      { id: 'sweet-tea', title: '奶茶我请', detail: '你喜欢的奶茶任选一杯，30 元以内。', note: '今天的甜度，你说了算。', weight: 4200, budget: 30 },
      { id: 'sweet-dessert', title: '甜品时间', detail: '蛋糕、冰淇淋或其他甜品任选一份，30 元以内。', note: '给普通的一天，加一点甜。', weight: 3500, budget: 30 },
      { id: 'sweet-coffee', title: '咖啡补给', detail: '喜欢的咖啡任选一杯，30 元以内。', note: '这一杯，陪你慢慢醒过来。', weight: 2100, budget: 30 },
      { id: 'sweet-fruit', title: '水果投喂', detail: '一份喜欢的水果分享盒，30 元以内。', note: '喜欢的水果，都想给你留一口。', weight: 2100, budget: 30 },
      { id: 'sweet-icecream', title: '冰淇淋时刻', detail: '冰淇淋任选一份，20 元以内。', note: '今天就从选一个喜欢的口味开始。', weight: 1400, budget: 20 },
      { id: 'sweet-breakfast', title: '早餐投喂', detail: '提前约好一天，安排一份你喜欢的早餐，25 元以内。', note: '早安，也要给你一点甜。', weight: 700, budget: 25 },
    ],
  },
  {
    id: 'snack', title: '馋嘴自由', icon: '🍿', color: '#ffe6b9',
    prizes: [
      { id: 'snack-box', title: '零食补货', detail: '一份 30 元零食礼包，口味由你来定。', note: '喜欢的每一口，都给你留着。', weight: 3500, budget: 30 },
      { id: 'snack-night', title: '夜宵安排', detail: '任选一份想吃的夜宵，40 元以内。', note: '今晚的快乐，可以再加一餐。', weight: 2800, budget: 40 },
      { id: 'snack-chicken', title: '炸鸡快乐券', detail: '喜欢的炸鸡任选一份，40 元以内。', note: '酥酥脆脆的快乐，给你安排。', weight: 2100, budget: 40 },
      { id: 'snack-roasted', title: '暖手小吃券', detail: '烤红薯或烤玉米任选一份，20 元以内。', note: '热乎乎的，捧在手里刚刚好。', weight: 1400, budget: 20 },
      { id: 'snack-bread', title: '面包小口袋', detail: '面包店挑一小袋喜欢的面包，总预算 30 元。', note: '把刚出炉的香气带给你。', weight: 1400, budget: 30 },
      { id: 'snack-oden', title: '热乎关东煮', detail: '关东煮任选一份，配菜你选，25 元以内。', note: '选你爱吃的，再喝一口热汤。', weight: 1400, budget: 25 },
    ],
  },
  {
    id: 'care', title: '贴心服务', icon: '🫶', color: '#dce9d7',
    prizes: [
      { id: 'care-massage', title: '按摩体验券', detail: '肩颈按摩 15 分钟，时间你来挑。', note: '辛苦啦，今天轮到你好好放松。', weight: 2800, budget: 0 },
      { id: 'care-help', title: '偷懒一次券', detail: '帮你完成一件提前约好的小事。', note: '这一件交给我，你负责歇一会儿。', weight: 2800, budget: 0 },
      { id: 'care-dishes', title: '洗碗代班券', detail: '一起吃完饭后，由我负责洗碗收拾一次。', note: '你先休息，这一餐我来收尾。', weight: 1400, budget: 0 },
      { id: 'care-parcel', title: '取件小帮手', detail: '帮你取一次附近的快递，往返 30 分钟以内。', note: '你的包裹，我来接一下。', weight: 1400, budget: 0 },
      { id: 'care-organize', title: '收纳小帮手', detail: '选一处桌面或一格柜子，帮你一起整理 30 分钟。', note: '腾出一点空间，也给心情松松绑。', weight: 1400, budget: 0 },
      { id: 'care-bag', title: '出门背包券', detail: '在一次约会中，帮你背包、拿小件物品。', note: '轻轻松松出门，好好享受今天。', weight: 1400, budget: 0 },
    ],
  },
  {
    id: 'date', title: '约会安排', icon: '🎬', color: '#e6dcf3',
    prizes: [
      { id: 'date-movie', title: '电影约会券', detail: '一起看一场你选的电影，预算 100 元。', note: '故事在银幕上，你在我身旁。', weight: 1400, budget: 100 },
      { id: 'date-dinner', title: '今晚吃点好的', detail: '100 元双人吃饭基金，约好时间一起去。', note: '想吃的那一家，这次就安排。', weight: 1400, budget: 100 },
      { id: 'date-picnic', title: '公园野餐券', detail: '准备一次双人公园野餐，食物和饮品总预算 80 元。', note: '找一块草地，把下午留给我们。', weight: 700, budget: 80 },
      { id: 'date-exhibition', title: '一起去看展', detail: '一次双人看展邀请，门票基金 80 元，展览一起挑。', note: '去看一点新鲜的，也听听你的想法。', weight: 700, budget: 80 },
      { id: 'date-games', title: '双人游玩券', detail: '一起体验桌游或电玩，活动总预算 60 元。', note: '今天认真玩，输赢都要开心。', weight: 700, budget: 60 },
      { id: 'date-city', title: '城市漫游券', detail: '一起逛一个没去过的街区，饮食与小体验总预算 80 元。', note: '走一条新路，留下一个新回忆。', weight: 700, budget: 80 },
    ],
  },
  {
    id: 'company', title: '专属陪伴', icon: '💬', color: '#f8d9c6',
    prizes: [
      { id: 'company-talk', title: '认真听你说', detail: '留出半小时，听你分享最近的开心和烦恼。', note: '你的碎碎念，我都想听。', weight: 2800, budget: 0 },
      { id: 'company-walk', title: '散步邀请函', detail: '一起散步一小时，路线你来选。', note: '慢慢走，今晚还有很多话。', weight: 2100, budget: 0 },
      { id: 'company-show', title: '追剧搭子上线', detail: '陪你看喜欢的剧，最多两集、90 分钟以内。', note: '这一集，我们一起看。', weight: 2100, budget: 0 },
      { id: 'company-game', title: '游戏搭子上线', detail: '陪你玩喜欢的游戏 45 分钟，游戏提前一起选。', note: '今天的队友，已经就位。', weight: 1400, budget: 0 },
      { id: 'company-story', title: '睡前故事券', detail: '找一个合适的晚上，给你讲 10 分钟睡前故事。', note: '把今天轻轻放下，做个好梦。', weight: 1400, budget: 0 },
      { id: 'company-study', title: '安静陪你一会儿', detail: '一起专注学习或做自己的事一小时，休息时聊聊天。', note: '各自认真，也一起度过这一小时。', weight: 1400, budget: 0 },
    ],
  },
  {
    id: 'romance', title: '浪漫掉落', icon: '🌷', color: '#f1d1e3',
    prizes: [
      { id: 'romance-flower', title: '花花送达', detail: '一束专门挑给你的小花，预算 50 元。', note: '挑花的时候，想的都是你。', weight: 1750, budget: 50 },
      { id: 'romance-letter', title: '只写给你的信', detail: '一封认真手写的信，不能拿一句话敷衍。', note: '有些喜欢，想一笔一画地告诉你。', weight: 1400, budget: 0 },
      { id: 'romance-photo', title: '专属摄影师', detail: '在一次约会中认真帮你拍照 45 分钟，再一起选出喜欢的照片。', note: '想把你今天的笑，认真留住。', weight: 1400, budget: 0 },
      { id: 'romance-album', title: '回忆小相册', detail: '一起挑 6 张照片，打印并做成小相册，总预算 50 元。', note: '把那些舍不得删的瞬间装订起来。', weight: 1050, budget: 50 },
      { id: 'romance-handmade', title: '手作小礼物', detail: '亲手做一份小礼物送给你，材料预算 50 元。', note: '慢慢做，把心意放进去。', weight: 700, budget: 50 },
      { id: 'romance-voice', title: '专属晚安语音', detail: '录一段至少 60 秒、只给你的晚安语音。', note: '想把这一句晚安，多留一会儿。', weight: 700, budget: 0 },
    ],
  },
  {
    id: 'redpacket', title: '惊喜红包', icon: '🧧', color: '#f8d2c1',
    prizes: [
      { id: 'redpacket-520', title: '一点点心动', detail: '获得一个 5.20 元红包，找你的男朋友领取。', note: '金额小小的，心意是认真的。', weight: 2800, budget: 5.20 },
      { id: 'redpacket-1314', title: '偏爱已到账', detail: '获得一个 13.14 元红包，找你的男朋友领取。', note: '把这份小小的偏爱收好。', weight: 1750, budget: 13.14 },
      { id: 'redpacket-666', title: '顺顺利利', detail: '获得一个 6.66 元红包，找你的男朋友领取。', note: '希望你今天顺顺利利。', weight: 1050, budget: 6.66 },
      { id: 'redpacket-888', title: '好运加一点', detail: '获得一个 8.88 元红包，找你的男朋友领取。', note: '再往你口袋里，放一点好运。', weight: 700, budget: 8.88 },
      { id: 'redpacket-2000', title: '今天给你加餐', detail: '获得一个 20.00 元红包，找你的男朋友领取。', note: '留给今天突然想吃的那一口。', weight: 350, budget: 20 },
      { id: 'redpacket-5200', title: '今天想宠你', detail: '获得一个 52.00 元红包，找你的男朋友领取。', note: '今天的偏爱，想多给你一些。', weight: 350, budget: 52 },
    ],
  },
  {
    id: 'grand', title: '隐藏大奖', icon: '🎁', color: '#f1e7b8',
    prizes: [
      { id: 'grand-wish', title: '心愿基金', detail: '100 元心愿基金，买一件你最近想要的小东西。', note: '你的小心愿，今天有人承包。', weight: 350, budget: 100 },
      { id: 'grand-date', title: '约会策划交给我', detail: '由我安排一次半日约会，活动预算 100 元。', note: '你只管赴约，剩下的我来准备。', weight: 350, budget: 100 },
      { id: 'grand-giftbox', title: '专属惊喜礼盒', detail: '按你的喜好准备一份实体礼物礼包，总预算 100 元。', note: '挑礼物这件事，我会认真想一想。', weight: 175, budget: 100 },
      { id: 'grand-three', title: '惊喜三连', detail: '同一天安排一份早餐、一杯饮品和一份小礼物，合计预算 100 元。', note: '从早安开始，把惊喜分三次送给你。', weight: 175, budget: 100 },
      { id: 'grand-home', title: '居家主题约会', detail: '布置一次主题居家约会，小吃与布置合计预算 100 元。', note: '把熟悉的小空间，变成今晚的约会地点。', weight: 175, budget: 100 },
      { id: 'grand-handcraft', title: '一起做件小作品', detail: '一次双人手作计划，材料或体验费用合计预算 100 元。', note: '一起动手，把这一天留在作品里。', weight: 175, budget: 100 },
    ],
  },
  {
    id: 'thanks', title: '谢谢惠顾', icon: '🍀', color: '#dce5d6',
    prizes: [
      { id: NO_PRIZE_ID, title: '谢谢惠顾', detail: '这次没中奖，再转一次试试。', note: '好运在下一转等你。', weight: 30000, budget: 0 },
    ],
  },
].map(category => Object.freeze({ ...category, weight: category.prizes.reduce((sum, prize) => sum + prize.weight, 0), prizes: Object.freeze(category.prizes.map(Object.freeze)) }));
Object.freeze(CATEGORIES);

export const OUTCOME_COUNT = CATEGORIES.reduce((sum, category) => sum + category.prizes.length, 0);
export const PRIZE_COUNT = OUTCOME_COUNT - 1;
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
        || !Number.isInteger(t.categoryIndex) || !CATEGORIES[t.categoryIndex]
        || !Number.isInteger(t.prizeIndex) || t.prizeIndex < 0
        || t.prizeIndex >= CATEGORIES[t.categoryIndex].prizes.length) return null;
    const category = CATEGORIES[t.categoryIndex];
    const prize = category.prizes[t.prizeIndex];
    const validStatuses = isNoPrize(t) ? ['unrevealed', 'missed'] : ['unrevealed', 'available', 'redeemed'];
    if (prize.id !== t.prizeId || !validStatuses.includes(t.status)
        || !validTime(t.createdAt)
        || !['title', 'detail', 'note', 'icon', 'categoryTitle'].every(key => validString(t[key]))) return null;
    if (t.status === 'redeemed') {
      if (!validTime(t.redeemedAt) || t.redeemedAt < t.createdAt) return null;
    } else if (t.redeemedAt !== null) return null;
    ids.add(t.id);
    tickets.push({ id: t.id, prizeId: t.prizeId, categoryIndex: t.categoryIndex, prizeIndex: t.prizeIndex,
      title: t.title, detail: t.detail, note: t.note, icon: t.icon, categoryTitle: t.categoryTitle,
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
