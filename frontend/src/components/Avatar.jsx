import { useUser, getInitials } from '../context/UserContext'

/**
 * Displays the user's profile picture, or their initials in a coloured
 * circle if no avatar is set.
 *
 * Props:
 *  size      – Tailwind size class pair, e.g. "w-14 h-14" (default)
 *  textSize  – Tailwind text size class, e.g. "text-lg"
 *  className – extra classes forwarded to the outer div
 */
export default function Avatar({ size = 'w-14 h-14', textSize = 'text-base', className = '' }) {
  const { user } = useUser()

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${size} rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${size} rounded-full bg-gradient-to-br from-primary to-tertiary flex items-center justify-center shrink-0 ${className}`}
    >
      <span className={`font-headline font-extrabold text-white ${textSize}`}>
        {getInitials(user.name)}
      </span>
    </div>
  )
}
