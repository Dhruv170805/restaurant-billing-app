export const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((res) => {
    if (!res.ok) throw new Error('API error')
    return res.json()
})
