'use client'

import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/fetcher'

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        focusThrottleInterval: 10000,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        keepPreviousData: true,
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}
