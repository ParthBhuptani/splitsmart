import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Users, 
  Receipt, 
  ArrowRight, 
  Sparkles, 
  Copy, 
  Share2, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Check,
  History,
  LayoutGrid,
  Home,
  Save,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BillItem, Person, SplitMode, Assignment, Settlement, Group, HistoryItem } from './types';
import { parseBillWithAI } from './services/aiService';
import { calculateSettlements } from './utils/algorithm';

const PEOPLE_COLORS = [
  'bg-rose-500', 
  'bg-sky-500', 
  'bg-amber-500', 
  'bg-violet-500', 
  'bg-emerald-500',
  'bg-fuchsia-500',
  'bg-orange-500',
  'bg-indigo-500'
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'split' | 'groups' | 'history'>('split');
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<BillItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [payerId, setPayerId] = useState<string | null>(null);
  const [groupNotice, setGroupNotice] = useState<string | null>(null);
  
  // Persistence State
  const [groups, setGroups] = useState<Group[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Group Creation State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPeopleRaw, setNewGroupPeopleRaw] = useState('');

  // Load from localStorage
  useEffect(() => {
    const savedGroups = localStorage.getItem('split_smart_groups');
    const savedHistory = localStorage.getItem('split_smart_history');
    if (savedGroups) setGroups(JSON.parse(savedGroups));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('split_smart_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('split_smart_history', JSON.stringify(history));
  }, [history]);

  // Screen 1: Input
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Screen 2: People
  const [newName, setNewName] = useState('');

  const totalAmount = useMemo(() => items.reduce((acc, item) => acc + item.amount, 0), [items]);

  const handleParseAI = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await parseBillWithAI(rawText);
      processParsedItems(parsed);
    } catch (error) {
      console.error(error);
      alert("Failed to parse bill. Please check your network or try manual entry.");
    } finally {
      setIsParsing(false);
    }
  };

  const processParsedItems = (parsed: any[]) => {
    const newItems = parsed.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      amount: Number(item.amount)
    }));
    setItems(newItems);
    setRawText('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(',')[1];
      try {
        const parsed = await parseBillWithAI('', data, file.type);
        processParsedItems(parsed);
      } catch (error) {
        console.error(error);
        alert("Failed to read image. Make sure the bill is clear and try again.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addItemManually = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: '', amount: 0 }]);
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addPerson = () => {
    if (!newName.trim()) return;
    const color = PEOPLE_COLORS[people.length % PEOPLE_COLORS.length];
    const person = { id: Math.random().toString(36).substr(2, 9), name: newName, color };
    setPeople([...people, person]);
    if (!payerId) setPayerId(person.id);
    setNewName('');
  };

  const removePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
  };

  const toggleAssignment = (itemId: string, personId: string) => {
    const existing = assignments.find(a => a.itemId === itemId);
    if (existing) {
      if (existing.personIds.includes(personId)) {
        setAssignments(assignments.map(a => 
          a.itemId === itemId ? { ...a, personIds: a.personIds.filter(pid => pid !== personId) } : a
        ));
      } else {
        setAssignments(assignments.map(a => 
          a.itemId === itemId ? { ...a, personIds: [...a.personIds, personId] } : a
        ));
      }
    } else {
      setAssignments([...assignments, { itemId, personIds: [personId] }]);
    }
  };

  const calculateResults = () => {
    const personDebt: Record<string, number> = {};
    people.forEach(p => personDebt[p.id] = 0);

    if (splitMode === 'equal') {
      const perPerson = totalAmount / people.length;
      people.forEach(p => personDebt[p.id] = perPerson);
    } else if (splitMode === 'item') {
      items.forEach(item => {
        const assignment = assignments.find(a => a.itemId === item.id);
        const assignedPeople = assignment?.personIds || [];
        if (assignedPeople.length > 0) {
          const share = item.amount / assignedPeople.length;
          assignedPeople.forEach(pid => personDebt[pid] += share);
        } else {
          const share = item.amount / people.length;
          people.forEach(p => personDebt[p.id] += share);
        }
      });
    } else if (splitMode === 'percentage') {
      people.forEach(p => {
        personDebt[p.id] = (totalAmount * (percentages[p.id] || 0)) / 100;
      });
    }

    // Balance = (Amount you PAID) - (Amount you CONSUMED)
    const balances = people.map(p => ({
      personId: p.id,
      balance: (p.id === payerId ? totalAmount : 0) - personDebt[p.id]
    }));

    return calculateSettlements(balances);
  };

  const resetAll = () => {
    setItems([]);
    setPeople([]);
    setAssignments([]);
    setPercentages({});
    setStep(1);
    setRawText('');
    setPayerId(null);
  };

  const handleSaveToHistory = (results: Settlement[]) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      groupId: people.length > 0 ? groups.find(g => 
        g.people.length === people.length && 
        g.people.every(p => people.some(pp => pp.name === p.name))
      )?.id : undefined,
      date: new Date().toLocaleDateString(),
      total: totalAmount,
      peopleCount: people.length,
      mode: splitMode,
      settlements: results,
      people: people
    };
    setHistory([newItem, ...history]);
  };

  const createGroupFromCurrent = () => {
    if (people.length < 2) return;
    const name = prompt("Name your group:", "Friday Dinner Crew");
    if (!name) return;
    const newGroup: Group = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      people: [...people]
    };
    setGroups([...groups, newGroup]);
    alert("Group created! You can use it for future splits.");
  };

  const loadGroup = (group: Group) => {
    setPeople(group.people);
    setPayerId(group.people[0]?.id || null);
    setStep(1); // Go to step 1 so they can add the bill
    setActiveTab('split');
    setGroupNotice(`Group Loaded: ${group.name} (${group.people.length} people)`);
    setTimeout(() => setGroupNotice(null), 3000);
  };

  const createGroupManually = () => {
    if (!newGroupName.trim() || !newGroupPeopleRaw.trim()) return;
    const names = newGroupPeopleRaw.split(',').map(n => n.trim()).filter(n => n);
    if (names.length < 2) {
      alert("Please add at least 2 people.");
      return;
    }
    
    const newGroup: Group = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
      people: names.map((name, idx) => ({
        id: Math.random().toString(36).substr(2, 9),
        name,
        color: PEOPLE_COLORS[idx % PEOPLE_COLORS.length]
      }))
    };
    
    setGroups([newGroup, ...groups]);
    setIsCreatingGroup(false);
    setNewGroupName('');
    setNewGroupPeopleRaw('');
  };

  const toggleSettlementPaid = (historyId: string, settlementIdx: number) => {
    setHistory(history.map(h => {
      if (h.id === historyId) {
        const updatedSettlements = [...h.settlements];
        updatedSettlements[settlementIdx] = {
          ...updatedSettlements[settlementIdx],
          isPaid: !updatedSettlements[settlementIdx].isPaid
        };
        return { ...h, settlements: updatedSettlements };
      }
      return h;
    }));
  };

  const toggleGroupExpansion = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedGroups(next);
  };

  const viewGroupHistory = (groupId: string) => {
    setHistoryFilter(groupId);
    setActiveTab('history');
  };

  const stats = useMemo(() => {
    let totalPending = 0;
    let totalSettled = 0;
    
    const relevantHistory = historyFilter 
      ? history.filter(h => h.groupId === historyFilter)
      : history;

    relevantHistory.forEach(h => {
      h.settlements.forEach(s => {
        if (s.isPaid) totalSettled += s.amount;
        else totalPending += s.amount;
      });
    });

    return { totalPending, totalSettled };
  }, [history, historyFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-syne selection:bg-emerald-500/30 relative flex flex-col">
      {/* Background Blobs */}
      <div className="bg-accent-blob -top-[10%] -left-[10%]" />
      <div className="bg-accent-blob -bottom-[10%] -right-[10%] opacity-50" />
      <div className="bg-mesh" />
      
      <main className={`relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-8 w-full flex-1 flex flex-col ${activeTab === 'split' ? 'pb-32' : 'pb-24'}`}>
        {/* Header Section (Desktop Only) */}
        <header className="hidden md:flex justify-between items-center mb-8 gap-8">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter text-white">SplitSmart<span className="text-emerald-500 emerald-text-glow">.</span></h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[8px] mt-1 ml-1">AI-Powered Settlement</p>
          </div>
          
          <nav className="glass p-1 rounded-xl flex gap-0.5">
            {[
              { id: 'split', icon: Home, label: 'Split' },
              { id: 'groups', icon: LayoutGrid, label: 'Groups' },
              { id: 'history', icon: History, label: 'History' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id !== 'history') setHistoryFilter(null);
                }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-slate-950' : 'text-slate-500 hover:text-white'}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black tracking-tighter text-white">SplitSmart<span className="text-emerald-500">.</span></h1>
          {activeTab === 'split' && step > 1 && (
            <button onClick={resetAll} className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          )}
        </header>

        {activeTab === 'split' ? (
          <>
            {groupNotice && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-center mb-4 transition-all"
              >
                {groupNotice}
              </motion.div>
            )}
            {/* Step Progress Line */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3, 4].map((s) => (
                <React.Fragment key={s}>
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] transition-all duration-500 ${
                      step >= s 
                      ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                    } ${step === s ? 'scale-110 border-2 border-emerald-500' : ''}`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div className={`w-6 h-[1px] transition-colors duration-500 ${step > s ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col max-w-2xl mx-auto w-full gap-8"
            >
              <div className="glass p-6 md:p-8 rounded-[2rem] space-y-4 shadow-2xl relative overflow-hidden">
                <div className="relative">
                  <textarea
                    className="w-full h-32 md:h-48 bg-transparent border-none focus:ring-0 text-lg md:text-xl resize-none placeholder:text-slate-700 font-mono text-slate-200"
                    placeholder="Paste your bill text here...&#10;Or use the camera below to scan a bill!"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  {isParsing && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md rounded-2xl flex items-center justify-center z-20">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="animate-spin text-emerald-500 w-8 h-8" />
                        <span className="font-bold text-emerald-500 uppercase tracking-widest text-xs">AI reading your bill...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleParseAI}
                    disabled={!rawText.trim() || isParsing}
                    className="w-full bg-emerald-500 text-slate-950 h-14 rounded-xl font-black flex items-center justify-center gap-3 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 shadow-[0_10px_30px_rgba(16,185,129,0.15)] group"
                  >
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    Parse Text
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex-1 bg-white/5 border border-white/5 h-14 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer text-[10px] uppercase tracking-widest text-slate-300">
                      <Camera className="w-4 h-4" />
                      Camera
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <label className="flex-1 bg-white/5 border border-white/5 h-14 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer text-[10px] uppercase tracking-widest text-slate-300">
                      <ImageIcon className="w-4 h-4" />
                      Gallery
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm uppercase tracking-widest text-slate-500 font-bold">Bill Items ({items.length})</h3>
                  <button 
                    onClick={addItemManually}
                    className="text-emerald-500 text-xs font-bold flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider"
                  >
                    <Plus className="w-3 h-3" /> Add Manually
                  </button>
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-4 p-4 glass rounded-[1.25rem] group hover:border-emerald-500/30 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-slate-600 group-focus-within:bg-emerald-500 transition-colors" />
                        <input
                          className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium p-0 placeholder:text-slate-600"
                          value={item.name}
                          placeholder="Item name"
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-500 font-mono font-bold">₹</span>
                          <input
                            type="number"
                            className="w-24 bg-white/5 rounded-xl border border-white/5 focus:ring-1 focus:ring-emerald-500/50 text-right font-mono font-bold text-emerald-500 p-2"
                            value={item.amount || ''}
                            onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          />
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-auto pt-8">
                <button
                  disabled={items.length === 0}
                  onClick={() => setStep(2)}
                  className="w-full bg-emerald-500 h-16 rounded-[1.25rem] text-[#0A0F1D] font-black text-xl flex items-center justify-center gap-3 emerald-glow hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  Continue <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col max-w-2xl mx-auto w-full gap-8"
            >
              <div className="space-y-2 text-center">
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">Who's sharing<br/>this bill?</h2>
                <p className="text-slate-500 font-medium">Add friends to start the split.</p>
              </div>

              <div className="flex gap-3 glass p-2 rounded-3xl">
                <input
                  autoFocus
                  className="flex-1 h-14 bg-transparent border-none rounded-2xl px-6 text-xl focus:ring-0 text-white font-medium"
                  placeholder="Enter name..."
                  value={newName}
                  onKeyDown={(e) => e.key === 'Enter' && addPerson()}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button
                  onClick={addPerson}
                  className="w-14 h-14 bg-emerald-500 text-[#0A0F1D] rounded-2xl flex items-center justify-center hover:scale-105 transition-all shadow-lg active:scale-95"
                >
                  <Plus className="w-8 h-8" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <AnimatePresence>
                  {people.map((person) => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="glass p-6 rounded-[2rem] flex flex-col items-center gap-4 relative group"
                    >
                      <button 
                        onClick={() => removePerson(person.id)}
                        className="absolute top-3 right-3 p-1.5 bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className={`w-16 h-16 ${person.color} rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-black/20`}>
                        {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-bold text-center truncate w-full px-2 text-lg">{person.name}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex justify-between items-center px-1 mt-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Fast Add</h3>
                {groups.length > 0 && (
                  <span className="text-[10px] text-slate-600 font-bold uppercase">Quick load from groups</span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {groups.length === 0 ? (
                  <p className="text-slate-700 text-xs italic px-2">Create groups to see them here for rapid entry.</p>
                ) : (
                  groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setPeople(group.people);
                        setPayerId(group.people[0]?.id || null);
                      }}
                      className="px-4 py-2 bg-slate-800/30 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      {group.name}
                    </button>
                  ))
                )}
              </div>

              <div className="mt-auto pt-8 flex gap-4">
                <button
                  onClick={() => setStep(1)}
                   className="w-16 h-16 glass rounded-[1.25rem] flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                >
                   <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <button
                  disabled={people.length < 2}
                  onClick={() => setStep(3)}
                  className="flex-1 bg-emerald-500 h-16 rounded-[1.25rem] text-[#0A0F1D] font-black text-xl flex items-center justify-center gap-3 emerald-glow hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                >
                  Let's Split <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-10"
            >
              <div className="flex flex-col gap-6">
                <div className="flex justify-center">
                  <div className="glass p-1.5 rounded-2xl flex w-fit">
                    {(['equal', 'item', 'percentage'] as SplitMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSplitMode(mode)}
                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          splitMode === mode 
                          ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20' 
                          : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        {mode === 'equal' ? 'Equal' : mode === 'item' ? 'Item' : 'Percent'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Who Paid Selector */}
                <div className="glass p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="flex flex-col gap-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Who picked up the tab?</h4>
                      <p className="text-sm font-bold text-white">Select the person who paid the entire bill.</p>
                   </div>
                   <div className="flex flex-wrap gap-2 justify-center">
                      {people.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPayerId(p.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                            payerId === p.id 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${p.color}`} />
                          <span className="text-xs font-bold">{p.name}</span>
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-8">
                {splitMode === 'equal' && (
                  <div className="max-w-2xl mx-auto w-full space-y-10">
                    <div className="text-center space-y-1">
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Grand Total</p>
                      <h2 className="text-6xl font-mono font-black text-emerald-500">₹{totalAmount}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {people.map(p => (
                        <div key={p.id} className="glass p-5 rounded-[1.5rem] flex items-center justify-between group hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${p.color} rounded-full flex items-center justify-center text-xs font-black shadow-md`}>
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-lg">{p.name}</span>
                          </div>
                          <span className="font-mono font-bold text-xl text-emerald-500">₹{(totalAmount / people.length).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {splitMode === 'item' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-full">
                    <div className="lg:col-span-12 flex flex-col gap-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Assign Items</h3>
                       {/* Simplified assignment UI for modern look */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar max-h-[60vh]">
                          {items.map(item => {
                            const assignedIds = assignments.find(a => a.itemId === item.id)?.personIds || [];
                            return (
                              <div 
                                key={item.id} 
                                className="p-5 glass rounded-3xl flex flex-col gap-4 border border-white/5 hover:border-emerald-500/20 transition-all"
                              >
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-lg leading-tight">{item.name}</span>
                                  <span className="font-mono font-black text-emerald-500">₹{item.amount}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {people.map(p => {
                                    const isActive = assignedIds.includes(p.id);
                                    return (
                                      <button
                                        key={p.id}
                                        onClick={() => toggleAssignment(item.id, p.id)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                                          isActive 
                                          ? `${p.color} text-white shadow-lg ring-2 ring-emerald-500/50` 
                                          : 'bg-slate-800 text-slate-500 hover:text-white'
                                        }`}
                                        title={p.name}
                                      >
                                        {p.name[0].toUpperCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  </div>
                )}

                {splitMode === 'percentage' && (
                  <div className="max-w-2xl mx-auto w-full space-y-12">
                     <div className="text-center space-y-2">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Distribution Progress</p>
                        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                           <div 
                              className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" 
                              style={{ width: `${(Object.values(percentages) as number[]).reduce((a, b) => a + b, 0)}%` }} 
                           />
                           <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] font-black text-white mix-blend-difference">
                                {(Object.values(percentages) as number[]).reduce((a, b) => a + b, 0)}% / 100%
                              </span>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                        {people.map(p => (
                          <div key={p.id} className="glass p-6 rounded-[2rem] space-y-4">
                             <div className="flex items-center justify-between font-bold">
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 ${p.color} rounded-full flex items-center justify-center text-[10px] font-black shadow-lg`}>
                                      {p.name.charAt(0).toUpperCase()}
                                   </div>
                                   <span className="text-lg">{p.name}</span>
                                </div>
                                <div className="flex gap-6 items-center">
                                   <span className="text-sm text-slate-500 font-mono">{percentages[p.id] || 0}%</span>
                                   <span className="text-2xl font-mono font-black text-emerald-500">₹{((totalAmount * (percentages[p.id] || 0)) / 100).toFixed(0)}</span>
                                </div>
                             </div>
                             <input
                                type="range"
                                min="0"
                                max="100"
                                value={percentages[p.id] || 0}
                                onChange={(e) => setPercentages({ ...percentages, [p.id]: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-all hover:bg-slate-700"
                             />
                          </div>
                        ))}
                     </div>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-12 flex justify-between items-center bg-slate-900/80 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] sticky bottom-0">
                <div className="flex gap-8">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Total Bill</p>
                    <p className="text-2xl font-mono font-bold text-white">₹{totalAmount}</p>
                  </div>
                  {splitMode === 'item' && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Assigned</p>
                      <p className="text-2xl font-mono font-bold text-emerald-500">
                        ₹{items.filter(i => assignments.find(a => a.itemId === i.id)?.personIds.length).reduce((a, b) => a + b.amount, 0)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                  >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="px-8 h-14 bg-emerald-500 text-[#0A0F1D] font-black rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    See Settlement <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <FinalSettlementView 
              people={people} 
              results={calculateResults()} 
              reset={resetAll} 
              total={totalAmount} 
              payerId={payerId} 
              onSave={handleSaveToHistory}
              onSaveGroup={createGroupFromCurrent}
            />
          )}
        </AnimatePresence>
          </>
        ) : activeTab === 'groups' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col gap-6 max-w-2xl mx-auto w-full"
          >
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">Your Groups</h2>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.1em]">Regular crews you hang out with.</p>
              </div>
              {!isCreatingGroup && (
                <button 
                  onClick={() => setIsCreatingGroup(true)}
                  className="px-6 py-3 bg-white text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Group
                </button>
              )}
            </header>

            {isCreatingGroup && (
              <div className="glass p-6 md:p-8 rounded-[2rem] border border-emerald-500/20 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Create New Group</h3>
                  <button onClick={() => setIsCreatingGroup(false)} className="text-slate-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Group Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Office Lunch"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/5 h-12 rounded-xl px-4 font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">People Names (comma separated)</label>
                    <textarea 
                      placeholder="Alice, Bob, Charlie..."
                      value={newGroupPeopleRaw}
                      onChange={(e) => setNewGroupPeopleRaw(e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/5 h-24 rounded-xl p-4 font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                   <button 
                    onClick={() => setIsCreatingGroup(false)}
                    className="flex-1 h-12 glass text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                    onClick={createGroupManually}
                    disabled={!newGroupName.trim() || !newGroupPeopleRaw.trim()}
                    className="flex-3 h-12 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
                   >
                     Save Group
                   </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {groups.length === 0 ? (
                <div className="text-center py-16 glass rounded-[2rem] space-y-4">
                  <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Users className="text-slate-500 w-6 h-6" />
                  </div>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No groups created yet.</p>
                </div>
              ) : (
                groups.map(group => {
                  const isExpanded = expandedGroups.has(group.id);
                  return (
                    <div key={group.id} className={`glass overflow-hidden rounded-[1.5rem] border border-white/5 transition-all ${isExpanded ? 'bg-white/[0.03]' : ''}`}>
                      <div className="p-4 md:p-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleGroupExpansion(group.id)}>
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-lg text-white leading-none mb-1">{group.name}</span>
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{group.people.length} Members</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleGroupExpansion(group.id); }}
                            className={`p-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); loadGroup(group); }}
                            className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-widest hover:scale-105 transition-transform"
                          >
                            Split Now
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="bg-black/20 border-t border-white/5"
                          >
                            <div className="p-5 space-y-4">
                              <div className="flex flex-wrap gap-2">
                                {group.people.map(p => (
                                  <div key={p.id} className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5">
                                    <div className={`w-2 h-2 rounded-full ${p.color}`} />
                                    <span className="text-[10px] font-bold text-slate-300">{p.name}</span>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex justify-between items-center pt-2">
                                <button 
                                  onClick={() => viewGroupHistory(group.id)}
                                  className="text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5"
                                >
                                  <History className="w-3 h-3" /> View Past Bills
                                </button>
                                <button 
                                  onClick={() => setGroups(groups.filter(g => g.id !== group.id))}
                                  className="text-[9px] font-black uppercase tracking-widest text-rose-500/50 hover:text-rose-500 flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete Group
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full"
          >
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div className="flex flex-col w-full md:w-auto">
                <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">Split History</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
                    {historyFilter ? `Filtering: ${groups.find(g => g.id === historyFilter)?.name}` : 'All past settlements'}
                  </p>
                  {historyFilter && (
                    <button onClick={() => setHistoryFilter(null)} className="text-emerald-500 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full hover:bg-emerald-500/20">
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Settlement Progress Summary */}
              <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                 <div className="glass px-4 py-3 rounded-xl border border-white/5">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Paid</span>
                    <span className="text-lg font-mono font-black text-emerald-500">₹{stats.totalSettled.toFixed(0)}</span>
                 </div>
                 <div className="glass px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Pending</span>
                    <span className="text-lg font-mono font-black text-white/40">₹{stats.totalPending.toFixed(0)}</span>
                 </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.length === 0 ? (
                <div className="col-span-full text-center py-16 glass rounded-[2rem] space-y-4">
                  <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <History className="text-slate-500 w-6 h-6" />
                  </div>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Your history is empty.</p>
                </div>
              ) : (
                (historyFilter ? history.filter(h => h.groupId === historyFilter) : history).map(item => {
                  const paidCount = item.settlements.filter(s => s.isPaid).length;
                  const totalCount = item.settlements.length;
                  const isFullySettled = paidCount === totalCount;
                  
                  return (
                    <div key={item.id} className={`glass p-5 rounded-[1.5rem] flex flex-col gap-4 border border-white/5 hover:bg-white/[0.04] transition-all relative overflow-hidden ${isFullySettled ? 'grayscale-[0.5] opacity-80' : ''}`}>
                      {isFullySettled && (
                        <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/30">
                          Settled
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.date}</span>
                          <span className={`${isFullySettled ? 'text-slate-400' : 'text-emerald-500'} text-xl font-mono font-black italic`}>
                            ₹{item.total}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] py-1 px-2.5 bg-slate-800 rounded-lg font-black text-slate-400 uppercase tracking-widest">{item.mode === 'equal' ? 'Equal' : item.mode === 'item' ? 'Item' : 'Percent'}</span>
                          <div className="flex -space-x-1.5 mt-2">
                             {item.people.slice(0, 4).map(p => (
                               <div key={p.id} className={`w-5 h-5 rounded-full ${p.color} border border-slate-900 flex items-center justify-center text-[7px] font-black`}>
                                 {p.name[0].toUpperCase()}
                               </div>
                             ))}
                             {item.people.length > 4 && (
                               <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[7px] font-black text-slate-400">
                                 +{item.people.length - 4}
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-3 border-t border-white/5 space-y-2">
                         <div className="flex justify-between items-center mb-1">
                           <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Transactions ({paidCount}/{totalCount})</h4>
                         </div>
                         {item.settlements.map((s, idx) => {
                           const from = item.people.find(p => p.id === s.from)?.name;
                           const to = item.people.find(p => p.id === s.to)?.name;
                           return (
                             <label key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors cursor-pointer group/item">
                               <div className="flex items-center gap-2">
                                  <div onClick={(e) => {
                                    e.preventDefault();
                                    toggleSettlementPaid(item.id, idx);
                                  }} className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${s.isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-white/10'}`}>
                                     {s.isPaid && <Check className="w-3 h-3 text-slate-950 stroke-[5]" />}
                                  </div>
                                  <span className={`text-[11px] font-bold transition-all ${s.isPaid ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                    {from} → {to}
                                  </span>
                               </div>
                               <span className={`text-xs font-mono font-bold transition-all ${s.isPaid ? 'text-slate-600' : 'text-emerald-500'}`}>₹{s.amount.toFixed(0)}</span>
                             </label>
                           );
                         })}
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <button 
                          onClick={() => setHistory(history.filter(h => h.id !== item.id))}
                          className="text-slate-600 hover:text-rose-500 text-[8px] font-black uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Remove History
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Persistent Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/40 backdrop-blur-2xl border-t border-white/5 p-3 flex justify-around items-center">
        {[
          { id: 'split', icon: Home, label: 'Split' },
          { id: 'groups', icon: LayoutGrid, label: 'Groups' },
          { id: 'history', icon: History, label: 'History' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id !== 'history') setHistoryFilter(null);
            }}
            className={`flex flex-col items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all ${activeTab === tab.id ? 'text-emerald-500' : 'text-slate-500'}`}
          >
            <tab.icon className={`w-5 h-5 transition-all ${activeTab === tab.id ? 'scale-110' : ''}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-40'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function FinalSettlementView({ people, results, reset, total, payerId, onSave, onSaveGroup }: { 
  people: Person[]; 
  results: Settlement[]; 
  reset: () => void;
  total: number;
  payerId: string | null;
  onSave: (results: Settlement[]) => void;
  onSaveGroup: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#ffffff']
    });
  }, []);

  const handleSave = () => {
    onSave(results);
    setSaved(true);
  };

  const getSummary = () => {
    const p = people.find(pers => pers.id === payerId)?.name || 'Payer';
    const summary = results.map(s => {
      const from = people.find(pers => pers.id === s.from)?.name;
      const to = people.find(pers => pers.id === s.to)?.name;
      return `• ${from} pays ${to}: ₹${s.amount}`;
    }).join('\n');
    return `SplitSmart Split (Total: ₹${total})\nPaid by: ${p}\n\n${summary}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col max-w-2xl mx-auto w-full gap-8"
    >
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest">
          <Check className="w-3 h-3" /> All Set!
        </div>
        <h2 className="text-5xl font-bold tracking-tight text-white leading-tight">Ready to<br/>settle up?</h2>
      </header>

      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="text-center py-16 glass rounded-[2.5rem] space-y-4">
             <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Users className="text-slate-500 w-8 h-8" />
             </div>
             <p className="text-slate-400 font-bold text-lg">Everyone is already even!</p>
          </div>
        ) : (
          results.map((settlement, idx) => {
            const fromPerson = people.find(p => p.id === settlement.from);
            const toPerson = people.find(p => p.id === settlement.to);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass p-6 rounded-[2.5rem] flex items-center gap-5 group hover:bg-white/5 transition-all"
              >
                <div className={`w-14 h-14 ${fromPerson?.color} rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black shadow-lg`}>
                  {fromPerson?.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-slate-500 mb-2">
                    <span className="truncate font-black text-[10px] uppercase tracking-widest">{fromPerson?.name}</span>
                    <div className="flex-1 h-[1px] bg-white/5" />
                    <span className="truncate font-black text-[10px] uppercase tracking-widest">{toPerson?.name}</span>
                  </div>
                  <div className="text-5xl font-mono font-black text-emerald-500 emerald-text-glow">
                    ₹{settlement.amount}
                  </div>
                </div>

                <div className={`w-14 h-14 ${toPerson?.color} rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black shadow-lg`}>
                  {toPerson?.name.charAt(0).toUpperCase()}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="mt-auto space-y-4 pt-8">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleSave}
            disabled={saved}
            className={`h-16 rounded-[1.25rem] flex items-center justify-center gap-3 font-black transition-all active:scale-95 ${
              saved ? 'bg-slate-800 text-emerald-500 grayscale' : 'glass text-white hover:bg-white/10'
            }`}
          >
            {saved ? <Check className="w-6 h-6" /> : <Save className="w-6 h-6" />}
            {saved ? 'Logged' : 'Save History'}
          </button>
          <button
            onClick={onSaveGroup}
            className="h-16 glass rounded-[1.25rem] flex items-center justify-center gap-3 font-black text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <Users className="w-6 h-6" />
            Save Group
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCopy}
            className="flex-1 h-16 glass rounded-[1.25rem] flex items-center justify-center gap-3 font-black text-white hover:bg-white/10 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-6 h-6 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-6 h-6" />
                Copy Summary
              </>
            )}
          </button>
          <button
            className="w-16 h-16 glass rounded-[1.25rem] flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 text-slate-400 hover:text-white"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={reset}
          className="w-full bg-white text-[#0A0F1D] h-16 rounded-[1.25rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all active:scale-95 shadow-2xl shadow-white/5"
        >
          <RefreshCw className="w-5 h-5" /> Start Over
        </button>

        <div className="text-center pt-2">
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Total Bill Settle: ₹{total}</p>
        </div>
      </div>
    </motion.div>
  );
}
