import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
}

export function Input({ label, error, helpText, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full border rounded-lg px-3 py-2 text-sm',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-[#F6821F] focus:border-transparent',
          'disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500',
          'transition-colors duration-150',
          error ? 'border-red-400 dark:border-red-700' : 'border-gray-300 dark:border-gray-700',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {helpText && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{helpText}</p>}
    </div>
  )
}

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: React.ReactNode
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function Select({ label, error, children, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={clsx(
          'w-full border rounded-lg px-3 py-2 text-sm',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-[#F6821F] focus:border-transparent',
          'transition-colors duration-150',
          error ? 'border-red-400 dark:border-red-700' : 'border-gray-300 dark:border-gray-700',
          className,
        )}
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  helpText?: string
}

export function Checkbox({ label, helpText, className, id, ...props }: CheckboxProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <label htmlFor={inputId} className={clsx('flex items-start gap-2.5 cursor-pointer', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#F6821F] focus:ring-[#F6821F] dark:bg-gray-800"
        {...props}
      />
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {helpText && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{helpText}</p>}
      </div>
    </label>
  )
}
