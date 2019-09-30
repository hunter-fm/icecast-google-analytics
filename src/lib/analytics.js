import axios from 'axios';

export default class Analytics {
  constructor(config, urlbase, minConnect) {
    this.createUserData = this.createUserData.bind(this);
    this.updateMounts = this.updateMounts.bind(this);

    this.config = config;
    this.minConnect = minConnect;
    this.urlbase = urlbase;
    this.urlgoogle = 'https://www.google-analytics.com/batch';
  }

  createUserData(mount, listener) {
    let title = mount.metadata.title || '';
    if ('artist' in mount.metadata) {
      title = `${mount.metadata.artist || ''} - ${title}`;
    }

    const data = {
      v: 1,
      t: 'pageview',
      tid: this.config.TID,
      cid: listener.uuid,
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

  updateMounts(mounts) {
    console.log('Updated Mount!', this.config.TID);

    // Filtrar mounts só do TID
    const myMounts =
      this.config.mounts[0] === '*'
        ? mounts
        : mounts.filter(m => this.config.mounts.indexOf(m.name) >= 0);

    // Gerar os id's e envia para o Google Analytics
    let datas = [];
    myMounts.forEach(m => {
      const valores = m.listeners
        .filter(l => l.connect >= this.minConnect)
        .map(l => this.createUserData(m, l));
      datas = [...datas, ...valores];
    });

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
