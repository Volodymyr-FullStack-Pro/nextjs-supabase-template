export const AUDIT_EXCEPTIONS = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    packages: ['picomatch'],
    reason:
      'picomatch <= 4.0.7, ReDoS on a crafted glob: no fixed version is published; it comes with build tooling (the Sentry build plugin, vite, tinyglobby), which takes glob patterns from our code and configuration, not from users',
    reviewBy: '2026-12-01',
  },
]
