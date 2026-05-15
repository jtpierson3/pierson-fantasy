type Props = {
  text: string
  className?: string
}

export default function FormattedText({ text, className }: Props) {
  // Split by newlines first
  const lines = text.split('\n')

  return (
    <span className={className}>
      {lines.map((line, lineIndex) => {
        // Split each line by bold markers
        const parts = line.split(/(\*\*.*?\*\*)/)

        return (
          <span key={lineIndex}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={partIndex}>
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return <span key={partIndex}>{part}</span>
            })}
            {/* Add line break after each line except the last */}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        )
      })}
    </span>
  )
}