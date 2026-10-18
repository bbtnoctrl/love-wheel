import { SETTINGS, CATEGORIES, PRIZE_COUNT, OUTCOME_COUNT, BLIND_PRIZE_COUNT, ACTIVE_CATEGORY_COUNT, STORAGE_KEY, getWheelSegments, isNoPrize, createInitialState, loadState, saveState, getPendingTicket, drawTicket, revealTicket, redeemTicket } from './core.js?v=mystery-20261018-1';
import { buildShareUrl, createQrSvgDataUrl } from './share.js?v=mystery-20261018-1';

const $ = selector => document.querySelector(selector);
const SVG_NS = 'http://www.w3.org/2000/svg';
const LOCK_NAME = `${STORAGE_KEY}:mutation`;
const wheelSegments = getWheelSegments();
const activeCategories = CATEGORIES.filter(category => category.weight > 0);
const hasNoPrize = activeCategories.some(category => category.id === 'thanks');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dialog = $('#app-dialog');
const dialogContent = $('#dialog-content');
let state = createInitialState();
let currentView = 'wheel';
let ticketFilter = 'all';
let storageBlocked = false;
let actionBusy = false;
let isSpinning = false;
let wheelRotation = 0;
let spinDeadline = 0;
let finishSpin = null;
let modalMode = '';
let modalTicketId = null;
let modalTicketStatus = null;
let returnFocus = null;
let cleanupScratch = null;
let imageObjectUrl = null;
let toastTimer = null;

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function svgElement(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function icon(name) {
  const node = svgElement('svg', { class: 'icon', 'aria-hidden': 'true' });
  node.append(svgElement('use', { href: `#i-${name}` }));
  return node;
}

function makeButton(text, className, handler, iconName) {
  const node = element('button', `button ${className}`);
  node.type = 'button';
  if (iconName) node.append(icon(iconName));
  node.append(document.createTextNode(text));
  if (handler) node.addEventListener('click', handler);
  return node;
}

function announce(text) {
  if (dialog.open) {
    let region = dialog.querySelector('[data-live-announcement]');
    if (!region) {
      region = element('div', 'sr-only');
      region.dataset.liveAnnouncement = 'true';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      dialogContent.append(region);
    }
    region.textContent = text;
  } else $('#screenreader-status').textContent = text;
}

function toast(text) {
  clearTimeout(toastTimer);
  if (dialog.open) {
    let feedback = dialog.querySelector('[data-feedback]');
    if (!feedback) {
      feedback = element('p', 'reward-footnote');
      feedback.dataset.feedback = 'true';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      dialogContent.append(feedback);
    }
    feedback.textContent = text;
    return;
  }
  const node = $('#toast');
  node.textContent = text;
  node.classList.add('is-visible');
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), 3600);
}

function dateLabel(value, withTime = false) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }).format(new Date(value));
  } catch { return new Date(value).toLocaleDateString('zh-CN'); }
}

function ticketNumber(ticket) { return ticket.id.replace(/-/g, '').slice(0, 8).toUpperCase(); }
function findTicket(id) { return state.tickets.find(ticket => ticket.id === id); }

function applySettings() {
  const pageTitle = `${SETTINGS.siteTitle} · ${SETTINGS.recipientName ? `${SETTINGS.recipientName}的` : ''}专属好运`;
  document.title = pageTitle;
  $('meta[property="og:title"]').content = pageTitle;
  const description = `${SETTINGS.subtitle} 转一转，亲手刮开一份只给你的惊喜。`;
  $('meta[name="description"]').content = description;
  $('meta[property="og:description"]').content = description;
  $('#brand-title').textContent = SETTINGS.siteTitle;
  $('.brand').setAttribute('aria-label', `${SETTINGS.siteTitle}，回到好运转盘`);
  $('#recipient-greeting').textContent = `${SETTINGS.recipientName || '你'}的专属小惊喜`;
  $('#hero-prefix').textContent = SETTINGS.heroPrefix;
  $('#hero-highlight').textContent = SETTINGS.heroHighlight;
  $('#hero-subtitle').textContent = SETTINGS.subtitle;
  $('#share-open').setAttribute('aria-label', `分享给${SETTINGS.recipientName || '她'}`);
  $('#share-open').title = `分享给${SETTINGS.recipientName || '她'}`;
  $('#wheel-stage').setAttribute('aria-label', `${ACTIVE_CATEGORY_COUNT} 个区域的好运转盘`);
}

class StorageProblem extends Error {}

function storageFailure() {
  storageBlocked = true;
  $('#storage-alert').hidden = false;
  $('#storage-alert-text').textContent = '请保留当前浏览器数据，允许网站存储后重新检查。为保护已有奖券，抽奖和兑现已暂停。';
  renderState();
  announce('奖券记录暂时无法读取或保存，抽奖和兑现已暂停。请保留浏览器数据。');
}

function readFreshState() {
  try { return loadState(window.localStorage); }
  catch { storageFailure(); throw new StorageProblem('奖券记录暂时无法读取，请保留浏览器数据。'); }
}

function persist(nextState) {
  try { saveState(window.localStorage, nextState); }
  catch { storageFailure(); throw new StorageProblem('奖券暂时无法保存，请恢复浏览器存储后重新检查。'); }
}

function withGameLock(operation) {
  if (navigator.locks?.request) return navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, operation);
  // In browsers without Web Locks, keep fresh-read and write synchronous in one task.
  return Promise.resolve().then(operation);
}

async function mutateGame(transform) {
  if (storageBlocked) throw new StorageProblem('请先恢复奖券保存，再继续操作。');
  return withGameLock(() => {
    if (storageBlocked) throw new StorageProblem('请先恢复奖券保存，再继续操作。');
    const latest = readFreshState();
    const next = transform(latest);
    persist(next);
    state = next;
    renderState();
    return state;
  });
}

function handleActionError(error) {
  if (error instanceof StorageProblem) {
    toast(error.message);
    const feedback = dialog.querySelector('[data-feedback]');
    if (feedback) feedback.textContent = error.message;
  } else toast(error instanceof Error ? error.message : '这份好运还没准备好，请稍后再试。');
}

