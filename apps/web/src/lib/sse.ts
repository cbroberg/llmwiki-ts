export interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

type SSEListener = (event: SSEEvent) => void;

export function connectSSE(onEvent: SSEListener): () => void {
  let es: EventSource | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    es = new EventSource('/api/v1/stream', { withCredentials: true });

    es.addEventListener('hello', () => {
      console.log('[sse] connected');
    });

    es.addEventListener('ingest_started', (e) => {
      onEvent(JSON.parse((e as MessageEvent).data));
    });

    es.addEventListener('ingest_completed', (e) => {
      onEvent(JSON.parse((e as MessageEvent).data));
    });

    es.addEventListener('ingest_failed', (e) => {
      onEvent(JSON.parse((e as MessageEvent).data));
    });

    es.onerror = () => {
      es?.close();
      retryTimeout = setTimeout(connect, 3000);
    };
  }

  connect();

  return () => {
    es?.close();
    if (retryTimeout) clearTimeout(retryTimeout);
  };
}
