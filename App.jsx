import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('GERAL');
  const [showModal, setShowModal] = useState(false);
  const [lancamentos, setLancamentos] = useState([]);
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio' });
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  
  // URLs padrões caso não tenha foto
  const fotoPadrao = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
  const [urlFotoCelio, setUrlFotoCelio] = useState(fotoPadrao);
  const [urlFotoBrenda, setUrlFotoBrenda] = useState(fotoPadrao);

  const fileInputRef = useRef(null); // Referência para o input de arquivo escondido
  const [usuarioSelecionadoParaFoto, setUsuarioSelecionadoParaFoto] = useState(null);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesIdx, setMesIdx] = useState(new Date().getMonth());
  const mesAtual = meses[mesIdx];

  // Função para buscar as fotos do Storage
  const carregarFotosPerfil = async () => {
    // Busca foto do Célio
    const { data: dataCelio } = supabase.storage.from('perfis').getPublicUrl('celio.png');
    if (dataCelio) setUrlFotoCelio(`${dataCelio.publicUrl}?t=${new Date().getTime()}`); // Cache bust

    // Busca foto da Brenda
    const { data: dataBrenda } = supabase.storage.from('perfis').getPublicUrl('brenda.png');
    if (dataBrenda) setUrlFotoBrenda(`${dataBrenda.publicUrl}?t=${new Date().getTime()}`); // Cache bust
  };

  // Função para lidar com o upload da foto
  const handleUploadFoto = async (event) => {
    const file = event.target.files[0];
    if (!file || !usuarioSelecionadoParaFoto) return;

    setCarregandoFoto(true);
    const nomeArquivo = usuarioSelecionadoParaFoto.toLowerCase() === 'célio' ? 'celio.png' : 'brenda.png';

    // 1. Faz o upload para o Bucket 'perfis'
    // Usamos 'upsert: true' para sobrescrever a foto antiga
    const { error } = await supabase.storage
      .from('perfis')
      .upload(nomeArquivo, file, { upsert: true });

    if (error) {
      alert("Erro ao subir foto: " + error.message);
    } else {
      // 2. Atualiza a URL na tela
      await carregarFotosPerfil();
    }

    setCarregandoFoto(false);
    setUsuarioSelecionadoParaFoto(null); // Limpa seleção
  };

  // Função para iniciar o processo de troca de foto
  const iniciarTrocaFoto = (usuario) => {
    if(confirm(`Alterar a foto de perfil de ${usuario}?`)){
      setUsuarioSelecionadoParaFoto(usuario);
      fileInputRef.current.click(); // Clica no input escondido
    }
  };

  const carregar = async () => {
    const { data } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    if (data) setLancamentos(data);
  };

  useEffect(() => {
    carregar();
    carregarFotosPerfil(); // Carrega as fotos ao abrir o app
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

    if (!error) { 
      setForm({ ...form, descricao: '', valor: '' }); 
      setShowModal(false);
      carregar(); 
    }
  };

  // Lógica de Saldos
  const filtroMes = lancamentos.filter(i => i.mes === mesAtual);
  const saldoGeral = filtroMes.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);
  const totalEntradas = filtroMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalSaidas = filtroMes.filter(i => i.tipo === 'despesa').reduce((acc, i) => acc + Number(i.valor), 0);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#0f1014] text-white p-6 font-sans selection:bg-pink-500">
      
      {/* INPUT DE ARQUIVO ESCONDIDO */}
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUploadFoto} className="hidden" />

      {/* HEADER PERSONALIZADO COM FOTOS CLICÁVEIS */}
      <header className="flex justify-between items-center py-4 mb-2">
        <div className="flex -space-x-3 relative">
          {carregandoFoto && (
            <div className="absolute inset-0 bg-black/50 rounded-full z-10 flex items-center justify-center text-[8px] animate-pulse">🆙</div>
          )}
          {/* Foto do Célio */}
          <button onClick={() => iniciarTrocaFoto('Célio')} className="w-14 h-14 rounded-full border-2 border-blue-500 overflow-hidden bg-slate-800 flex items-center justify-center group relative">
            <img src={urlFotoCelio} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Célio" />
            <span className="absolute text-[8px] font-bold opacity-0 group-hover:opacity-100 uppercase">Alterar</span>
          </button>
          {/* Foto da Brenda */}
          <button onClick={() => iniciarTrocaFoto('Brenda')} className="w-14 h-14 rounded-full border-2 border-pink-500 overflow-hidden bg-slate-800 flex items-center justify-center group relative">
            <img src={urlFotoBrenda} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Brenda" />
            <span className="absolute text-[8px] font-bold opacity-0 group-hover:opacity-100 uppercase">Alterar</span>
          </button>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{mesAtual}</p>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setMesIdx(mesIdx > 0 ? mesIdx - 1 : 11)}>❮</button>
            <button onClick={() => setMesIdx(mesIdx < 11 ? mesIdx + 1 : 0)}>❯</button>
          </div>
        </div>
      </header>

      {/* CARD DE SALDO ESTILO "CARTÃO DE CRÉDITO" */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 rounded-[2.5rem] shadow-2xl shadow-purple-500/20 mb-8 mt-4">
        <p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-widest">Saldo Total do Casal</p>
        <h1 className="text-4xl font-black tracking-tighter">R$ {saldoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
        <div className="flex justify-between mt-6 pt-4 border-t border-white/20 text-[10px] font-black uppercase tracking-widest">
          <div className="text-green-300">Entradas: R$ {totalEntradas.toFixed(2)}</div>
          <div className="text-red-200 font-bold underline decoration-pink-500 decoration-2">Saídas: R$ {totalSaidas.toFixed(2)}</div>
        </div>
      </div>

      {/* NAV DE ABAS COM ESTILO MODERNO */}
      <nav className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-[1.5rem] backdrop-blur-md border border-white/5 relative z-20">
        {['GERAL', 'CÉLIO', 'BRENDA', 'CICLO'].map(t => (
          <button key={t} onClick={() => setAba(t)}
            className={`flex-1 py-2.5 rounded-xl text-[9px] font-black transition-all duration-300 ${aba === t ? 'bg-white text-black shadow-lg scale-105' : 'text-white/40 hover:text-white/70'}`}>
            {t}
          </button>
        ))}
      </nav>

      {/* CONTEÚDO DAS ABAS */}
      <div className="flex-1 overflow-y-auto pr-1">
        {aba === 'CICLO' ? (
          <div className="bg-pink-500/10 p-10 rounded-[3rem] border border-pink-500/20 text-center animate-pulse">
            <span className="text-5xl">💝</span>
            <h2 className="mt-4 font-black text-pink-400 text-lg uppercase">Espaço Brenda</h2>
            <p className="text-[10px] opacity-60 mt-2 uppercase font-bold tracking-widest leading-loose">Monitoramento do ciclo menstrual vindo aí...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">Lançamentos Recentes</p>
            {filtroMes
              .filter(i => aba === 'GERAL' ? true : i.usuario.toUpperCase() === aba)
              .map(i => (
                <div key={i.id} className="group bg-white/[0.03] hover:bg-white/[0.08] p-5 rounded-[2rem] flex justify-between items-center border border-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${i.tipo === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {i.tipo === 'entrada' ? '↗' : '↘'}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white/90">{i.descricao}</p>
                      <p className={`text-[9px] font-black uppercase ${i.usuario === 'Célio' ? 'text-blue-400' : 'text-pink-400'}`}>{i.usuario} • {i.data_formatada}</p>
                    </div>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                    {i.tipo === 'entrada' ? '+' : '-'} R$ {Number(i.valor).toFixed(2)}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* BOTÃO FLUTUANTE (POP-UP) */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full shadow-2xl shadow-pink-500/40 flex items-center justify-center text-2xl font-bold hover:scale-110 active:scale-95 transition-all z-40 border-4 border-[#0f1014]">
        +
      </button>

      {/* MODAL (POP-UP) DO FORMULÁRIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-8 pb-10 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-black font-black text-xl uppercase tracking-tighter italic">Novo Registro</h3>
              <button onClick={() => setShowModal(false)} className="text-black/20 text-2xl font-black">✕</button>
            </div>
            
            <form onSubmit={salvar} className="space-y-4">
              <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-[1.5rem]">
                {['Célio', 'Brenda'].map(u => (
                  <button key={u} type="button" onClick={() => setForm({...form, usuario: u})}
                    className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${form.usuario === u ? (u === 'Célio' ? 'bg-blue-600 text-white shadow-lg' : 'bg-pink-500 text-white shadow-lg') : 'text-slate-400'}`}>
                    {u.toUpperCase()}
                  </button>
                ))}
              </div>

              <input type="text" placeholder="No que você gastou?" className="w-full p-5 bg-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 outline-none focus:ring-2 ring-purple-500" 
                value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
              
              <div className="flex gap-3">
                <input type="text" inputMode="decimal" placeholder="R$ 0,00" className="w-3/5 p-5 bg-slate-100 rounded-2xl font-black text-xl text-slate-900 outline-none"
                  value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
                <select className="w-2/5 p-5 bg-slate-100 rounded-2xl font-black text-[10px] text-slate-900 outline-none uppercase"
                  value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option value="despesa">Saída 💸</option>
                  <option value="entrada">Entrada 💰</option>
                </select>
              </div>

              <button type="submit" className="w-full mt-6 bg-black text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:opacity-90 active:scale-95 transition-all">
                Salvar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
