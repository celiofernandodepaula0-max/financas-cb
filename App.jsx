import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('GERAL');
  const [lancamentos, setLancamentos] = useState([]);
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio' });
  
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesIdx, setMesIdx] = useState(new Date().getMonth());
  const mesAtual = meses[mesIdx];

  const carregar = async () => {
    const { data } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    if (data) setLancamentos(data);
  };

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 5000);
    return () => clearInterval(timer);
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor) return;
    const valorNumerico = parseFloat(String(form.valor).replace(',', '.'));
    
    const { error } = await supabase.from('fluxo').insert([{
      descricao: form.descricao,
      valor: valorNumerico,
      tipo: form.tipo,
      usuario: form.usuario,
      mes: mesAtual,
      data_formatada: new Date().toLocaleDateString('pt-BR')
    }]);

    if (!error) { setForm({ ...form, descricao: '', valor: '' }); carregar(); }
  };

  // Cálculos por aba
  const saldoGeral = lancamentos.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);
  const gastosCelio = lancamentos.filter(i => i.usuario === 'Célio' && i.tipo === 'despesa').reduce((acc, i) => acc + Number(i.valor), 0);
  const gastosBrenda = lancamentos.filter(i => i.usuario === 'Brenda' && i.tipo === 'despesa').reduce((acc, i) => acc + Number(i.valor), 0);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-900 text-white p-4 font-sans">
      
      {/* HEADER DINÂMICO */}
      <header className="py-6 text-center">
        <div className="flex justify-between items-center mb-4 px-2 text-[10px] font-bold opacity-50 uppercase tracking-widest">
          <button onClick={() => setMesIdx(mesIdx > 0 ? mesIdx - 1 : 11)}>❮</button>
          <span className="bg-slate-800 px-4 py-1 rounded-full">{mesAtual}</span>
          <button onClick={() => setMesIdx(mesIdx < 11 ? mesIdx + 1 : 0)}>❯</button>
        </div>
        
        <p className="text-[10px] font-black opacity-40 mb-1 uppercase tracking-tighter">{aba}</p>
        <h1 className={`text-5xl font-black tracking-tighter ${saldoGeral >= 0 ? 'text-green-400' : 'text-red-500'}`}>
          R$ {aba === 'GERAL' ? saldoGeral.toFixed(2) : (aba === 'CÉLIO' ? gastosCelio.toFixed(2) : gastosBrenda.toFixed(2))}
        </h1>
      </header>

      {/* NAVEGAÇÃO ENTRE ABAS */}
      <nav className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-2xl">
        {['GERAL', 'CÉLIO', 'BRENDA', 'CICLO'].map(t => (
          <button key={t} onClick={() => setAba(t)}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${aba === t ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500'}`}>
            {t}
          </button>
        ))}
      </nav>

      {aba === 'CICLO' ? (
        <div className="bg-pink-900/20 p-8 rounded-[2.5rem] border border-pink-500/20 text-center">
          <span className="text-4xl">🌸</span>
          <h2 className="mt-4 font-black text-pink-400">ESPAÇO DA BRENDA</h2>
          <p className="text-xs opacity-50 mt-2">Calendário menstrual em desenvolvimento...</p>
        </div>
      ) : (
        <>
          {/* FORMULÁRIO */}
          <form onSubmit={salvar} className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8">
            <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-2xl">
              {['Célio', 'Brenda'].map(u => (
                <button key={u} type="button" onClick={() => setForm({...form, usuario: u})}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] ${form.usuario === u ? (u === 'Célio' ? 'bg-blue-600 text-white' : 'bg-pink-500 text-white') : 'text-slate-400'}`}>
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Descrição" className="w-full p-4 mb-3 bg-slate-50 rounded-2xl text-slate-900 outline-none" 
              value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
            <div className="flex gap-2">
              <input type="text" inputMode="decimal" placeholder="0,00" className="w-1/2 p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none"
                value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
              <select className="w-1/2 p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none"
                value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="despesa">GASTO 💸</option>
                <option value="entrada">GANHO 💰</option>
              </select>
            </div>
            <button type="submit" className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
              Lançar na conta de {form.usuario}
            </button>
          </form>

          {/* LISTA FILTRADA */}
          <div className="space-y-3 pb-10">
            {lancamentos
              .filter(i => i.mes === mesAtual)
              .filter(i => aba === 'GERAL' ? true : i.usuario.toUpperCase() === aba)
              .map(i => (
                <div key={i.id} className="bg-slate-800/40 p-4 rounded-2xl flex justify-between items-center border border-slate-700/30">
                  <div>
                    <p className="font-bold text-sm">{i.descricao}</p>
                    <p className="text-[9px] font-black opacity-30 uppercase">{i.usuario} • {i.data_formatada}</p>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                    {i.tipo === 'entrada' ? '+' : '-'} {Number(i.valor).toFixed(2)}
                  </p>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App
