"use client";

export default function DebugPusherPage() {
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Pusher Debug</h1>
      <div className="space-y-4">
        <div>
          <strong>NEXT_PUBLIC_PUSHER_KEY:</strong>
          <pre className="mt-1 rounded bg-gray-100 p-2">
            {JSON.stringify(pusherKey)}
          </pre>
          <p className="text-sm text-gray-600">
            Length: {pusherKey?.length ?? 0}
          </p>
        </div>
        <div>
          <strong>NEXT_PUBLIC_PUSHER_CLUSTER:</strong>
          <pre className="mt-1 rounded bg-gray-100 p-2">
            {JSON.stringify(pusherCluster)}
          </pre>
          <p className="text-sm text-gray-600">
            Length: {pusherCluster?.length ?? 0}
          </p>
        </div>
        <div className="mt-6">
          <strong>Expected URLs:</strong>
          <div className="space-y-1 text-sm">
            <div>WebSocket: wss://ws-{pusherCluster}.pusher.com</div>
            <div>SockJS: https://sockjs-{pusherCluster}.pusher.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
