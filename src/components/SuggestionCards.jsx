export default function SuggestionCards({ onSelect }) {
  const suggestions = [
    {
      label: 'Common',
      color: 'teal',
      text: "I've been having a headache and mild fever for 2 days",
      prompt: "I've been having a persistent headache and mild fever for the past 2 days. I also feel slight body aches."
    },
    {
      label: 'Urgent',
      color: 'red',
      text: 'Severe chest pain with difficulty breathing',
      prompt: "I'm experiencing severe chest pain with difficulty breathing. It started about an hour ago and hasn't improved."
    },
    {
      label: 'Chronic',
      color: 'blue',
      text: 'Recurring stomach pain after eating meals',
      prompt: "I've been having recurring stomach pain after eating meals for the past 3 weeks. It comes with bloating and sometimes nausea."
    },
    {
      label: 'Skin',
      color: 'purple',
      text: 'Red rash spreading across arms with itching',
      prompt: "I noticed a red rash spreading across my arms with itching. It appeared yesterday morning and seems to be getting worse."
    }
  ]

  return (
    <div className="suggestions-grid">
      {suggestions.map((s, i) => (
        <div
          key={i}
          className="suggestion-card"
          onClick={() => onSelect(s.prompt)}
          id={`suggestion-${s.color}`}
        >
          <span className={`suggestion-label ${s.color}`}>{s.label}</span>
          <span className="suggestion-text">{s.text}</span>
        </div>
      ))}
    </div>
  )
}
