let count = 0;
let activeTurnId = '';
const threadId = 'fixture-thread';
const send = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);
const complete = (id: string, status: string) =>
  send({
    method: 'turn/completed',
    params: {
      threadId,
      turn: {
        id,
        status,
        items: [],
      },
    },
  });

for await (const line of console) {
  if (line.trim().length === 0) {
    continue;
  }

  const message = JSON.parse(line) as {
    id?: number;
    method: string;
    params: { threadId?: string; turnId?: string; input?: { text: string }[] };
  };

  if (message.id === undefined) {
    continue;
  }

  const reply = (result: unknown) => send({ id: message.id, result });

  switch (message.method) {
    case 'initialize':
      reply({ userAgent: 'fixture/0.154.0' });
      break;
    case 'thread/start':
      reply({
        thread: { id: threadId },
        model: 'fixture-model',
        modelProvider: 'fixture-provider',
        reasoningEffort: 'high',
      });
      break;
    case 'turn/start': {
      if (message.params.threadId !== threadId) {
        throw new Error('Wrong native thread');
      }
      count += 1;
      activeTurnId = `turn-${count}`;
      const prompt = message.params.input?.[0]?.text;
      if (prompt === 'early-completion') {
        complete(activeTurnId, 'completed');
      }
      reply({ turn: { id: activeTurnId, status: 'inProgress' } });
      if (prompt !== 'hold' && prompt !== 'early-completion') {
        complete(activeTurnId, prompt === 'fail' ? 'failed' : 'completed');
      }
      break;
    }
    case 'turn/interrupt':
      if (message.params.turnId !== activeTurnId) {
        throw new Error('Wrong interrupted turn');
      }
      complete(activeTurnId, 'interrupted');
      reply({});
      break;
    default:
      send({ id: message.id, error: { code: -32601, message: 'Unknown fixture method' } });
  }
}
