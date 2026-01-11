export default class SelectionStore {
  constructor() {
    this.state = {
      kind: null,         
      object: null,        
      worldPos: null,   
      area: 0,             
    };
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  clear() {
    this.state = { kind: null, object: null, padInstanceId: -1, worldPos: null, area: 0 };
    this._emit();
  }

  set(next) {
    this.state = { ...this.state, ...next };
    this._emit();
  }
}
