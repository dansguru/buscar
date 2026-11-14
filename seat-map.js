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

  for (let index = 0; index < 8; index += 1) {
    const row = 5 + index;
    const firstSeat = 5 + index * 4;
    layout.push(
      { id: String(firstSeat), column: 1, row },
      { id: String(firstSeat + 1), column: 2, row },
      { id: String(firstSeat + 2), column: 4, row },
      { id: String(firstSeat + 3), column: 5, row }
    );
  }

  layout.push(
    { id: '37', column: 1, row: 13 },
    { id: '38', column: 2, row: 13 },
    { id: '39', column: 3, row: 13 },
    { id: '40', column: 4, row: 13 },
    { id: '41', column: 5, row: 13 }
  );

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

  function createSeats(trip, seed, savedSeats = []) {
    const order = ids.slice().sort((left, right) =>
      hash(left + trip.id + seed) - hash(right + trip.id + seed));
    const free = new Set(order.slice(0, trip.seatsLeft));
    if (Array.isArray(savedSeats)) savedSeats.slice(0, 6).forEach((id) => free.add(id));
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
