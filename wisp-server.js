// Wisp Server for WebSocket-based proxy communication
// This module handles WebSocket connections for tunneling traffic through the proxy

const WISP_VERSION = '2.0.0';
const PACKET_TYPE = {
  CONNECT: 1,
  DATA: 2,
  CLOSE: 3,
  PING: 4,
  PONG: 5
};

class WispServer {
  constructor() {
    this.connections = new Map();
    this.messageHandlers = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    // Handle connection requests
    this.registerHandler(PACKET_TYPE.CONNECT, this.handleConnect);
    // Handle data packets
    this.registerHandler(PACKET_TYPE.DATA, this.handleData);
    // Handle close signals
    this.registerHandler(PACKET_TYPE.CLOSE, this.handleClose);
    // Handle keep-alive ping
    this.registerHandler(PACKET_TYPE.PING, this.handlePing);
  }

  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler.bind(this));
  }

  async handleConnect(data) {
    try {
      const { id, host, port } = JSON.parse(new TextDecoder().decode(data));
      const socket = await this.createConnection(host, port);
      this.connections.set(id, socket);
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleData(data) {
    const view = new DataView(data);
    const id = view.getUint32(0);
    const payload = data.slice(4);
    
    const connection = this.connections.get(id);
    if (connection) {
      connection.write(payload);
    }
  }

  handleClose(data) {
    const view = new DataView(data);
    const id = view.getUint32(0);
    
    const connection = this.connections.get(id);
    if (connection) {
      connection.destroy();
      this.connections.delete(id);
    }
  }

  handlePing() {
    return { type: PACKET_TYPE.PONG };
  }

  async createConnection(host, port) {
    // Implementation depends on runtime environment
    if (typeof WebSocket !== 'undefined') {
      return new WebSocket(`ws://${host}:${port}`);
    }
    throw new Error('WebSocket not available');
  }

  async handleWebSocketMessage(event) {
    const data = event.data;
    const type = new Uint8Array(data)[0];
    const payload = data.slice(1);
    
    const handler = this.messageHandlers.get(type);
    if (handler) {
      return await handler(payload);
    }
  }
}

export { WispServer, PACKET_TYPE, WISP_VERSION };