function drawWheel() {
  const svg = $('#wheel-svg');
  svg.replaceChildren();
  svg.append(svgElement('circle', { cx: 200, cy: 200, r: 195, fill: '#fff3dc', stroke: '#dbb3a0', 'stroke-width': 1 }));
  svg.append(svgElement('circle', { cx: 200, cy: 200, r: 190, fill: '#dca08b' }));
  svg.append(svgElement('circle', { cx: 200, cy: 200, r: 187, fill: '#f3ddbe' }));
  svg.append(svgElement('circle', { cx: 200, cy: 200, r: 172, fill: '#fff5e4', stroke: '#d39e8c', 'stroke-width': 1.4 }));
  for (let i = 0; i < 32; i += 1) {
    const angle = i * Math.PI / 16;
    svg.append(svgElement('circle', { cx: 200 + Math.cos(angle) * 179.5, cy: 200 + Math.sin(angle) * 179.5, r: 2.7, fill: i % 2 ? '#fffaf0' : '#fff8e8', stroke: '#cb997649', 'stroke-width': .6 }));
  }
  const rotor = svgElement('g', { id: 'wheel-rotor' });
  wheelSegments.forEach(segment => {
    if (segment.weight <= 0 || segment.spanAngle <= 0) return;
    const category = CATEGORIES[segment.categoryIndex];
    // Sector angles come from the same integer weights used for the draw.
    const start = segment.startAngle * Math.PI / 180;
    const end = segment.endAngle * Math.PI / 180;
    const radius = 167;
    const x1 = 200 + radius * Math.cos(start), y1 = 200 + radius * Math.sin(start);
    const x2 = 200 + radius * Math.cos(end), y2 = 200 + radius * Math.sin(end);
    if (segment.spanAngle >= 360 - 1e-8) rotor.append(svgElement('circle', { cx: 200, cy: 200, r: radius, fill: category.color, stroke: '#fff8ec', 'stroke-width': 1.5 }));
    else rotor.append(svgElement('path', { d: `M200 200 L${x1} ${y1} A${radius} ${radius} 0 ${segment.spanAngle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`, fill: category.color, stroke: '#fff8ec', 'stroke-width': 1.5 }));
    const angle = segment.centerAngle * Math.PI / 180;
    const narrow = segment.spanAngle < 15;
    const labelRadius = narrow ? 137 : 117;
    const group = svgElement('g', { transform: `translate(${200 + labelRadius * Math.cos(angle)} ${200 + labelRadius * Math.sin(angle)}) rotate(${segment.centerAngle + 90})` });
    if (narrow) {
      const star = svgElement('text', { x: 0, y: 4, 'text-anchor': 'middle', fill: '#8a642c', 'font-size': 13, 'font-family': 'Georgia, serif' });
      star.textContent = '✦';
      group.append(star);
    } else {
      const emoji = svgElement('text', { x: 0, y: -22, 'text-anchor': 'middle', 'font-size': 25, 'font-family': 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' });
      emoji.textContent = category.icon;
      const title = svgElement('text', { x: 0, 'text-anchor': 'middle', fill: '#755347', 'font-size': 16, 'font-weight': 600, 'letter-spacing': .6, 'font-family': '-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif' });
      const titleCharacters = Array.from(category.title);
      const labelLines = [titleCharacters.slice(0, 2).join(''), titleCharacters.length > 4 ? `${titleCharacters[2]}…` : titleCharacters.slice(2).join('')];
      for (const [lineIndex, line] of labelLines.entries()) {
        const span = svgElement('tspan', { x: 0, y: 6 + lineIndex * 20 });
        span.textContent = line;
        title.append(span);
      }
      group.append(emoji, title);
    }
    rotor.append(group);
  });
  rotor.append(svgElement('circle', { cx: 200, cy: 200, r: 58, fill: '#fff5e4', stroke: '#c591782e', 'stroke-width': 1 }));
  svg.append(rotor);
  const legend = $('#wheel-legend');
  legend.replaceChildren(...activeCategories.map(category => {
    const item = element('div', 'wheel-legend-item');
    if (category.id === 'thanks') item.classList.add('legend-no-prize');
    const swatch = element('span', 'legend-swatch');
    swatch.style.backgroundColor = category.color;
    swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, element('span', '', category.title));
    return item;
  }));
}

function renderState() {
  const pending = getPendingTicket(state);
  const stage = $('#wheel-stage');
  stage.classList.toggle('is-spinning', isSpinning);
  stage.classList.toggle('is-pending', Boolean(pending) && !isSpinning);
  const spin = $('#spin-button');
  spin.disabled = storageBlocked || actionBusy || isSpinning;
  spin.setAttribute('aria-busy', String(actionBusy || isSpinning));
  $('#spin-label').textContent = isSpinning ? '转动中' : actionBusy ? '稍等' : pending ? '刮开' : '开始';
  $('#spin-sublabel').textContent = isSpinning ? '偏爱正在靠近' : pending?.blind ? '拆开盲盒' : pending ? '继续揭晓' : '接住好运';
  spin.setAttribute('aria-label', pending?.blind ? '继续刮开这份盲盒' : pending ? '继续刮开本次抽奖结果' : '开始抽奖');
  $('#wheel-hint').textContent = isSpinning ? '嘘，看看这一次，偏爱会落在哪儿…' : pending?.blind ? '有一份盲盒还封着，接着拆开吧' : pending ? '有一张惊喜还没刮开，接着玩吧' : '转一转，再亲手刮开你的惊喜';
  $('#pending-button').replaceChildren(icon('sparkle'), document.createTextNode(pending?.blind ? '继续拆开这份盲盒' : '继续刮开这份惊喜'), icon('arrow'));
  $('#pending-button').hidden = !pending || isSpinning || actionBusy;
  $('#pending-button').disabled = storageBlocked;
  const unredeemed = state.tickets.filter(ticket => !isNoPrize(ticket) && ticket.status !== 'redeemed').length;
  $('#ticket-nav-count').hidden = unredeemed === 0;
  $('#ticket-nav-count').textContent = String(unredeemed);
  renderTickets();
  dialog.querySelectorAll('[data-game-write]').forEach(button => { button.disabled = storageBlocked || actionBusy; });
}

function navigate(view, focusHeading = false) {
  if (!['wheel', 'tickets', 'prizes'].includes(view)) view = 'wheel';
  currentView = view;
  for (const name of ['wheel', 'tickets', 'prizes']) $(`#view-${name}`).hidden = name !== view;
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (focusHeading) {
    const heading = $(`#view-${view} h1`);
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

async function startDraw() {
  if (actionBusy || isSpinning || storageBlocked) return;
  actionBusy = true;
  renderState();
  try {
    const result = await withGameLock(() => {
      if (storageBlocked) throw new StorageProblem('请先恢复奖券保存，再继续抽奖。');
      const latest = readFreshState();
      const pending = getPendingTicket(latest);
      if (pending) { state = latest; return { resume: true, ticket: pending }; }
      const drawn = drawTicket(latest);
      // The ticket is committed BEFORE the animation, so it can always be resumed.
      persist(drawn.state);
      state = drawn.state;
      return { resume: false, ticket: drawn.ticket };
    });
    if (result.resume) openTicket(result.ticket.id);
    else spinToTicket(result.ticket);
  } catch (error) { handleActionError(error); }
  finally { actionBusy = false; renderState(); }
}

function spinToTicket(ticket) {
  isSpinning = true;
  renderState();
  announce('转盘正在转动，请稍等。');
  const rotor = $('#wheel-rotor');
  const segment = wheelSegments.find(item => item.categoryIndex === ticket.categoryIndex);
  const desired = ((-90 - segment.centerAngle) % 360 + 360) % 360;
  const current = ((wheelRotation % 360) + 360) % 360;
  wheelRotation += 4 * 360 + ((desired - current + 360) % 360);
  const duration = reduceMotion.matches ? 0 : SETTINGS.spinSeconds * 1000;
  spinDeadline = Date.now() + duration;
  let done = false;
  let timer;
  const onTransitionEnd = event => {
    if (event.target === rotor && event.propertyName === 'transform') complete();
  };
  const complete = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    rotor.removeEventListener('transitionend', onTransitionEnd);
    // Also snaps to the committed target if a page suspension skipped animation frames.
    rotor.style.transition = 'none';
    rotor.style.transform = `rotate(${wheelRotation}deg)`;
    isSpinning = false;
    finishSpin = null;
    renderState();
    announce(ticket.blind ? '抽到一份封好的盲盒，现在可以刮开封条了。' : `转盘停在${ticket.categoryTitle}，现在可以刮开惊喜了。`);
    if (findTicket(ticket.id)) openTicket(ticket.id);
  };
  finishSpin = complete;
  rotor.addEventListener('transitionend', onTransitionEnd);
  rotor.style.transition = duration ? `transform ${duration}ms cubic-bezier(.14,.68,.13,1)` : 'none';
  rotor.style.transform = `rotate(${wheelRotation}deg)`;
  timer = setTimeout(complete, duration + (duration ? 400 : 30));
}

function emptyState(title, message, withAction = false) {
  const node = element('div', 'empty-state');
  const art = element('div', 'empty-art');
  art.append(icon('ticket'));
  node.append(art, element('h2', '', title), element('p', '', message));
  if (withAction) node.append(makeButton('去接住第一份好运', 'button-primary', () => navigate('wheel', true), 'sparkle'));
  return node;
}

function renderTickets() {
  const prizeTickets = state.tickets.filter(ticket => !isNoPrize(ticket));
  const available = prizeTickets.filter(ticket => ticket.status === 'available').length;
  const summary = $('#ticket-summary');
  const left = element('div');
  left.append(element('strong', '', String(available)), document.createTextNode(' '), element('span', '', '张偏爱待兑现'));
  const collected = element('small', '', `已收集 ${prizeTickets.length} 份好运`);
  summary.replaceChildren(left, collected, icon('ticket'));
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === ticketFilter)));
  const list = $('#ticket-list');
  list.replaceChildren();
  if (storageBlocked && prizeTickets.length === 0) {
    list.append(emptyState('暂时无法读取奖券', '请保留当前浏览器数据，允许网站存储后重新检查。'));
    return;
  }
  const tickets = prizeTickets.filter(ticket => ticketFilter === 'all' || ticket.status === ticketFilter).slice().sort((a, b) => b.createdAt - a.createdAt);
  if (!tickets.length) {
    list.append(prizeTickets.length ? emptyState(ticketFilter === 'redeemed' ? '美好的兑现，值得期待' : '这里暂时没有奖券', ticketFilter === 'redeemed' ? '奖品兑现以后，这里会留下一份甜甜的记录。' : '可以切换到「全部」，看看已经收集到的好运。') : emptyState('第一份好运，还在等你', '转一下转盘，亲手刮开惊喜。抽中的奖券会好好收在这里。', true));
    return;
  }
  for (const ticket of tickets) {
    const sealed = ticket.status === 'unrevealed';
    const sealedBlind = sealed && ticket.blind;
    const redeemed = ticket.status === 'redeemed';
    const card = element('article', 'ticket-card');
    if (sealedBlind) card.classList.add('sealed-blind-ticket');
    const body = element('div', 'ticket-body');
    const topline = element('div', 'ticket-topline');
    const emoji = element('span', 'ticket-emoji', sealedBlind ? '🎁' : sealed ? '💌' : ticket.icon);
    emoji.setAttribute('aria-hidden', 'true');
    const titles = element('div', 'ticket-title-group');
    titles.append(element('span', 'ticket-category', sealedBlind ? '惊喜盲盒' : ticket.categoryTitle), element('h2', '', sealedBlind ? ticket.blindLabel : sealed ? '一份惊喜，还没刮开' : ticket.title));
    topline.append(emoji, titles, element('span', `ticket-status${redeemed ? ' is-redeemed' : ''}`, sealedBlind ? '未拆封' : sealed ? '待刮开' : redeemed ? '已兑现' : '待兑现'));
    body.append(topline, element('p', 'ticket-detail', sealedBlind ? ticket.blindHint : sealed ? '已经替你留好啦，点击下方继续揭晓。' : ticket.detail));
    if (!sealed) body.append(element('p', 'ticket-note', ticket.note));
    const footer = element('div', 'ticket-footer');
    const meta = element('p', 'ticket-meta');
    meta.append(element('span', '', dateLabel(ticket.createdAt)), element('span', '', `NO. ${ticketNumber(ticket)}`));
    const actions = element('div', 'ticket-actions');
    if (sealed) {
      const resume = makeButton(isSpinning ? '好运转动中…' : sealedBlind ? '继续拆开盲盒' : '继续刮开惊喜', 'button-soft', () => openTicket(ticket.id), sealedBlind ? 'gift' : 'sparkle');
      resume.disabled = storageBlocked || isSpinning;
      actions.append(resume);
    } else {
      actions.append(makeButton('保存奖券', 'button-secondary', () => openTicketImage(ticket.id), 'download'));
      if (!redeemed) {
        const redeem = makeButton('标记已兑现', 'button-soft', () => confirmRedeem(ticket.id), 'check');
        redeem.disabled = storageBlocked || actionBusy;
        actions.append(redeem);
      }
    }
    footer.append(meta, actions);
    card.append(body, element('div', 'ticket-divider'), footer);
    list.append(card);
  }
}

