import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('DASHBOARD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // SISTEMA DE NOTIFICAÇÕES (TOAST)
  const [toast, setToast] = useState(null);
  
  const mostrarAviso = (mensagem, tipo = 'info') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000); // Some depois de 4 segundos
  };

  const [tema, setTema] = useState(() => localStorage.getItem('@financasCB:tema') || 'dark');
  const [fotoUrl, setFotoUrl] = useState(() => localStorage.getItem('@financasCB:foto') || null);
  
  const [lancamentos, setLancamentos] = useState(() => {
    const salvo = localStorage.getItem('@financasCB:lancamentos'); return salvo ? JSON.parse(salvo) : [];
  });
  
  const [contratos, setContratos] = useState(() => {
    const salvo = localStorage.getItem('@financasCB:contratos'); return salvo ? JSON.parse(salvo) : [];
  });
  
  const [config, setConfig] = useState(() => {
    const salvo = localStorage.getItem('@financasCB:config'); return salvo ? JSON.parse(salvo) : { saldo_inicial: 0, data_inicio: '' };
  });
  
  const [ciclo, setCiclo] = useState(() => {
    const salvo = localStorage.getItem('@financasCB:ciclo'); return salvo ? JSON.parse(salvo) : { data_inicio: '', duracao: 28 };
  });

  const [dataFiltro, setDataFiltro] = useState(new Date()); 
  const [editingEntryId, setEditingEntryId] = useState(null);
  
  const dataHoje = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal', previsibilidade: 'Variável', data: dataHoje });
  
  const [formContrato, setFormContrato] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', escopo: 'casal', data_inicio: dataHoje });

  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const fileInputRef = useRef(null);

  // SENSOR DE SWIPE
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (aba !== 'CONFIG' && aba !== 'CONTRATOS') {
      if (distance > minSwipeDistance) setDataFiltro(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      if (distance < -minSwipeDistance) setDataFiltro(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const carregarDados = async () => {
    const { data: f } = await supabase.from('fluxo').select('*').order('data_lancamento', { ascending: false });
    const { data: ct } = await supabase.from('contratos_fixos').select('*');
    const { data: c } = await supabase.from('configuracoes').select('*').maybeSingle();
    const { data: cb } = await supabase.from('ciclo_brenda').select('*').maybeSingle();
    
    if (f) { setLancamentos(f); localStorage.setItem('@financasCB:lancamentos', JSON.stringify(f)); }
    if (ct) { 
      setContratos(ct); localStorage.setItem('@financasCB:contratos', JSON.stringify(ct)); 
      
      // VERIFICA CONTAS VENCENDO HOJE OU AMANHÃ
      const diaHoje = new Date().getDate();
      const temContaPerto = ct.some(conta => {
        const diaConta = new Date(conta.data_inicio + 'T00:00:00').getDate();
        return conta.tipo === 'despesa' && (diaConta === diaHoje || diaConta === diaHoje + 1 || diaConta === diaHoje - 1);
      });
      if (temContaPerto) mostrarAviso("Atenção: Tem conta fixa para vencer por esses dias! 🚨", "aviso");
    }
    if (c) { 
      setConfig(c); localStorage.setItem('@financasCB:config', JSON.stringify(c));
      const temaBanco = c.tema || 'dark';
      setTema(temaBanco); localStorage.setItem('@financasCB:tema', temaBanco);
    }
    if (cb) { setCiclo(cb); localStorage.setItem('@financasCB:ciclo', JSON.stringify(cb)); }
    
    const { data: img } = supabase.storage.from('perfis').getPublicUrl('casal.png');
    if (img) {
      const urlComCache = `${img.publicUrl}?t=${new Date().getTime()}`;
      setFotoUrl(urlComCache); localStorage.setItem('@financasCB:foto', urlComCache);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const alternarTema = async () => {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema); localStorage.setItem('@financasCB:tema', novoTema);
    await supabase.from('configuracoes').upsert({ id: 1, tema: novoTema });
  };

  const subirFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSalvandoFoto(true);
    await supabase.storage.from('perfis').upload('casal.png', file, { upsert: true, cacheControl: '0' });
    setSalvandoFoto(false);
    carregarDados();
    mostrarAviso("Foto atualizada com sucesso! 📸", "sucesso");
  };

  const salvarGasto = async (e) => {
    e.preventDefault();
    const v = parseFloat(String(form.valor).replace(',', '.'));
    const dadosParaSalvar = { 
      descricao: form.descricao, valor: v, tipo: form.tipo, 
      usuario: form.usuario, forma_pagamento: form.forma, 
      escopo: form.escopo, previsibilidade: form.previsibilidade, data_lancamento: form.data 
    };

    if (editingEntryId) {
      await supabase.from('fluxo').update(dadosParaSalvar).eq('id', editingEntryId);
      mostrarAviso("Lançamento alterado! ✏️", "info");
    } else {
      await supabase.from('fluxo').insert([dadosParaSalvar]);
      
      // A MÁGICA DAS FRASES DIVERTIDAS
      if (form.tipo === 'entrada') {
        mostrarAviso("Eita, bicho! Bora gastá! 🤑", "sucesso");
      } else if (v > 500) {
        mostrarAviso("Lá se vai nosso suado dinheirinho... 💸", "erro");
      } else {
        mostrarAviso("Gasto registrado com dor no coração! 📉", "erro");
      }
    }
    
    fecharModal(); carregarDados();
  };

  const salvarContratoFixo = async (e) => {
    e.preventDefault();
    const v = parseFloat(String(formContrato.valor).replace(',', '.'));
    const dados = { ...formContrato, valor: v };
    await supabase.from('contratos_fixos').insert([dados]);
    setFormContrato({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', escopo: 'casal', data_inicio: dataHoje });
    mostrarAviso("Conta Fixa ativada! Vai descontar sozinho agora. 🔁", "info");
    carregarDados();
  };

  const apagarContratoFixo = async (id) => {
    if (confirm("Apagar esta conta fixa? Ela deixará de descontar nos meses passados e futuros.")) {
      await supabase.from('contratos_fixos').delete().eq('id', id);
      carregarDados();
    }
  };

  const iniciarEdicao = (entry) => {
    if (entry.isVirtual) return alert("Esta é uma Conta Fixa. Para editá-la, vá no menu 'Contas Fixas'.");
    setEditingEntryId(entry.id);
    setForm({
      descricao: entry.descricao, valor: String(entry.valor).replace('.', ','),
      tipo: entry.tipo, usuario: entry.usuario, forma: entry.forma_pagamento,
      escopo: entry.escopo, previsibilidade: entry.previsibilidade, data: entry.data_lancamento
    });
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false); setEditingEntryId(null);
    setForm({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal', previsibilidade: 'Variável', data: dataHoje });
  };

  const apagarLancamento = async () => {
    if (!editingEntryId) return;
    if (confirm("Apagar definitivamente este lançamento?")) {
      await supabase.from('fluxo').delete().eq('id', editingEntryId);
      mostrarAviso("Lançamento apagado! 🗑️", "info");
      fecharModal(); carregarDados();
    }
  };

  const salvarCiclo = async (e) => {
    e.preventDefault(); 
    await supabase.from('ciclo_brenda').upsert({ id: 1, ...ciclo });
    mostrarAviso("Ciclo da patroa sincronizado! 🌸", "sucesso"); 
    carregarDados();
  };

  // --- MOTOR MATEMÁTICO DO TEMPO E RECORRÊNCIA ---
  const mesAnoFiltro = dataFiltro.toISOString().slice(0, 7); 
  const ultimoDiaDoMesVisualizado = new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() + 1, 0).toISOString().split('T')[0];
  const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const nomeMesAtual = `${nomeMeses[dataFiltro.getMonth()]} ${dataFiltro.getFullYear()}`;

  const calcularMesesAtivos = (dataInicioStr) => {
    if (!dataInicioStr) return 0;
    const inicio = new Date(dataInicioStr + 'T00:00:00');
    const filtro = new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() + 1, 0); 
    if (inicio > filtro) return 0;
    const anos = filtro.getFullYear() - inicio.getFullYear();
    const meses = filtro.getMonth() - inicio.getMonth();
    return (anos * 12) + meses + 1;
  };

  const lancamentosDoMes = lancamentos.filter(i => (i.data_lancamento || '').startsWith(mesAnoFiltro));
  const lancamentosAcumulados = lancamentos.filter(i => (i.data_lancamento || '') <= ultimoDiaDoMesVisualizado);

  const contratosVirtuais = contratos.filter(c => calcularMesesAtivos(c.data_inicio) > 0).map(c => ({
     ...c,
     id: 'virtual-' + c.id,
     isVirtual: true, 
     data_lancamento: `${mesAnoFiltro}-01`,
     forma_pagamento: 'Débito Recorrente',
     previsibilidade: 'Fixa'
  }));

  const extratoCasalMes = [...lancamentosDoMes.filter(i => i.escopo === 'casal'), ...contratosVirtuais.filter(i => i.escopo === 'casal')]
     .sort((a,b) => new Date(b.data_lancamento) - new Date(a.data_lancamento));
     
  const extratoCelioMes = [...lancamentosDoMes.filter(i => i.escopo === 'celio'), ...contratosVirtuais.filter(i => i.escopo === 'celio')]
     .sort((a,b) => new Date(b.data_lancamento) - new Date(a.data_lancamento));

  const extratoBrendaMes = [...lancamentosDoMes.filter(i => i.escopo === 'brenda'), ...contratosVirtuais.filter(i => i.escopo === 'brenda')]
     .sort((a,b) => new Date(b.data_lancamento) - new Date(a.data_lancamento));

  const calcularSaldoAcumulado = (escopo) => {
     const avulsos = lancamentosAcumulados.filter(i => i.escopo === escopo);
     let saldo = avulsos.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);
     
     contratos.filter(c => c.escopo === escopo).forEach(c => {
        const meses = calcularMesesAtivos(c.data_inicio);
        if (meses > 0) {
           saldo += c.tipo === 'entrada' ? (Number(c.valor) * meses) : -(Number(c.valor) * meses);
        }
     });
     return saldo;
  };

  const saldoAtualCasal = Number(config.saldo_inicial || 0) + calcularSaldoAcumulado('casal');
  const saldoCelio = calcularSaldoAcumulado('celio');
  const saldoBrenda = calcularSaldoAcumulado('brenda');

  const despesasFixasMes = extratoCasalMes.filter(i => i.tipo === 'despesa' && i.previsibilidade === 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0);
  const despesasVariaveisMes = extratoCasalMes.filter(i => i.tipo === 'despesa' && i.previsibilidade === 'Variável').reduce((acc, i) => acc + Number(i.valor), 0);

  // MOTOR DO CICLO
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

    if (diaDoCicloAtual >= 1 && diaDoCicloAtual <= 5) { infoCiclo.fase = "🩸 Menstruação (Ativo)"; infoCiclo.cor = "text-red-500"; }
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
      
      {/* TOAST NOTIFICATION (BALÃOZINHO DE AVISO) */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 ${toast.tipo === 'sucesso' ? 'bg-green-500 text-black' : toast.tipo === 'erro' ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'}`}>
          {toast.mensagem}
        </div>
      )}

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
          <button onClick={() => {setAba('CONTRATOS'); setIsMenuOpen(false)}} className="block w-full text-left py-3 font-bold border-b border-gray-500/20 italic text-yellow-500">🔁 Contas Fixas</button>
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

      <main onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="max-w-md mx-auto px-6 pb-32">
        {aba !== 'CONFIG' && aba !== 'CONTRATOS' && (
          <div className="flex justify-between items-center mb-6 px-4">
             <button onClick={() => setDataFiltro(new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() - 1, 1))} className={`p-2 rounded-full ${bgCard} active:scale-90`}>❮</button>
             <span className="font-black text-sm uppercase tracking-widest">{nomeMesAtual}</span>
             <button onClick={() => setDataFiltro(new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() + 1, 1))} className={`p-2 rounded-full ${bgCard} active:scale-90`}>❯</button>
          </div>
        )}

        {aba === 'DASHBOARD' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-purple-800 via-indigo-900 to-black p-8 rounded-[3rem] shadow-2xl mb-8 text-white relative overflow-hidden">
              <p className="text-[10px] font-black opacity-60 uppercase mb-1">Acumulado até {nomeMesAtual}</p>
              <h1 className={`text-5xl font-black tracking-tighter ${saldoAtualCasal < 0 ? 'text-red-400' : 'text-white'}`}>
                R$ {saldoAtualCasal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </h1>
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
              {extratoCasalMes.length === 0 ? <p className={`text-center text-xs font-bold py-8 ${textMuted}`}>Arraste para os lados ou lance no "+".</p> : null}
              {extratoCasalMes.map(i => (
                <div key={i.id} onClick={() => iniciarEdicao(i)} className={`p-4 rounded-[1.5rem] border flex justify-between items-center cursor-pointer transition-all hover:border-purple-500/20 active:scale-[0.98] ${bgCard}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${i.isVirtual ? 'bg-yellow-500/20' : (i.tipo === 'entrada' ? 'bg-green-500/20' : 'bg-red-500/20')}`}>
                       {i.isVirtual ? '🔁' : (i.tipo === 'entrada' ? '💰' : '💸')}
                    </div>
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
            {extratoCelioMes.length === 0 ? <p className={`text-center text-xs font-bold py-8 ${textMuted}`}>Nenhum gasto seu aqui.</p> : null}
            {extratoCelioMes.map(i => (
                <div key={i.id} onClick={() => iniciarEdicao(i)} className={`p-4 rounded-[1.5rem] border flex justify-between items-center cursor-pointer ${bgCard}`}>
                  <div>
                     <p className="font-bold text-sm">
                       {i.isVirtual && <span className="mr-2">🔁</span>}
                       {i.descricao}
                     </p>
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
            {extratoBrendaMes.length === 0 ? <p className={`text-center text-xs font-bold py-8 ${textMuted}`}>Nenhum gasto dela aqui.</p> : null}
            {extratoBrendaMes.map(i => (
                <div key={i.id} onClick={() => iniciarEdicao(i)} className={`p-4 rounded-[1.5rem] border flex justify-between items-center cursor-pointer ${bgCard}`}>
                  <div>
                     <p className="font-bold text-sm">
                       {i.isVirtual && <span className="mr-2">🔁</span>}
                       {i.descricao}
                     </p>
                     <p className={`text-[8px] font-black uppercase ${textMuted}`}>{i.data_lancamento ? i.data_lancamento.split('-').reverse().join('/') : ''}</p>
                  </div>
                  <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>R$ {Number(i.valor).toFixed(2)}</p>
                </div>
            ))}
          </div>
        )}

        {aba === 'CONTRATOS' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-yellow-600 text-white p-8 rounded-[3rem] shadow-xl mb-8">
               <h2 className="font-black text-2xl uppercase italic mb-2">Contas Fixas</h2>
               <p className="text-xs font-bold opacity-80">Cadastre Salários, Aluguéis ou Assinaturas. Eles cairão na conta automaticamente todos os meses.</p>
            </div>

            <form onSubmit={salvarContratoFixo} className={`p-6 rounded-[2rem] border ${bgCard} space-y-4`}>
              <h3 className="font-black text-sm uppercase italic mb-4">Novo Contrato Fixo</h3>
              <input type="text" placeholder="Ex: Aluguel Betim, Salário" value={formContrato.descricao} onChange={e => setFormContrato({...formContrato, descricao: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-bold text-sm ${inputClass}`} required />
              <div className="grid grid-cols-2 gap-3">
                 <input type="text" inputMode="decimal" placeholder="R$ 0,00" value={formContrato.valor} onChange={e => setFormContrato({...formContrato, valor: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-black text-lg ${inputClass}`} required />
                 <select value={formContrato.tipo} onChange={e => setFormContrato({...formContrato, tipo: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-[10px] font-black uppercase ${inputClass}`}>
                    <option value="despesa">💸 Pagar (Saída)</option>
                    <option value="entrada">💰 Receber (Entrada)</option>
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={formContrato.escopo} onChange={e => setFormContrato({...formContrato, escopo: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-[10px] font-black uppercase ${inputClass}`}>
                   <option value="casal">🌍 Conta Casal</option>
                   <option value="celio">💼 Pessoal Célio</option>
                   <option value="brenda">🌸 Pessoal Brenda</option>
                </select>
                <input type="date" value={formContrato.data_inicio} onChange={e => setFormContrato({...formContrato, data_inicio: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-bold text-[10px] ${inputClass}`} required />
              </div>
              <button type="submit" className="w-full bg-yellow-500 text-black py-4 rounded-xl font-black text-xs uppercase shadow-xl active:scale-95 transition-transform mt-2">Ativar Conta Fixa</button>
            </form>

            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mt-8 mb-4 ${textMuted}`}>Contratos Ativos</h3>
            <div className="space-y-3">
              {contratos.map(c => (
                <div key={c.id} className={`p-5 rounded-[1.5rem] border ${bgCard}`}>
                  <div className="flex justify-between items-start mb-2">
                     <div>
                        <p className="font-black text-sm">{c.descricao}</p>
                        <p className={`text-[9px] font-black uppercase ${textMuted}`}>Desde {new Date(c.data_inicio).toLocaleDateString('pt-BR')} • {c.escopo}</p>
                     </div>
                     <p className={`font-black text-lg ${c.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>R$ {Number(c.valor).toFixed(2)}</p>
                  </div>
                  <button onClick={() => apagarContratoFixo(c.id)} className="text-[10px] font-black text-red-500 uppercase mt-2 bg-red-500/10 px-4 py-2 rounded-lg">Encerrar / Apagar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'CONFIG' && (
          <div className={`p-8 rounded-[3rem] border space-y-6 ${bgCard}`}>
            <h2 className="font-black text-2xl italic uppercase text-purple-500 mb-8">Ponto de Partida</h2>
            <div>
              <label className={`text-[9px] font-black uppercase block mb-2 ${textMuted}`}>Saldo no Banco (Ponto Zero)</label>
              <input type="number" value={config.saldo_inicial} onChange={e => setConfig({...config, saldo_inicial: e.target.value})} placeholder="Pode deixar em branco ou 0" className={`w-full p-4 rounded-2xl border outline-none font-bold text-xl ${inputClass}`} />
            </div>
            <button onClick={async () => {
              await supabase.from('configuracoes').upsert({id: 1, ...config});
              mostrarAviso("Marco Zero salvo! 💾", "sucesso"); carregarDados();
            }} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase mt-4 shadow-xl active:scale-95">💾 Salvar Ponto Zero</button>
          </div>
        )}
      </main>

      {aba !== 'CONTRATOS' && (
        <button onClick={() => setShowModal(true)} className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-tr from-purple-700 to-purple-500 text-white rounded-full shadow-[0_10px_40px_rgba(147,51,234,0.6)] flex items-center justify-center text-3xl font-bold z-40 active:scale-90 transition-transform">
          +
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className={`w-full max-w-sm p-8 rounded-[3rem] border shadow-2xl ${isDark ? 'bg-[#121418] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl italic uppercase">
                {editingEntryId ? 'Editar Lançamento' : 'Gasto Avulso'}
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

              <input type="text" placeholder="O que foi? (Ex: iFood, Lazer)" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-bold ${inputClass}`} required />
              
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
                 <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className={`w-full p-4 rounded-2xl border outline-none font-bold text-[10px] ${inputClass}`} required />
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
