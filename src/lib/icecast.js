import axios from 'axios';
import EventEmitter from 'events';
import xml2js from 'xml-js';

export default class IceCast extends EventEmitter {
  constructor(sleepTime, config) {
    super();
    this.getUrl = this.getUrl.bind(this);
    this.getServerInfo = this.getServerInfo.bind(this);
    this.getXMLInfo = this.getXMLInfo.bind(this);
    this.getXMLClient = this.getXMLClient.bind(this);
    this.findGetParameter = this.findGetParameter.bind(this);

    this.config = config;
    this.sleepTime = sleepTime;

    this.getServerInfo();
  }

  getUrl() {
    let url = this.config.ssl ? 'https://' : 'http://';

    if (this.config.username) {
      url += `${this.config.username}:${this.config.password}@`;
    }

    url += this.config.hostname;
    if (
      this.config.port !== 0 &&
      this.config.port !== 80 &&
      this.config.port !== 443
    ) {
      url += `:${this.config.port}`;
    }
    return url;
  }

  getServerInfo() {
    axios
      .get(`${this.getUrl()}${this.config.xml.status}`)
      .then(res => this.getXMLInfo(res.data))
      .catch(err => {
        console.log('Erro Icecast:', err);
      })
      .finally(() => {
        setTimeout(this.getServerInfo, this.sleepTime);
      });
  }

  getXMLClient(xml) {
    const { icestats } = xml2js.xml2js(xml, { compact: true });
    const { source } = icestats;

    if (parseInt(String, source.listeners._text) <= 0) return [];
    return Array.from(
      Array.isArray(source.listener) ? source.listener : [source.listener]
    ).map(client => {
      return {
        id: client.ID._text,
        ip: client.IP._text,
        connect: client.Connected._text,
        useragent: client.UserAgent._text,
        referer: 'Referer' in client ? client.Referer._text : 'no-referer',
      };
    });
  }

  async getXMLInfo(xml) {
    const { icestats } = xml2js.xml2js(xml, { compact: true });
    const { sources, source } = icestats;

    if (parseInt(String, sources._text) <= 0) return [];
    const filterSource = Array.from(
      Array.isArray(source) ? source : [source]
    ).filter(
      mount => this.config.notlist.indexOf(mount._attributes.mount) === -1
    );

    const mounts = filterSource.map(mount => ({
      name: mount._attributes.mount,
      title: mount.title._text,
      metadata: this.findGetParameter(mount.metadata_url._text),
      listeners: [],
    }));

    const promises = mounts.map(mount =>
      axios
        .get(
          `${this.getUrl()}${this.config.xml.listclients}?mount=${mount.name}`
        )
        .then(({ data }) => {
          mount.listeners = this.getXMLClient(data);
        })
    );

    await Promise.all(promises);
    this.emit('update', mounts);
    return true;
  }

  findGetParameter(url) {
    const result = {};
    if (url[0] === '/') {
      url = url.substr(1);
    }
    if (url[0] === '?' || url[0] === '&') {
      url = url.substr(1);
    }

    url.split('&').forEach(function(item) {
      const tmp = item.split('=');
      result[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp[1]);
    });
    return result;
  }
}
