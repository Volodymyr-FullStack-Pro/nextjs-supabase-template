const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const PORT_SUFFIX = /:\d+$/u

export function isLocalHost(host: string): boolean {
  return LOCAL_HOSTNAMES.has(host.replace(PORT_SUFFIX, ''))
}