function renderPrizes() {
  const list = $('#prize-list');
  const countTitle = `${PRIZE_COUNT} 种奖品${hasNoPrize ? ' + 谢谢惠顾' : ''}`;
  $('#prize-teaser strong').textContent = countTitle;
  $('#prize-teaser small').textContent = BLIND_PRIZE_COUNT ? `含 ${BLIND_PRIZE_COUNT} 份盲盒，刮开才知道` : '奶茶、约会和更多小惊喜';
  $('#prize-count-title').textContent = countTitle;
  $('#prize-intro-copy').textContent = `${ACTIVE_CATEGORY_COUNT} 个区域 · ${OUTCOME_COUNT} 种结果${BLIND_PRIZE_COUNT ? ` · 含 ${BLIND_PRIZE_COUNT} 份盲盒` : ''}`;
  $('#legend-note').textContent = BLIND_PRIZE_COUNT ? '有些偏爱装进了盲盒，刮开才知道是什么。' : '甜蜜、陪伴和小小的惊喜，都藏在转盘里。';
  $('#prize-guide-title').textContent = BLIND_PRIZE_COUNT ? '封好的心意，留一点悬念' : '抽到的惊喜，记得收好';
  $('#prize-guide-copy').textContent = BLIND_PRIZE_COUNT ? '盲盒先看封面和提示，里面的礼物等你亲手刮开。揭晓后的奖券会收进「我的奖券」，也可以保存图片留作纪念。' : '中奖后，奖券会自动收进「我的奖券」。你可以随时查看，也可以保存图片留作纪念。';
  $('#rules-outcomes').textContent = `转盘共有 ${ACTIVE_CATEGORY_COUNT} 个区域，包含 ${PRIZE_COUNT} 种奖品${hasNoPrize ? '和「谢谢惠顾」。「谢谢惠顾」表示这次未中奖，不会生成奖券；想继续玩的话，可以再转一次。' : '。抽中的奖券会保存在「我的奖券」。'}`;
  $('#rules-blind').hidden = BLIND_PRIZE_COUNT === 0;
  $('#rules-blind').textContent = `${PRIZE_COUNT} 种奖品中，有 ${BLIND_PRIZE_COUNT} 份是盲盒。清单只展示封面和提示，刮开以后才会揭晓里面的礼物。`;
  list.replaceChildren();
  for (const category of activeCategories) {
    const enabledPrizes = category.prizes.filter(prize => prize.enabled && prize.weight > 0);
    if (!enabledPrizes.length) continue;
    const group = element('article', 'prize-group');
    if (category.id === 'thanks') group.classList.add('is-no-prize');
    group.style.setProperty('--category-tint', `${category.color}80`);
    const heading = element('div', 'prize-group-heading');
    const emoji = element('span', '', category.icon);
    emoji.setAttribute('aria-hidden', 'true');
    heading.append(emoji, element('h2', '', category.title));
    const entries = element('div', 'prize-entries');
    for (const prize of enabledPrizes) {
      const entry = element('div', `prize-entry${prize.blind ? ' blind-prize-entry' : ''}`);
      if (prize.blind) {
        const seal = element('span', 'blind-seal', '封盒待拆');
        const cover = element('div', 'blind-prize-cover');
        cover.append(icon('gift'), element('h3', '', prize.blindLabel), seal);
        entry.append(cover, element('p', '', prize.blindHint));
      } else entry.append(element('h3', '', prize.title), element('p', '', prize.detail));
      entries.append(entry);
    }
    group.append(heading, entries);
    list.append(group);
  }
}

