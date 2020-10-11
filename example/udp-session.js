const DNS = require('..');

const dns = new DNS.UDPSession({nameServers: ['8.8.8.8']});

dns.init();

(async () => {
    const resp = await dns.resolveA('google.com');
    console.log(resp.answers)
    dns.shutdown()
})();
