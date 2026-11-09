// Бюджет на телефоне: настройки Lighthouse по умолчанию — Moto G Power, медленный 4G, процессор в 4 раза медленнее
// (троттлинг симулируется по трассе раннера). LCP — порог «хорошо» Core Web Vitals для телефона (2,5 с).
// TBT на телефоне: на раннере GitHub /login с формой даёт 200–235 мс (на компьютере разработчика — 0), поэтому порог
// компьютера (200 мс) здесь мигал бы; 400 мс ловит регресс вдвое, а общий балл ≥ 0,9 учитывает TBT и так.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- конфиг LHCI в CommonJS
const desktop = require('./lighthouserc.cjs')

module.exports = {
  ci: {
    ...desktop.ci,
    collect: { ...desktop.ci.collect, settings: {} },
    assert: {
      assertions: {
        ...desktop.ci.assert.assertions,
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['error', { maxNumericValue: 400 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/mobile' },
  },
}