function modalHeader(eyebrow, title, description) {
  const node = element('div', 'modal-heading');
  const heading = element('h2', '', title);
  heading.id = 'dialog-heading';
  heading.tabIndex = -1;
  node.append(element('span', 'eyebrow', eyebrow), heading, element('p', '', description));
  return node;
}

function cleanupModal() {
  if (cleanupScratch) { cleanupScratch(); cleanupScratch = null; }
  if (imageObjectUrl) { URL.revokeObjectURL(imageObjectUrl); imageObjectUrl = null; }
}

function openModal(mode, content, ticketId = null) {
  cleanupModal();
  if (!dialog.open) returnFocus = document.activeElement;
  modalMode = mode;
  modalTicketId = ticketId;
  modalTicketStatus = ticketId ? findTicket(ticketId)?.status : null;
  dialogContent.replaceChildren(content);
  dialog.dataset.mode = mode;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  requestAnimationFrame(() => dialog.querySelector('#dialog-heading')?.focus({ preventScroll: true }));
}

function closeModal() { if (dialog.open) dialog.close(); }

function openTicket(ticketId) {
  const ticket = findTicket(ticketId);
  if (!ticket) { toast('这张奖券暂时没有找到，请重新检查浏览器记录。'); return; }
  if (isSpinning && ticket.status === 'unrevealed') return;
  const revealed = ticket.status !== 'unrevealed';
  const noPrize = isNoPrize(ticket);
  const blind = ticket.blind && !noPrize;
  const content = element('div');
  if (!revealed && blind) content.append(modalHeader('A LITTLE MYSTERY, SEALED WITH LOVE', ticket.blindLabel, ticket.blindHint));
  else if (!revealed) content.append(modalHeader('A LITTLE SURPRISE AWAITS', '结果已准备好', '请亲手刮开，看看这一次的结果。'));
  else if (noPrize) content.append(modalHeader('ANOTHER LITTLE MOMENT', '这次未中奖', '想继续玩的话，可以再转一次。'));
  else if (blind) content.append(modalHeader('YOUR LITTLE MYSTERY, UNBOXED', '盲盒打开啦！', `给${SETTINGS.recipientName || '你'}的这份惊喜，终于藏不住了。`));
  else content.append(modalHeader('A LITTLE LOVE, JUST FOR YOU', '呀，是这份偏爱！', '这一份小小的心意，要认真送给你。'));
  const card = element('div', `scratch-ticket${noPrize ? ' no-prize-card' : ''}${blind ? ' blind-box-card' : ''}`);
  const topline = element('div', 'scratch-topline');
  topline.append(element('span', '', blind && !revealed ? '惊喜盲盒' : ticket.categoryTitle), element('span', blind && !revealed ? 'blind-seal' : '', blind ? revealed ? 'MYSTERY UNBOXED' : '封盒待拆' : noPrize ? 'LUCKY MOMENT' : 'LOVE COUPON'));
  const shell = element('div', `scratch-shell${revealed ? ' is-revealed' : ''}`);
  const prize = element('div', 'scratch-content');
  prize.setAttribute('aria-hidden', String(!revealed));
  const emoji = element('span', 'prize-emoji', ticket.icon);
  emoji.setAttribute('aria-hidden', 'true');
  prize.append(emoji, element('h3', '', ticket.title), element('p', 'reward-detail', ticket.detail), element('p', 'reward-note', ticket.note));
  shell.append(prize);
  let canvas;
  if (!revealed) {
    canvas = element('canvas', 'scratch-canvas');
    canvas.setAttribute('aria-label', blind ? '用手指刮开盲盒封条，也可以使用下方的直接拆开盲盒按钮。' : '用手指刮开惊喜，也可以使用下方的直接揭晓按钮。');
    canvas.setAttribute('role', 'img');
    shell.append(canvas);
  }
  card.append(topline, shell, element('div', 'scratch-bottomline', noPrize ? 'THANK YOU FOR PLAYING' : `NO. ${ticketNumber(ticket)}  ·  ONLY FOR YOU`));
  content.append(card);
  const feedback = element('p', 'scratch-instruction', revealed ? noPrize ? '这次没有获得奖品，可以再转一次。' : blind ? '盲盒里的心意，已经收进「我的奖券」。' : '好运已收进「我的奖券」，随时都能回来看看。' : blind ? '刮掉封条，把藏好的心意拆开' : '用指尖涂一涂，让结果慢慢出现');
  feedback.dataset.feedback = 'true';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  content.append(feedback);
  if (revealed && noPrize) {
    const actions = element('div', 'modal-actions');
    const again = makeButton('再转一次', 'button-primary', () => {
      if (storageBlocked || actionBusy || isSpinning) return;
      closeModal();
      navigate('wheel', true);
      startDraw();
    }, 'wheel');
    again.dataset.gameWrite = 'true';
    again.disabled = storageBlocked || actionBusy;
    actions.append(again, makeButton('回到转盘', 'button-text', () => { closeModal(); navigate('wheel', true); }));
    content.append(actions, element('p', 'reward-footnote', '每次独立抽取，下一次的结果也由好运决定。'));
  } else if (revealed) {
    const actions = element('div', 'modal-actions');
    actions.append(makeButton('收进我的奖券', 'button-primary', () => { closeModal(); navigate('tickets', true); }, 'ticket'), makeButton('保存奖券图片', 'button-secondary', () => openTicketImage(ticket.id), 'download'));
    content.append(actions, element('p', 'reward-footnote', ticket.status === 'redeemed' ? '这份偏爱已经兑现，快乐值得留个纪念。' : '兑现人：你的男朋友 · 兑现时间一起商量'));
  } else {
    const direct = makeButton(blind ? '直接拆开盲盒' : '直接揭晓', 'button-text scratch-direct', () => revealActiveTicket(ticket.id), blind ? 'gift' : 'sparkle');
    direct.dataset.revealButton = 'true';
    direct.dataset.gameWrite = 'true';
    direct.disabled = storageBlocked;
    content.append(direct, element('p', 'reward-footnote', blind ? '关掉也没关系，这份盲盒会保持封好，等你回来。' : '关掉也没关系，这张惊喜会一直为你留着。'));
  }
  openModal('ticket', content, ticket.id);
  if (!revealed) {
    requestAnimationFrame(() => {
      if (dialog.open && modalMode === 'ticket' && modalTicketId === ticket.id && canvas.isConnected) cleanupScratch = setupScratch(canvas, shell, feedback, () => revealActiveTicket(ticket.id), blind);
    });
  }
}

