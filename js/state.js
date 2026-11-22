// Model: nodes (services and containers), links (arrows), and selection.
(function () {
  const CAT = Object.fromEntries(window.AWS_CATEGORIES.map(c => [c.id, c]));
  const SVC = Object.fromEntries(window.AWS_SERVICES.map(s => [s.id, s]));
  const CONT = Object.fromEntries(window.AWS_CONTAINERS.map(c => [c.id, c]));
  const SVC_W = 124, SVC_H = 100;

  const S = window.S = {
    nodes: [], links: [], sel: null, multi: [], review: {}, clip: null, tool: 'select', zoom: 1, connectSrc: null, seq: 1,
    world: { w: 4000, h: 3000 }
  };
  const A = window.AWSDATA = { CAT, SVC, CONT, SVC_W, SVC_H };

  A.def = n => n.kind === 'cont' ? CONT[n.type] : SVC[n.type];
  A.color = n => n.kind === 'cont' ? CONT[n.type].color : CAT[SVC[n.type].cat].color;
  A.byId = id => S.nodes.find(n => n.id === id);
  A.uid = p => p + (S.seq++);

  A.defaultProps = def => {
    const p = {};
    (def.options || []).forEach(o => { p[o.key] = o.default; });
    return p;
  };

  A.makeNode = function (kind, type, x, y) {
    const def = kind === 'cont' ? CONT[type] : SVC[type];
    const n = { id: A.uid('n'), kind, type, x, y, parent: null, label: '', props: A.defaultProps(def) };
    n.w = kind === 'cont' ? def.w : SVC_W;
    n.h = kind === 'cont' ? def.h : SVC_H;
    return n;
  };

  A.center = n => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

  A.descendants = function (id) {
    const out = [];
    const walk = pid => S.nodes.forEach(n => { if (n.parent === pid) { out.push(n); walk(n.id); } });
    walk(id);
    return out;
  };

  A.depth = function (n) {
    let d = 0, p = n.parent;
    while (p) { d++; p = (A.byId(p) || {}).parent; }
    return d;
  };

  // Smallest container under the point that may hold this node.
  A.containerAt = function (node, px, py) {
    const skip = new Set([node.id, ...A.descendants(node.id).map(d => d.id)]);
    const allowed = node.kind === 'cont' ? CONT[node.type].parents.filter(Boolean) : null;
    let best = null;
    S.nodes.forEach(c => {
      if (c.kind !== 'cont' || skip.has(c.id)) return;
      if (allowed && !allowed.includes(c.type)) return;
      if (px < c.x || py < c.y || px > c.x + c.w || py > c.y + c.h) return;
      if (!best || c.w * c.h < best.w * best.h) best = c;
    });
    return best;
  };

  A.reparent = function (node) {
    const c = A.center(node);
    const host = A.containerAt(node, c.x, c.y);
    node.parent = host ? host.id : null;
  };

  A.removeNode = function (id) {
    const n = A.byId(id);
    if (!n) return;
    S.nodes.forEach(k => { if (k.parent === id) k.parent = n.parent; });
    S.nodes = S.nodes.filter(k => k.id !== id);
    S.links = S.links.filter(l => l.from !== id && l.to !== id);
  };

  A.addLink = function (from, to) {
    if (from === to) return null;
    if (S.links.some(l => l.from === from && l.to === to)) return null;
    const l = { id: A.uid('l'), from, to, label: '', dashed: false };
    S.links.push(l);
    return l;
  };

  // Short text shown under a service: custom label or its name.
  A.title = n => n.label || (n.kind === 'cont' ? containerTitle(n) : SVC[n.type].name.replace(/^(Amazon|AWS) /, ''));
  function containerTitle(n) {
    const d = CONT[n.type], p = n.props;
    if (n.type === 'c-region') return 'Region · ' + p.name;
    if (n.type === 'c-az') return 'AZ · ' + p.name;
    if (n.type === 'c-vpc') return 'VPC · ' + p.cidr;
    if (n.type === 'c-account') return 'Account · ' + p.env;
    return d.name;
  }

  // Up to two short chips summarising the key settings on a service.
  // "Application (ALB)" shows as ALB; other parentheses are dropped.
  const short = v => { v = String(v); const m = v.match(/\(([A-Z]{3,5})\)/); return m ? m[1] : v.replace(/ \(.*\)/, ''); };
  A.chips = function (n) {
    const def = SVC[n.type], tg = [], sel = [];
    (def.options || []).forEach(o => {
      const v = n.props[o.key];
      if (o.type === 'toggle' && v && /Multi-AZ|multiple AZ|Spans|Global|Cross-region|Spot|Provisioned conc|Versioning|replica|WAF|DAX|Cluster/i.test(o.label))
        tg.push({ t: o.label.replace(/ \(.*\)/, '').replace(/^Part of an /, '').replace(/^Spans multiple AZs$/, 'Multi-AZ'), on: true });
      if (o.type === 'select' && /purchase|capacity|class|type|policy|launch|mode|engine|tier/i.test(o.key))
        sel.push({ t: short(v), on: false });
    });
    return tg.concat(sel).slice(0, 2);
  };

  A.clear = function () { S.nodes = []; S.links = []; S.sel = null; S.multi = []; S.review = {}; S.connectSrc = null; };
  A.serialize = brief => JSON.stringify({ v: 2, brief, nodes: S.nodes, links: S.links, seq: S.seq, review: S.review }, null, 2);
  A.load = function (json) {
    const d = JSON.parse(json);
    if (!d || !Array.isArray(d.nodes) || !Array.isArray(d.links)) throw new Error('Not a design file');
    const ok = d.nodes.filter(n => (n.kind === 'cont' ? CONT[n.type] : SVC[n.type]));
    const ids = new Set(ok.map(n => n.id));
    S.nodes = ok;
    S.links = d.links.filter(l => ids.has(l.from) && ids.has(l.to));
    S.seq = d.seq || 1000; S.sel = null; S.multi = []; S.connectSrc = null; S.review = d.review && typeof d.review === 'object' ? d.review : {};
    return d.brief || '';
  };

  // ---------- Selection ----------
  A.isSelected = id => S.multi.includes(id) || !!(S.sel && S.sel.type === 'node' && S.sel.id === id);
  A.selectOnly = id => { S.sel = { type: 'node', id }; S.multi = [id]; };
  A.clearSelection = () => { S.sel = null; S.multi = []; };
  A.toggleSelect = id => {
    if (S.multi.includes(id)) { S.multi = S.multi.filter(k => k !== id); S.sel = S.multi.length ? { type: 'node', id: S.multi[S.multi.length - 1] } : null; }
    else { S.multi.push(id); S.sel = { type: 'node', id }; }
  };
  // The selected nodes plus everything inside any selected container.
  A.selectedWithKids = () => {
    const ids = new Set();
    S.multi.forEach(id => { ids.add(id); A.descendants(id).forEach(d => ids.add(d.id)); });
    return S.nodes.filter(n => ids.has(n.id));
  };

  // ---------- History (undo / redo) ----------
  const H = A.history = { stack: [], i: -1 };
  const snap = () => JSON.stringify({ nodes: S.nodes, links: S.links });
  A.commit = function () {
    const s = snap();
    if (H.i >= 0 && H.stack[H.i] === s) return;
    H.stack = H.stack.slice(0, H.i + 1); H.stack.push(s);
    if (H.stack.length > 100) H.stack.shift();
    H.i = H.stack.length - 1;
  };
  A.resetHistory = function () { H.stack = []; H.i = -1; A.commit(); };
  function restore() {
    const d = JSON.parse(H.stack[H.i]);
    S.nodes = d.nodes; S.links = d.links; A.clearSelection(); S.connectSrc = null;
  }
  A.undo = function () { if (H.i > 0) { H.i--; restore(); return true; } return false; };
  A.redo = function () { if (H.i < H.stack.length - 1) { H.i++; restore(); return true; } return false; };

  // ---------- Copy / paste ----------
  A.copy = function () {
    const nodes = A.selectedWithKids();
    if (!nodes.length) return false;
    const ids = new Set(nodes.map(n => n.id));
    S.clip = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(S.links.filter(l => ids.has(l.from) && ids.has(l.to))))
    };
    return true;
  };
  // Paste with an offset; new ids; parents inside the pasted set are remapped, others re-detected by position.
  A.paste = function (dx, dy) {
    if (!S.clip) return [];
    const map = {};
    const fresh = S.clip.nodes.map(n => {
      const c = JSON.parse(JSON.stringify(n)); map[n.id] = c.id = A.uid('n');
      c.x = Math.max(0, c.x + dx); c.y = Math.max(0, c.y + dy); return c;
    });
    fresh.forEach(c => { c.parent = c.parent && map[c.parent] ? map[c.parent] : null; });
    S.nodes.push(...fresh);
    S.clip.links.forEach(l => S.links.push({ id: A.uid('l'), from: map[l.from], to: map[l.to], label: l.label, dashed: l.dashed }));
    for (let i = 0; i < 2; i++) fresh.forEach(A.reparent);
    return fresh.map(n => n.id);
  };

  // ---------- Templates ----------
  // spec: { nodes:[{id,type,x,y,w?,h?,label?,props?}], links:[[from,to,label?,dashed?]] }
  A.addTemplate = function (spec, ox, oy) {
    const map = {}, made = [];
    spec.nodes.forEach(t => {
      const kind = CONT[t.type] ? 'cont' : 'svc';
      const n = A.makeNode(kind, t.type, ox + t.x, oy + t.y);
      if (t.w) n.w = t.w; if (t.h) n.h = t.h;
      if (t.label) n.label = t.label;
      if (t.props) Object.assign(n.props, t.props);
      map[t.id] = n.id; S.nodes.push(n); made.push(n);
    });
    (spec.links || []).forEach(k => {
      const l = A.addLink(map[k[0]], map[k[1]]);
      if (l) { l.label = k[2] || ''; l.dashed = !!k[3]; }
    });
    for (let i = 0; i < 3; i++) made.forEach(A.reparent);
    return made.map(n => n.id);
  };
  A.bounds = function () {
    if (!S.nodes.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    S.nodes.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h); });
    return { x0, y0, x1, y1 };
  };
})();
