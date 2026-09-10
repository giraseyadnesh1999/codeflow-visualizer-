import { Fragment } from 'react'

/** Renders problem text: blank-line paragraphs, `inline code` and **bold**. */
export function Prose({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2.5 text-[13.5px] leading-relaxed text-white/70 ${className}`}>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>
          <Inline text={para} />
        </p>
      ))}
    </div>
  )
}

export function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
          return (
            <code key={i} className="rounded bg-white/[0.07] px-1.5 py-px font-mono text-[12.5px] text-fuchsia-200">
              {part.slice(1, -1)}
            </code>
          )
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={i} className="font-semibold text-white/90">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}
