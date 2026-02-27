import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tema, setTema] = useState('dark');
  const [aba, setAba] = useState('DASHBOARD');
  const [lancamentos, setLancamentos] = useState([]);
  const [metas, setMetas] = useState([]);
  const [config, setConfig] = useState({ saldo_inicial: 0 });
  const [form, setForm] = useState({ titulo: '', valor: '', data: '', tipo: 'despesa' });

  const carregarTudo = async () => {
    const { data: f } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    const { data: m } = await supabase.from('planejamentos').select('*');
    const { data: c } = await supabase.from('configuracoes').select('*').single();
    if (f) setLancamentos(f);
    if (m) setMetas(m);
    if (c) { setConfig(c); setTema(c.tema); }
  };

  useEffect(() => { carregarTudo(); }, []);

  const totalGastos = lancamentos.reduce((acc, i) => i.tipo === 'despesa' ? acc + Number(i.valor) : acc, 0);
  const totalEntradas = lancamentos.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc, 0);
  const saldoAtual = Number(config.saldo_inicial) + totalEntradas - totalGastos;

  const bgClass = tema === 'dark' ? 'bg-[#0a0b0e] text-white' : 'bg-slate-50 text-slate-900';
  const cardClass = tema === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div className={`max-w-md mx-auto min-h-screen transition-colors duration-500 ${bgClass} font-sans relative overflow-hidden`}>
      
      {/* MENU LATERAL OCULTO */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 shadow-2xl p-6`}>
        <button onClick={() => setIsMenuOpen(false)} className="absolute top-6 right-6 text-2xl">✕</button>
        <div className="mt-12 space-y-6">
          <h3 className="text-xs font-black opacity-30 tracking-widest uppercase text-white">Menu Principal</h3>
          <button onClick={() => {setAba('DASHBOARD'); setIsMenuOpen(false)}} className="block w-full text-left font-bold text-lg text-white">🏠 Dashboard</button>
          <button onClick={() => {setAba('OBJETIVOS'); setIsMenuOpen(false)}} className="block w-full text-left font-bold text-lg text-white">🎯 Metas de Vida</button>
          <button onClick={() => {setAba('PERFIL'); setIsMenuOpen(false)}} className="block w-full text-left font-bold text-lg text-white">👤 Perfil do Casal</button>
          <div className="pt-6 border-t border-white/10">
            <button onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} className="text-xs font-bold text-blue-400">🌗 MUDAR PARA MODO {tema === 'dark' ? 'CLARO' : 'ESCURO'}</button>
          </div>
        </div>
      </div>

      {/* HEADER FIXO */}
      <header className="p-6 flex justify-between items-center">
        <button onClick={() => setIsMenuOpen(true)} className="text-2xl font-bold">☰</button>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Olá, Casal Célio & Brenda</span>
           <div className="w-10 h-10 rounded-full border-2 border-purple-500 bg-slate-800 overflow-hidden mt-1">
              {/* Foto única do casal vira aqui */}
              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">CB</div>
           </div>
        </div>
      </header>

      {/* CONTEÚDO CENTRAL (DASH) */}
      <main className="px-6 pb-24">
        {aba === 'DASHBOARD' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className={`p-8 rounded-[3rem] border ${cardClass} mb-8 text-center relative overflow-hidden`}>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
              <p className="text-[10px] font-black opacity-50 uppercase tracking-tighter mb-2 italic">Saúde Financeira Atual</p>
              <h1 className="text-5xl font-black tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
              <p className="text-[9px] mt-4 opacity-40 uppercase font-bold tracking-widest">Ponto Zero: R$ {config.saldo_inicial}</p>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Fluxo de Caixa</h3>
               {lancamentos.slice(0, 5).map(i => (
                 <div key={i.id} className={`p-5 rounded-3xl border ${cardClass} flex justify-between items-center`}>
                    <div className="flex items-center gap-4">
                       <span className={`text-xl ${i.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>{i.tipo === 'entrada' ? '●' : '○'}</span>
                       <div>
                          <p className="font-bold text-sm">{i.descricao}</p>
                          <p className="text-[9px] opacity-40 uppercase font-bold">{i.usuario}</p>
                       </div>
                    </div>
                    <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>R$ {Number(i.valor).toFixed(2)}</p>
                 </div>
               ))}
            </div>
          </div>
        )}

        {aba === 'PERFIL' && (
          <div className="p-6 rounded-3xl border border-white/10 bg-white/5 space-y-6">
             <h3 className="font-black text-xl italic uppercase">Configurações de Casal</h3>
             <div>
                <label className="text-[10px] font-black opacity-40 uppercase">Saldo Inicial (Ponto 0)</label>
                <input type="number" className="w-full bg-black/20 p-4 rounded-xl mt-1 border border-white/10 outline-none font-bold" 
                  value={config.saldo_inicial} onChange={e => setConfig({...config, saldo_inicial: e.target.value})} />
                <button onClick={async () => await supabase.from('configuracoes').upsert({id: 1, saldo_inicial: config.saldo_inicial})} className="mt-2 text-[10px] font-black text-green-400 uppercase tracking-widest">💾 Salvar Ponto Zero</button>
             </div>
          </div>
        )}
      </main>

      {/* BOTÃO FLUTUANTE DE LANÇAMENTO */}
      <button className="fixed bottom-8 right-8 w-16 h-16 bg-white text-black rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform z-40">
        +
      </button>

    </div>
  );
}

export default App;
