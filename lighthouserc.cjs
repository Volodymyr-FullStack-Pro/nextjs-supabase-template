// Бюджет производительности (см. README «Производительность»). Запуск: npm run perf (после npm run build).
// В CI выполняется после Playwright в том же job: production-сборка уже есть.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      url: ['http://localhost:3000/', 'http://localhost:3000/login'],
      numberOfRuns: 3, // медиана трёх прогонов: на общих раннерах один прогон шумит
      settings: { preset: 'desktop' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        // объём JS считает npm run budget по HTML страницы: Lighthouse учитывает и префетч ссылок
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
