1. network and handshake measurement C:\Users\kagit>curl -w "\nDNS: %{time_namelookup}s | TCP: %{time_connect}s | TLS: %{time_appconnect}s | PreTransfer: %{time_pretransfer}s | TTFB: %{time_starttransfer}s | Total: %{time_total}s\n" -o /dev/null -s "https://projectlms-backend.onrender.com/health"

DNS: 0.028256s | TCP: 0.045753s | TLS: 0.154950s | PreTransfer: 0.155591s | TTFB: 0.995333s | Total: 0.996307s

internal backend & database timing
react-router-dom.js?v=41242259	200	script	main.jsx:1	(memory cache)	0 ms
react-dom.js?v=41242259	200	script	MessagingIcon.jsx:1	(memory cache)	0 ms
react-dom_client.js?v=41242259	200	script	main.jsx:1	(memory cache)	0 ms
socket.io/?EIO=4&transport=websocket	101	websocket	SocketContext.jsx:17	0.0 kB	Pending
?token=Zf5Ad251B7Zh	101	websocket	client:948	0.0 kB	Pending
55 requests
1.2 MB transferred
11.5 MB resources

how to inspect current deployed regions
1. vercel 
Object[[Prototype]]: Object
fetch('/index.html').then(r => console.log('Vercel Edge PoP:', r.headers.get('x-vercel-id')));

Promise {<pending>}[[Prototype]]: Promisecatch: ƒ catch()constructor: ƒ Promise()finally: ƒ finally()then: ƒ then()Symbol(Symbol.toStringTag): "Promise"[[Prototype]]: Object[[PromiseState]]: "fulfilled"[[PromiseResult]]: undefined
VM63:1 Vercel Edge PoP: bom1::gqm27-1791822269675-495b0743ef7e