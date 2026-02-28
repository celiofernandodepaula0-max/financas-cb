import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('DASHBOARD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tema, setTema] = useState('dark');
  const [lancamentos, setLancamentos] = useState([]);
  const [config, setConfig] = useState({ saldo_inicial: 0, renda_fixa: 0 });
  const [ciclo, setCiclo] = useState({ data_inicio: '', duracao: 28, idade: '', fatores: '' });
  
  // Novo formulário com 'escopo'
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal' });
  
  const [fotoUrl, setFotoUrl] = useState(null);
  const fileInputRef = useRef(null);

  const carregarDados = async () => {
    const { data: f } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabase.from('configuracoes').select('*').maybeSingle();
    const { data: cb } = await supabase.from('ciclo_brenda').select('*').maybeSingle();
    
    if (f) setLancamentos(f);
    if (c) { setConfig(c); setTema(c.tema || 'dark'); }
    if (cb) setCiclo(cb);
    
    const { data: img } = supabase.storage.from('perfis').getPublicUrl('casal.png');
    if (img) setFotoUrl(`${img.publicUrl}?t=${new Date().getTime()}`);
  };

  useEffect(() => { carregarDados(); }, []);

  const alternarTema = async () => {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema);
    await supabase.from('configuracoes').upsert({ id: 1, tema: novoTema });
  };

  const salvarGasto = async (e) => {
    e.preventDefault();
    const v = parseFloat(String(form.valor).replace(',', '.'));
    await supabase.from('fluxo').insert([{ 
      descricao: form.descricao, valor: v, tipo: form.tipo, 
      usuario: form.usuario, forma_pagamento: form.forma, escopo: form.escopo,
      mes: new Intl.DateTimeFormat('pt-BR', {month: 'long'}).format(new Date()) 
    }]);
    setShowModal(false);
    setForm({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal' });
    carregarDados();
  };

  const salvarCiclo = async (e) => {
    e.preventDefault();
    await supabase.from('ciclo_brenda').upsert({ id: 1, ...ciclo });
    alert("Dados do ciclo atualizados!");
    carregarDados();
  };

  // Lógica de Separação (Casal vs Pessoal)
  const gastosCasal = lancamentos.filter(i => i.escopo === 'casal');
  const gastosCelio = lancamentos.filter(i => i.escopo === 'celio');
  const gastosBrenda = lancamentos.filter(i => i.escopo === 'brenda');

  const totalGastosCasal = gastosCasal.reduce((acc, i) => i.tipo === 'despesa' ? acc + Number(i.valor) : acc, 0);
  const totalEntradasCasal = gastosCasal.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc, 0);
  const saldoAtualCasal = Number(config.saldo_inicial) + totalEntradasCasal - totalGastosCasal;

  const saldoCelio = gastosCelio.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);
  const saldoBrenda = gastosBrenda.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);

  // Lógica do Ciclo Menstrual
  let diasParaProxima = 0;
  let faseAtual = "Aguardando dados...";
  let corFase = "text-gray-400";
  if (ciclo.data_inicio) {
    const hoje = new Date();
    const inicio = new Date(ciclo.data_inicio);
    const diferencaDias = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
    const diaDoCiclo = (diferencaDias % ciclo.duracao) + 1;
    diasParaProxima = ciclo.duracao - diaDoCiclo;

    if (diaDoCiclo >= 1 && diaDoCiclo <= 5) { faseAtual = "Menstruação"; corFase = "text-red-500"; }
    else if (diaDoCiclo >= 6 && diaDoCiclo <= 11) { faseAtual = "Fase Folicular"; corFase = "text-pink-400"; }
    else if (diaDoCiclo >= 12 && diaDoCiclo <= 16) { faseAtual = "Período Fértil"; corFase = "text-purple-500"; }
    else { faseAtual = "Fase Lútea"; corFase = "text-blue-400"; }
  }

  // --- CLASSES DINÂMICAS DE TEMA ---
  const isDark = tema === 'dark';
  const bgBody = isDark ? 'bg-[#0a0b0e]' : 'bg-slate-100';
  const textBody = isDark ? 'text-white' : 'text-slate-900';
  const bgMenu = isDark ? 'bg-[#121418] border-r border-white/5' : 'bg-white border-r border-slate-200 shadow-2xl';
  const bgCard = isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textMuted = isDark ? 'opacity-40' : 'text-slate-500';
  const inputClass = isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';

  return (
    <div className={`min-h-screen ${bgBody} ${textBody} font-sans overflow-x-hidden transition-colors duration-300`}>
      
      {/* MENU LATERAL */}
      <div className={`fixed inset-y-0 left-0 w-72 ${bgMenu} z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-500 p-8`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="font-black italic text-xl">MENU</h2>
          <button onClick={() => setIsMenuOpen(false)} className="text-2xl">✕</button>
        </div>
        <div className="space-y-4">
          <button onClick={() => {setAba('DASHBOARD'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-gray-500/20 italic">📊 Dashboard Casal</button>
          <button onClick={() => {setAba('CELIO'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-gray-500/20 italic text-blue-500">💼 Espaço Célio</button>
          <button onClick={() => {setAba('BRENDA'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-gray-500/20 italic text-pink-500">🌸 Espaço Brenda</button>
          <button onClick={() => {setAba('CONFIG'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-gray-500/20 italic">⚙️ Configurações</button>
          
          <button onClick={alternarTema} className="mt-8 flex items-center gap-2 font-black text-xs uppercase tracking-widest text-purple-500">
            {isDark ? '☀️ Mudar para Claro' : '🌙 Mudar para Escuro'}
          </button>
        </div>
      </div>

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center max-w-md mx-auto">
        <button onClick={() => setIsMenuOpen(true)} className={`text-2xl p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>☰</button>
        <div className="text-right">
           <span className={`block text-[10px] font-black uppercase ${textMuted}`}>Olá, Casal</span>
           <span className="text-xs font-bold text-purple-500 italic">Célio & Brenda</span>
        </div>
        <div onClick={() => fileInputRef.current.click()} className="w-12 h-12 rounded-full border-2 border-purple-600 overflow-hidden cursor-pointer shadow-lg shadow-purple-500/20">
           <img src={fotoUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
           <input type="file" ref={fileInputRef} onChange={async (e) => {
             const file = e.target.files[0];
             if (file) { await supabase.storage.from('perfis').upload('casal.png', file, { upsert: true }); carregarDados(); }
           }} className="hidden" />
        </div>
      </header>

      {/* DASHBOARD PRINCIPAL */}
      <main className="max-w-md mx-auto px-6 pb-32">
        {aba === 'DASHBOARD' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-purple-800 via-indigo-900 to-black p-8 rounded-[3rem] shadow-2xl mb-10 text-white relative overflow-hidden">
              <p className="text-[10px] font-black opacity-60 uppercase mb-1">Conta Conjunta</p>
              <h1 className="text-5xl font-black tracking-tighter">R$ {saldoAtualCasal.toLocaleString('pt-BR')}</h1>
            </div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${textMuted}`}>Histórico do Casal</h3>
            <div className="space-y-3">
              {gastosCasal.map(i => (
                <div key={i.id} className={`p-4 rounded-[1.5rem] border flex justify-between items-center ${bgCard}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${i.tipo === 'entrada' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-bold text-sm">{i.descricao}</p>
                      <p className={`text-[9px] font-black uppercase ${textMuted}`}>{i.usuario} • {i.forma_pagamento}</p>
                    </div>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                    {i.tipo === 'entrada' ? '+' : '-'} R$ {Number(i.valor).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ESPAÇO CÉLIO */}
        {aba === 'CELIO' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-blue-600 text-white p-8 rounded-[3rem] shadow-xl text-center">
               <h2 className="font-black text-2xl uppercase italic">Gasto Pessoal Célio</h2>
               <p className="text-xs opacity-70 mt-2">Valores aqui não afetam o painel do casal.</p>
               <h1 className="text-4xl font-black mt-4">R$ {saldoCelio.toLocaleString('pt-BR')}</h1>
            </div>
            {gastosCelio.map(i => (
                <div key={i.id} className={`p-4 rounded-[1.5rem] border flex justify-between items-center ${bgCard}`}>
                  <p className="font-bold text-sm">{i.descricao}</p>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>R$ {Number(i.valor).toFixed(2)}</p>
                </div>
            ))}
          </div>
        )}

        {/* ESPAÇO BRENDA & CICLO */}
        {aba === 'BRENDA' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="bg-pink-600 text-white p-8 rounded-[3rem] shadow-xl text-center">
               <h2 className="font-black text-2xl uppercase italic">Gasto Pessoal Brenda</h2>
               <p className="text-xs opacity-70 mt-2">Carteira privada (não afeta o painel geral).</p>
               <h1 className="text-4xl font-black mt-4">R$ {saldoBrenda.toLocaleString('pt-BR')}</h1>
            </div>
            
            {/* O NOVO MOTOR DO CICLO MENSTRUAL */}
            <div className={`p-6 rounded-[2rem] border ${bgCard}`}>
               <h3 className="font-black text-xl text-pink-500 italic uppercase mb-6 flex justify-between items-center">
                  <span>🌸 Ciclo Menstrual</span>
                  <span className="text-[10px] bg-pink-500/20 px-3 py-1 rounded-full">{diasParaProxima} dias para a próxima</span>
               </h3>
               
               <div className="mb-8 text-center bg-black/5 p-4 rounded-2xl">
                  <p className={`text-2xl font-black uppercase ${corFase}`}>{faseAtual}</p>
                  <p className={`text-[10px] font-black uppercase mt-1 ${textMuted}`}>Fase Atual do Ciclo</p>
               </div>

               <form onSubmit={salvarCiclo} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-[9px] font-black uppercase mb-1 block ${textMuted}`}>Última Menstruação</label>
                      <input type="date" value={ciclo.data_inicio} onChange={e => setCiclo({...ciclo, data_inicio: e.target.value})} className={`w-full p-3 rounded-xl border outline-none font-bold text-xs ${inputClass}`} />
                    </div>
                    <div>
                      <label className={`text-[9px] font-black uppercase mb-1 block ${textMuted}`}>Duração do Ciclo</label>
                      <input type="number" placeholder="Ex: 28" value={ciclo.duracao} onChange={e => setCiclo({...ciclo, duracao: e.target.value})} className={`w-full p-3 rounded-xl border outline-none font-bold text-xs ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-[9px] font-black uppercase mb-1 block ${textMuted}`}>Idade</label>
                      <input type="number" value={ciclo.idade} onChange={e => setCiclo({...ciclo, idade: e.target.value})} className={`w-full p-3 rounded-xl border outline-none font-bold text-xs ${inputClass}`} />
                    </div>
                    <div>
                      <label
