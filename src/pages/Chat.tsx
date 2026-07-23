import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ChatRoom, ChatMessage, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, ArrowLeft, Users, Plus, X, Reply, Trash2, Image as ImageIcon, LogOut, Phone, UserPlus, Info, Smile, MoreVertical, ShieldCheck, UserMinus, Pencil, Camera, Star, BadgeCheck, MessageCircle, Sparkles } from 'lucide-react';import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';


const MAX_IMAGE_BYTES = 400_000;
const WA_GREEN = '#008069';
const WA_GREEN_DARK = '#005c4b';
const WA_BUBBLE_SENT = '#d9fdd3';
const WA_BG = '#e9ddc9';
const AI_USER_ID = 'ai-assistant';

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('img_error'));
      img.onload = () => {
        const maxDim = 1000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > MAX_IMAGE_BYTES && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > MAX_IMAGE_BYTES) { reject(new Error('too_big')); return; }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// аватарка группы может быть чуть крупнее — свой лимит и сжатие под квадрат
function compressAvatarImage(file: File, maxBytes = 500_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('img_error'));
      img.onload = () => {
        const size = 500;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > maxBytes && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > maxBytes) { reject(new Error('too_big')); return; }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function formatLastSeen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `сегодня в ${time}` : `${d.toLocaleDateString('ru-RU')} в ${time}`;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function Chat() {
  const { roomId } = useParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [imgError, setImgError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ChatMessage | null>(null);
  const [openRoomMenu, setOpenRoomMenu] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [nicknameRoomId, setNicknameRoomId] = useState<string | null>(null);
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readSentRef = useRef<string | null>(null);
  const emojiWrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

 function loadRooms() {
    api.getRooms().then(d => setRooms(d.rooms || [])).catch(() => {});
  }

  async function handleStartAiChat() {
    try {
      const d = await api.startAiChat();
      loadRooms();
      navigate(`/chat/${d.roomId}`);
    } catch (e) { console.error(e); }
  }


  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (!roomId) { setMessages([]); setReplyingTo(null); setShowGroupInfo(false); return; }
    api.getMessages(roomId).then(d => setMessages(d.messages || [])).catch(() => {});
    socket?.emit('room:join', roomId);
  }, [roomId, socket]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.isGroup) { setOtherUser(null); return; }
    const other = room.participants.find(p => p.id !== user?.id);
    if (!other) { setOtherUser(null); return; }
    api.getUser(other.id).then(d => setOtherUser(d.user)).catch(() => {});
  }, [roomId, rooms, user?.id, onlineUsers]);

  useEffect(() => {
    if (!roomId || !socket) return;
    const hasUnread = messages.some(m => m.senderId !== user?.id && !(m.readBy || []).includes(user?.id || ''));
    if (hasUnread && readSentRef.current !== roomId + messages.length) {
      readSentRef.current = roomId + messages.length;
      socket.emit('message:read', { roomId });
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unread: 0 } : r));
    }
  }, [messages, roomId, socket, user?.id]);

  useEffect(() => {
    if (!socket) return;

    function onNewMessage(msg: ChatMessage) {
      if (msg.roomId === roomId) setMessages(prev => [...prev, msg]);
      loadRooms();
    }
    function onTyping({ roomId: rId, userId, userName, isTyping }: any) {
      if (rId !== roomId || userId === user?.id) return;
      setTypingUsers(prev => {
        const n = { ...prev };
        if (isTyping) n[userId] = userName; else delete n[userId];
        return n;
      });
    }
    function onRead({ roomId: rId, userId }: any) {
      if (rId !== roomId) return;
      setMessages(prev => prev.map(m => m.senderId === user?.id
        ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), userId])) }
        : m));
    }
    function onDeleted({ roomId: rId, messageId }: any) {
      if (rId !== roomId) return;
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
    function onError({ message }: any) { setImgError(message); setTimeout(() => setImgError(''), 4000); }
    function onGroupLeft({ roomId: rId }: any) {
      if (rId === roomId) return;
      loadRooms();
    }
    function onMemberRemoved({ roomId: rId, userId }: any) {
      loadRooms();
      if (userId === user?.id && rId === roomId) { navigate('/chat'); }
    }
    function onGroupUpdated({ room }: any) {
      loadRooms();
      if (room?.id === roomId) {
        // подтягиваем свежее имя/аву в шапке без ожидания перезагрузки списка
        setRooms(prev => prev.map(r => r.id === room.id ? { ...r, ...room } : r));
      }
    }

    socket.on('message:new', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('message:read', onRead);
    socket.on('message:deleted', onDeleted);
    socket.on('message:error', onError);
    socket.on('group:left', onGroupLeft);
    socket.on('group:member_removed', onMemberRemoved);
    socket.on('group:updated', onGroupUpdated);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('message:read', onRead);
      socket.off('message:deleted', onDeleted);
      socket.off('message:error', onError);
      socket.off('group:left', onGroupLeft);
      socket.off('group:member_removed', onMemberRemoved);
      socket.off('group:updated', onGroupUpdated);
    };
  }, [socket, roomId, user?.id]);

  useEffect(() => {
    if (!showEmoji && !openRoomMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target as Node)) setShowEmoji(false);
      if (!(e.target as HTMLElement).closest('[data-room-menu]')) setOpenRoomMenu(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji, openRoomMenu]);

  function handleTextChange(v: string) {
    setText(v);
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 1500);
  }

  function handleEmojiPick(data: EmojiClickData) {
    setText(t => t + data.emoji);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !roomId) return;
    setSending(true);
    const value = text.trim();
    const replyId = replyingTo?.id;
    setText('');
    setReplyingTo(null);
    setShowEmoji(false);
    try {
      if (socket) {
        socket.emit('message:send', { roomId, text: value, replyTo: replyId });
      } else {
        await api.sendMessage(roomId, value, replyId);
        const d = await api.getMessages(roomId);
        setMessages(d.messages || []);
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !roomId) return;
    if (!file.type.startsWith('image/')) { setImgError('Можно отправлять только изображения'); setTimeout(() => setImgError(''), 4000); return; }
    try {
      const dataUrl = await compressImage(file);
      if (socket) {
        socket.emit('message:send', { roomId, type: 'image', fileUrl: dataUrl });
      }
    } catch {
      setImgError('Изображение слишком большое или не открывается. Выберите другое.');
      setTimeout(() => setImgError(''), 4000);
    }
  }

  async function confirmDeleteMessage(mode: 'me' | 'everyone') {
    if (!confirmDelete || !roomId) return;
    const msg = confirmDelete;
    setConfirmDelete(null);
    if (socket) {
      socket.emit('message:delete', { roomId, messageId: msg.id, mode });
      if (mode === 'me') setMessages(prev => prev.filter(m => m.id !== msg.id));
    } else {
      await api.deleteMessage(roomId, msg.id, mode).catch(() => {});
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    }
  }

  async function handleDeleteChat(rId: string) {
    if (!confirm('Удалить этот чат у себя? У собеседника сообщения останутся.')) return;
    try {
      await api.deleteChat(rId);
      loadRooms();
      if (roomId === rId) navigate('/chat');
    } catch (e) { console.error(e); }
    setOpenRoomMenu(null);
  }

  const activeRoom = rooms.find(r => r.id === roomId);

  function roomLabel(r: ChatRoom) {
    if (r.isGroup) return r.name || 'Топ';
    if (r.nickname) return r.nickname;
    const other = r.participants.find(p => p.id !== user?.id);
    return other?.name || 'Пользователь';
  }
  function roomInitial(r: ChatRoom) {
    return roomLabel(r)[0] || '?';
  }
  function isOtherOnline(r: ChatRoom) {
    if (r.isGroup) return false;
    const other = r.participants.find(p => p.id !== user?.id);
    return other ? onlineUsers.has(other.id) : false;
  }

  const typingText = Object.values(typingUsers).join(', ');
  const otherParticipantId = activeRoom && !activeRoom.isGroup ? activeRoom.participants.find(p => p.id !== user?.id)?.id : undefined;

  function messageStatus(m: ChatMessage) {
    if (m.senderId !== user?.id) return null;
    const readBy = m.readBy || [];
    let isRead: boolean;
    if (activeRoom?.isGroup) {
      const others = activeRoom.participants.filter(p => p.id !== user?.id);
      isRead = others.length > 0 && others.every(p => readBy.includes(p.id));
    } else {
      isRead = otherParticipantId ? readBy.includes(otherParticipantId) : false;
    }
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" className="inline-block align-middle">
        <path d="M1 5.5L4.5 9L11 1.5" stroke={isRead ? '#53bdeb' : '#8696a0'} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 5.5L9 9L15.5 1.5" stroke={isRead ? '#53bdeb' : '#8696a0'} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  function findReplySnippet(id?: string) {
    if (!id) return null;
    const m = messages.find(x => x.id === id);
    if (!m) return null;
    return { senderName: m.senderName, text: m.type === 'image' ? '📷 Фото' : m.text };
  }

  type Item = { kind: 'date'; label: string } | { kind: 'msg'; m: ChatMessage };
  const items: Item[] = [];
  let lastDate = '';
  for (const m of messages) {
    const label = dateLabel(m.createdAt);
    if (label !== lastDate) { items.push({ kind: 'date', label }); lastDate = label; }
    items.push({ kind: 'msg', m });
  }

  return (
    <div className="max-w-5xl mx-auto px-2 py-3 sm:px-4 sm:py-8 h-[calc(100vh-90px)] sm:h-[calc(100vh-140px)] flex flex-col md:flex-row gap-2 sm:gap-4">
      {/* rooms list */}
      
      <div className={`${roomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-border`}>
        <div className="p-3 sm:p-4 flex items-center justify-between text-white" style={{ background: WA_GREEN }}>
          <span className="font-semibold text-sm sm:text-base">Сообщения</span>
          <div className="flex items-center gap-1">
            <button onClick={handleStartAiChat} className="p-1.5 rounded-full hover:bg-white/15" title="Спросить у ИИ">
              <Sparkles size={18} />
            </button>
            <button onClick={() => setShowNewChat(true)} className="p-1.5 rounded-full hover:bg-white/15" title="Новый чат">
              <Plus size={19} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 bg-white">
          {rooms.length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">Нет чатов</div>
          ) : rooms.map(r => (
            <div key={r.id} className={`relative flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-[#f5f6f6] border-b border-slate-100 transition ${r.id === roomId ? 'bg-[#f0f2f0]' : ''}`}>
              <Link to={`/chat/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}>
                    {r.isGroup
                      ? (r.avatar ? <img src={r.avatar} alt="" className="w-full h-full object-cover" /> : <Users size={20} />)
                      : roomInitial(r)}
                  </div>
                  {isOtherOnline(r) && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate text-slate-800">{roomLabel(r)}</div>
                  <div className="text-[12px] text-muted truncate">{r.lastMessage || 'Нет сообщений'}</div>
                </div>
              </Link>
              {r.unread > 0 && <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: WA_GREEN }}>{r.unread}</span>}
              <div className="relative shrink-0" data-room-menu>
                <button onClick={() => setOpenRoomMenu(v => v === r.id ? null : r.id)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                  <MoreVertical size={16} />
                </button>
                {openRoomMenu === r.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-20 py-1 w-44">
                    {!r.isGroup && (
                      <button onClick={() => { setNicknameRoomId(r.id); setOpenRoomMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-surface flex items-center gap-2">
                        <Pencil size={14} /> Задать никнейм
                      </button>
                    )}
                    <button onClick={() => handleDeleteChat(r.id)} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                      <Trash2 size={14} /> Удалить чат
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* chat window */}
      <div className={`${!roomId ? 'hidden md:flex' : 'flex'} flex-col flex-1 rounded-2xl overflow-hidden shadow-sm border border-border`}>
        {!roomId ? (
          <div className="flex-1 flex items-center justify-center text-muted flex-col gap-3 bg-[#f7f7f5]">
            <div className="text-6xl">💬</div>
            <div className="font-semibold text-lg text-slate-600">AgroBazar чат</div>
            <div className="text-sm">Выберите пользователя слева</div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 sm:gap-2 text-white" style={{ background: WA_GREEN }}>
              <Link to="/chat" className="md:hidden p-2 ml-1 rounded-full hover:bg-white/15 shrink-0"><ArrowLeft size={18} /></Link>
              <button
                onClick={() => {
                  if (activeRoom?.isGroup) setShowGroupInfo(true);
                  else if (otherParticipantId) setProfileUserId(otherParticipantId);
                }}
                className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 py-3 sm:py-3.5 px-2 sm:px-3 text-left hover:bg-white/10 cursor-pointer transition"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-white bg-white/20 overflow-hidden">
                  {activeRoom?.isGroup
                    ? (activeRoom.avatar ? <img src={activeRoom.avatar} alt="" className="w-full h-full object-cover" /> : <Users size={17} />)
                    : (activeRoom ? roomInitial(activeRoom) : '?')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base leading-tight truncate">{activeRoom ? roomLabel(activeRoom) : 'Пользователь'}</div>
                  {activeRoom?.isGroup ? (
                    <div className="text-[11px] sm:text-xs text-white/75">{activeRoom.participants.length} участников</div>
                  ) : (
                    <div className="text-[11px] sm:text-xs text-white/75">
                      {otherParticipantId && onlineUsers.has(otherParticipantId)
                        ? 'в сети'
                        : otherUser?.lastSeen ? `был(а) в сети ${formatLastSeen(otherUser.lastSeen)}` : ''}
                    </div>
                  )}
                  {typingText && <div className="text-[11px] sm:text-xs text-white font-medium">{typingText} печатает...</div>}
                </div>
                <Info size={17} className="text-white/70 shrink-0" />
              </button>
            </div>

            {imgError && <div className="px-4 py-2 bg-red-50 text-red-600 text-xs">{imgError}</div>}

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1.5"
              style={{
                background: WA_BG,
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            >
              {items.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-10 bg-white/80 rounded-xl mx-auto max-w-xs px-4 shadow-sm">Нет сообщений. Напишите первым!</div>
              ) : items.map((item, idx) => {
                if (item.kind === 'date') {
                  return (
                    <div key={`d-${idx}`} className="flex justify-center my-3">
                      <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">{item.label}</span>
                    </div>
                  );
                }
                const m = item.m;
                if (m.type === 'system') {
                  return (
                    <div key={m.id} className="flex justify-center my-2">
                      <span className="bg-white/80 text-slate-500 text-[11px] px-3 py-1 rounded-lg shadow-sm text-center max-w-xs">{m.text}</span>
                    </div>
                  );
                }
                const isMe = m.senderId === user?.id;
                const snippet = findReplySnippet(m.replyTo);
                return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
  {isMe && (
    <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 mr-1 self-center">
      <button onClick={() => setReplyingTo(m)} className="p-1 rounded hover:bg-white/70 text-slate-500" title="Ответить"><Reply size={14} /></button>
      <button onClick={() => setConfirmDelete(m)} className="p-1 rounded hover:bg-white/70 text-red-500" title="Удалить"><Trash2 size={14} /></button>
    </div>
  )}
  <div
    className="max-w-[85%] sm:max-w-[65%] px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm shadow-sm"
    style={{
      background: isMe ? WA_BUBBLE_SENT : '#ffffff',
      borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
    }}
  >
                      {!isMe && activeRoom?.isGroup && (
                        <button
                          onClick={() => setProfileUserId(m.senderId)}
                          className="font-semibold text-xs mb-0.5 hover:underline"
                          style={{ color: WA_GREEN }}
                        >
                          {m.senderName}
                        </button>
                      )}
                      {snippet && (
                        <div className="text-xs mb-1.5 px-2 py-1 rounded bg-black/5 border-l-2" style={{ borderColor: WA_GREEN }}>
                          <div className="font-semibold" style={{ color: WA_GREEN }}>{snippet.senderName}</div>
                          <div className="truncate opacity-70 text-slate-600">{snippet.text}</div>
                        </div>
                      )}
                      {m.type === 'image' && m.fileUrl ? (
                        <img src={m.fileUrl} alt="фото" className="rounded-lg max-w-full max-h-72 mb-1" />
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-slate-800">{m.text}</div>
                      )}
                      <div className="text-[10px] mt-0.5 flex items-center gap-1 text-slate-500 justify-end">
                        {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        {messageStatus(m)}
                      </div>
                    </div>
  {!isMe && (
    <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 ml-1 self-center">
      <button onClick={() => setReplyingTo(m)} className="p-1 rounded hover:bg-white/70 text-slate-500" title="Ответить"><Reply size={14} /></button>
      <button onClick={() => setConfirmDelete(m)} className="p-1 rounded hover:bg-white/70 text-slate-400" title="Удалить у себя"><Trash2 size={14} /></button>
    </div>
  )}
</div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {replyingTo && (
              <div className="px-2 sm:px-3 pt-2 flex items-center gap-2 border-t border-border bg-white">
                <div className="flex-1 min-w-0 bg-surface rounded-lg px-2 sm:px-3 py-1.5 border-l-2" style={{ borderColor: WA_GREEN }}>
                  <div className="text-xs font-semibold" style={{ color: WA_GREEN }}>{replyingTo.senderName}</div>
                  <div className="text-xs text-muted truncate">{replyingTo.type === 'image' ? '📷 Фото' : replyingTo.text}</div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1.5 rounded-lg hover:bg-surface"><X size={16} /></button>
              </div>
            )}

            <form onSubmit={handleSend} className="p-2 sm:p-3 border-t border-border flex items-center gap-1.5 sm:gap-2 bg-white relative">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

              <div className="relative shrink-0" ref={emojiWrapRef}>
                <button type="button" onClick={() => setShowEmoji(v => !v)} className="p-2.5 rounded-full hover:bg-surface text-muted" title="Эмодзи">
                  <Smile size={20} />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 shadow-xl rounded-2xl overflow-hidden">
                    <EmojiPicker onEmojiClick={handleEmojiPick} theme={Theme.LIGHT} width={300} height={360} searchDisabled={false} skinTonesDisabled />
                  </div>
                )}
              </div>

              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-surface text-muted shrink-0" title="Отправить фото">
                <ImageIcon size={19} />
              </button>

              <input value={text} onChange={e => handleTextChange(e.target.value)} placeholder="Напишите сообщение..."
                className="input flex-1 text-sm min-w-0 rounded-full" />

              <button disabled={sending || !text.trim()} className="btn p-2.5 sm:px-4 sm:py-2.5 text-white rounded-full shrink-0" style={{ background: sending || !text.trim() ? '#94a3b8' : WA_GREEN }}>
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onOpenNewGroup={() => { setShowNewChat(false); setShowNewGroup(true); }}
          onChatStarted={(rId) => { setShowNewChat(false); loadRooms(); navigate(`/chat/${rId}`); }}
        />
      )}

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={loadRooms} />}

      {showGroupInfo && activeRoom && roomId && (
        <GroupInfoModal
          room={activeRoom}
          roomId={roomId}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={loadRooms}
          onLeft={() => { setShowGroupInfo(false); navigate('/chat'); loadRooms(); }}
          onOpenProfile={(uid) => setProfileUserId(uid)}
        />
      )}

      {profileUserId && (
        <ProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}

      {nicknameRoomId && (
        <NicknameModal
          room={rooms.find(r => r.id === nicknameRoomId)!}
          currentUserId={user?.id}
          onClose={() => setNicknameRoomId(null)}
          onSaved={loadRooms}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="font-semibold text-base mb-2">Удалить сообщение?</div>
            <p className="text-sm text-muted mb-5">Это действие нельзя отменить.</p>
            <div className="space-y-2">
              {confirmDelete.senderId === user?.id && (
                <button onClick={() => confirmDeleteMessage('everyone')} className="w-full btn bg-red-50 text-red-600 hover:bg-red-100 justify-center">
                  Удалить у всех
                </button>
              )}
              <button onClick={() => confirmDeleteMessage('me')} className="w-full btn btn-outline justify-center">
                Удалить у себя
              </button>
              <button onClick={() => setConfirmDelete(null)} className="w-full btn justify-center text-muted">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Profile modal: view any user's public info (phone, rating, etc) ── */
function ProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: me } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.getUser(userId).then(d => setProfile(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  async function handleMessage() {
    if (!profile) return;
    try {
      const d = await api.startChat(profile.id);
      onClose();
      navigate(`/chat/${d.roomId}`);
    } catch (e) { console.error(e); }
  }

  const isMe = me?.id === userId;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col items-center text-white p-6 sm:p-8 relative" style={{ background: `linear-gradient(160deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/15"><X size={18} /></button>
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-3 overflow-hidden font-bold text-3xl">
            {profile?.avatar ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" /> : (profile?.name?.[0] || '?')}
          </div>
          <div className="font-bold text-lg text-center px-6 flex items-center gap-1.5">
            {profile?.name || (loading ? 'Загрузка...' : 'Пользователь')}
            {profile?.verified && <BadgeCheck size={18} className="text-white/90" />}
          </div>
          {profile && (
            <div className="flex items-center gap-1 mt-1 text-sm text-white/85">
              <Star size={14} className="fill-current" /> {profile.rating?.toFixed(1) || '0.0'} · {profile.reviewCount || 0} пикир
            </div>
          )}
        </div>

        {!loading && profile && (
          <div className="p-4 sm:p-5 space-y-3">
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-slate-700">
                <Phone size={18} style={{ color: WA_GREEN }} />
                <div>
                  <div className="text-[11px] text-muted">Телефон</div>
                  <div className="text-sm font-medium">{profile.phone}</div>
                </div>
              </a>
            )}
            {profile.email && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700">
                <MessageCircle size={18} style={{ color: WA_GREEN }} />
                <div>
                  <div className="text-[11px] text-muted">Email</div>
                  <div className="text-sm font-medium truncate">{profile.email}</div>
                </div>
              </div>
            )}
            {(profile.region || profile.district || profile.village) && (
              <div className="px-3 py-2.5 rounded-xl text-slate-700">
                <div className="text-[11px] text-muted">Жайгашкан жери</div>
                <div className="text-sm font-medium">
                  {[profile.region, profile.district, profile.village].filter(Boolean).join(', ')}
                </div>
              </div>
            )}
            {profile.companyName && (
              <div className="px-3 py-2.5 rounded-xl text-slate-700">
                <div className="text-[11px] text-muted">Компания</div>
                <div className="text-sm font-medium">{profile.companyName}</div>
              </div>
            )}
            {profile.role && (
              <div className="px-3 py-2.5 rounded-xl text-slate-700">
                <div className="text-[11px] text-muted">Роль</div>
                <div className="text-sm font-medium capitalize">{profile.role}</div>
              </div>
            )}

            {!isMe && (
              <button onClick={handleMessage} className="w-full btn text-white rounded-full mt-2" style={{ background: WA_GREEN }}>
                <MessageCircle size={16} className="mr-1.5" /> Написать сообщение
              </button>
            )}
          </div>
        )}
        {loading && <div className="p-8 text-center text-muted text-sm">Загрузка...</div>}
      </div>
    </div>
  );
}

/* ── Nickname modal: set a private nickname for a 1:1 chat ── */
function NicknameModal({ room, currentUserId, onClose, onSaved }: {
  room: ChatRoom; currentUserId?: string; onClose: () => void; onSaved: () => void;
}) {
  const [value, setValue] = useState(room.nickname || '');
  const [saving, setSaving] = useState(false);
  const other = room.participants.find(p => p.id !== currentUserId);

  async function handleSave() {
    setSaving(true);
    try {
      await api.setChatNickname(room.id, value.trim() || null);
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-base">Задать никнейм</div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted mb-3">
          {other?.name || 'Колдонуучунун'} — задайте личный никнейм. Его увидите только вы.
        </p>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={other?.name || 'Никнейм'}
          className="input w-full mb-4 rounded-full"
          autoFocus
        />
        <div className="flex gap-2">
          {room.nickname && (
            <button onClick={() => { setValue(''); }} className="btn btn-outline flex-1 justify-center text-sm">
              Очистить
            </button>
          )}
          <button disabled={saving} onClick={handleSave} className="btn flex-1 text-white justify-center" style={{ background: WA_GREEN }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupInfoModal({ room, roomId, onClose, onUpdated, onLeft, onOpenProfile }: {
  room: ChatRoom; roomId: string; onClose: () => void; onUpdated: () => void; onLeft: () => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [openMemberMenu, setOpenMemberMenu] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(room.name || '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const { user } = useAuth();
  const { socket } = useSocket();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = room.ownerId === user?.id || (room.admins || []).includes(user?.id || '');

  useEffect(() => {
    setLoadingMembers(true);
    Promise.all(room.participants.map(p => api.getUser(p.id).then(d => d.user).catch(() => null)))
      .then(list => setMembers(list.filter(Boolean) as User[]))
      .finally(() => setLoadingMembers(false));
  }, [room.participants.map(p => p.id).join(',')]);

  useEffect(() => { setNameDraft(room.name || ''); }, [room.name]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.searchUsers(query.trim())
        .then(d => setResults((d.users || []).filter((u: User) => !room.participants.some(p => p.id === u.id))))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, room.participants]);

  async function handleAdd(u: User) {
    setAdding(u.id);
    try {
      await api.addGroupMember(roomId, u.id);
      setMembers(prev => [...prev, u]);
      setResults(prev => prev.filter(x => x.id !== u.id));
      onUpdated();
    } catch (e) { console.error(e); }
    finally { setAdding(null); }
  }

  async function handleLeave() {
    if (!confirm('Покинуть эту группу?')) return;
    setLeaving(true);
    try {
      await api.leaveGroup(roomId);
      onLeft();
    } catch (e) { console.error(e); }
    finally { setLeaving(false); }
  }

  async function handleRemoveMember(u: User) {
    if (!confirm(`Убрать ${u.name} из группы?`)) return;
    try {
      if (socket) socket.emit('group:remove_member', { roomId, userId: u.id });
      else await api.removeGroupMember(roomId, u.id);
      setMembers(prev => prev.filter(m => m.id !== u.id));
      onUpdated();
    } catch (e) { console.error(e); }
    setOpenMemberMenu(null);
  }

  async function handleToggleAdmin(u: User, makeAdmin: boolean) {
    try {
      await api.setGroupAdmin(roomId, u.id, makeAdmin);
      onUpdated();
    } catch (e) { console.error(e); }
    setOpenMemberMenu(null);
  }

  async function handleSaveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === room.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await api.updateGroup(roomId, { name: trimmed });
      onUpdated();
      setEditingName(false);
    } catch (e) { console.error(e); }
    finally { setSavingName(false); }
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setAvatarError('Выберите изображение'); setTimeout(() => setAvatarError(''), 4000); return; }
    setUploadingAvatar(true);
    try {
      const dataUrl = await compressAvatarImage(file);
      await api.updateGroup(roomId, { avatar: dataUrl });
      onUpdated();
    } catch {
      setAvatarError('Изображение слишком большое или не открывается');
      setTimeout(() => setAvatarError(''), 4000);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    try {
      await api.updateGroup(roomId, { avatar: null });
      onUpdated();
    } catch (e) { console.error(e); }
    finally { setUploadingAvatar(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col items-center text-white p-6 sm:p-8 relative" style={{ background: `linear-gradient(160deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/15"><X size={18} /></button>

          <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarSelect} className="hidden" />
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {room.avatar ? <img src={room.avatar} alt="" className="w-full h-full object-cover" /> : <Users size={32} />}
            </div>
            {isAdmin && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md"
                title="Изменить фото"
              >
                <Camera size={15} style={{ color: WA_GREEN }} />
              </button>
            )}
          </div>
          {isAdmin && room.avatar && (
            <button onClick={handleRemoveAvatar} disabled={uploadingAvatar} className="text-[11px] text-white/70 hover:text-white underline mb-2">
              Удалить фото
            </button>
          )}
          {avatarError && <div className="text-[11px] text-red-100 bg-red-500/30 px-2 py-1 rounded mb-2">{avatarError}</div>}

          {editingName ? (
            <div className="flex items-center gap-2 px-6 w-full">
              <input
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditingName(false); setNameDraft(room.name || ''); } }}
                className="flex-1 rounded-full px-3 py-1.5 text-sm text-slate-800"
                autoFocus
              />
              <button onClick={handleSaveName} disabled={savingName} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30">
                <ShieldCheck size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => isAdmin && setEditingName(true)}
              className={`font-bold text-lg text-center px-6 flex items-center gap-1.5 ${isAdmin ? 'hover:underline' : ''}`}
            >
              {room.name || 'Топ'}
              {isAdmin && <Pencil size={14} className="text-white/70" />}
            </button>
          )}
          <div className="text-xs text-white/75 mt-1">{room.participants.length} участников</div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm text-slate-700">Участники</div>
            <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: WA_GREEN }}>
              <UserPlus size={16} /> Добавить
            </button>
          </div>

          {showAdd && (
            <div className="mb-4 bg-surface rounded-xl p-3">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по имени, email или номеру..."
                className="input w-full mb-2 text-sm rounded-full" />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searching && <div className="text-xs text-muted px-2 py-1">Поиск...</div>}
                {!searching && query.trim().length >= 2 && results.length === 0 && (
                  <div className="text-xs text-muted px-2 py-1">Ничего не найдено</div>
                )}
                {results.map(u => (
                  <button key={u.id} onClick={() => handleAdd(u)} disabled={adding === u.id}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm hover:bg-white">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: WA_GREEN }}>
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{u.name}</div>
                      <div className="text-[11px] text-muted truncate">{u.email}</div>
                    </div>
                    {adding === u.id && <span className="text-xs text-muted">...</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {loadingMembers ? (
              <div className="text-sm text-muted px-2 py-3">Загрузка...</div>
            ) : members.map(m => {
              const memberIsAdmin = room.ownerId === m.id || (room.admins || []).includes(m.id);
              const canManage = isAdmin && m.id !== user?.id && m.id !== room.ownerId;
              return (
                <div key={m.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg relative">
                  <button onClick={() => onOpenProfile(m.id)} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}>
                    {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : m.name[0]}
                  </button>
                  <button onClick={() => onOpenProfile(m.id)} className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      {m.name}
                      {m.id === user?.id && <span className="text-[10px] text-muted font-normal">(вы)</span>}
                      {room.ownerId === m.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 font-normal">владелец</span>}
                      {memberIsAdmin && room.ownerId !== m.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-normal">админ</span>}
                    </div>
                    {m.phone && (
                      <div className="text-xs text-muted flex items-center gap-1"><Phone size={11} /> {m.phone}</div>
                    )}
                  </button>
                  {canManage && (
                    <div className="relative" data-room-menu>
                      <button onClick={() => setOpenMemberMenu(v => v === m.id ? null : m.id)} className="p-1.5 rounded-full hover:bg-surface text-slate-400">
                        <MoreVertical size={16} />
                      </button>
                      {openMemberMenu === m.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border z-20 py-1 w-48">
                          {room.ownerId === user?.id && (
                            <button onClick={() => handleToggleAdmin(m, !memberIsAdmin)} className="w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2">
                              <ShieldCheck size={14} /> {memberIsAdmin ? 'Убрать права админа' : 'Сделать админом'}
                            </button>
                          )}
                          <button onClick={() => handleRemoveMember(m)} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                            <UserMinus size={14} /> Удалить из группы
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={handleLeave} disabled={leaving}
            className="w-full mt-5 flex items-center justify-center gap-2 text-red-500 font-medium text-sm py-2.5 rounded-xl hover:bg-red-50">
            <LogOut size={16} /> {leaving ? 'Выход...' : 'Покинуть группу'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── New chat: WhatsApp-style contact picker ──
   Top option "Новая группа" opens the group creation flow.
   Tapping any found contact starts a direct 1:1 chat immediately. */
function NewChatModal({ onClose, onOpenNewGroup, onChatStarted }: {
  onClose: () => void;
  onOpenNewGroup: () => void;
  onChatStarted: (roomId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.searchUsers(query.trim())
        .then(d => setResults(d.users || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handlePick(u: User) {
    setStarting(u.id);
    try {
      const d = await api.startChat(u.id);
      onChatStarted(d.roomId);
    } catch (e) { console.error(e); }
    finally { setStarting(null); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 text-white shrink-0" style={{ background: WA_GREEN }}>
          <div className="font-semibold text-lg">Новый чат</div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15"><X size={18} /></button>
        </div>

        <div className="p-3 sm:p-4 border-b border-border shrink-0">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по имени, email или номеру..."
            className="input w-full rounded-full text-sm"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          <button
            onClick={onOpenNewGroup}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface text-left border-b border-slate-100"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: WA_GREEN }}>
              <Users size={19} />
            </div>
            <div className="font-medium text-sm text-slate-800">Новая группа</div>
          </button>

          {query.trim().length < 2 && (
            <div className="px-4 py-6 text-center text-muted text-sm">Начните вводить имя, email или номер телефона</div>
          )}
          {searching && (
            <div className="px-4 py-3 text-xs text-muted">Поиск...</div>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-muted text-sm">Ничего не найдено</div>
          )}
          {results.map(u => (
            <button
              key={u.id}
              onClick={() => handlePick(u)}
              disabled={starting === u.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface text-left border-b border-slate-50"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}>
                {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate text-slate-800 flex items-center gap-1.5">
                  {u.name}
                  {u.verified && <BadgeCheck size={13} style={{ color: WA_GREEN }} />}
                </div>
                <div className="text-[12px] text-muted truncate">{u.phone || u.email}</div>
              </div>
              {starting === u.id && <span className="text-xs text-muted shrink-0">...</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.searchUsers(query.trim())
        .then(d => setResults(d.users || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function toggle(u: User) {
    setSelected(prev => prev.some(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]);
  }

  async function create() {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      await api.createGroup(name.trim(), selected.map(u => u.id));
      onCreated();
      onClose();
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 text-white rounded-t-2xl" style={{ background: WA_GREEN }}>
          <div className="font-semibold text-lg">Новая группа</div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название группы"
            className="input w-full mb-3 rounded-full" />

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selected.map(u => (
                <span key={u.id} className="flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full">
                  {u.name}
                  <button onClick={() => toggle(u)}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}

          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по имени, email или номеру..."
            className="input w-full mb-2 rounded-full" />

          <div className="max-h-48 overflow-y-auto mb-4 space-y-1">
            {searching && <div className="text-xs text-muted px-2 py-1">Поиск...</div>}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <div className="text-xs text-muted px-2 py-1">Ничего не найдено</div>
            )}
            {results.map(u => (
              <button key={u.id} onClick={() => toggle(u)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${selected.some(x => x.id === u.id) ? 'bg-primary-50' : 'hover:bg-surface'}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: WA_GREEN }}>
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{u.name}</div>
                  <div className="text-[11px] text-muted truncate">{u.email}</div>
                </div>
              </button>
            ))}
          </div>

          <button disabled={creating || !name.trim() || selected.length === 0} onClick={create}
            className="btn w-full text-white rounded-full" style={{ background: (creating || !name.trim() || selected.length === 0) ? '#94a3b8' : WA_GREEN }}>
            {creating ? 'Создание...' : 'Создать группу'}
          </button>
        </div>
      </div>
    </div>
  );
}