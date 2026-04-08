import { useState, type FormEvent } from 'react'
import './App.css'

type ActivateResponse = {
  success: boolean
  reason?: string
  message: string
}

export default function App() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch('/api/code/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = (await res.json()) as ActivateResponse
      setIsError(!data.success)
      setMessage(data.message)
    } catch {
      setIsError(true)
      setMessage('Не удалось связаться с сервером')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <h1>Активация кода</h1>
      <p className="lead">Введите код доступа</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">Код</span>
          <input
            type="text"
            name="code"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Например: ABC123"
            disabled={loading}
          />
        </label>
        <button type="submit" className="submit" disabled={loading}>
          {loading ? 'Проверка…' : 'Активировать'}
        </button>
      </form>
      {message != null && (
        <p className={`feedback ${isError ? 'error' : 'ok'}`} role="status">
          {message}
        </p>
      )}
    </main>
  )
}
