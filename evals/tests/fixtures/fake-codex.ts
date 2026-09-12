type JsonRpcId = string | number;

interface IJsonMessage {
  id?: unknown;
  method?: unknown;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

const pendingReverse = new Map<JsonRpcId, JsonRpcId>();
let timeoutRequests = 0;

if (process.argv[2] === 'keep-alive') {
  setInterval(() => undefined, 1_000);
}

function send(message: IJsonMessage): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id: JsonRpcId, result: unknown): void {
  send({ id, result });
}

function isObject(value: unknown): value is IJsonMessage {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is JsonRpcId {
  return typeof value === 'string' || typeof value === 'number';
}

function handleResponse(message: IJsonMessage): void {
  if (!isId(message.id)) {
    return;
  }

  const originalId = pendingReverse.get(message.id);
  if (originalId === undefined) {
    return;
  }
  pendingReverse.delete(message.id);
  sendResult(originalId, {
    reverseResponse: 'result' in message ? message.result : message.error,
  });
}

let firstOutOfOrderId: JsonRpcId | null = null;

function handleRequest(message: IJsonMessage): void {
  if (!isId(message.id) || typeof message.method !== 'string') {
    return;
  }

  const id = message.id;
  const method = message.method;

  switch (method) {
    case 'out-of-order/first':
      firstOutOfOrderId = id;
      return;
    case 'out-of-order/second':
      sendResult(id, 'second');
      if (firstOutOfOrderId !== null) {
        sendResult(firstOutOfOrderId, 'first');
        firstOutOfOrderId = null;
      }
      return;
    case 'nested/check':
      sendResult(id, { nested: true });
      return;
    case 'reverse/start':
      pendingReverse.set('approval-1', id);
      send({
        id: 'approval-1',
        method: 'approval/request',
        params: { reason: 'test' },
      });
      return;
    case 'reverse/unknown':
      pendingReverse.set('unknown-1', id);
      send({
        id: 'unknown-1',
        method: 'unknown/reverse',
        params: { reason: 'test' },
      });
      return;
    case 'emit/notification':
      send({ method: 'future/notification', params: { value: 42 } });
      sendResult(id, 'notified');
      return;
    case 'emit/stderr':
      process.stderr.write('fake diagnostic\n');
      sendResult(id, 'diagnosed');
      return;
    case 'rpc/error':
      send({
        id,
        error: {
          code: -32_000,
          message: 'fake failure',
          data: { source: 'fixture' },
        },
      });
      return;
    case 'protocol/malformed':
      process.stdout.write('{not-json\n');
      return;
    case 'protocol/invalid-response':
      send({ id });
      return;
    case 'exit/early':
      process.stderr.write('exiting early\n');
      process.exit(7);
      return;
    case 'timeout/hold':
      timeoutRequests += 1;
      return;
    case 'timeout/count':
      sendResult(id, timeoutRequests);
      return;
    case 'timeout/delayed':
      setTimeout(() => sendResult(id, 'finished'), 150);
      return;
    case 'hold':
      return;
    default:
      sendResult(id, { method, params: message.params });
  }
}

async function main(): Promise<void> {
  const reader = Bun.stdin.stream().getReader();
  const decoder = new TextDecoder();
  let buffered = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffered += decoder.decode(value, { stream: true });
    let newline = buffered.indexOf('\n');

    while (newline >= 0) {
      const line = buffered.slice(0, newline).replace(/\r$/, '');
      buffered = buffered.slice(newline + 1);
      if (line.length > 0) {
        const message: unknown = JSON.parse(line);
        if (isObject(message)) {
          if ('method' in message) {
            handleRequest(message);
          } else {
            handleResponse(message);
          }
        }
      }
      newline = buffered.indexOf('\n');
    }
  }
}

await main();
