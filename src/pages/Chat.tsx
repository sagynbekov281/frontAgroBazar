import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import type { ChatRoom, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { roomId } = useParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getRooms().then(d => setRooms(d.rooms || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!roomId) return;
    api.getMessages(roomId).then(d => setMessages(d.messages || [])).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !roomId) return;
    setSending(true);
    try {
      await api.sendMessage(roomId, text.trim());
      const d = await api.getMessages(roomId);
      setMessages(d.messages || []);
      setText('');
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  const activeRoom = rooms.find(r => r.id === roomId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 h-[calc(100vh-140px)] flex gap-4">
      {/* rooms list */}
      <div className={`${roomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 shrink-0 card overflow-hidden`}>
        <div className="p-4 border-b border-border font-semibold">Билдирүүлөр</div>
        <div className="overflow-y-auto flex-1">
          {rooms.length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">Чат жок</div>
          ) : rooms.map(r => {
            const other = r.participants.find(p => p.id !== user?.id);
            return (
              <Link key={r.id} to={`/chat/${r.id}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-surface border-b border-border transition ${r.id === roomId ? 'bg-primary-50' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 shrink-0">
                  {other?.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{other?.name || 'Колдонуучу'}</div>
                  <div className="text-xs text-muted truncate">{r.lastMessage || '...'}</div>
                </div>
                {r.unread > 0 && <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">{r.unread}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* chat window */}
      <div className={`${!roomId ? 'hidden md:flex' : 'flex'} flex-col flex-1 card overflow-hidden`}>
        {!roomId ? (
          <div className="flex-1 flex items-center justify-center text-muted flex-col gap-3">
            <div className="text-5xl">💬</div>
            <div className="font-semibold">Чат тандаңыз</div>
            <div className="text-sm">Сол тараптан колдонуучуну тандаңыз</div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Link to="/chat" className="md:hidden p-2 rounded-lg hover:bg-surface"><ArrowLeft size={18} /></Link>
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                {activeRoom?.participants.find(p => p.id !== user?.id)?.name?.[0] || '?'}
              </div>
              <div className="font-semibold">{activeRoom?.participants.find(p => p.id !== user?.id)?.name || 'Колдонуучу'}</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted text-sm py-10">Билдирүүлөр жок. Биринчи болуп жазыңыз!</div>
              ) : messages.map(m => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-surface border border-border rounded-bl-sm'}`}>
                      {!isMe && <div className="font-semibold text-xs mb-0.5 text-primary-600">{m.senderName}</div>}
                      <div>{m.text}</div>
                      <div className={`text-[10px] mt-0.5 ${isMe ? 'text-white/60' : 'text-muted'}`}>{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Билдирүү жазыңыз..."
                className="input flex-1 text-sm" />
              <button disabled={sending || !text.trim()} className="btn btn-primary px-4 py-2.5">
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
