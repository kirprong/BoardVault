import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { Plus, ExternalLink, Trash2, Edit3, Layers, FileText, X, Archive, RotateCcw, Search, Hash, ChevronLeft, ChevronRight, ClipboardCopy } from 'lucide-react';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'boardvault-demo';

const ITEMS_PER_PAGE = 6;

export default function App() {
    const [user, setUser] = useState(null);
    const [notes, setNotes] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ title: '', url: '', description: '', category: '' });
    const [editId, setEditId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [toast, setToast] = useState(null);

    const notesRef = collection(db, 'artifacts', appId, 'public', 'data', 'notes');

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        const init = async () => {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Auth error:", error);
            }
        };
        init();
        return onAuthStateChanged(auth, setUser);
    }, []);

    useEffect(() => {
        if (user) return onSnapshot(notesRef, (s) => setNotes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [user]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handlePasteUrl = async (id) => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.startsWith('http')) {
                showToast("В буфере нет валидной ссылки!");
                return;
            }
            const d = doc(db, 'artifacts', appId, 'public', 'data', 'notes', id);
            await updateDoc(d, { url: text, updatedAt: Date.now() });
            showToast("Ссылка обновлена из буфера!");
        } catch (err) {
            showToast("Ошибка доступа к буферу!");
        }
    };

    const categories = useMemo(() => Array.from(new Set(notes.filter(n => !n.archived).map(n => n.category))).filter(Boolean).sort(), [notes]);

    const handleAction = async (id, type, val) => {
        const d = doc(db, 'artifacts', appId, 'public', 'data', 'notes', id);
        if (type === 'archive') await updateDoc(d, { archived: val });
        else if (confirm('Удалить навсегда?')) await deleteDoc(d);
    };

    const save = async (e) => {
        e.preventDefault();
        const data = { ...form, archived: false, updatedAt: Date.now() };
        if (editId) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', editId), data);
        else await addDoc(notesRef, { ...data, createdAt: Date.now() });
        closeModal();
    };

    const closeModal = () => {
        setIsModalOpen(false); setEditId(null);
        setForm({ title: '', url: '', description: '', category: '' });
    };

    const filteredItems = useMemo(() => {
        return notes.filter(n => {
            const s = searchTerm.toLowerCase();
            const match = n.title?.toLowerCase().includes(s) || n.category?.toLowerCase().includes(s) || n.description?.toLowerCase().includes(s);
            if (activeTab === 'archived') return n.archived && match;
            if (n.archived) return false;
            return (activeTab === 'all' || n.category === activeTab) && match;
        });
    }, [notes, searchTerm, activeTab]);

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const currentItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handDrawnBorder = "border-2 border-slate-800 shadow-[2px_2px_0px_0px_rgba(30,41,59,1)]";

    return (
        <div className="flex h-screen bg-[#f4f4f7] text-slate-800" style={{ fontFamily: '"Indie Flower", cursive' }}>
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 z-[100] ${handDrawnBorder} font-bold text-lg`}>
                    {toast}
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-64 bg-white border-r-4 border-slate-800 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 font-bold text-2xl mb-4">
                    <div className={`p-1 bg-indigo-200 border-2 border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                        <Layers size={20} />
                    </div>
                    <span>BoardVault</span>
                </div>

                <nav className="flex-1 space-y-2 overflow-auto">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`w-full text-left px-3 py-2 rounded font-bold text-lg border-2 transition-all ${activeTab === 'all' ? 'bg-indigo-100 border-slate-800' : 'border-transparent hover:bg-slate-50'}`}
                    >
                        Все записи
                    </button>

                    <div className="py-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-3">Категории</p>
                        <div className="space-y-1">
                            {categories.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setActiveTab(c)}
                                    className={`w-full text-left px-3 py-1.5 rounded flex items-center gap-2 text-md border-2 transition-all ${activeTab === c ? 'bg-amber-100 border-slate-800 font-bold' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Hash size={14} className={activeTab === c ? 'text-slate-800' : 'text-slate-300'} /> {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setActiveTab('archived')}
                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 mt-4 border-2 transition-all ${activeTab === 'archived' ? 'bg-red-100 border-slate-800 font-bold text-red-800' : 'border-transparent text-slate-400 hover:text-red-500'}`}
                    >
                        <Archive size={16} /> Корзина
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="h-16 border-b-4 border-slate-800 flex items-center justify-between px-8 bg-white z-10">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            placeholder="Поиск по доскам..."
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-md pl-10 pr-4 py-1.5 text-lg outline-none focus:border-slate-800 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className={`bg-indigo-500 text-white px-6 py-2 font-bold text-lg flex items-center gap-2 ${handDrawnBorder} active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all`}
                    >
                        <Plus size={20} /> Добавить
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-8 flex flex-col">
                    <div className={`bg-white border-4 border-slate-800 overflow-x-auto shadow-[6px_6px_0px_0px_rgba(30,41,59,1)] flex-1`}>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b-4 border-slate-800">
                                <tr className="text-xs uppercase font-bold tracking-widest text-slate-500">
                                    <th className="px-6 py-4 border-r-2 border-slate-800">Название</th>
                                    <th className="px-6 py-4 border-r-2 border-slate-800 w-32 text-center">Тег</th>
                                    <th className="px-6 py-4 border-r-2 border-slate-800">Описание</th>
                                    <th className="px-6 py-4 text-right w-48">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-slate-800">
                                {currentItems.length > 0 ? currentItems.map(n => (
                                    <tr key={n.id} className="border-b-2 border-slate-800 hover:bg-indigo-50/50 transition-colors group">
                                        <td className="px-6 py-4 border-r-2 border-slate-800 font-bold text-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText size={18} className="text-slate-400" />
                                                {n.title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 border-r-2 border-slate-800 text-center">
                                            <span className="bg-amber-100 border-2 border-slate-800 px-2 py-0.5 rounded text-sm font-bold inline-block shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                                {n.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 border-r-2 border-slate-800 text-slate-600 text-md italic truncate max-w-xs">
                                            {n.description || "---"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {n.archived ? (
                                                    <>
                                                        <button onClick={() => handleAction(n.id, 'archive', false)} className="p-1.5 border-2 border-slate-800 bg-white hover:bg-indigo-50 rounded" title="Вернуть"><RotateCcw size={18} /></button>
                                                        <button onClick={() => handleAction(n.id, 'delete')} className="p-1.5 border-2 border-slate-800 bg-white hover:bg-red-50 text-red-600 rounded" title="Удалить"><Trash2 size={18} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handlePasteUrl(n.id)} className="p-1.5 border-2 border-slate-800 bg-white hover:bg-amber-50 text-amber-600 rounded transition-all" title="Вставить из буфера"><ClipboardCopy size={18} /></button>
                                                        <a href={n.url} target="_blank" className="p-1.5 border-2 border-slate-800 bg-white hover:bg-indigo-50 text-indigo-600 rounded transition-all" title="Открыть"><ExternalLink size={18} /></a>
                                                        <button onClick={() => { setEditId(n.id); setForm(n); setIsModalOpen(true); }} className="p-1.5 border-2 border-slate-800 bg-white hover:bg-slate-50 text-slate-500 rounded transition-all" title="Правка"><Edit3 size={18} /></button>
                                                        <button onClick={() => handleAction(n.id, 'archive', true)} className="p-1.5 border-2 border-slate-800 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all" title="В корзину"><Archive size={18} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center text-slate-300 text-2xl italic uppercase tracking-widest">
                                            Доска пуста...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Пагинация */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className={`p-2 border-2 border-slate-800 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none transition-all`}
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex gap-2">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-10 h-10 border-2 border-slate-800 font-bold text-lg transition-all ${currentPage === i + 1 ? 'bg-indigo-500 text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>

                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className={`p-2 border-2 border-slate-800 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none transition-all`}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form
                        onSubmit={save}
                        className="bg-white w-full max-w-md p-8 border-4 border-slate-800 shadow-[10px_10px_0px_0px_rgba(30,41,59,1)] space-y-5"
                    >
                        <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                            <span className="font-bold text-2xl uppercase tracking-tighter">{editId ? 'Правка записи' : 'Новый рисунок'}</span>
                            <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-800 transition-transform hover:rotate-90"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-400 ml-1">Название проекта</label>
                                <input required placeholder="Напр: Схема API" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border-2 border-slate-800 p-2.5 outline-none bg-slate-50 focus:bg-white text-lg transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Тег</label>
                                    <input required placeholder="Идеи" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border-2 border-slate-800 p-2.5 outline-none bg-slate-50 focus:bg-amber-50 text-lg transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Ссылка</label>
                                    <input required type="url" placeholder="https://..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full border-2 border-slate-800 p-2.5 outline-none bg-slate-50 focus:bg-indigo-50 text-lg transition-all" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-400 ml-1">Краткое описание</label>
                                <textarea placeholder="О чем этот набросок?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border-2 border-slate-800 p-2.5 outline-none bg-slate-50 focus:bg-white h-24 resize-none text-lg transition-all" />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={closeModal} className="flex-1 py-2 font-bold text-slate-400 hover:text-slate-800 uppercase text-sm">Отмена</button>
                            <button type="submit" className={`flex-[2] py-3 bg-indigo-500 text-white font-bold text-xl uppercase ${handDrawnBorder} active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all`}>
                                Сохранить
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}