async function revealActiveTicket(ticketId) {
  if (actionBusy || storageBlocked) return false;
  actionBusy = true;
  const direct = dialog.querySelector('[data-reveal-button]');
  if (direct) direct.disabled = true;
  try {
    await mutateGame(latest => revealTicket(latest, ticketId));
    const ticket = findTicket(ticketId);
    if (dialog.open && modalMode === 'ticket' && modalTicketId === ticketId) openTicket(ticketId);
    announce(isNoPrize(ticket) ? `${ticket.title}。${ticket.detail}` : ticket.blind ? `盲盒打开了，获得${ticket.title}。${ticket.detail}` : `恭喜获得${ticket.title}。${ticket.detail}`);
    return true;
  } catch (error) { handleActionError(error); return false; }
  finally {
    actionBusy = false;
    renderState();
    if (direct?.isConnected) direct.disabled = storageBlocked;
  }
}

function setupScratch(canvas, shell, progress, onReveal, blind = false) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    progress.textContent = blind ? '当前浏览器不支持刮卡，点「直接拆开盲盒」也能揭晓礼物。' : '当前浏览器不支持刮卡，点「直接揭晓」也能接住好运。';
    canvas.style.background = '#e4d8e8';
    return () => {};
  }
  let width = 1, height = 1, radius = 23;
  let activePointer = null;
  let previousPoint = null;
  let revealing = false;
  let disposed = false;
  let lastStage = 0;
  const revealThreshold = SETTINGS.scratchRevealPercent / 100;
  const strokes = [];
  const cols = 32, rows = 22, visited = new Uint8Array(cols * rows);
  let cleared = 0;

  function erase(from, to) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width + .01, to.y * height + .01);
    ctx.stroke();
    ctx.restore();
  }

  function drawCover() {
    width = Math.max(1, shell.clientWidth);
    height = Math.max(1, shell.clientHeight);
    radius = Math.max(20, width * .067);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#e2d6e8');
    gradient.addColorStop(.5, '#ede1e7');
    gradient.addColorStop(1, '#d9cede');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.strokeRect(12, 12, width - 24, height - 24);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff65';
    for (let y = 26; y < height; y += 19) for (let x = 22; x < width; x += 22) { ctx.beginPath(); ctx.arc(x + ((y / 19) % 2) * 5, y, .8, 0, Math.PI * 2); ctx.fill(); }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#aa8b9d';
    ctx.font = blind ? '32px "Apple Color Emoji", "Segoe UI Emoji", sans-serif' : '32px Georgia, serif';
    ctx.fillText(blind ? '🎁' : '♡', width / 2, height / 2 - 39);
    ctx.fillStyle = '#8c6b80';
    ctx.font = '600 19px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(blind ? '刮开封条，拆开盲盒' : '刮开这份小偏爱', width / 2, height / 2 + 5);
    ctx.fillStyle = '#a08a9b';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(blind ? 'SEALED WITH A LITTLE LOVE' : 'SCRATCH FOR A LITTLE LOVE', width / 2, height / 2 + 35);
    for (const stroke of strokes) erase(stroke[0], stroke[1]);
    shell.dataset.ready = 'true';
  }

  function markSegment(from, to) {
    const x1 = from.x * width, y1 = from.y * height, x2 = to.x * width, y2 = to.y * height;
    const dx = x2 - x1, dy = y2 - y1, lengthSquared = dx * dx + dy * dy;
    for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      if (visited[index]) continue;
      const x = (col + .5) / cols * width, y = (row + .5) / rows * height;
      const t = lengthSquared ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared)) : 0;
      if ((x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2 <= radius ** 2) { visited[index] = 1; cleared += 1; }
    }
    const fraction = cleared / visited.length;
    const stage = Math.min(2, Math.floor(fraction / revealThreshold * 3));
    if (stage > lastStage) {
      lastStage = stage;
      progress.textContent = stage === 1 ? blind ? '封条慢慢松开了，再刮一刮' : '惊喜露出一点点了，再刮一刮' : blind ? '盲盒就快打开啦…' : '再一点点，就能看见这份惊喜啦';
    }
    if (fraction >= revealThreshold && !revealing) {
      revealing = true;
      progress.textContent = blind ? '盲盒正在打开…' : '惊喜正在打开…';
      Promise.resolve(onReveal()).then(success => { if (!success && !disposed) revealing = false; });
    }
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }

  function down(event) {
    if (storageBlocked || actionBusy || revealing || activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    previousPoint = point(event);
    erase(previousPoint, previousPoint);
    strokes.push([previousPoint, previousPoint]);
    markSegment(previousPoint, previousPoint);
  }

  function move(event) {
    if (storageBlocked || actionBusy || revealing || event.pointerId !== activePointer) return;
    event.preventDefault();
    const next = point(event);
    erase(previousPoint, next);
    strokes.push([previousPoint, next]);
    markSegment(previousPoint, next);
    previousPoint = next;
  }

  function up(event) {
    if (event.pointerId !== activePointer) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    activePointer = null;
    previousPoint = null;
  }

  drawCover();
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  let observer;
  if (window.ResizeObserver) { observer = new ResizeObserver(() => { if (!disposed) drawCover(); }); observer.observe(shell); }
  else window.addEventListener('resize', drawCover);
  return () => {
    disposed = true;
    observer?.disconnect();
    window.removeEventListener('resize', drawCover);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('lostpointercapture', up);
  };
}

