// Practice profiles: each has its own balance, leverage and trade history.
export class Profiles {
  constructor(api) { this.api = api; this.list = []; this.id = localStorage.getItem('tb_profile'); }
  get current() { return this.list.find((p) => p.id === this.id) || this.list[0]; }
  async load() { this.list = (await this.api('/profiles')).profiles; this.id = this.current.id; }
  select(id) { this.id = id; localStorage.setItem('tb_profile', id); }
  async create(data) { const { profile } = await this.api('/profiles', { method: 'POST', body: data }); this.list.push(profile); this.select(profile.id); return profile; }
  async update(id, data) { const { profile } = await this.api(`/profiles/${id}`, { method: 'PATCH', body: data }); Object.assign(this.list.find((p) => p.id === id), profile); return profile; }
  async remove(id) { await this.api(`/profiles/${id}`, { method: 'DELETE' }); this.list = this.list.filter((p) => p.id !== id); this.select(this.list[0].id); }
  trades() { return this.api(`/trades?profileId=${this.id}`).then((r) => r.trades); }
  clearTrades() { return this.api(`/trades?profileId=${this.id}`, { method: 'DELETE' }); }
}
