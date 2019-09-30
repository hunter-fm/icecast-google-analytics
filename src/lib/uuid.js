import { v4 } from 'uuid';

export default class UUID {
  constructor() {
    this.clients = [];

    this.create = this.create.bind(this);
  }

  create(id, ip) {
    id = parseInt(id);
    const client = this.clients.find(c => c.ip === ip);
    if (client === undefined || client === null) {
      const uuid = v4();
      this.clients.push({ ip, ids: [{ id, uuid }] });
      return uuid;
    }

    const ids = client.ids.find(i => i.id === id);
    if (ids === undefined || ids === null) {
      const uuid = v4();
      client.ids.push({ id, uuid });
      return uuid;
    }

    return ids.uuid;
  }
}
