import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('DASHBOARD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Memória do Celular (Performance)
  const [tema, setTema] = useState(() => localStorage.getItem('@financasCB:tema') || 'dark');
  const [fotoUrl, setFotoUrl] = useState(() => localStorage.getItem('@financasCB:foto') || null);
  
  const [lancamentos, setLancamentos] = useState(() => {
    const salvo = localStorage.getItem('@financasCB:lancamentos');
    return salvo ? JSON.parse(salvo) : [];
  });
  
  const [config, setConfig] = useState(() => {
    const salvo = localStorage.getItem('@financasCB:config');
    return salvo ? JSON.parse(salvo) : { saldo_inicial: 0, data_inicio: '' };
  });
  
  const [ciclo, setCiclo] = useState(() => {
    const salvo = localStorage.getItem('@financasCB:ciclo');
    return salvo ? JSON.parse(salvo) : { data_inicio: '', duracao: 28 };
  });

  // NOVO: Navegação de Meses
  const [dataFiltro, setDataFiltro] = useState(new Date()); 
  
  const [editingEntryId, setEditingEntryId] = useState(null);
  
  // NOVO: Campo 'data' adicionado ao formulário (padrão é hoje)
  const dataHoje = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal', previsibilidade: 'Variável', data: dataHoje });
  
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const fileInputRef = useRef(null);

  const carregarDados = async () => {
    const { data: f } = await supabase.from('fluxo').select('*').order('data_lancamento', { ascending: false }).order('created_at', { ascending: false });
    const { data: c } = await supabase.from('configuracoes').select('*').maybeSingle();
    const { data: cb } = await supabase.from('ciclo_brenda').select('*').maybeSingle();
    
    if (f) { setLancamentos(f); localStorage.setItem('@financasCB:lancamentos', JSON.stringify(f)); }
    if (c) { 
      setConfig(c); localStorage.setItem('@financasCB:config', JSON.stringify(c));
      const temaBanco = c.tema || 'dark';
      setTema(temaBanco); localStorage.setItem('@financasCB:tema', temaBanco);
    }
    if (cb) { setCiclo(cb); localStorage.setItem('@financasCB:ciclo', JSON.stringify(cb)); }
    
    const { data: img } = supabase.storage.from('perfis').getPublicUrl('casal.png');
    if (img) {
      const urlComCache = `${img.publicUrl}?t=${new Date().getTime()}`;
      setFotoUrl(urlComCache);
      localStorage.setItem('@financasCB:foto', urlComCache);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const alternarTema = async () => {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema);
    localStorage.setItem('@financasCB:tema', novoTema);
    await supabase.from('configuracoes').upsert({ id: 1, tema: novoTema });
  };

  const subirFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSalvandoFoto(true);
    await supabase.storage.from('perfis').upload('casal.png', file, { upsert: true, cacheControl: '0' });
    setSalvandoFoto(false);
    carregarDados();
  };

  const salvarGasto = async (e) => {
    e.preventDefault();
    const v = parseFloat(String(form.valor).replace(',', '.'));
    
    const dadosParaSalvar = { 
      descricao: form.descricao, valor: v, tipo: form.tipo, 
      usuario: form.usuario, forma_pagamento: form.forma, 
      escopo: form.escopo, previsibilidade: form.previsibilidade,
      data_lancamento: form.data // Salva a data exata escolhida
    };

    if (editingEntryId) {
      await supabase.from('fluxo').update(dadosParaSalvar).eq('id', editingEntryId);
    } else {
      await supabase.from('fluxo').insert([dadosParaSalvar]);
    }
    fecharModal();
    carregarDados();
  };

  const iniciarEdicao = (entry) => {
    setEditingEntryId(entry.id);
    setForm({
      descricao: entry.descricao, valor: String(entry.valor).replace('.', ','),
      tipo: entry.tipo, usuario: entry.usuario, forma: entry.forma_pagamento,
      escopo: entry.escopo, previsibilidade: entry.previsibilidade,
      data: entry.data_lancamento || entry.created_at.split('T')[0]
    });
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditingEntryId(null);
    setForm({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal', previsibilidade: 'Variável', data: dataHoje });
  };

  const apagarLancamento = async () => {
    if (!editingEntryId) return;
    if (confirm("Apagar definitivamente este lançamento?")) {
      await supabase.from('fluxo').delete().eq('id', editingEntryId);
      fecharModal();
      carregarDados();
    }
  };

  const salvarCiclo = async (e) => {
    e.preventDefault();
    await supabase.from('ciclo_brenda').upsert({ id: 1, ...ciclo });
    alert("Dados do ciclo sincronizados!");
    carregarDados();
  };

  const salvarConfiguracoes = async () => {
    const numSaldo = Number(config.saldo_inicial) || 0; // Garante que vazio vire 0 e não dê erro
    const dadosConfig = { id: 1, saldo_inicial: numSaldo, data_inicio: config.data_inicio };
    await supabase.from('configuracoes').upsert(dadosConfig);
    setConfig(dadosConfig);
    alert("Configurações atualizadas!");
    carregarDados();
  };

  // --- LÓGICA DE DATAS E ACUMULAÇÃO (O CÉREBRO DO APP) ---
  const mesAnoFiltro = dataFiltro.toISOString().slice(0, 7); // Ex: "2026-02"
  
  // Navegação
  const irMesAnterior = () => setDataFiltro(new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() - 1, 1));
  const irMesProximo = () => setDataFiltro(new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() + 1, 1));
  
  const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const nomeMesAtual = `${nomeMeses[dataFiltro.getMonth()]} ${dataFiltro.getFullYear()}`;

  // Filtra lançamentos para exibir APENAS os do mês selecionado
  const lancamentosDoMes = lancamentos.filter(i => {
    const dataRef = i.data_lancamento || i.created_at.split('T')[0];
    return dataRef.startsWith(mesAnoFiltro);
  });

  // Filtra lançamentos para calcular o ACUMULADO (Tudo até o final do mês selecionado)
  const ultimoDiaDoMes = new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() + 1, 0).toISOString().split('T')[0];
  const lancamentosAcumulados = lancamentos.filter(i => {
    const dataRef = i.data_lancamento || i.created_at.split('T')[0];
    return dataRef <= ultimoDiaDoMes;
  });

  // Cálculos do Mês Visualizado (Extrato)
  const gastosCasalMes = lancamentosDoMes.filter(i => i.escopo === 'casal');
  const despesasFixasMes = gastosCasalMes.filter(i => i.tipo === 'despesa' && i.previsibilidade === 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0);
  const despesasVariaveisMes = gastosCasalMes.filter(i => i.tipo === 'despesa' && i.previsibilidade === 'Variável').reduce((acc, i) => acc + Number(i.valor), 0);
  
  // Cálculos do Acumulado (Efeito Cascata)
  const acmCasal = lancamentosAcumulados.filter(i => i.escopo === 'casal');
  const totalEntradasAcumulado = acmCasal.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalSaidasAcumulado = acmCasal.filter(i => i.tipo === 'despesa').reduce((acc, i) => acc + Number(i.valor), 0);
  
  // Saldo Final = Ponto Zero + Entradas Históricas - Saídas Históricas
  const saldoAtualCasal = Number(config.saldo_inicial || 0) + totalEntradasAcumulado - totalSaidasAcumulado;

  // Saldos Pessoais (Também Acumulativos)
  const saldoCelio = lancamentosAcumulados.filter(i => i.escopo === 'celio').reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);
  const saldoBrenda = lancamentosAcumulados.filter(i => i.escopo === 'brenda').reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);

  // Motor do Ciclo
  let infoCiclo = { fase: "Aguardando dados...", cor: "text-gray-400", diasProxima: 0, ovulacaoData: '' };
  if (ciclo.data_inicio) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const inicio = new Date(ciclo.data_inicio + 'T00:00:00'); 
    const proximaMenstruacao = new Date(inicio); proximaMenstruacao.setDate(inicio.getDate() + Number(ciclo.duracao));
    const ovulacao = new Date(proximaMenstruacao); ovulacao.setDate(proximaMenstruacao.getDate() - 14);
    const inicioFertil = new Date(ovulacao); inicioFertil.setDate(ovulacao.getDate() - 5);
    const fimFertil = new Date(ovulacao); fimFertil.setDate(ovulacao.getDate() + 1);

    const diaDoCicloAtual = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24)) + 1;
    infoCiclo.diasProxima = Math.ceil((proximaMenstruacao - hoje) / (1000 * 60 * 60 * 24));
    infoCiclo.ovulacaoData = ovulacao.toLocaleDateString('pt-BR');

    if (diaDoCicloAtual >= 1 && diaDoCicloAtual <= 5) { infoCiclo.fase = "🩸 Menstruação (Sangramento Ativo)"; infoCiclo.cor = "text-red-500"; }
    else if (hoje >= inicioFertil && hoje <= fimFertil) {
      if (hoje.getTime() === ovulacao.getTime()) { infoCiclo.fase = "🥚 Dia de Ovulação"; infoCiclo.cor = "text-purple-500"; }
      else { infoCiclo.fase = "✨ Período Fértil"; infoCiclo.cor = "text-purple-400"; }
    } else if (hoje > fimFertil && hoje < proximaMenstruacao) { infoCiclo.fase = "🌥️ Fase Lútea (TPM)"; infoCiclo.cor = "text-blue-400"; }
    else if (diaDoCicloAtual > 5 && hoje < inicioFertil) { infoCiclo.fase = "🌱 Fase Folicular"; infoCiclo.cor = "text-pink-400"; }
    else { infoCiclo.fase = "🔄 Ciclo Atrasado"; infoCiclo.cor = "text-orange-500"; infoCiclo.diasProxima = 0; }
  }

  const isDark = tema === 'dark';
  const bgBody = isDark ? 'bg-[#0a0b0e]' : 'bg-slate-100';
  const textBody = isDark ? 'text-white' : 'text-slate-900';
  const bgMenu = isDark ? 'bg-[#121418] border-r border-white/5' : 'bg-white border-r border-slate-200 shadow-2xl';
  const bgCard = isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const textMuted = isDark ? 'opacity-40' : 'text-slate-500';
  const inputClass = isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900';

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

      <header className="p-6 flex justify-between items-center max-w-md mx-auto">
        <button onClick={() => setIsMenuOpen(true)} className={`text-2xl p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>☰</button>
        <div className="text-right">
           <span className={`block text-[10px] font-black uppercase ${textMuted}`}>Olá, Casal</span>
           <span className="text-xs font-bold text-purple-500 italic">Célio & Brenda</span>
        </div>
        
        <div onClick={() => !salvandoFoto && fileInputRef.current.click()} className={`w-12 h-12 rounded-full border-2 border-purple-600 overflow-hidden cursor-pointer shadow-lg relative flex items-center justify-center ${salvandoFoto ? 'animate-pulse bg-purple-900' : ''}`}>
           {salvandoFoto ? <span className="text-[8px] font-black">⚙️</span> : <img src={fotoUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover bg-slate-800" />}
           <input type="file" accept="image/*" ref={fileInputRef} onChange={subirFoto} className="hidden" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pb-32">
        {/* NAVEGAÇÃO DE MESES GLOBAL */}
        {aba !== 'CONFIG' && (
          <div className="flex justify-between items-center mb-6 px-4">
             <button onClick={irMesAnterior} className={`p-2 rounded-full ${bgCard} active:scale-90`}>❮</button>
             <span className="font-black text-sm uppercase tracking-widest">{nomeMesAtual}</span>
             <button onClick={irMesProximo} className={`p-2 rounded-full ${bgCard} active:scale-90`}>❯</button>
          </div>
        )}

        {aba === 'DASHBOARD' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-purple-800 via-indigo-900 to-black p-8 rounded-[3rem] shadow-2xl mb-8 text-white relative overflow-hidden">
              <p className="text-[10px] font-black opacity-60 uppercase mb-1">Acumulado até {nomeMesAtual}</p>
              <h1 className={`text-5xl font-black tracking-tighter ${saldoAtualCasal < 0 ? 'text-red-400' : 'text-white'}`}>
                R$ {saldoAtualCasal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </h1>
              <div className="flex justify-between mt-6 pt-4 border-t border-white/20 text-[9px] font-black uppercase tracking-widest">
                 <div>
                    <span className="opacity-50 block mb-1">Ponto Zero</span>
                    <span className="text-white">R$ {Number(config.saldo_inicial).toFixed(2)}</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className={`p-5 rounded-[2rem] border ${bgCard}`}>
                  <p className={`text-[9px] font-black uppercase mb-1 ${textMuted}`}>Fixas ({nomeMesAtual})</p>
                  <p className="text-lg font-black text-red-500">R$ {despesasFixasMes.toFixed(2)}</p>
               </div>
               <div className={`p-5 rounded-[2rem] border ${bgCard}`}>
                  <p className={`text-[9px] font-black uppercase mb-1 ${textMuted}`}>Variáveis ({nomeMesAtual})</p>
                  <p className="text-lg font-black text-orange-400">R$ {despesasVariaveisMes.toFixed(2)}</p>
               </div>
            </div>

            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${textMuted}`}>Extrato do Mês</h3>
            <div className="space-y-3">
              {gastosCasalMes.length === 0 ? (
                 <p className={`text-center text-xs font-bold py-8 ${textMuted}`}>Nenhum lançamento neste mês.</p>
              ) : gastosCasalMes.map(i => (
                <div key={i.id} onClick={() => iniciarEdicao(i)} className={`p-4 rounded-[1.5rem] border flex justify-between items-center cursor-pointer transition-all hover:border-purple-500/20 active:scale-[0.98] ${bgCard}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${i.tipo === 'entrada' ? 'bg-green-500' : (i.previsibilidade === 'Fixa' ? 'bg-red-600' : 'bg-orange-400')}`}></div>
                    <div>
                      <p className="font-bold text-sm leading-none mb-1">{i.descricao}</p>
                      <p className={`text-[8px] font-black uppercase ${textMuted}`}>{i.usuario} • {i.data_lancamento ? i.data_lancamento.split('-').reverse().join('/') : ''}</p>
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

        {aba === 'CELIO' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-blue-600 text-white p-8 rounded-[3rem] shadow-xl text-center">
               <p className="text-[10px] font-black opacity-60 uppercase mb-1">Acumulado Geral</p>
               <h2 className="font-black text-2xl uppercase italic">Caixa Pessoal Célio</h2>
               <h1 className="text-4xl font-black mt-4">R$ {saldoCelio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h1>
            </div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${textMuted}`}>Extrato de {nomeMesAtual}</h3>
            {lancamentosDoMes.filter(i => i.escopo === 'celio').map(i => (
                <div key={i.id} onClick={() => iniciarEdicao(i)} className={`p-4 rounded-[1.5rem] border flex justify-between items-center cursor-pointer ${bgCard}`}>
                  <div>
                     <p className="font-bold text-sm">{i.descricao}</p>
                     <p className={`text-[8px] font-black uppercase ${textMuted}`}>{i.data_lancamento ? i.data_lancamento.split('-').reverse().join('/') : ''}</p>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>R$ {Number(i.valor).toFixed(2)}</p>
                </div>
            ))}
          </div>
        )}

        {aba === 'BRENDA' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="bg-pink-600 text-white p-8 rounded-[3rem] shadow-xl text-center">
               <p className="text-[10px] font-black opacity-60 uppercase mb-1">Acumulado Geral</p>
               <h2 className="font-black text-2xl uppercase italic">Caixa Pessoal Brenda</h2>
               <h1 className="text-4xl font-black mt-4">R$ {saldoBrenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h1>
            </div>
            
            <div className={`p-6 rounded-[2rem] border ${bgCard}`}>
               <h3 className="font-black text-xl text-pink-500 italic uppercase mb-6 flex justify-between items-center">
                  <span>🌸 Saúde Íntima</span>
                  <span className="text-[10px] bg-pink-500/20 px-3 py-1 rounded-full font-black">
                    {infoCiclo.diasProxima > 0 ? `${infoCiclo.diasProxima} DIAS P/ PRÓXIMA` : 'ATRASADO'}
                  </span>
               </h3>
               <div className="mb-6 text-center bg-black/5 p-5 rounded-3xl border border-white/5">
                  <p className={`text-xl font-black uppercase ${infoCiclo.cor}`}>{infoCiclo.fase}</p>
                  {infoCiclo.ovulacaoData && (
                     <p className={`text-[10px] font-black uppercase mt-3 ${textMuted}`}>Data provável da Ovulação: {infoCiclo.ovulacaoData}</p>
                  )}
               </div>
               <form onSubmit={salvarCiclo} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-[9px] font-black uppercase mb-1 block ${textMuted}`}>Dia 1 (Sangramento)</label>
                      <input type="date" value={ciclo.data_inicio} onChange={e => setCiclo({...ciclo, data_inicio: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-bold text-xs ${inputClass}`} />
                    </div>
                    <div>
                      <label className={`text-[9px] font-black uppercase mb-1 block ${textMuted}`}>Duração Média</label>
                      <input type="number" placeholder="28" value={ciclo.duracao} onChange={e => setCiclo({...ciclo, duracao: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-bold text-xs ${inputClass}`} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-pink-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-transform mt-2">Calcular Ciclo</button>
               </form>
            </div>
            
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${textMuted}`}>Extrato de {nomeMesAtual}</h3>
            {lancamentosDoMes.filter(i => i.escopo === 'brenda').map(i => (
                <div key={i.id} onClick={() => iniciarEdicao(i)} className={`p-4 rounded-[1.5rem] border flex justify-between items-center cursor-pointer ${bgCard}`}>
                  <div>
                     <p className="font-bold text-sm">{i.descricao}</p>
                     <p className={`text-[8px] font-black uppercase ${textMuted}`}>{i.data_lancamento ? i.data_lancamento.split('-').reverse().join('/') : ''}</p>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>R$ {Number(i.valor).toFixed(2)}</p>
                </div>
            ))}
          </div>
        )}

        {aba === 'CONFIG' && (
          <div className={`p-8 rounded-[3rem] border space-y-6 ${bgCard}`}>
            <h2 className="font-black text-2xl italic uppercase text-purple-500 mb-8">Ponto de Partida</h2>
            <div>
              <label className={`text-[9px] font-black uppercase block mb-2 ${textMuted}`}>Data de Início do App</label>
              <input type="date" value={config.data_inicio} onChange={e => setConfig({...config, data_inicio: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-bold text-lg ${inputClass}`} />
            </div>
            <div>
              <label className={`text-[9px] font-black uppercase block mb-2 ${textMuted}`}>Saldo no Banco (Ponto Zero)</label>
              <input type="number" value={config.saldo_inicial} onChange={e => setConfig({...config, saldo_inicial: e.target.value})} placeholder="Pode deixar em branco ou 0" className={`w-full p-4 rounded-2xl border outline-none font-bold text-xl ${inputClass}`} />
            </div>
            <button onClick={salvarConfiguracoes} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase mt-4 shadow-xl active:scale-95">💾 Salvar Ponto Zero</button>
          </div>
        )}
      </main>

      <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-tr from-purple-700 to-purple-500 text-white rounded-full shadow-[0_10px_40px_rgba(147,51,234,0.6)] flex items-center justify-center text-3xl font-bold z-40 active:scale-90 transition-transform">
        +
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className={`w-full max-w-sm p-8 rounded-[3rem] border shadow-2xl ${isDark ? 'bg-[#121418] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl italic uppercase">
                {editingEntryId ? 'Editar Lançamento' : 'Lançamento'}
              </h3>
              <button onClick={fecharModal} className={`text-2xl ${textMuted}`}>✕</button>
            </div>
            
            <form onSubmit={salvarGasto} className="space-y-4">
              
              <div>
                <select value={form.escopo} onChange={e => setForm({...form, escopo: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none text-[11px] font-black uppercase ${inputClass}`}>
                   <option value="casal">🌍 Conta Central do Casal</option>
                   <option value="celio">💼 Carteira Pessoal - Célio</option>
                   <option value="brenda">🌸 Carteira Pessoal - Brenda</option>
                </select>
              </div>

              {form.escopo === 'casal' && (
                <div className={`flex gap-2 p-1 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  {['Célio', 'Brenda'].map(u => (
                    <button key={u} type="button" onClick={() => setForm({...form, usuario: u})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${form.usuario === u ? (isDark ? 'bg-white text-black shadow-md' : 'bg-slate-800 text-white shadow-md') : textMuted}`}>{u.toUpperCase()}</button>
                  ))}
                </div>
              )}

              <input type="text" placeholder="No que foi? (Ex: Aluguel)" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-bold ${inputClass}`} required />
              
              <div className="grid grid-cols-2 gap-3">
                 <input type="text" inputMode="decimal" placeholder="R$ 0,00" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-black text-xl ${inputClass}`} required />
                 <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none text-[10px] font-black uppercase ${inputClass}`}>
                    <option value="despesa">💸 Saída</option>
                    <option value="entrada">💰 Entrada</option>
                 </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <select value={form.forma} onChange={e => setForm({...form, forma: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none text-[9px] font-black uppercase ${inputClass}`}>
                    <option value="À Vista">💵 À Vista</option>
                    <option value="Cartão de Crédito">💳 Crédito</option>
                 </select>
                 <select value={form.previsibilidade} onChange={e => setForm({...form, previsibilidade: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none text-[9px] font-black uppercase ${inputClass}`}>
                    <option value="Variável">🍔 Variável</option>
                    <option value="Fixa">🏠 Fixa</option>
                 </select>
              </div>

              {/* NOVO: Campo de Data no Lançamento */}
              <div>
                 <label className={`text-[9px] font-black uppercase block mb-1 mt-2 ${textMuted}`}>Data do Ocorrido</label>
                 <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-bold text-xs ${inputClass}`} required />
              </div>
              
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-500/10">
                  {editingEntryId && (
                    <button type="button" onClick={apagarLancamento} className="flex-1 bg-gray-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase active:scale-95 transition-all">
                      🗑️ Apagar
                    </button>
                  )}
                  <button type="submit" className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase shadow-xl active:scale-95 transition-all ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>
                    {editingEntryId ? 'Salvar Alterações' : 'Lançar no Caixa'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
