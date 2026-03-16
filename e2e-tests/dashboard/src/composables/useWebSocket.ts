// WebSocket 连接 + 自动重连 + 事件订阅

import { ref, onUnmounted } from 'vue';

type EventHandler = (data: any) => void;

const handlers = new Map<string, Set<EventHandler>>();
const pendingMessages: string[] = [];
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

export const wsStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected');

function getWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

function connect() {
  if (ws && ws.readyState <= WebSocket.OPEN) return;

  wsStatus.value = 'connecting';
  ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    wsStatus.value = 'connected';
    reconnectDelay = 1000;
    // 重新订阅频道
    for (const channel of subscribedChannels) {
      ws!.send(JSON.stringify({ type: 'subscribe', channel }));
    }
    // 发送队列中缓存的消息
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift()!;
      ws!.send(msg);
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const eventType = data.type as string;
      const fns = handlers.get(eventType);
      if (fns) {
        for (const fn of fns) fn(data);
      }
    } catch {
      // ignore
    }
  };

  ws.onclose = () => {
    wsStatus.value = 'disconnected';
    ws = null;
    // 自动重连（指数退避，最大 30s）
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      connect();
    }, reconnectDelay);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

const subscribedChannels = new Set<string>();

export function useWebSocket() {
  // 确保连接已建立
  if (!ws || ws.readyState > WebSocket.OPEN) {
    connect();
  }

  function subscribe(channel: string) {
    subscribedChannels.add(channel);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }

  function unsubscribe(channel: string) {
    subscribedChannels.delete(channel);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }

  function onEvent(type: string, handler: EventHandler) {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);

    // 组件卸载时自动清理
    onUnmounted(() => {
      handlers.get(type)?.delete(handler);
    });
  }

  /** 向服务端发送消息 */
  function sendEvent(type: string, data: Record<string, any> = {}) {
    const message = JSON.stringify({ type, ...data });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      // 连接未就绪时缓存到队列
      pendingMessages.push(message);
    }
  }

  return { subscribe, unsubscribe, onEvent, sendEvent, status: wsStatus };
}
