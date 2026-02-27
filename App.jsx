import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('GERAL');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('gasto'); // 'gasto', 'renda' ou 'meta'
  const [lancamentos, setLancamentos] = useState([]);
  const [rendas, setRendas] = useState([]);
  const [metas, setMetas] = useState([]);
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', data: '' });
  
  const [urlFotoCelio, setUrlFotoCelio] = useState("https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png");
  const [urlFotoBrenda, setUrlFotoBrenda] = useState("https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png");

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesIdx, setMesIdx] = useState(new Date().getMonth());
  const mesAtual = meses[mesIdx];

  const carregarDados = async () => {
    const { data: f } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    const { data: r } = await supabase.from('rendas').select('*');
    const { data: m } = await supabase.from('planejamentos').select('*').order('data', { ascending: true });
    if (f) setLancamentos(f);
    if (r) setRendas(r);
    if (m) setMetas(m);
  };

  useEffect(() => {
    carregarDados();
    const timer = setInterval(carregarDados, 10000);
    return () => clearInterval(timer);
  }, []);

  const salvarGeral = async (e) => {
    e.preventDefault();
    const v = parseFloat(String(form.valor).replace(',', '.'));
    
    if (modalType === 'gasto') {
      await supabase.from('fluxo').insert([{ descricao: form.descricao, valor: v, tipo: form.tipo, usuario: form.usuario, mes: mesAtual }]);
    } else if (modalType === 'renda') {
      await supabase.from('rendas').upsert([{ usuario: form.usuario, valor: v }], { onConflict: 'usuario' });
    } else if (modalType === 'meta') {
      await supabase.from('planejamentos').insert([{ titulo: form.descricao, valor: v, data: form.data }]);
    }

    setForm({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', data: '' });
    setShowModal(false);
    carregarDados();
  };

  // Cálculos de Saúde Financeira
  const filtroMes = lancamentos.filter(i => i.mes === mesAtual);
  const totalRendas = rendas.reduce((acc, i) => acc + Number(i.valor), 0);
  const totalGastosMes = filtroMes.filter(i => i.tipo === 'despesa').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalMetas = metas.reduce((acc, i) => acc + Number(i.valor), 0);
  const saldoReal = totalRendas - totalGastosMes;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0b0e] text-white p-6 font-sans">
      
      {/* DASHBOARD - SAÚDE FINANCEIRA */}
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex -space-x-3">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-slate-800 overflow-hidden"><img src={urlFotoCelio} className="object-cover h-full w-full"/></div>
            <div className="w-12 h-12 rounded-full border-2 border-pink-500 bg-slate-800 overflow-hidden"><img src={urlFotoBrenda} className="object-cover h-full w-full"/></div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{mesAtual}</p>
            <h2 className="text-lg font-black text-purple-400">FINANÇAS CB</h2>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-[2rem] border border-white/10 shadow-2xl">
          <p className="text-[10px] font-bold opacity-50 mb-1">SAÚDE FINANCEIRA (DISPONÍVEL)</p>
          <h1 className={`text-4xl font-black ${saldoReal < 500 ? 'text-orange-400' : 'text-green-400'}`}>
            R$ {saldoReal.toLocaleString('pt-BR')}
          </h1>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5">
            <div>
              <p className="text-[8px] opacity-40 uppercase">Renda Fixa</p>
              <p className="text-xs font-bold text-blue-400">R$ {totalRendas.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[8px] opacity-40 uppercase">Metas/Viagens</p>
              <p className="text-xs font-bold text-yellow-400">R$ {totalMetas.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ABAS PRINCIPAIS */}
      <nav className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl border border-white/5">
        {['GERAL', 'CÉLIO', 'BRENDA'].map(t => (
          <button key={t} onClick={() => setAba(t)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${aba === t ? 'bg-white text-black shadow-lg' : 'text-white/30'}`}>
            {t}
          </button>
        ))}
      </nav>

      <main className="space-y-6 pb-24">
        {aba === 'BRENDA' && (
          <section className="animate-in fade-in slide-in-from-top-4">
            <div className="bg-pink-600/10 border border-pink-500/20 p-6 rounded-3xl mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-pink-400 font-black text-xs uppercase tracking-widest">🌸 Ciclo Menstrual</h3>
                <span className="bg-pink-500 text-[8px] px-2 py-1 rounded-full font-bold">FASE FOLICULAR</span>
              </div>
              <div className="flex gap-2">
                {[1,2,3,4,5,6,7].map(d => <div key={d} className={`flex-1 h-1 rounded-full ${d < 4 ? 'bg-pink-500' : 'bg-white/10'}`}></div>)}
              </div>
              <p className="text-[10px] mt-4 opacity-60 italic text-center">Faltam 12 dias para o próximo ciclo.</p>
            </div>
          </section>
        )}

        {/* SEÇÃO DE PLANEJAMENTOS (METAS) - APARECE NA GERAL */}
        {aba === 'GERAL' && metas.length > 0 && (
          <section>
            <p className="text-[10px] font-black opacity-30 mb-3 uppercase tracking-widest">Próximos Sonhos ✈️</p>
            {metas.map(m => (
              <div key={m.id} className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex justify-between items-center mb-2">
                <div>
                  <p className="font-bold text-xs">{m.titulo}</p>
                  <p className="text-[8px] opacity-50 uppercase">{new Date(m.data).toLocaleDateString('pt-BR')}</p>
                </div>
                <p className="font-black text-yellow-500 text-xs">R$ {Number(m.valor).toFixed(2)}</p>
              </div>
            ))}
          </section>
        )}

        {/* LISTA DE GASTOS */}
        <section>
          <p className="text-[10px] font-black opacity-30 mb-3 uppercase tracking-widest">Extrato de {aba}</p>
          <div className="space-y-3">
            {filtroMes
              .filter(i => aba === 'GERAL' ? true : i.usuario.toUpperCase() === aba)
              .map(i => (
                <div key={i.id} className="bg-white/[0.03] p-4 rounded-2xl flex justify-between items-center border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${i.tipo === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {i.tipo === 'entrada' ? '💰' : '💸'}
                    </div>
                    <div>
                      <p className="font-bold text-xs">{i.descricao}</p>
                      <p className="text-[8px] opacity-30 uppercase">{i.usuario} • {i.data_formatada}</p>
                    </div>
                  </div>
                  <p className={`font-black text-xs ${i.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                    R$ {Number(i.valor).toFixed(2)}
                  </p>
                </div>
              ))}
          </div>
        </section>
      </main>

      {/* BOTÕES DE AÇÃO RÁPIDA */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button onClick={() => { setModalType('renda'); setShowModal(true); }} className="bg-blue-600 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-lg border-2 border-black">💵</button>
        <button onClick={() => { setModalType('meta'); setShowModal(true); }} className="bg-yellow-500 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-lg border-2 border-black">✈️</button>
        <button onClick={() => { setModalType('gasto'); setShowModal(true); }} className="bg-pink-500 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-2xl font-bold border-4 border-black">+</button>
      </div>

      {/* MODAL MULTIFUNÇÃO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-[#1a1b1f] rounded-[3rem] p-8 pb-12 border-t border-white/10">
            <h3 className="text-white font-black text-lg mb-6 uppercase italic">
              {modalType === 'gasto' ? 'Novo Lançamento' : (modalType === 'renda' ? 'Configurar Renda' : 'Planejar Meta')}
            </h3>
            <form onSubmit={salvarGeral} className="space-y-4">
              {modalType !== 'meta' && (
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                  {['Célio', 'Brenda'].map(u => (
                    <button key={u} type="button" onClick={() => setForm({...form, usuario: u})}
                      className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${form.usuario === u ? 'bg-white text-black' : 'text-white/30'}`}>
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              <input type="text" placeholder={modalType === 'meta' ? "Ex: Viagem Março" : "Descrição"} className="w-full p-4 bg-white/5 rounded-2xl text-white outline-none border border-white/10" 
                value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
              <input type="number" placeholder="R$ 0,00" className="w-full p-4 bg-white/5 rounded-2xl text-white font-black text-xl outline-none border border-white/10"
                value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
              {modalType === 'meta' && (
                <input type="date" className="w-full p-4 bg-white/5 rounded-2xl text-white outline-none border border-white/10"
                  value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-xs opacity-50">CANCELAR</button>
                <button type="submit" className="flex-[2] bg-white text-black py-4 rounded-2xl font-black text-xs uppercase shadow-xl">SALVAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
