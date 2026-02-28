import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

function App() {
  const [aba, setAba] = useState('DASHBOARD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // O SEGREDO MÁXIMO DA VELOCIDADE: Tudo começa lendo a memória do celular (Síncrono)
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
  
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal', previsibilidade: 'Variável' });
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const fileInputRef = useRef(null);

  const carregarDados = async () => {
    // Busca dados frescos na internet de forma invisível
    const { data: f } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabase.from('configuracoes').select('*').maybeSingle();
    const { data: cb } = await supabase.from('ciclo_brenda').select('*').maybeSingle();
    
    // Atualiza a tela e o "Cofre" do celular ao mesmo tempo
    if (f) {
      setLancamentos(f);
      localStorage.setItem('@financasCB:lancamentos', JSON.stringify(f));
    }
    if (c) { 
      setConfig(c); 
      localStorage.setItem('@financasCB:config', JSON.stringify(c));
      const temaBanco = c.tema || 'dark';
      setTema(temaBanco); 
      localStorage.setItem('@financasCB:tema', temaBanco);
    }
    if (cb) {
      setCiclo(cb);
      localStorage.setItem('@financasCB:ciclo', JSON.stringify(cb));
    }
    
    const { data: img } = supabase.storage.from('perfis').getPublicUrl('casal.png');
    if (img) {
      const urlComCache = `${img.publicUrl}?t=${new Date().getTime()}`;
      setFotoUrl(urlComCache);
      localStorage.setItem('@financasCB:foto', urlComCache);
    }
  };

  // Roda a verificação invisível toda vez que abre o app
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
    
    const { error } = await supabase.storage.from('perfis').upload('casal.png', file, { upsert: true, cacheControl: '0' });
    
    setSalvandoFoto(false);
    if (error) {
      alert("Erro ao salvar foto: " + error.message);
    } else {
      carregarDados();
    }
  };

  const salvarGasto = async (e) => {
    e.preventDefault();
    const v = parseFloat(String(form.valor).replace(',', '.'));
    
    const dadosParaSalvar = { 
      descricao: form.descricao, valor: v, tipo: form.tipo, 
      usuario: form.usuario, forma_pagamento: form.forma, 
      escopo: form.escopo, previsibilidade: form.previsibilidade,
      mes: new Intl.DateTimeFormat('pt-BR', {month: 'long'}).format(new Date()) 
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
      escopo: entry.escopo, previsibilidade: entry.previsibilidade
    });
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditingEntryId(null);
    setForm({ descricao: '', valor: '', tipo: 'despesa', usuario: 'Célio', forma: 'À Vista', escopo: 'casal', previsibilidade: 'Variável' });
  };

  const apagarLancamento = async () => {
