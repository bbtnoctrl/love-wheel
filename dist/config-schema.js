/** Shared validation for the game and the offline configuration editor. */
const CONFIG_NO_PRIZE_ID = 'thanks-try-again';
const CONFIG_MAX_PRIZES = 300;

function configIsRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateConfig(raw) {
  const errors = [];
  const text = (value, label, maximum, allowEmpty = false) => {
    if (typeof value !== 'string' || value.length > maximum || (!allowEmpty && !value.trim())) {
      errors.push(`${label}请填写${allowEmpty ? '不超过' : '1–'}${maximum}个字符。`);
      return '';
    }
    return value.trim();
  };
  const number = (value, label, minimum, maximum, integer = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) {
      errors.push(`${label}应为${minimum}–${maximum}之间的${integer ? '整数' : '数字'}。`);
      return minimum;
    }
    return value;
  };
  const identifier = (value, label) => {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(value)) {
      errors.push(`${label}请使用小写英文字母、数字和短横线，以字母开头，最多80个字符。`);
      return '';
    }
    return value;
  };
  if (!configIsRecord(raw)) return { ok: false, errors: ['配置必须是一个 JSON 对象。'], value: null };
  if (raw.schemaVersion !== 1) errors.push('配置版本不支持，请使用本工具导出的配置文件。');
  const sourceSettings = configIsRecord(raw.settings) ? raw.settings : {};
  if (!configIsRecord(raw.settings)) errors.push('缺少页面设置 settings。');
  const settings = {
    siteTitle: text(sourceSettings.siteTitle, '网站名称', 24),
    recipientName: text(sourceSettings.recipientName, '她的称呼', 20, true),
    heroPrefix: text(sourceSettings.heroPrefix, '首页标题前半句', 16, true),
    heroHighlight: text(sourceSettings.heroHighlight, '首页标题重点文字', 16),
    subtitle: text(sourceSettings.subtitle, '首页副标题', 120),
    spinSeconds: number(sourceSettings.spinSeconds, '转盘时长（秒）', 1, 8),
    scratchRevealPercent: number(sourceSettings.scratchRevealPercent, '刮开揭晓阈值', 10, 80, true),
    noPrizePercent: number(sourceSettings.noPrizePercent, '谢谢惠顾比例', 1, 99, true),
  };
  if (!Array.isArray(raw.categories) || raw.categories.length < 1 || raw.categories.length > 24) {
    errors.push('需要1–24个奖品分类。');
    return { ok: false, errors, value: null };
  }
  const categoryIds = new Set();
  const prizeIds = new Set();
  let noPrizeCount = 0;
  let prizeCount = 0;
  let activeRealCount = 0;
  let realWeightTotal = 0;
  const categories = raw.categories.map((source, categoryIndex) => {
    const label = `第${categoryIndex + 1}个分类`;
    if (!configIsRecord(source)) { errors.push(`${label}格式不正确。`); return null; }
    const id = identifier(source.id, `${label}标识`);
    if (categoryIds.has(id)) errors.push(`分类标识重复：${id}`);
    categoryIds.add(id);
    const title = text(source.title, `${label}名称`, 24);
    const icon = text(source.icon, `${label}图标`, 24);
    const color = typeof source.color === 'string' && /^#[a-f\d]{6}$/i.test(source.color) ? source.color : '#f8c7ce';
    if (color !== source.color) errors.push(`${label}颜色应为 #RRGGBB 格式。`);
    if (!Array.isArray(source.prizes) || source.prizes.length === 0 || source.prizes.length > CONFIG_MAX_PRIZES) {
      errors.push(`${label}需要保留至少一个奖品条目，暂停奖品请使用“停用”。`);
      return { id, title, icon, color, prizes: [] };
    }
    const prizes = source.prizes.map((prize, prizeIndex) => {
      prizeCount += 1;
      const prizeLabel = `${title || label}中的第${prizeIndex + 1}项`;
      if (!configIsRecord(prize)) { errors.push(`${prizeLabel}格式不正确。`); return null; }
      const prizeId = identifier(prize.id, `${prizeLabel}标识`);
      if (prizeIds.has(prizeId)) errors.push(`奖品标识重复：${prizeId}`);
      prizeIds.add(prizeId);
      const enabled = prize.enabled === undefined ? true : prize.enabled;
      const blind = prize.blind === undefined ? false : prize.blind;
      if (typeof enabled !== 'boolean') errors.push(`${prizeLabel}启用状态应为 true 或 false。`);
      if (typeof blind !== 'boolean') errors.push(`${prizeLabel}盲盒状态应为 true 或 false。`);
      const weight = number(prize.weight, `${prizeLabel}权重`, 1, 100000, true);
      const result = {
        id: prizeId,
        title: text(prize.title, `${prizeLabel}真实名称`, 80),
        detail: text(prize.detail, `${prizeLabel}兑现内容`, 500),
        note: text(prize.note, `${prizeLabel}揭晓留言`, 240),
        weight,
        budget: number(prize.budget, `${prizeLabel}预算`, 0, 1000000),
        enabled: enabled === true,
        blind: blind === true,
        blindLabel: text(prize.blindLabel ?? '', `${prizeLabel}盲盒封面名称`, 40, !blind),
        blindHint: text(prize.blindHint ?? '', `${prizeLabel}盲盒提示`, 240, !blind),
      };
      if (prizeId === CONFIG_NO_PRIZE_ID) {
        noPrizeCount += 1;
        if (id !== 'thanks' || source.prizes.length !== 1) errors.push('“谢谢惠顾”必须单独保留在 thanks 分类。');
        if (!result.enabled || result.blind) errors.push('“谢谢惠顾”不可停用或设为盲盒，请在页面设置中调整它的比例。');
      } else if (result.enabled) {
        activeRealCount += 1;
        realWeightTotal += weight;
      }
      return result;
    });
    return { id, title, icon, color, prizes };
  });
  if (prizeCount > CONFIG_MAX_PRIZES) errors.push(`奖品条目合计不能超过${CONFIG_MAX_PRIZES}项（含停用和谢谢惠顾）。`);
  if (noPrizeCount !== 1) errors.push('必须且只能保留一个 thanks-try-again（谢谢惠顾）条目。');
  if (activeRealCount < 1) errors.push('至少需要启用一种真实奖励。');
  if (!Number.isSafeInteger(realWeightTotal * 100) || realWeightTotal * 100 > 4294967296) errors.push('总权重超出抽奖支持范围，请降低权重。');
  return { ok: errors.length === 0, errors, value: errors.length ? null : { schemaVersion: 1, settings, categories } };
}

