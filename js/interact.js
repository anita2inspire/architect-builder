// Input: palette drag, moving and resizing, multi-select, arrows, zoom, undo/redo, copy/paste, keys.
(function () {
  const A = window.AWSDATA, S = window.S, R = window.R;
  const viewport = document.getElementById('viewport'), stage = document.getElementById('stage'), world = document.getElementById('world'),
        palette = document.getElementById('palette-list'), tip = document.getElementById('mode-tip');
  const I = window.I = {};
  const ZOOMS = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const refresh = () => { R.render(); if (window.P) window.P.renderPanel(); updateHistoryButtons(); };
  I.refresh = refresh;
  I.commit = () => { A.commit(); updateHistoryButtons(); };
  function updateHistoryButtons() {
    const H = A.history;
    document.getElementById('btn-undo').disabled = H.i <= 0;
    document.getElementById('btn-redo').disabled = H.i >= H.stack.length - 1;
  }

  const toWorld = (cx, cy) => {
    const r = stage.getBoundingClientRect();
    return { x: (cx - r.left) / S.zoom, y: (cy - r.top) / S.zoom };
  };
  const reparentAll = () => { for (let i = 0; i < 2; i++) S.nodes.forEach(A.reparent); };

  function place(kind, type, cx, cy) {
    const n = A.makeNode(kind, type, 0, 0);
    n.x = clamp(cx - n.w / 2, 0, S.world.w - n.w);
    n.y = clamp(cy - (kind === 'cont' ? 30 : n.h / 2), 0, S.world.h - n.h);
    S.nodes.push(n);
    if (kind === 'cont') reparentAll(); else A.reparent(n);
    A.selectOnly(n.id); I.commit(); refresh();
  }

  // ---------- Palette drag ----------
  let drag = null;
  palette.addEventListener('pointerdown', e => {
    const item = e.target.closest('.pitem'); if (!item || e.button > 0) return;
    drag = { kind: item.dataset.kind, type: item.dataset.type, item, sx: e.clientX, sy: e.clientY, ghost: null };
    item.setPointerCapture(e.pointerId);
  });
  palette.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      const g = drag.item.cloneNode(true); g.classList.add('ghost'); g.style.width = drag.item.offsetWidth + 'px';
      document.body.append(g); drag.ghost = g;
    }
    if (drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; }
  });
  palette.addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) {
      d.ghost.remove();
      const r = viewport.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        const p = toWorld(e.clientX, e.clientY); place(d.kind, d.type, p.x, p.y);
      }
    } else addAtCentre(d.kind, d.type);
  });
  palette.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; });
  palette.addEventListener('keydown', e => {
    const item = e.target.closest && e.target.closest('.pitem');
    if (item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); addAtCentre(item.dataset.kind, item.dataset.type); }
  });
  let nudge = 0;
  function addAtCentre(kind, type) {
    const r = viewport.getBoundingClientRect();
    const p = toWorld(r.left + r.width / 2, r.top + r.height / 2);
    nudge = (nudge + 1) % 6;
    place(kind, type, p.x + nudge * 18, p.y + nudge * 18);
  }

  // ---------- Canvas pointer handling ----------
  let move = null, band = null;
  const isMod = e => e.shiftKey || e.metaKey || e.ctrlKey;

  viewport.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const linkEl = e.target.closest('[data-link]');
    if (linkEl && linkEl.dataset.link && S.tool === 'select') {
      A.clearSelection(); S.sel = { type: 'link', id: linkEl.dataset.link }; refresh(); return;
    }
    const nodeEl = e.target.closest('.node');
    const n = nodeEl && A.byId(nodeEl.dataset.id);

    // Empty canvas, or Shift held: start a selection box.
    if (!n || (e.shiftKey && S.tool === 'select')) {
      if (S.tool === 'connect') { S.connectSrc = null; setTip(); refresh(); return; }
      const p = toWorld(e.clientX, e.clientY);
      band = { p0: p, add: e.shiftKey, toggle: n ? n.id : null, base: e.shiftKey ? S.multi.slice() : [], box: null, moved: false };
      viewport.setPointerCapture(e.pointerId);
      if (!e.shiftKey) { A.clearSelection(); S.connectSrc = null; refresh(); }
      return;
    }

    if (S.tool === 'connect') {
      if (n.kind !== 'svc') return;
      if (!S.connectSrc) { S.connectSrc = n.id; A.selectOnly(n.id); }
      else {
        const l = A.addLink(S.connectSrc, n.id);
        S.connectSrc = null;
        if (l) { A.clearSelection(); S.sel = { type: 'link', id: l.id }; I.commit(); }
      }
      setTip(); refresh(); return;
    }

    if (isMod(e) && !e.shiftKey) { A.toggleSelect(n.id); refresh(); return; }

    if (!S.multi.includes(n.id) || S.sel === null || S.sel.type === 'link') A.selectOnly(n.id);
    else S.sel = { type: 'node', id: n.id };
    const resizing = e.target.classList.contains('resize');
    if (resizing) A.selectOnly(n.id);
    const group = resizing ? [] : A.selectedWithKids();
    move = { n, resizing, p0: toWorld(e.clientX, e.clientY), start: group.map(g => ({ g, x: g.x, y: g.y })), w: n.w, h: n.h, moved: false };
    nodeEl.setPointerCapture(e.pointerId);
    refresh();
  });

  viewport.addEventListener('pointermove', e => {
    if (S.connectSrc) drawPending(e);
    if (band) { dragBand(e); return; }
    if (!move) return;
    const p = toWorld(e.clientX, e.clientY), dx = p.x - move.p0.x, dy = p.y - move.p0.y;
    if (!move.moved && Math.hypot(dx, dy) < 2) return;
    move.moved = true;
    if (move.resizing) {
      move.n.w = Math.max(120, Math.round((move.w + dx) / 10) * 10);
      move.n.h = Math.max(90, Math.round((move.h + dy) / 10) * 10);
    } else {
      move.start.forEach(s => {
        s.g.x = clamp(Math.round((s.x + dx) / 10) * 10, 0, S.world.w - s.g.w);
        s.g.y = clamp(Math.round((s.y + dy) / 10) * 10, 0, S.world.h - s.g.h);
      });
    }
    R.render();
  });

  function dragBand(e) {
    const p = toWorld(e.clientX, e.clientY);
    if (!band.moved && Math.hypot(p.x - band.p0.x, p.y - band.p0.y) < 4) return;
    band.moved = true;
    if (!band.box) { band.box = document.createElement('div'); band.box.className = 'selbox'; world.append(band.box); }
    const x = Math.min(p.x, band.p0.x), y = Math.min(p.y, band.p0.y), w = Math.abs(p.x - band.p0.x), h = Math.abs(p.y - band.p0.y);
    Object.assign(band.box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    band.rect = { x, y, w, h };
    // Only services and containers fully inside the box are picked.
    const hit = S.nodes.filter(n => n.x >= x && n.y >= y && n.x + n.w <= x + w && n.y + n.h <= y + h).map(n => n.id);
    S.multi = Array.from(new Set(band.base.concat(hit)));
    S.sel = S.multi.length ? { type: 'node', id: S.multi[S.multi.length - 1] } : null;
    R.render();
  }

  const end = () => {
    if (band) {
      const b = band; band = null;
      if (b.box) b.box.remove();
      if (!b.moved && b.toggle) A.toggleSelect(b.toggle);
      refresh(); return;
    }
    if (!move) return;
    if (move.moved) {
      if (!move.resizing && move.start.length) {
        const moved = new Set(S.multi);
        if (S.nodes.some(n => moved.has(n.id) && n.kind === 'cont')) reparentAll();
        else S.nodes.filter(n => moved.has(n.id)).forEach(A.reparent);
      } else reparentAll();
      I.commit();
    }
    move = null; refresh();
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  function drawPending(e) {
    const src = A.byId(S.connectSrc), path = document.getElementById('pending-link');
    if (!src || !path) return;
    const p = toWorld(e.clientX, e.clientY), s = R.edgePoint(src, p.x, p.y);
    path.setAttribute('d', 'M' + s.x + ',' + s.y + ' L' + p.x + ',' + p.y);
  }

  // ---------- Tools ----------
  function setTip() {
    if (S.tool !== 'connect') { tip.hidden = true; return; }
    tip.hidden = false;
    tip.textContent = S.connectSrc ? 'Now click the service to connect to. Esc cancels.' : 'Connect mode: click the first service.';
  }
  I.setTool = t => { S.tool = t; S.connectSrc = null; setTip(); refresh(); };
  document.getElementById('btn-select').onclick = () => I.setTool('select');
  document.getElementById('btn-connect').onclick = () => I.setTool(S.tool === 'connect' ? 'select' : 'connect');

  const zoomBy = dir => {
    let i = ZOOMS.findIndex(z => Math.abs(z - S.zoom) < 0.001); if (i < 0) i = 5;
    S.zoom = ZOOMS[clamp(i + dir, 0, ZOOMS.length - 1)]; R.render();
  };
  document.getElementById('btn-zoom-in').onclick = () => zoomBy(1);
  document.getElementById('btn-zoom-out').onclick = () => zoomBy(-1);

  // ---------- Edit actions ----------
  I.deleteSelection = function () {
    if (S.sel && S.sel.type === 'link') S.links = S.links.filter(l => l.id !== S.sel.id);
    else if (S.multi.length) S.multi.slice().forEach(A.removeNode);
    else return;
    A.clearSelection(); I.commit(); refresh();
  };
  I.undo = () => { if (A.undo()) refresh(); };
  I.redo = () => { if (A.redo()) refresh(); };
  document.getElementById('btn-undo').onclick = I.undo;
  document.getElementById('btn-redo').onclick = I.redo;

  let pasteStep = 0;
  I.copy = () => { pasteStep = 0; return A.copy(); };
  I.paste = function () {
    if (!S.clip) return;
    pasteStep++;
    const ids = A.paste(30 * pasteStep, 30 * pasteStep);
    S.multi = ids; S.sel = ids.length ? { type: 'node', id: ids[ids.length - 1] } : null;
    I.commit(); refresh();
  };
  I.duplicate = function () { if (I.copy()) I.paste(); };
  I.selectAll = function () { S.multi = S.nodes.map(n => n.id); S.sel = S.multi.length ? { type: 'node', id: S.multi[0] } : null; refresh(); };

  // Add a starter template below whatever is already on the canvas.
  I.addTemplate = function (id) {
    const spec = (window.AWS_TEMPLATES || []).find(t => t.id === id); if (!spec) return;
    const b = A.bounds(), ox = 60, oy = b ? b.y1 + 60 : 60;
    const ids = A.addTemplate(spec, ox, oy);
    S.multi = ids; S.sel = ids.length ? { type: 'node', id: ids[0] } : null;
    I.commit(); refresh();
    viewport.scrollTo({ left: Math.max(0, ox * S.zoom - 30), top: Math.max(0, oy * S.zoom - 30) });
  };

  document.addEventListener('keydown', e => {
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (typing) return;
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? I.redo() : I.undo(); }
    else if (mod && k === 'y') { e.preventDefault(); I.redo(); }
    else if (mod && k === 'c') { if (I.copy()) e.preventDefault(); }
    else if (mod && k === 'v') { e.preventDefault(); I.paste(); }
    else if (mod && k === 'd') { e.preventDefault(); I.duplicate(); }
    else if (mod && k === 'a') { e.preventDefault(); I.selectAll(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); I.deleteSelection(); }
    else if (e.key === 'Escape') { S.connectSrc = null; if (S.tool === 'connect') S.tool = 'select'; else A.clearSelection(); setTip(); refresh(); }
    else if (!mod && k === 'c') I.setTool(S.tool === 'connect' ? 'select' : 'connect');
    else if (!mod && k === 'v') I.setTool('select');
  });
})();
