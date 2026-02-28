import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('DASHBOARD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tema, setTema] = useState('dark');
  const [lancamentos, setLancamentos] = useState([]);
  const [config, setConfig] = useState({ saldo_inicial: 0, renda_fixa: 0 });
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista' });
  const [fotoUrl, setFotoUrl] = useState(null);
  const fileInputRef = useRef(null);

  const carregarDados = async () => {
    const { data: f } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabase.from('configuracoes').select('*').single();
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

  const subirFoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await supabase.storage.from('perfis').upload('casal.png', file, { upsert: true });
      carregarFotos();
    }
  };

  const totalGastos = lancamentos.reduce((acc, i) => i.tipo === 'despesa' ? acc + Number(i.valor) : acc, 0);
  const totalEntradas = lancamentos.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc, 0);
  const saldoAtual = Number(config.saldo_inicial) + totalEntradas - totalGastos;

  return (
    <div className={`min-h-screen ${tema === 'dark' ? 'bg-[#0a0b0e] text-white' : 'bg-white text-slate-900'} font-sans relative overflow-x-hidden`}>
      
      {/* MENU LATERAL */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#121418] z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-500 shadow-[20px_0_60px_rgba(0,0,0,0.5)] p-8`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="font-black italic text-xl">MENU</h2>
          <button onClick={() => setIsMenuOpen(false)} className="text-2xl">✕</button>
        </div>
        <nav className="space-y-6">
          <button onClick={() => {setAba('DASHBOARD'); setIsMenuOpen(false)}} className="block text-lg font-bold hover:text-purple-400 transition-colors">📊 Dashboard</button>
          <button onClick={() => {setAba('CONFIG'); setIsMenuOpen(false)}} className="block text-lg font-bold hover:text-purple-400 transition-colors">⚙️ Configurações</button>
          <button onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} className="mt-10 block text-[10px] font-black opacity-50 uppercase tracking-widest">Alternar Modo {tema === 'dark' ? 'Claro' : 'Escuro'}</button>
        </nav>
      </div>

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center max-w-md mx-auto">
        <button onClick={() => setIsMenuOpen(true)} className="text-2xl">☰</button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black opacity-40 uppercase text-right leading-none">Célio & Brenda</span>
          <div onClick={() => fileInputRef.current.click()} className="w-12 h-12 rounded-full border-2 border-purple-600 bg-slate-800 overflow-hidden cursor-pointer active:scale-90 transition-transform">
             <img src={fotoUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
             <input type="file" ref={fileInputRef} onChange={subirFoto} className="hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pb-32">
        {aba === 'DASHBOARD' ? (
          <div className="animate-in fade-in duration-700">
            <div className="bg-gradient-to-br from-purple-700 to-indigo-900 p-8 rounded-[3rem] shadow-2xl mb-10">
              <p className="text-[10px] font-black opacity-70 uppercase mb-2">Saúde Financeira do Casal</p>
              <h1 className="text-5xl font-black tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
              <div className="flex justify-between mt-6 text-[10px] font-bold opacity-80 uppercase pt-4 border-t border-white/20">
                <span>Renda: R$ {config.renda_fixa}</span>
                <span>Ponto 0: R$ {config.saldo_inicial}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest">Últimos Lançamentos</h3>
              {lancamentos.map(i => (
                <div key={i.id} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] flex justify-between items-center transition-all hover:bg-white/10">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${i.tipo === 'entrada' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <div>
                      <p className="font-bold text-sm">{i.descricao}</p>
                      <p className="text-[9px] opacity-40 font-bold uppercase">{i.usuario} • {i.forma_pagamento}</p>
                    </div>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>R$ {Number(i.valor).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 space-y-8">
            <h2 className="font-black text-2xl italic uppercase underline decoration-purple-500">Configurações</h2>
            <div>
              <label className="text-[10px] font-black opacity-50 uppercase mb-2 block">Saldo Inicial (Ponto 0)</label>
              <input type="number" value={config.saldo_inicial} onChange={e => setConfig({...config, saldo_inicial: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none font-bold text-xl border border-white/10" />
            </div>
            <div>
              <label className="text-[10px] font-black opacity-50 uppercase mb-2 block">Renda Mensal Fixa</label>
              <input type="number" value={config.renda_fixa} onChange={e => setConfig({...config, renda_fixa: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none font-bold text-xl border border-white/10" />
            </div>
            <button onClick={async () => await supabase.from('configuracoes').upsert({id: 1, ...config})} className="w-full bg-purple-600 py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-transform">Salvar Configurações</button>
          </div>
        )}
      </main>

      {/* BOTÃO "+" FUNCIONAL */}
      <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-white text-black rounded-full shadow-[0_15px_40px_rgba(255,255,255,0.2)] flex items-center justify-center text-2xl font-bold z-40 active:scale-90 transition-transform">
        +
      </button>

      {/* MODAL DE LANÇAMENTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#121418] p-8 rounded-[3rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-lg italic uppercase">Novo Lançamento</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl">✕</button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                {['Célio', 'Brenda'].map(u => (
                  <button key={u} type="button" onClick={() => setForm({...form, usuario: u})} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${form.usuario === u ? 'bg-white text-black' : 'opacity-30'}`}>{u.toUpperCase()}</button>
                ))}
              </div>
              <input type="text" placeholder="Descrição" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 font-bold" />
              <div className="flex gap-2">
                 <input type="number" placeholder="Valor" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="flex-[2] bg-white/5 p-4 rounded-2xl outline-none border border-white/10 font-black text-xl" />
                 <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="flex-1 bg-white/5 p-4 rounded-2xl outline-none border border-white/10 text-[10px] font-black uppercase">
                    <option value="despesa">💸 Gasto</option>
                    <option value="entrada">💰 Ganho</option>
                 </select>
              </div>
              <select value={form.forma} onChange={e => setForm({...form, forma: e.target.value})} className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/10 text-[10px] font-black uppercase">
                 <option value="À Vista">À Vista</option>
                 <option value="Cartão de Crédito">Cartão de Crédito</option>
              </select>
              <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase mt-6 shadow-xl">Confirmar Lançamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
