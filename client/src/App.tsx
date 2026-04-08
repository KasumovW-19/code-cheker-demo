import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type ActivateResponse = {
  success: boolean
  reason?: string
  message: string
}

type CodeItem = {
  id: number
  code: string
  status: string
  createdAt: string
  activatedAt: string | null
}

type CodesResponse = {
  success: boolean
  items: CodeItem[]
  message?: string
}

type CreateCodesResponse = {
  success: boolean
  items: CodeItem[]
  message?: string
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  activated: 'Активирован',
}

export default function App() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  const [codes, setCodes] = useState<CodeItem[]>([])
  const [codesLoading, setCodesLoading] = useState(false)
  const [createCount, setCreateCount] = useState('1')
  const [adminMessage, setAdminMessage] = useState<string | null>(null)

  /** Код, скопированный из таблицы — показываем «Вставить» в форме активации */
  const [pendingClipboardCode, setPendingClipboardCode] = useState<
    string | null
  >(null)

  async function loadCodes() {
    setCodesLoading(true)

    try {
      const res = await fetch('/api/admin/codes')
      const data = (await res.json()) as CodesResponse

      if (data.success) {
        setCodes(data.items)
      } else {
        setAdminMessage(data.message ?? 'Не удалось загрузить коды')
      }
    } catch {
      setAdminMessage('Не удалось загрузить коды')
    } finally {
      setCodesLoading(false)
    }
  }

  useEffect(() => {
    void loadCodes()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const normalizedCode = code.trim().toUpperCase()

    if (!normalizedCode) {
      setIsError(true)
      setMessage('Введите код')
      return
    }

    setMessage(null)
    setLoading(true)

    try {
      const res = await fetch('/api/code/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode }),
      })

      const data = (await res.json()) as ActivateResponse

      setIsError(!data.success)
      setMessage(data.message)

      if (data.success) {
        setCode('')
        void loadCodes()
      }
    } catch {
      setIsError(true)
      setMessage('Не удалось связаться с сервером')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCodes() {
    const count = Number(createCount)

    setAdminMessage(null)

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setAdminMessage('Введите число от 1 до 100')
      return
    }

    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })

      const data = (await res.json()) as CreateCodesResponse

      if (!data.success) {
        setAdminMessage(data.message ?? 'Не удалось создать коды')
        return
      }

      setAdminMessage(`Создано кодов: ${data.items.length}`)
      setCreateCount('1')
      void loadCodes()
    } catch {
      setAdminMessage('Не удалось создать коды')
    }
  }

  async function handleCopyCodeFromTable(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setPendingClipboardCode(value)
    } catch {
      setAdminMessage('Не удалось скопировать в буфер обмена')
    }
  }

  function handlePasteIntoActivation() {
    if (pendingClipboardCode == null) return
    setCode(pendingClipboardCode.trim().toUpperCase())
    setPendingClipboardCode(null)
    setMessage(null)
    setIsError(false)
  }

  const showPasteButton =
    pendingClipboardCode != null &&
    code.trim().toUpperCase() !== pendingClipboardCode.trim().toUpperCase()

  async function handleDeleteCode(id: number) {
    setAdminMessage(null)

    try {
      const res = await fetch(`/api/admin/codes/${id}`, {
        method: 'DELETE',
      })

      const data = (await res.json()) as { success: boolean; message?: string }

      if (!data.success) {
        setAdminMessage(data.message ?? 'Не удалось удалить код')
        return
      }

      void loadCodes()
    } catch {
      setAdminMessage('Не удалось удалить код')
    }
  }

  return (
    <main className="app">
      <section className="panel panel--activation">
        <header className="panel__head">
          <h1>Активация кода</h1>
          <p className="lead">Введите код доступа для проверки и активации</p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="label">Код</span>
            <div className="field-row">
              <input
                type="text"
                name="code"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Например: ABC123"
                disabled={loading}
              />
              {showPasteButton && (
                <button
                  type="button"
                  className="btn btn--ghost btn--paste"
                  onClick={handlePasteIntoActivation}
                  disabled={loading}
                >
                  Вставить
                </button>
              )}
            </div>
          </label>

          <button
            type="submit"
            className="submit"
            disabled={loading || !code.trim()}
          >
            {loading ? 'Проверка…' : 'Активировать'}
          </button>
        </form>

        {message != null && (
          <p
            className={`feedback ${isError ? 'error' : 'ok'}`}
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </section>

      <section className="panel panel--admin">
        <header className="panel__head">
          <h2>Управление кодами</h2>
        </header>

        <div className="admin-actions">
          <label className="admin-count">
            <span className="admin-count__label">Сколько кодов создать</span>
            <input
              className="admin-count__input"
              type="number"
              min="1"
              max="100"
              inputMode="numeric"
              value={createCount}
              onChange={(e) => setCreateCount(e.target.value)}
              placeholder="1–100"
              aria-label="Количество новых кодов"
            />
          </label>
          <div className="admin-actions__buttons">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleCreateCodes}
            >
              Создать
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void loadCodes()}
            >
              Обновить список
            </button>
          </div>
        </div>

        {adminMessage && <p className="feedback">{adminMessage}</p>}

        {codesLoading ? (
          <div className="loading-line" role="status">
            Загрузка списка…
          </div>
        ) : codes.length === 0 ? (
          <p className="empty-state">Кодов пока нет — создайте первые коды выше</p>
        ) : (
          <div className="table-wrap">
            <table className="codes-table codes-table--stackable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Код</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th>Активирован</th>
                  <th className="cell-actions" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {codes.map((item) => (
                  <tr key={item.id}>
                    <td className="mono" data-label="ID">
                      <span className="stack-value">{item.id}</span>
                    </td>
                    <td className="mono" data-label="Код">
                      <span className="stack-value">
                        <button
                          type="button"
                          className="code-copy-btn"
                          onClick={() => void handleCopyCodeFromTable(item.code)}
                          title="Нажмите, чтобы скопировать"
                        >
                          {item.code}
                        </button>
                      </span>
                    </td>
                    <td data-label="Статус">
                      <span className="stack-value">
                        <span
                          className={`status-pill status-pill--${item.status === 'activated' ? 'activated' : 'new'}`}
                        >
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      </span>
                    </td>
                    <td className="date-cell" data-label="Создан">
                      <span className="stack-value">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="date-cell" data-label="Активирован">
                      <span className="stack-value">
                        {item.activatedAt
                          ? new Date(item.activatedAt).toLocaleString()
                          : '—'}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn btn--danger"
                        onClick={() => void handleDeleteCode(item.id)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}