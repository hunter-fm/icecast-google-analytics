import axios from 'axios';

export default class Analytics {
  constructor(config, urlbase, minConnect) {    
    this.sessionType = this.sessionType.bind(this);
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

  sessionType(uuid, info) {
    const session = this.sessions.find(c => c.uuid === uuid);
    if (session === undefined || session === null) {
      this.sessions.push({ info, uuid, update: this.update });
      return 'start';
    }

    session.update = this.update;
    session.info = Object.assign({}, info);
    return 'update';
  }
  
  createUserEvent(mount, listener) {
    let title = mount.metadata.title || '';
    if ('artist' in mount.metadata) {
      title = `${mount.metadata.artist || ''} - ${title}`;
    }

    const isAds = title.toLowerCase().indexOf('advert:') === 0;
    const data = {
      v: 1,
      t: 'event',
      tid: this.config.TID,

      ec: this.config.category,
      ea: isAds ? 'advert' : 'music',
      el: title,

      cid: listener.ip,
      uip: listener.ip,
      ua: listener.useragent,
      dh: this.urlbase,
      dp: `${mount.name}/${title}`,
      dt: mount.title,
      dr: listener.referer,
    };

    let textData = '';
    Object.keys(data).forEach(key => {
      if (textData.length > 0) textData += '&';
      textData += `${key}=${encodeURIComponent(data[key])}`;
    });
    return textData;
  }

  createUserPageview(mount, listener) {
    let title = mount.metadata.title || '';
    if ('artist' in mount.metadata) {
      title = `${mount.metadata.artist || ''} - ${title}`;
    }

    const data = {
      v: 1,
      t: 'pageview',
      sc: 'update',
      tid: this.config.TID,
      cid: listener.uuid,
      uip: listener.ip,
      ua: listener.useragent,
      dh: this.urlbase,
      dp: mount.name,
      dt: mount.title,
      dr: listener.referer,
    };

    data.sc = this.sessionType(listener.uuid, data);

    let textData = '';
    Object.keys(data).forEach(key => {
      if (textData.length > 0) textData += '&';
      textData += `${key}=${encodeURIComponent(data[key])}`;
    });
    return textData;
  }

  createUserSessionEnd() {
    const ends = this.sessions.filter(s => s.update !== this.update);
    this.sessions = this.sessions.filter(s => s.update === this.update);
    return ends.length > 0
      ? ends.map(s => {
          const data = { ...s.info, sc: 'end' };
          let textData = '';
          Object.keys(data).forEach(key => {
            if (textData.length > 0) textData += '&';
            textData += `${key}=${encodeURIComponent(data[key])}`;
          });
          return textData;
        })
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
      const valores = m.listeners
        .filter(l => l.connect >= this.minConnect)
        .map(l =>
          this.config.type.map(type => {
            return type === 'pageview'
              ? this.createUserPageview(m, l)
              : this.createUserEvent(m, l);
          })
        );
      datas = [...datas, ...valores];
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
