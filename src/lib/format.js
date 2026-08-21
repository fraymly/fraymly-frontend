export function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes)) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let index = 0

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatSeconds(value = 0) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) {
    return '0:00'
  }

  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const remaining = total % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function humanizeStatus(status = '') {
  return status.replaceAll('_', ' ')
}

