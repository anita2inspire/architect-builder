// Side panel: Properties (settings for the selection) and Review (self-check by pillar).
(function () {
  const A = window.AWSDATA, S = window.S;
  const root = document.getElementById('props');
  const tabProps = document.getElementById('tab-props'), tabReview = document.getElementById('tab-review');
  const P = window.P = { tab: 'props', lastSel: '' };
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => 'f' + Math.random().toString(36).slice(2, 8);
  const commit = () => window.I && window.I.commit && window.I.commit();

  function textField(label, value, placeholder, onInput, listId, listItems) {
    const f = h('div', 'field'), id = uid();
    const l = h('label', '', label); l.htmlFor = id;
    const i = h('input'); i.type = 'text'; i.id = id; i.value = value; i.placeholder = placeholder || '';
    i.addEventListener('input', () => onInput(i.value));
    i.addEventListener('change', commit);
    f.append(l, i);
    if (listItems) {
      i.setAttribute('list', listId);
      const dl = h('datalist'); dl.id = listId;
      listItems.forEach(v => { const o = h('option'); o.value = v; dl.append(o); });
      f.append(dl);
    }
    return f;
  }

  function optionControl(n, o) {
    if (o.type === 'toggle') {
      const row = h('label', 'switch'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!n.props[o.key];
      cb.addEventListener('change', () => { n.props[o.key] = cb.checked; window.R.render(); commit(); });
      row.append(h('span', '', o.label), cb);
      return row;
    }
    const f = h('div', 'field'), id = uid();
    const l = h('label', '', o.label); l.htmlFor = id;
    const s = h('select'); s.id = id;
    o.choices.forEach(c => { const op = h('option', '', c); op.value = c; if (c === n.props[o.key]) op.selected = true; s.append(op); });
    s.addEventListener('change', () => { n.props[o.key] = s.value; window.R.render(); commit(); });
    f.append(l, s);
    return f;
  }

  function help() {
    const d = h('div', 'help');
    d.append(h('h2', '', 'Properties'));
    d.append(h('p', '', 'Select something on the canvas to change its settings.'));
    const ul = h('ul');
    [
      'Drag items from the left onto the canvas. Containers nest: Region, VPC, AZ, subnet.',
      'Drop a service inside a subnet and it joins that subnet. Moving a container moves what is inside it.',
      'Connect (or C) then click two services to draw an arrow.',
      'Shift-click or drag a box on empty canvas to select several. Ctrl/Cmd+C and V copy and paste. Ctrl/Cmd+Z undoes.',
      'Open the Review tab to check your design against the six Well-Architected pillars.'
    ].forEach(t => ul.append(h('li', '', t)));
    d.append(ul);
    return d;
  }

  function multiPanel() {
    const d = h('div');
    d.append(h('h2', '', S.multi.length + ' items selected'), h('p', 'sub', 'Drag any one to move them all together.'));
    const row = h('div', 'row2');
    const dup = h('button', '', 'Duplicate'); dup.onclick = () => window.I.duplicate();
    const del = h('button', 'danger', 'Delete'); del.style.margin = '0'; del.onclick = () => window.I.deleteSelection();
    row.append(dup, del); d.append(row);
    return d;
  }

  function properties() {
    if (S.multi.length > 1) { root.append(multiPanel()); return; }
    if (!S.sel) { root.append(help()); return; }

    if (S.sel.type === 'link') {
      const l = S.links.find(k => k.id === S.sel.id); if (!l) { root.append(help()); return; }
      const a = A.byId(l.from), b = A.byId(l.to);
      root.append(h('h2', '', 'Arrow'), h('p', 'sub', A.title(a) + '  →  ' + A.title(b)));
      root.append(textField('Label', l.label, 'e.g. HTTPS, SQL, async', v => { l.label = v; window.R.renderLinks(); }, 'link-labels',
        ['HTTPS', 'HTTP', 'SQL', 'Reads', 'Writes', 'Replication', 'Async', 'Events', 'Messages', 'Private link', 'VPN', 'Backup']));
      const row = h('label', 'switch'), cb = h('input'); cb.type = 'checkbox'; cb.checked = l.dashed;
      cb.addEventListener('change', () => { l.dashed = cb.checked; window.R.renderLinks(); commit(); });
      row.append(h('span', '', 'Dashed (async or optional path)'), cb); root.append(row);
      const rev = h('button', '', 'Reverse direction'); rev.style.marginTop = '12px'; rev.style.width = '100%';
      rev.onclick = () => { const t = l.from; l.from = l.to; l.to = t; window.I.commit(); window.I.refresh(); };
      root.append(rev);
      const del = h('button', 'danger', 'Delete arrow'); del.onclick = () => window.I.deleteSelection(); root.append(del);
      return;
    }

    const n = A.byId(S.sel.id); if (!n) { root.append(help()); return; }
    const def = A.def(n), color = A.color(n);
    const head = h('div', 'head'), badge = h('span', 'badge'); window.R.paintBadge(badge, n.kind, n.type, def.abbr, color);
    const t = h('div'); t.append(h('h2', '', def.name), h('p', 'sub', n.kind === 'cont' ? 'Container' : A.CAT[def.cat].name));
    head.append(badge, t); root.append(head);
    if (def.tip) root.append(h('div', 'tip', def.tip));

    root.append(textField('Label on diagram', n.label, 'e.g. Web tier', v => { n.label = v; window.R.render(); }));
    const opts = def.options || [];
    if (opts.length) { const hd = h('div', 'lbl', 'Settings'); hd.style.cssText = 'font-size:12px;font-weight:600;color:var(--muted);margin:4px 0 2px'; root.append(hd); }
    opts.forEach(o => root.append(optionControl(n, o)));
    if (!opts.length) root.append(h('p', 'sub', 'No settings for this one. Use the label and arrows to show how it fits in.'));
    const del = h('button', 'danger', 'Delete ' + (n.kind === 'cont' ? 'container' : 'service'));
    del.onclick = () => window.I.deleteSelection(); root.append(del);
  }

  // ---------- Review ----------
  const total = () => window.AWS_REVIEW.reduce((a, p) => a + p.items.length, 0);
  const done = pillar => (pillar ? pillar.items : window.AWS_REVIEW.flatMap(p => p.items)).filter(i => S.review[i.id]).length;

  function updateCounts() {
    document.getElementById('review-count').textContent = done() + '/' + total();
    const bar = root.querySelector('.bar > i'); if (bar) bar.style.width = (done() / total() * 100) + '%';
    const sum = root.querySelector('[data-sum]'); if (sum) sum.textContent = done() + ' of ' + total() + ' answered';
    window.AWS_REVIEW.forEach(p => { const e = root.querySelector('[data-p="' + p.id + '"]'); if (e) e.textContent = done(p) + '/' + p.items.length; });
  }

  function review() {
    root.append(h('h2', '', 'Design review'));
    root.append(h('p', 'sub', 'Tick each question once your diagram answers it. Nothing is checked for you.'));
    const bar = h('div', 'bar'); bar.append(h('i')); root.append(bar);
    const sum = h('p', 'sub'); sum.dataset.sum = '1'; root.append(sum);
    window.AWS_REVIEW.forEach((p, idx) => {
      const d = h('details', 'pillar'); d.open = idx === 0 || done(p) > 0 && done(p) < p.items.length;
      const sm = h('summary'); sm.append(h('span', '', p.name)); const pill = h('span', 'pill'); pill.dataset.p = p.id; sm.append(pill); d.append(sm);
      p.items.forEach(it => {
        const row = h('label', 'check'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!S.review[it.id];
        cb.addEventListener('change', () => { if (cb.checked) S.review[it.id] = true; else delete S.review[it.id]; updateCounts(); });
        const body = h('div'); body.append(h('span', 'q', it.q), h('span', 'look', 'Look for: ' + it.look));
        row.append(cb, body); d.append(row);
      });
      root.append(d);
    });
    const reset = h('button', '', 'Clear all ticks'); reset.style.cssText = 'margin-top:12px;width:100%';
    reset.onclick = () => { S.review = {}; P.renderPanel(); };
    root.append(reset);
    updateCounts();
  }

  function setTab(t) { P.tab = t; P.renderPanel(); }
  tabProps.onclick = () => setTab('props'); tabReview.onclick = () => setTab('review');

  P.renderPanel = function () {
    const key = S.multi.length > 1 ? 'multi' + S.multi.length : S.sel ? S.sel.type + S.sel.id : '';
    if (key && key !== P.lastSel && P.tab === 'review') P.tab = 'props';
    P.lastSel = key;
    tabProps.setAttribute('aria-selected', String(P.tab === 'props'));
    tabReview.setAttribute('aria-selected', String(P.tab === 'review'));
    root.textContent = '';
    if (P.tab === 'review') review(); else properties();
    updateCounts();
  };
})();
