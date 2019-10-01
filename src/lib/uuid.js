import { v4 } from 'uuid';

export default class UUID {
  constructor() {
    this.count = 0;
    this.clients = [];

    this.clear = this.clear.bind(this);
    this.update = this.update.bind(this);
    this.create = this.create.bind(this);
  }

  clear() {
    this.clients = this.clients.filter(c => c.count === this.count);
  }

  update() {
    this.count++;
  }

  create(id, ip) {
    id = parseInt(id, 10);
    const client = this.clients.find(c => c.ip === ip && c.id === id);
    if (client === undefined || client === null) {
      const data = { ip, id, uuid: v4(), session: 'start', count: this.count };
      this.clients.push(data);
      return data;
    } else {
      client.session = 'update';
      client.count = this.count;
    }

    return client;
  }
}
