(() => {
  'use strict';

  const layout = [
    { id: 'A', column: 1, row: 1 },
    { kind: 'wheel', column: 4, row: 1, columnSpan: 2 },
    { id: 'B', column: 1, row: 2 },
    { id: 'C', column: 4, row: 2 },
    { id: 'D', column: 5, row: 2 },
    { kind: 'door', column: 1, row: 3, rowSpan: 2 },
    { id: '1', column: 4, row: 3 },
    { id: '2', column: 5, row: 3 },
    { id: '3', column: 4, row: 4 },
    { id: '4', column: 5, row: 4 }
  ];

  const normalPairs = [];
  for (let index = 0; index < 8; index += 1) {
    const row = 5 + index;
    const firstSeat = 5 + index * 4;
    layout.push(
      { id: String(firstSeat), column: 1, row },
      { id: String(firstSeat + 1), column: 2, row },
      { id: String(firstSeat + 2), column: 4, row },
      { id: String(firstSeat + 3), column: 5, row }
    );
    normalPairs.push(
      [String(firstSeat), String(firstSeat + 1)],
      [String(firstSeat + 2), String(firstSeat + 3)]
    );
  }

  layout.push(
    { id: '37', column: 1, row: 13 },
    { id: '38', column: 2, row: 13 },
    { id: '39', column: 3, row: 13 },
    { id: '40', column: 4, row: 13 },
    { id: '41', column: 5, row: 13 }
  );
  normalPairs.push(['37', '38'], ['40', '41']);

  const ids = Object.freeze(layout.filter((item) => item.id).map((item) => item.id));
  const fareKeys = Object.freeze({ vip: 'Vip', business: 'Bclass', normal: 'Normal' });
  const hash = (value) => {
    let result = 7;
    for (const character of value) result = (result * 31 + character.charCodeAt(0)) >>> 0;
    return result;
  };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const money = (value) => Number(value).toLocaleString('en-US');
  const placement = (item) => {
    const column = item.columnSpan ? `${item.column} / span ${item.columnSpan}` : item.column;
    const row = item.rowSpan ? `${item.row} / span ${item.rowSpan}` : item.row;
    return `grid-column:${column};grid-row:${row}`;
  };
  const getType = (id) => ['A', 'B', 'C', 'D'].includes(id) ? 'vip' : Number(id) <= 4 ? 'business' : 'normal';
  const getName = (id) => getType(id) === 'vip' ? `VIP ${id}` : `Seat ${id}`;
  const vipIds = Object.freeze(ids.filter((id) => getType(id) === 'vip'));
  const businessIds = Object.freeze(ids.filter((id) => getType(id) === 'business'));

  function createSeats(trip, seed, savedSeats = []) {
    const minimumAvailable = vipIds.length + businessIds.length + 20;
    const availableCount = Math.min(ids.length, Math.max(minimumAvailable, Math.floor(Number(trip.seatsLeft)) || 0));
    const availablePairCount = Math.min(normalPairs.length, Math.floor((availableCount - vipIds.length - businessIds.length) / 2));
    const maxStart = normalPairs.length - availablePairCount;
    const pairStart = hash(`${trip.id}|${seed}|normal-pairs`) % (maxStart + 1);
    const free = new Set([
      ...vipIds,
      ...businessIds,
      ...normalPairs.slice(pairStart, pairStart + availablePairCount).reduce((seats, pair) => seats.concat(pair), [])
    ]);
    if (Array.isArray(savedSeats)) savedSeats.slice(0, ids.length).forEach((id) => free.add(id));
    const seats = {};
    ids.forEach((id) => { seats[id] = { type: getType(id), free: free.has(id) }; });
    return seats;
  }

  function renderSeat(trip, item, selectedSeats, index) {
    const id = item.id;
    const seat = trip.seats[id];
    const selected = selectedSeats.has(id);
    const state = selected ? 'selected' : seat.free ? 'free' : 'booked';
    const label = `${getName(id)} — KES ${money(trip.fares[fareKeys[seat.type]])}, availability to be confirmed`;
    const content = seat.type === 'vip'
      ? `<span class="vip-tag">VIP</span><em>${escapeHtml(id)}</em>`
      : escapeHtml(id);
    return `<button type="button" class="seat ${seat.type} ${state}" data-seat="${escapeHtml(id)}" style="${placement(item)};--seat-order:${index}" ${state === 'booked' ? 'disabled' : ''} aria-pressed="${selected}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${content}</button>`;
  }

  function render(trip, selectedSeats) {
    const selected = selectedSeats instanceof Set ? selectedSeats : new Set(selectedSeats || []);
    return layout.map((item, index) => {
      if (item.id) return renderSeat(trip, item, selected, index);
      if (item.kind === 'wheel') {
        return `<span class="wheel" style="${placement(item)}" aria-hidden="true"><svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="24" cy="24" r="21"/><circle cx="24" cy="24" r="5"/><path d="M4 22c6-3 10-3 16 0M44 22c-6-3-10-3-16 0M24 29v14"/></svg></span>`;
      }
      if (item.kind === 'door') return `<span class="door" style="${placement(item)}"><b>Door</b></span>`;
      return '';
    }).join('');
  }

  window.BuscarSeatMap = Object.freeze({ ids, fareKeys, getName, getType, createSeats, render });
})();
