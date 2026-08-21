import React from 'react'

const variants = {
  default: 'bg-slate-900 text-white hover:bg-slate-700',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-slate-200 bg-white hover:bg-slate-100',
}

export const Button = React.forwardRef(({ className, variant, ...props }, ref) => {
  const variantClass = variants[variant] || variants.default
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${variantClass} ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'