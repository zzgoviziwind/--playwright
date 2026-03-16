// WebSocket 连接管理器 + 频道广播

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export interface WsEvent {
  type: string;
  [key: string]: unknown;
}

class SocketManager {
  private wss: WebSocketServer | null = null;
  private channels = new Map<string, Set<WebSocket>>();
  private messageHandlers = new Map<string, (data: any) => void>();

  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      console.log('[WS] 新连接');

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'subscribe' && msg.channel) {
            this.subscribe(ws, msg.channel);
          } else if (msg.type === 'unsubscribe' && msg.channel) {
            this.unsubscribe(ws, msg.channel);
          } else if (this.messageHandlers.has(msg.type)) {
            this.messageHandlers.get(msg.type)!(msg);
          }
        } catch {
          // ignore invalid messages
        }
      });

      ws.on('close', () => {
        for (const subs of this.channels.values()) {
          subs.delete(ws);
        }
      });

      // 心跳
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30_000);

      ws.on('close', () => clearInterval(pingInterval));
    });
  }

  private subscribe(ws: WebSocket, channel: string): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(ws);
  }

  private unsubscribe(ws: WebSocket, channel: string): void {
    this.channels.get(channel)?.delete(ws);
  }

  /** 向频道内所有客户端广播事件 */
  broadcast(channel: string, event: WsEvent): void {
    const subs = this.channels.get(channel);
    if (!subs) return;
    const data = JSON.stringify(event);
    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  /** 注册消息处理器（客户端→服务端） */
  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /** 移除消息处理器 */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  /** 向所有连接广播（不区分频道） */
  broadcastAll(event: WsEvent): void {
    if (!this.wss) return;
    const data = JSON.stringify(event);
    for (const ws of this.wss.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

export const socketManager = new SocketManager();
