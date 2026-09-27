import { useState, useCallback } from 'react'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const call = useCallback(async (channel, payload) => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.invoke(channel, payload)
      if (result.error) throw new Error(result.error)
      return result.data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { call, loading, error, setError }
}
