// Minimal DOM shim, enough to run src/main.ts (compiled) outside a browser.
export class El {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.handlers = {};
    this.className = '';
    this.hidden = false;
    this.disabled = false;
    this._text = '';
    this._value = '';
  }
  get textContent() {
    return this._text;
  }
  set textContent(v) {
    this._text = String(v ?? '');
    if (this._text === '') this.children = [];
  }
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v;
  }
  append(...kids) {
    for (const k of kids) this.children.push(k);
  }
  addEventListener(ev, fn) {
    this.handlers[ev] = fn;
  }
  focus() {}
}

export function makeDom() {
  const ids = new Map();
  const document = {
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, new El('div'));
      return ids.get(id);
    },
    createElement(tag) {
      return new El(tag);
    },
  };
  return { ids, document };
}
