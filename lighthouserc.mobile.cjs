// Тот же бюджет на телефоне: настройки Lighthouse по умолчанию — Moto G Power, медленный 4G, процессор в 4 раза медленнее
// (троттлинг симулируется, поэтому прогон стабилен на общих раннерах). LCP — порог «хорошо» Core Web Vitals для телефона.
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
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/mobile' },
  },
}
