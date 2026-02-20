import React, { useState, useEffect } from 'react';
import { Camera, Copy, CheckCircle2, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContextObj';
import { auth, nutricionistas, supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
    const { user, profile, role } = useAuth();
    const navigate = useNavigate();

    // States from backend
    const [nome, setNome] = useState('');
    const [sobrenome, setSobrenome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [crn, setCrn] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [clinica, setClinica] = useState('');
    const [codigoConvite, setCodigoConvite] = useState('');
    const [membroDesde, setMembroDesde] = useState('Janeiro de 2026');
    const [pacientesAtivos, setPacientesAtivos] = useState(0);
    const [email, setEmail] = useState('');
    const [nutriProfile, setNutriProfile] = useState(null);

    const [activeTab, setActiveTab] = useState('dados');
    const [copied, setCopied] = useState(false);

    // Editing states
    const [editingField, setEditingField] = useState(null);
    const [editValue, setEditValue] = useState("");

    useEffect(() => {
        let active = true;
        async function loadNutri() {
            if (role !== 'nutricionista') return;
            try {
                const n = await nutricionistas.meuPerfil();
                if (active) setNutriProfile(n || null);
            } catch (error) {
                console.error('Erro ao carregar perfil da nutricionista:', error);
            }
        }
        loadNutri();
        return () => {
            active = false;
        };
    }, [role]);

    useEffect(() => {
        const currentNutri = nutriProfile || profile?.nutricionistas?.[0] || null;

        if (profile) {
            setNome(profile.nome || '');
            setSobrenome(profile.sobrenome || '');
            setTelefone(profile.telefone || '');

            if (user && user.email) {
                setEmail(user.email);
            }

            if (role === 'nutricionista' && currentNutri) {
                const n = currentNutri;
                setCrn(n.crn || '');
                setCodigoConvite(n.codigo_convite || '');
                if (n.created_at) {
                    const data = new Date(n.created_at);
                    // format: Janeiro de 2026
                    setMembroDesde(data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
                }
                setEspecialidade(n.especialidade || 'Nutrição clínica');
                setClinica(n.clinica || 'Não informada');
            } else {
                setCrn('');
                setCodigoConvite('');
                setEspecialidade('');
                setClinica('');
            }

            // Conta quantos pacientes a nutricionista tem
            if (role === 'nutricionista' && currentNutri?.id) {
                const nutriId = currentNutri.id;
                supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('id_nutricionista', nutriId)
                    .then(({ count }) => {
                        if (count !== null) setPacientesAtivos(count);
                    });
            }
        }
    }, [profile, role, user, nutriProfile]);

    const handleCopy = () => {
        navigator.clipboard.writeText(codigoConvite);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveField = async (field) => {
        try {
            if (field === 'nome_completo') {
                const parts = editValue.split(' ');
                const n = parts[0];
                const s = parts.slice(1).join(' ');
                await supabase.from('profiles').update({ nome: n, sobrenome: s }).eq('id', user.id);
                setNome(n);
                setSobrenome(s);
            } else if (field === 'telefone') {
                await supabase.from('profiles').update({ telefone: editValue }).eq('id', user.id);
                setTelefone(editValue);
            } else if (field === 'crn' && role === 'nutricionista') {
                await supabase.from('nutricionistas').update({ crn: editValue }).eq('profile_id', user.id);
                setCrn(editValue);
            } else if (field === 'especialidade' && role === 'nutricionista') {
                await supabase.from('nutricionistas').update({ especialidade: editValue }).eq('profile_id', user.id);
                setEspecialidade(editValue);
            } else if (field === 'clinica' && role === 'nutricionista') {
                await supabase.from('nutricionistas').update({ clinica: editValue }).eq('profile_id', user.id);
                setClinica(editValue);
            }
            setEditingField(null);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar o campo");
        }
    };

    const startEdit = (field, currentValue) => {
        setEditValue(currentValue);
        setEditingField(field);
    };

    const renderListItem = (label, value, fieldId, allowEdit = true, customRight = null) => {
        const isEditing = editingField === fieldId;

        return (
            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 group">
                <span className="w-1/3 text-xs text-gray-500 font-bold tracking-wide">{label}</span>

                <div className="flex-1 text-sm font-semibold text-gray-800">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="w-full border border-[#8E1A1A]/30 bg-gray-50/50 rounded px-3 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#8E1A1A] transition-colors"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveField(fieldId);
                                    if (e.key === 'Escape') setEditingField(null);
                                }}
                            />
                        </div>
                    ) : (
                        value
                    )}
                </div>

                <div className="w-20 text-right">
                    {customRight ? customRight : (
                        isEditing ? (
                            <div className="flex gap-3 justify-end items-center">
                                <button onClick={() => setEditingField(null)} className="text-xs text-red-500 hover:underline font-medium">Cancelar</button>
                                <button onClick={() => handleSaveField(fieldId)} className="text-xs text-[#6F0B0F] hover:underline font-bold">Salvar</button>
                            </div>
                        ) : (
                            allowEdit && <button onClick={() => startEdit(fieldId, value)} className="text-[0.7rem] uppercase tracking-wider text-[#8E1A1A] opacity-0 group-hover:opacity-100 hover:font-bold transition-all">Editar</button>
                        )
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center p-4 md:p-8 min-h-full bg-black/10 relative overflow-y-auto w-full">
            <div className="w-full max-w-[650px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden my-auto mb-20 md:mb-auto">
                {/* Header Gradient */}
                <div className="bg-gradient-to-br from-[#6F0B0F] to-[#8E1A1A] p-8 flex items-center gap-6 relative overflow-hidden">
                    {/* Elementos decorativos de fundo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/2"></div>

                    <div className="relative z-10 w-20 h-20 rounded-full bg-[#F2D6D6] text-[#6F0B0F] flex items-center justify-center text-3xl font-bold tracking-tight shadow-xl border-2 border-white/20">
                        {nome?.charAt(0) || 'D'}
                        {sobrenome?.charAt(0) || 'R'}
                    </div>
                    <div className="relative z-10 text-white flex-1">
                        <h2 className="text-xl font-serif tracking-wide text-white drop-shadow-sm font-bold">{nome} {sobrenome}</h2>
                        <p className="text-[0.65rem] font-medium opacity-90 mt-1 uppercase tracking-widest text-[#F2D6D6]">
                            {role === 'nutricionista' ? `${especialidade || 'NUTRICIONISTA'} · CRN ${crn || 'NÃO INFORMADO'}` : 'PACIENTE'}
                        </p>
                        <div className="mt-4 bg-[#8E1A1A]/80 backdrop-blur-md border border-[#B76464]/50 rounded-full px-3 py-1 flex items-center gap-1.5 w-fit shadow-sm">
                            <ShieldCheck size={14} className="text-white" />
                            <span className="text-[0.65rem] font-bold tracking-wider text-white">
                                {role === 'nutricionista' ? 'Perfil verificado' : 'Conta ativa'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    {['Dados', 'Notificações', 'Plano', 'Segurança'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`flex-1 py-5 text-[0.65rem] font-bold uppercase tracking-widest text-center transition-all ${activeTab === tab.toLowerCase()
                                ? 'text-[#6F0B0F] border-b-[3px] border-[#6F0B0F] bg-gray-50/50'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-8 px-10">
                    {activeTab === 'dados' && (
                        <div className="animate-fade-in">
                            <div className="mb-10">
                                <h3 className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest mb-4">Informações Pessoais</h3>
                                <div className="border-t border-gray-100"></div>
                                {renderListItem('Nome completo', `${nome} ${sobrenome}`, 'nome_completo')}
                                {renderListItem('E-mail', <span className="text-blue-600 font-bold">{email}</span>, 'email', false)}
                                {renderListItem('Telefone', telefone || 'Não informado', 'telefone')}
                                {role === 'nutricionista' && renderListItem('CRN', crn || 'Não informado', 'crn')}
                            </div>

                            {role === 'nutricionista' && (
                                <div>
                                    <h3 className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest mb-4">Informações Profissionais</h3>
                                    <div className="border-t border-gray-100"></div>
                                    {renderListItem('Especialidade', especialidade, 'especialidade')}
                                    {renderListItem('Clínica / Consultório', clinica, 'clinica')}

                                    {renderListItem(
                                        'Código de convite',
                                        <div className="bg-[#FBEDEE] px-3.5 py-1.5 rounded text-brand-charcoal font-mono tracking-wider text-xs inline-block shadow-inner border border-[#EACACA]">
                                            {codigoConvite || 'Nenhum'}
                                        </div>,
                                        'codigo_convite',
                                        false,
                                        <button
                                            onClick={handleCopy}
                                            className="text-[0.7rem] uppercase tracking-wider text-[#8E1A1A] hover:font-bold transition-all"
                                        >
                                            {copied ? 'Copiado!' : 'Copiar'}
                                        </button>
                                    )}

                                    {renderListItem('Pacientes ativos', `${pacientesAtivos} pacientes`, 'pacientes', false)}
                                    {renderListItem('Membro desde', membroDesde, 'membro_desde', false)}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab !== 'dados' && (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <ShieldCheck size={24} />
                            </div>
                            <p className="text-sm font-medium text-gray-400">Conteúdo da aba <span className="capitalize text-gray-500">{activeTab}</span> em desenvolvimento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