function confirmRedeem(ticketId) {
  const ticket = findTicket(ticketId);
  if (!ticket || isNoPrize(ticket) || ticket.status !== 'available' || storageBlocked) return;
  const content = element('div');
  content.append(modalHeader('A PROMISE, KEPT', '这份偏爱，兑现了吗？', '等收到礼物或一起完成约定后，再留下这枚小印记。'));
  const summary = element('div', 'redeem-summary');
  const emoji = element('span', 'prize-emoji', ticket.icon);
  emoji.setAttribute('aria-hidden', 'true');
  summary.append(emoji, element('h3', '', ticket.title), element('p', '', ticket.detail));
  const actions = element('div', 'modal-actions');
  const confirm = makeButton('确认已兑现', 'button-primary', async () => {
    if (actionBusy || storageBlocked) return;
    actionBusy = true;
    confirm.disabled = true;
    try {
      await mutateGame(latest => redeemTicket(latest, ticketId));
      closeModal();
      toast('已盖上兑现印记，这份快乐好好收着。');
      announce(`${ticket.title}已标记为已兑现。`);
    } catch (error) { handleActionError(error); }
    finally { actionBusy = false; confirm.disabled = storageBlocked; renderState(); }
  }, 'check');
  confirm.dataset.gameWrite = 'true';
  actions.append(confirm, makeButton('还没呢，再等一等', 'button-text', closeModal));
  const feedback = element('p', 'reward-footnote');
  feedback.dataset.feedback = 'true';
  feedback.setAttribute('role', 'status');
  content.append(summary, actions, feedback);
  openModal('redeem', content, ticket.id);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrappedLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const character of String(text)) {
    if (character === '\n') { lines.push(line); line = ''; continue; }
    if (line && ctx.measureText(line + character).width > maxWidth) { lines.push(line); line = character; }
    else line += character;
  }
  if (line) lines.push(line);
  return lines;
}

