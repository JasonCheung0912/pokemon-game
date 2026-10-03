import { Actor } from 'base44:runtime/actors';

// Live multiplayer room for the Pokémon Catching Arena.
// One room per difficulty mode — players in DIFFERENT modes never see each
// other. Presence only: positions are relayed, nothing durable is stored.

const MAX_USERS = 24;

export default class GameRoom extends Actor {
  users = new Map();   // conn.id -> { seat, name, x, y, z, yaw }
  nextSeat = 1;

  async handleStart() {
    // Any wake (deploy restart, hibernation): reconcile against live sockets
    const live = new Set(this.getConnections().map(c => c.id));
    for (const id of [...this.users.keys()]) if (!live.has(id)) this.users.delete(id);
    this.nextSeat = Math.max(0, ...[...this.users.values()].map(u => u.seat)) + 1;
  }

  async handleConnect(conn) {
    if (!this.users.has(conn.id) && this.users.size >= MAX_USERS) {
      conn.reject(4001, 'room full');
      return;
    }
    if (!this.users.has(conn.id)) {
      this.users.set(conn.id, { seat: this.nextSeat++, name: 'Trainer', x: 0, y: 0, z: 0, yaw: 0 });
    }
    conn.send({ type: 'you', seat: this.users.get(conn.id).seat });
    // late joiners see everyone already in the world
    for (const [cid, u] of this.users) {
      if (cid !== conn.id) conn.send({ type: 'pos', seat: u.seat, name: u.name, x: u.x, y: u.y, z: u.z, yaw: u.yaw });
    }
  }

  async handleClose(conn) {
    const u = this.users.get(conn.id);
    this.users.delete(conn.id);
    if (u) this.broadcast({ type: 'leave', seat: u.seat });
  }

  async handleMessage(conn, msg) {
    if (typeof msg !== 'object' || msg === null) return;
    const u = this.users.get(conn.id);
    if (!u) return;
    if (msg.type === 'pos') {
      u.x = Number(msg.x) || 0;
      u.y = Number(msg.y) || 0;
      u.z = Number(msg.z) || 0;
      u.yaw = Number(msg.yaw) || 0;
      if (typeof msg.name === 'string' && msg.name.trim()) u.name = msg.name.slice(0, 20);
      this.broadcast({ type: 'pos', seat: u.seat, name: u.name, x: u.x, y: u.y, z: u.z, yaw: u.yaw });
    }
  }
}