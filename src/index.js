import IceCast from './lib/icecast';
import Analytics from './lib/analytics';
import config from '../config.json';

const allAnalytics = config.analytics.map(
  analytics => new Analytics(analytics, config.urlbase, config.minConnect)
);

config.icecast.forEach(icecast => {
  const aux = new IceCast(config.sleepTime, icecast);
  aux.addListener('update', mounts => {
    allAnalytics.forEach(analytics => analytics.updateMounts(mounts));
  });
});
