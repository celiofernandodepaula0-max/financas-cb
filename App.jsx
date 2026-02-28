import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('DASHBOARD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lancamentos, setLancamentos] = useState([]);
  const [config, setConfig] = useState({ saldo_inicial: 0, renda_fixa: 0 });
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista' });
  const [fotoUrl, setFotoUrl] = useState(null);
  const fileInputRef = useRef(null);

  const carregarDados = async () => {
    const { data: f } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabase.from('configuracoes').select('*').maybeSingle();
    if (f) setLancamentos(f);
    if (c) setConfig(c);
    
    const { data: img } = supabase.storage.from('perfis').getPublicUrl('casal.png');
    if (img) setFotoUrl(`${img.publicUrl}?t=${new Date().getTime()}`);
  };

  useEffect(() => { carregarDados(); }, []);

  const salvar = async (e) => {
    e.preventDefault();
    const v = parseFloat(String(form.valor).replace(',', '.'));
    await supabase.from('fluxo').insert([{ 
      descricao: form.descricao, valor: v, tipo: form.tipo, 
      usuario: form.usuario, forma_pagamento: form.forma,
      mes: new Intl.DateTimeFormat('pt-BR', {month: 'long'}).format(new Date()) 
    }]);
    setShowModal(false);
    setForm({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista' });
    carregarDados();
  };

  const totalGastos = lancamentos.reduce((acc, i) => i.tipo === 'despesa' ? acc + Number(i.valor) : acc, 0);
  const totalEntradas = lancamentos.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc, 0);
  const saldoAtual = Number(config.saldo_inicial) + totalEntradas - totalGastos;

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white font-sans overflow-x-hidden">
      
      {/* MENU LATERAL - AGORA PROFISSIONAL */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#121418] z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-500 p-8 border-r border-white/5`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="font-black italic text-xl">CONFIGURAÇÕES</h2>
          <button onClick={() => setIsMenuOpen(false)} className="text-2xl">✕</button>
        </div>
        <div className="space-y-6">
          <button onClick={() => {setAba('DASHBOARD'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-white/5 italic">📊 Dashboard</button>
          <button onClick={() => {setAba('CONFIG'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-white/5 italic">⚙️ Ajustar Ponto Zero</button>
          <button onClick={() => {setAba('BRENDA'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-white/5 italic text-pink-400">🌸 Ciclo da Brenda</button>
        </div>
      </div>

      {/* HEADER LIMPO */}
      <header className="p-6 flex justify-between items-center max-w-md mx-auto">
        <button onClick={() => setIsMenuOpen(true)} className="text-2xl p-2 bg-white/5 rounded-xl">☰</button>
        <div className="text-right">
           <span className="block text-[10px] font-black opacity-30 uppercase">Olá, Casal</span>
           <span className="text-xs font-bold text-purple-400 italic">Célio & Brenda</span>
        </div>
        <div onClick={() => fileInputRef.current.click()} className="w-12 h-12 rounded-full border-2 border-purple-600 bg-slate-800 overflow-hidden cursor-pointer">
           <img src={fotoUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
           <input type="file" ref={fileInputRef} onChange={async (e) => {
             const file = e.target.files[0];
             if (file) {
               await supabase.storage.from('perfis').upload('casal.png', file, { upsert: true });
               carregarDados();
             }
           }} className="hidden" />
        </div>
      </header>

      {/* DASH PRINCIPAL */}
      <main className="max-w-md mx-auto px-6 pb-32">
        {aba === 'DASHBOARD' ? (
          <div className="animate-in fade-in duration-700">
            <div className="bg-gradient-to-br from-purple-800 via-indigo-900 to-black p-8 rounded-[3rem] shadow-2xl mb-10 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl font-black italic">CB</div>
              <p className="text-[10px] font-black opacity-60 uppercase mb-1">Patrimônio Líquido</p>
              <h1 className="text-5xl font-black tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
              <div className="flex justify-between mt-6 pt-4 border-t border-white/10 text-[9px] font-black opacity-50 uppercase">
                 <span>Renda: R$ {config.renda_fixa}</span>
                 <span>Ponto 0: R$ {config.saldo_inicial}</span>
              </div>
            </div>

            <h3 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">Movimentações</h3>
            <div className="space-y-3">
              {lancamentos.map(i => (
                <div key={i.id} className="bg-white/[0.03] p-5 rounded-[2rem] flex justify-between items-center border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${i.tipo === 'entrada' ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{i.descricao}</p>
                      <p className="text-[8px] font-black opacity-30 uppercase">{i.usuario} • {i.forma_pagamento}</p>
                    </div>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                    {i.tipo === 'entrada' ? '+' : '-'} R$ {Number(i.valor).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : aba === 'CONFIG' ? (
          <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 space-y-6">
            <h2 className="font-black text-xl italic uppercase">Configurações Base</h2>
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase block mb-2">Seu Ponto Zero (Saldo hoje)</label>
              <input type="number" value={config.saldo_inicial} onChange={e => setConfig({...config, saldo_inicial: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none font-bold border border-white/10 text-xl" />
            </div>
            <div>
              <label className="text-[10px] font-black opacity-40 uppercase block mb-2">Renda Mensal do Casal</label>
              <input type="number" value={config.renda_fixa} onChange={e => setConfig({...config, renda_fixa: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none font-bold border border-white/10 text-xl" />
            </div>
            <button onClick={async () => await supabase.from('configuracoes').upsert({id: 1, ...config})} className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-95 transition-transform">💾 Salvar Alterações</button>
          </div>
        ) : (
          <div className="p-10 bg-pink-500/10 rounded-[3rem] border border-pink-500/20 text-center animate-pulse">
            <span className="text-4xl">🌸</span>
            <h2 className="mt-4 font-black text-pink-400 text-lg uppercase italic">Espaço Brenda</h2>
            <p className="text-[10px] opacity-40 mt-2 uppercase font-black tracking-widest leading-loose">Monitorando saúde e ciclo vindo aí...</p>
          </div>
        )}
      </main>

      {/* BOTÃO + FLUTUANTE CENTRALIZADO */}
      <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-white text-black rounded-full shadow-[0_20px_50px_rgba(255,255,255,0.3)] flex items-center justify-center text-3xl font-bold z-40 active:scale-90 transition-transform">
        +
      </button>

      {/* MODAL DE LANÇAMENTO (POP-UP) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#121418] p-8 rounded-[3.5rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-lg italic uppercase tracking-tighter">Novo Lançamento</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl opacity-20 hover:opacity-100 transition-opacity">✕</button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                {['Célio', 'Brenda'].map(u => (
                  <button key={u} type="button" onClick={() => setForm({...form, usuario: u})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${form.usuario === u ? 'bg-white text-black shadow-lg' : 'opacity-20'}`}>{u.toUpperCase()}</button>
                ))}
              </div>
              <input type="text" placeholder="O que foi?" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/5 font-bold" />
              <div className="flex gap-2">
                 <input type="number" placeholder="Valor" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="flex-[2] bg-white/5 p-4 rounded-2xl outline-none border border-white/5 font-black text-2xl" />
                 <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="flex-1 bg-white/5 p-4 rounded-2xl outline-none border border-white/5 text-[10px] font-black uppercase">
                    <option value="despesa">💸 Saída</option>
                    <option value="entrada">💰 Entrada</option>
                 </select>
              </div>
              <select value={form.forma} onChange={e => setForm({...form, forma: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/5 text-[10px] font-black uppercase">
                 <option value="À Vista">💵 À Vista</option>
                 <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
              </select>
              <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase mt-6 shadow-xl hover:scale-[0.98] transition-all">Lançar no Fluxo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
