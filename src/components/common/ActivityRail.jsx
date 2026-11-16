import { useActivity } from '@/hooks/useActivity'

export function ActivityRail() {
  const { activities } = useActivity()
  const items =
    activities.length > 0
      ? activities.slice(0, 8)
      : [{ id: 'empty', time: '—', who: 'Waiting', what: 'Nothing yet in this session.' }]

  return (
    <section className="card">
      <div className="railhd lbl">
        <span>Activity · audit</span>
        <span>newest first</span>
      </div>
      <ol className="act">
        {items.map((item) => (
          <li key={item.id || `${item.time}-${item.what}`}>
            <time>{item.time}</time>
            <span>
              <b className="font-semibold">{item.who}</b> · {item.what}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
