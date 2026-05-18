function Avatar({ name = 'User', src, size = 'md' }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return src ? (
    <img className={`avatar avatar-${size}`} src={src} alt={name} />
  ) : (
    <span className={`avatar avatar-${size}`}>{initials || 'U'}</span>
  )
}

export default Avatar