export function assertConfig(raw) {
  const result = validateConfig(raw);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.value;
}

export function buildCategories(raw) {
  const config = assertConfig(raw);
  const realTotal = config.categories.reduce((sum, category) => sum + category.prizes.reduce((subtotal, prize) => subtotal + (prize.enabled && prize.id !== CONFIG_NO_PRIZE_ID ? prize.weight : 0), 0), 0);
  const p = config.settings.noPrizePercent;
  const categories = config.categories.map(category => {
    const prizes = category.prizes.map(prize => Object.freeze({
      ...prize,
      relativeWeight: prize.weight,
      weight: prize.id === CONFIG_NO_PRIZE_ID ? realTotal * p : prize.enabled ? prize.weight * (100 - p) : 0,
    }));
    return Object.freeze({ ...category, prizes: Object.freeze(prizes), weight: prizes.reduce((sum, prize) => sum + prize.weight, 0) });
  });
  return Object.freeze(categories);
}

export function getConfigSummary(raw) {
  const config = assertConfig(raw);
  const categories = buildCategories(config);
  const totalWeight = categories.reduce((sum, category) => sum + category.weight, 0);
  const realPrizes = config.categories.flatMap(category => category.prizes).filter(prize => prize.enabled && prize.id !== CONFIG_NO_PRIZE_ID);
  const prizeOdds = Object.create(null);
  categories.forEach(category => category.prizes.forEach(prize => { prizeOdds[prize.id] = prize.weight * 100 / totalWeight; }));
  return {
    prizeCount: realPrizes.length,
    blindCount: realPrizes.filter(prize => prize.blind).length,
    categoryCount: categories.filter(category => category.weight > 0).length,
    realWeightTotal: realPrizes.reduce((sum, prize) => sum + prize.weight, 0),
    noPrizePercent: config.settings.noPrizePercent,
    totalWeight,
    prizeOdds,
  };
}

export function serializeConfig(raw) {
  const config = assertConfig(raw);
  const json = JSON.stringify(config, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return '// Generated by the local love-wheel editor. Keep prize IDs stable.\nexport const GAME_CONFIG = ' + json + ';\n';
}