function paintTicket(ticket) {
  if (isNoPrize(ticket)) throw new Error('这次未中奖，没有可保存的奖券。');
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 1370;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('暂时无法生成图片，请用手机截图收好这张奖券。');
  const sans = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  const serif = '"Noto Serif SC", "Songti SC", serif';
  ctx.font = `26px ${sans}`;
  const subtitleLines = wrappedLines(ctx, SETTINGS.subtitle, 820);
  const headerExtra = Math.max(0, subtitleLines.length - 1) * 38;
  ctx.font = `600 51px ${serif}`;
  const titleLines = wrappedLines(ctx, ticket.title, 690);
  ctx.font = `29px ${sans}`;
  const detailLines = wrappedLines(ctx, ticket.detail, 665);
  ctx.font = `24px ${sans}`;
  const noteLines = wrappedLines(ctx, ticket.note, 665);
  const titleY = 619 + headerExtra;
  const detailY = titleY + titleLines.length * 71 + 18;
  const noteY = detailY + detailLines.length * 49 + 34;
  const dividerY = Math.max(951 + headerExtra, noteY + noteLines.length * 42 + 26);
  // Custom prize text can be longer; extend the image without clipping the promise.
  canvas.height = dividerY + 419;
  ctx.fillStyle = '#fff8eb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#eeded06b';
  for (let y = 16; y < canvas.height; y += 18) for (let x = 16; x < canvas.width; x += 18) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b27370';
  ctx.font = `22px ${sans}`;
  ctx.fillText('THE LITTLE LOVE CLUB', 480, 91);
  ctx.fillStyle = '#604239';
  ctx.font = `600 52px ${serif}`;
  ctx.fillText(SETTINGS.siteTitle, 480, 165, 820);
  ctx.fillStyle = '#a68673';
  ctx.font = `26px ${sans}`;
  subtitleLines.forEach((line, index) => ctx.fillText(line, 480, 220 + index * 38));
  ctx.fillStyle = '#fffdfa';
  drawRoundedRect(ctx, 70, 285 + headerExtra, 820, dividerY - 74 - headerExtra, 33);
  ctx.fill();
  ctx.strokeStyle = '#dfc4af';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#faeae2';
  drawRoundedRect(ctx, 91, 307 + headerExtra, 778, 90, 18);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a06560';
  ctx.font = `600 25px ${sans}`;
  ctx.fillText(ticket.categoryTitle, 121, 364 + headerExtra, 470);
  ctx.textAlign = 'right';
  ctx.font = `20px ${sans}`;
  ctx.fillText('LOVE COUPON', 839, 364 + headerExtra);
  ctx.textAlign = 'center';
  ctx.font = '86px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(ticket.icon, 480, 526 + headerExtra);
  ctx.fillStyle = '#624239';
  ctx.font = `600 51px ${serif}`;
  let y = titleY;
  for (const line of titleLines) { ctx.fillText(line, 480, y); y += 71; }
  y = detailY;
  ctx.fillStyle = '#8b6a59';
  ctx.font = `29px ${sans}`;
  for (const line of detailLines) { ctx.fillText(line, 480, y); y += 49; }
  y = noteY;
  ctx.fillStyle = '#b18b76';
  ctx.font = `24px ${sans}`;
  for (const line of noteLines) { ctx.fillText(line, 480, y); y += 42; }
  ctx.strokeStyle = '#d8bda7';
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 12]);
  ctx.beginPath(); ctx.moveTo(70, dividerY); ctx.lineTo(890, dividerY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff8eb';
  for (const x of [70, 890]) { ctx.beginPath(); ctx.arc(x, dividerY, 20, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = ticket.status === 'redeemed' ? '#77916b' : '#b6686c';
  ctx.font = `600 26px ${sans}`;
  ctx.fillText(ticket.status === 'redeemed' ? '已兑现 · 快乐已签收' : '待兑现 · 一份认真准备的偏爱', 480, dividerY + 61);
  ctx.fillStyle = '#9f806c';
  ctx.font = `22px ${sans}`;
  ctx.fillText(`中奖时间：${dateLabel(ticket.createdAt, true)}`, 480, dividerY + 113);
  ctx.font = `18px ${sans}`;
  let idY = dividerY + 153;
  for (const line of wrappedLines(ctx, `奖券编号：${ticket.id}`, 725)) { ctx.fillText(line, 480, idY); idY += 26; }
  ctx.fillStyle = '#a98972';
  ctx.font = `24px ${sans}`;
  ctx.fillText('兑现人：你的男朋友', 480, dividerY + 280);
  ctx.font = `20px ${sans}`;
  ctx.fillText('不设过期时间 · 兑现时间一起商量', 480, dividerY + 324);
  ctx.fillStyle = '#c89087';
  ctx.font = `29px ${serif}`;
  ctx.fillText('♡', 480, dividerY + 374);
  return canvas;
}

function openTicketImage(ticketId) {
  const ticket = findTicket(ticketId);
  if (!ticket || isNoPrize(ticket) || !['available', 'redeemed'].includes(ticket.status)) return;
  try {
    const canvas = paintTicket(ticket);
    const content = element('div');
    content.append(modalHeader('KEEP A LITTLE LOVE', '收好这份偏爱', '长按图片保存，也可以使用下方下载按钮。'));
    const wrap = element('div', 'image-preview-wrap');
    const image = element('img', 'image-preview');
    image.alt = `${ticket.title}奖券：${ticket.detail}，${ticket.status === 'redeemed' ? '已兑现' : '待兑现'}，中奖日期${dateLabel(ticket.createdAt)}。`;
    const dataUrl = canvas.toDataURL('image/png');
    image.src = dataUrl;
    wrap.append(image);
    const actions = element('div', 'modal-actions');
    const download = element('a', 'button button-primary');
    download.href = dataUrl;
    download.download = `偏爱奖券-${ticket.title}-${ticketNumber(ticket)}.png`;
    download.append(icon('download'), document.createTextNode('下载奖券图片'));
    actions.append(download, makeButton('返回这张奖券', 'button-text', () => openTicket(ticket.id)));
    content.append(wrap, actions);
    openModal('image', content, ticket.id);
  } catch (error) { handleActionError(error); }
}

function openShare() {
  const SHARE_URL = buildShareUrl(window.location.href);
  const content = element('div');
  if (!SHARE_URL) {
    content.append(modalHeader('SEND A LITTLE LOVE', '分享网页链接', '这个页面目前没有可分享的网页地址。发布成网页后，再打开这里就能复制链接和扫码分享。'));
    content.append(makeButton('知道啦', 'button-primary button-full', closeModal));
    openModal('share', content);
    return;
  }
  content.append(modalHeader('SEND A LITTLE LOVE', '把好运发给她', `复制链接发给${SETTINGS.recipientName || '她'}，或者让她扫码打开。`));
  const qrWrap = element('div', 'share-qr-wrap');
  const qr = element('img', 'share-qr');
  qr.alt = `扫码打开「${SETTINGS.siteTitle}」好运转盘`;
  qr.width = 168;
  qr.height = 168;
  qr.addEventListener('error', () => { qrWrap.replaceChildren(element('p', 'share-qr-error', '二维码暂时没能加载，复制下方链接也可以打开。')); });
  try {
    qr.src = createQrSvgDataUrl(SHARE_URL);
    qrWrap.append(qr);
  } catch {
    qrWrap.append(element('p', 'share-qr-error', '这个链接暂时无法生成二维码，复制下方链接也可以打开。'));
  }
  const label = element('label', 'share-link-label', '你的专属好运链接');
  label.htmlFor = 'share-link-input';
  const input = element('input', 'share-link');
  input.id = 'share-link-input';
  input.type = 'url';
  input.readOnly = true;
  input.value = SHARE_URL;
  const feedback = element('p', 'share-note', '她在自己的手机打开，就能转一转，刮开属于她的惊喜。');
  feedback.setAttribute('role', 'status');
  feedback.dataset.feedback = 'true';
  const actions = element('div', 'modal-actions');
  const copy = makeButton('复制邀请链接', 'button-primary', async () => {
    let copied = false;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(SHARE_URL); copied = true; } } catch { /* Manual selection below remains available. */ }
    if (!copied) {
      input.focus();
      input.select();
      input.setSelectionRange(0, SHARE_URL.length);
      try { copied = document.execCommand('copy'); } catch { copied = false; }
    }
    feedback.textContent = copied ? '链接已复制，发给她就能玩啦。' : '自动复制暂时不可用，请长按上面的链接复制。';
    if (copied) copy.replaceChildren(icon('check'), document.createTextNode('链接已复制'));
  }, 'copy');
  actions.append(copy);
  if (navigator.share) actions.append(makeButton('通过手机分享', 'button-secondary', async () => {
    try { await navigator.share({ title: SETTINGS.siteTitle, text: `${SETTINGS.recipientName ? `${SETTINGS.recipientName}，` : ''}小小的好运已经为你准备好了。`, url: SHARE_URL }); }
    catch (error) { if (error?.name !== 'AbortError') feedback.textContent = '也可以点「复制邀请链接」，手动发给她。'; }
  }, 'share'));
  content.append(qrWrap, label, input, actions, feedback);
  openModal('share', content);
}

