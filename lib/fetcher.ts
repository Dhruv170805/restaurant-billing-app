export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!res.ok) {
    const error = new Error('API request failed') as Error & { status: number }
    error.status = res.status
    throw error
  }
  return res.json()
}
