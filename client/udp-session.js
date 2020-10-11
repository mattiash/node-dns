const DNS = require('..')
const udp = require('dgram');
const Packet = require('../packet');
const { debuglog } = require('util');

const debug = debuglog('dns2');

class DNSSession extends DNS {
  constructor(options) {
    super(options)
    this.resolveFns = new Map();
  }

  init() {
    this.client = new udp.Socket('udp4');
    this.client.on('message', message => this.handleResponse(message))
  }

  shutdown() {
    this.client.close();
  }

  handleResponse(message) {
    const response = Packet.parse(message);
    const r = this.resolveFns.get(response.header.id);
    if(r) {
      this.resolveFns.delete(response.header.id);
      clearTimeout(r.timeout);
      r.resolve(response);
    }
    else {
      debug('No handler for response', response)
    }
  }

  sendRequest(ip, port, name, type, cls, clientIp) {
    return new Promise((resolve, reject) => {
      const query = new Packet();
      query.header.id = (Math.random() * 1e4) | 0;
      query.questions.push({
        name,
        class: cls,
        type: Packet.TYPE[type],
      });
      if(clientIp) {
        query.additionals.push(Packet.Resource.EDNS([
          Packet.Resource.EDNS.ECS(clientIp)
        ]));
      };

      const timeout = setTimeout(() => reject(new Error('DNS timeout')), this.timeout*1000)

      this.resolveFns.set(query.header.id, {resolve, timeout})

      const buf = query.toBuffer()
      debug('send', buf);
      this.client.send(buf, port, ip, err => err && reject(err))
    })
  }

  query(name, type, cls, clientIp) {
    const { port, nameServers } = this;
    return Promise.race(nameServers.map(address => 
      this.sendRequest(address, port, name, type, cls, clientIp)
    ));
  }
}

module.exports = DNSSession