function syncFromStorage() {
  if (actionBusy || storageBlocked) return;
  try {
    const latest = readFreshState();
    state = latest;
    renderState();
    if (dialog.open && modalMode === 'ticket') {
      const ticket = findTicket(modalTicketId);
      if (ticket && ticket.status !== modalTicketStatus) openTicket(ticket.id);
      else if (!ticket) closeModal();
    }
  } catch (error) { handleActionError(error); }
}

$('#spin-button').addEventListener('click', startDraw);
$('#pending-button').addEventListener('click', startDraw);
$('#prize-teaser').addEventListener('click', () => navigate('prizes', true));
$('#share-open').addEventListener('click', openShare);
$('.brand').addEventListener('click', event => { event.preventDefault(); navigate('wheel', true); });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view, true)));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { ticketFilter = button.dataset.filter; renderTickets(); }));
$('#dialog-close').addEventListener('click', closeModal);
dialog.addEventListener('close', () => {
  cleanupModal();
  modalMode = '';
  modalTicketId = null;
  modalTicketStatus = null;
  const destination = returnFocus?.isConnected && !returnFocus.disabled ? returnFocus : document.querySelector('[data-view][aria-current="page"]');
  destination?.focus({ preventScroll: true });
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeModal();
});
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')].filter(node => !node.hidden && node.getClientRects().length);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('#storage-retry').addEventListener('click', async () => {
  if (actionBusy) return;
  actionBusy = true;
  $('#storage-retry').disabled = true;
  try {
    await withGameLock(() => {
      const latest = readFreshState();
      persist(latest);
      state = latest;
    });
    storageBlocked = false;
    $('#storage-alert').hidden = true;
    renderState();
    toast('奖券保存已恢复，可以继续接住好运啦。');
    if (modalMode === 'ticket' && modalTicketId) openTicket(modalTicketId);
  } catch (error) { handleActionError(error); }
  finally { actionBusy = false; $('#storage-retry').disabled = false; renderState(); }
});
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) syncFromStorage(); });
window.addEventListener('hashchange', () => navigate(location.hash.slice(1), true));
window.addEventListener('pageshow', event => { if (event.persisted) { syncFromStorage(); if (finishSpin && Date.now() >= spinDeadline) finishSpin(); } });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  syncFromStorage();
  if (finishSpin && Date.now() >= spinDeadline) finishSpin();
});
if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', () => { if (reduceMotion.matches && finishSpin) finishSpin(); });

// Each deployed copy identifies its own address, rather than an earlier host.
const pageShareUrl = buildShareUrl(window.location.href);
if (pageShareUrl) {
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = pageShareUrl;
  document.head.append(canonical);
  const socialUrl = document.createElement('meta');
  socialUrl.setAttribute('property', 'og:url');
  socialUrl.content = pageShareUrl;
  document.head.append(socialUrl);
}

applySettings();
drawWheel();
renderPrizes();
try { state = readFreshState(); } catch { /* The persistent error banner blocks mutations without deleting records. */ }
renderState();
navigate(location.hash.slice(1) || 'wheel');
const pendingOnLoad = getPendingTicket(state);
if (pendingOnLoad && !storageBlocked) requestAnimationFrame(() => openTicket(pendingOnLoad.id));
