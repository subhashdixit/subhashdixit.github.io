const selectedWork = [
  {
    category: '01 / Corporate delivery',
    title: 'Demand forecasting at EPAM',
    summary: 'Built a forecasting workflow covering 500+ models across five countries and 20 product categories.',
    href: '#experience',
  },
  {
    category: '02 / Independent project',
    title: 'Invoice Extraction Studio',
    summary: 'Extracts structured fields from invoices using a model that runs in the browser.',
    href: '#projects',
  },
]

export default function SelectedWork() {
  return (
    <div className="loop-cards" aria-label="Selected work">
      {selectedWork.map(({ category, title, summary, href }) => (
        <article key={title}>
          <a href={href} className="loop-card">
            <p className="loop-label">{category}</p>
            <h2>{title}</h2>
            <p>{summary}</p>
          </a>
        </article>
      ))}
    </div>
  )
}
