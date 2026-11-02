import { env } from '@/config/env'
import { Chip } from '@/components/ui/Chip'
import { useUiStore } from '@/store/uiStore'

export function ApiRail({ title, apis = [], snippet }) {
  const apiPanel = useUiStore((state) => state.apiPanel)

  if (!env.showApiPanel || !apiPanel) {
    return null
  }

  const normalizedApis = apis.map((item) => {
    if (Array.isArray(item)) {
      return {
        method: item[0],
        path: item[1],
        tag: item[2],
        note: item[3],
      }
    }
    return item
  })

  return (
    <section className="card">
      <div className="railhd lbl">
        <span>API for this screen</span>
        <span>{title}</span>
      </div>
      <ul className="list">
        {normalizedApis.map((api, idx) => {
          const isReady = api.tag === 'READY'
          return (
            <li key={`${api.method}-${api.path}-${idx}`}>
              <div className="row" style={{ gap: '6px' }}>
                <span className="meth">{api.method}</span>
                <code style={{ fontSize: '12.5px', overflowWrap: 'anywhere', minWidth: 0 }}>
                  {api.path}
                </code>
                {api.tag && <Chip tone={isReady ? 'ok' : 'amb'}>{api.tag}</Chip>}
              </div>
              {api.note && <span className="small muted">{api.note}</span>}
            </li>
          )
        })}
      </ul>
      {snippet && (
        <pre className="code" style={{ margin: '0 8px 8px' }}>
          {snippet}
        </pre>
      )}
    </section>
  )
}
