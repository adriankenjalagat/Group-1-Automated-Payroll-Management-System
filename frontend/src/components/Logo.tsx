import { useState } from 'react'

export function Logo() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5e60a] text-sm font-bold text-blue-950">
        MSU
      </div>
    )
  }

  return (
    <img
      src="/logo.png"
      alt="MSU-Naawan seal"
      className="h-14 w-14 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

