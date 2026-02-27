import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function App() {
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

        if (!error) {
            setForm({ ...form, descricao: '', valor: '' });
            carregar();
        } else {
            alert("Erro ao salvar: " + error.message);
        }
    };

    const saldoGeral = lancamentos.reduce((acc, i) => i.tipo === 'entrada' ? acc + Number(i.valor) : acc - Number(i.valor), 0);
    const itensMes = lancamentos.filter(i => i.mes === mesAtual);

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col p-4">
            <header className="py-8 text-center">
                <div className="flex justify-between items-center mb-6 px-4 font-bold text-xs opacity-50 uppercase tracking-widest notranslate">
                    <button onClick={() => setMesIdx(mesIdx > 0 ? mesIdx - 1 : 11)}>❮</button>
                    <span className="bg-slate-800 px-3 py-1 rounded-full">{mesAtual}</span>
                    <button onClick={() => setMesIdx(mesIdx < 11 ? mesIdx + 1 : 0)}>❯</button>
                </div>
                <h1 className={`text-5xl font-black ${saldoGeral >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                    R$ {saldoGeral.toFixed(2)}
                </h1>
            </header>

            <form onSubmit={salvar} className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8">
                <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-2xl">
                    {['Célio', 'Brenda'].map(u => (
                        <button key={u} type="button" onClick={() => setForm({...form, usuario: u})}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] ${form.usuario === u ? (u === 'Célio' ? 'bg-blue-600 text-white shadow-md' : 'bg-pink-500 text-white shadow-md') : 'text-slate-400'}`}>
                            {u.toUpperCase()}
                        </button>
                    ))}
                </div>
                
                <input type="text" placeholder="Descrição" className="w-full p-4 mb-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none text-slate-900" 
                    value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                
                <div className="flex gap-2">
                    <input type="text" inputMode="decimal" placeholder="0,00" className="w-1/2 p-4 bg-slate-50 rounded-2xl font-bold text-lg outline-none text-slate-900"
                        value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
                    <select className="w-1/2 p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none text-slate-900"
                        value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                        <option value="despesa">GASTO 💸</option>
                        <option value="entrada">GANHO 💰</option>
                    </select>
                </div>

                <button type="submit" className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-transform">
                    Lançar Registro
                </button>
            </form>

            <div className="space-y-3 pb-10">
                {itensMes.map(i => (
                    <div key={i.id} className="bg-slate-800/50 p-4 rounded-2xl flex justify-between items-center border border-slate-700/50">
                        <div>
                            <p className="font-bold text-sm text-slate-100">{i.descricao}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase notranslate">{i.usuario} • {i.data_formatada}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className={`font-black text-sm ${i.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                                {i.tipo === 'entrada' ? '+' : '-'} {Number(i.valor).toFixed(2)}
                            </p>
                            <button onClick={async () => { if(confirm("Apagar?")) { await supabase.from('fluxo').delete().eq('id', i.id); carregar(); } }} className="opacity-20 hover:opacity-100 transition-opacity">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App