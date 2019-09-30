import axios from 'axios';

export default class Analytics {
  constructor(config, urlbase, minConnect) {
    this.data2Uri = this.data2Uri.bind(this);

    this.getSession = this.getSession.bind(this);
    this.createSession = this.createSession.bind(this);

    this.createUserEvent = this.createUserEvent.bind(this);
    this.createUserPageview = this.createUserPageview.bind(this);
    this.updateMounts = this.updateMounts.bind(this);

    this.update = 1;
    this.sessions = [];

    this.config = config;
    this.minConnect = minConnect;
    this.urlbase = urlbase;
    this.urlgoogle = 'https://www.google-analytics.com/batch';
  }

  data2Uri(data) {
    let textData = '';
    Object.keys(data).forEach(key => {
      if (textData.length > 0) textData += '&';
      textData += `${key}=${encodeURIComponent(data[key])}`;
    });
    return textData;
  }

  getSession(uuid) {
    const s = this.sessions.find(c => c.uuid === uuid);
    if (s !== undefined && s !== null) return s;
    return null;
  }

  createSession(uuid, info) {
    const s = Object.assign({}, { info, uuid, update: this.update });
    this.sessions.push(s);
  }

  createUserEvent(mount, listener) {
    let title = '';
    if (mount.metadata !== null) {
      title = mount.metadata.title || '';
      if ('artist' in mount.metadata) {
        title = `${mount.metadata.artist || ''} - ${title}`;
      }
    } else {
      title = mount.title || '';
    }

    const isAds = title.toLowerCase().indexOf('advert:') === 0;
    const data = {
      v: 1,
      t: 'event',
      tid: this.config.TID,

      ec: this.config.category,
      ea: isAds ? 'advert' : 'music',
      el: title,

      cid: listener.uuid,
      uip: listener.ip,
      ua: listener.useragent,
      dh: this.urlbase,
      dp: 'url' in this.config ? this.config.url : mount.name,
      dr: listener.referer,
    };

    return this.data2Uri(data);
  }

  createUserPageview(mount, listener) {
    // let title = mount.metadata.title || '';
    // if ('artist' in mount.metadata) {
    //   title = `${mount.metadata.artist || ''} - ${title}`;
    // }
    // dt: mount.title,
    const data = {
      v: 1,
      t: 'pageview',
      sc: 'start',
      tid: this.config.TID,
      cid: listener.uuid,
      uip: listener.ip,
      ua: listener.useragent,
      dh: this.urlbase,
      dp: 'url' in this.config ? this.config.url : mount.name,
      dr: listener.referer,
    };

    this.createSession(listener.uuid, data);
    return this.data2Uri(data);
  }

  createUserSessionEnd() {
    const ends = this.sessions.filter(s => s.update !== this.update);
    this.sessions = this.sessions.filter(s => s.update === this.update);
    return ends.length > 0
      ? ends.map(s => this.data2Uri({ ...s.info, sc: 'end' }))
      : [];
  }

  updateMounts(mounts) {
    console.log('Updated Mount! ', this.config.category);

    // Filtrar mounts só do TID
    const myMounts =
      this.config.mounts[0] === '*'
        ? mounts
        : mounts.filter(m => this.config.mounts.indexOf(m.name) >= 0);

    // Gerar os id's e envia para o Google Analytics
    this.update++;
    let datas = [];

    myMounts.forEach(m => {
      m.listeners.forEach(l => {
        if (l.connect < this.minConnect) return;

        const s = this.getSession(l.uuid);
        if (s === null) {
          datas.push(this.createUserPageview(m, l));
        } else {
          s.update = this.update;
        }
        datas.push(this.createUserEvent(m, l));
      });
    });
    datas = [...datas, ...this.createUserSessionEnd()];

    const sendsDatas = [];
    let tempDatas = '';
    let countData = 0;
    datas.forEach(dt => {
      if (tempDatas.length + dt.length > 8000 || countData > 19) {
        sendsDatas.push(tempDatas);
        tempDatas = '';
        countData = 0;
      }

      if (countData > 0) {
        tempDatas += '\n';
      }
      tempDatas += dt;
      countData++;
    });

    if (tempDatas !== '' || countData > 0) {
      sendsDatas.push(tempDatas);
    }

    sendsDatas.forEach(body => {
      axios({
        method: 'post',
        url: this.urlgoogle,
        data: body,
        config: {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      }).catch(err => console.error(err));
    });

    console.log('--- FIM ---');
  }
}
