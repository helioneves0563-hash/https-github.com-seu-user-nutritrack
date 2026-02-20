import React, { useState, useEffect } from 'react';
import { Search, Users, ChevronRight, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContextObj';
import { feedbacks, nutricionistas, supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function DashboardNutri() {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const nomeUser = profile?.nome || user?.user_metadata?.nome || 'Nutricionista';

    const [selectedClient, setSelectedClient] = useState(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [feedbackDrafts, setFeedbackDrafts] = useState({});
    const [sendingFeedbackId, setSendingFeedbackId] = useState(null);

    // Auto-fix legacy nutritionists without invite code
    useEffect(() => {
        const checkAndFixInviteCode = async () => {
            const nutri = profile?.nutricionistas?.[0];
            if (nutri && !nutri.codigo_convite) {
                const generatedCode = `NUTRI-${nutri.id.substring(0, 6).toUpperCase()}`;
                try {
                    await supabase
                        .from('nutricionistas')
                        .update({ codigo_convite: generatedCode })
                        .eq('id', nutri.id);
                    console.log('Legacy invite code fixed:', generatedCode);
                } catch (err) {
                    console.error('Falha ao atualizar código legado:', err);
                }
            }
        };
        checkAndFixInviteCode();
    }, [profile]);

    useEffect(() => {
        async function fetchClients() {
            setIsLoading(true);
            try {
                const data = await nutricionistas.listarPacientes();

                // Mapear os dados reais para o formato da UI
                const formatados = (data || []).map(p => {
                    const profileData = p.profiles || {};
                    const nomeStr = profileData.nome ? `${profileData.nome} ${profileData.sobrenome || ''}`.trim() : 'Paciente sem nome';

                    // Extrair iniciais do nome "João Pedro" -> "JP"
                    const parts = nomeStr.split(' ');
                    const initials = parts.length > 1
                        ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`
                        : `${parts[0].charAt(0)}`;

                    return {
                        id: p.id,
                        nome: nomeStr,
                        status: p.registros_refeicoes?.length > 0 ? 'Existem registros' : 'Nenhum registro hoje',
                        badge: null,
                        initials: initials.toUpperCase(),
                        dados: p // guarda resto dos dados
                    }
                });

                setClients(formatados);
                if (formatados.length > 0) {
                    setSelectedClient(formatados[0].id);
                }
            } catch (error) {
                console.error("Erro ao buscar clientes:", error);
                setClients([]); // fallback de segurança
            } finally {
                setIsLoading(false);
            }
        }
        fetchClients();
    }, []);

    const handleEnviarFeedback = async (registroId) => {
        const texto = (feedbackDrafts[registroId] || '').trim();
        if (!texto) return;

        try {
            setSendingFeedbackId(registroId);
            await feedbacks.enviar({ registroId, texto });
            setFeedbackDrafts((prev) => ({ ...prev, [registroId]: '' }));

            const data = await nutricionistas.listarPacientes();
            const formatados = (data || []).map(p => {
                const profileData = p.profiles || {};
                const nomeStr = profileData.nome ? `${profileData.nome} ${profileData.sobrenome || ''}`.trim() : 'Paciente sem nome';
                const parts = nomeStr.split(' ');
                const initials = parts.length > 1
                    ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`
                    : `${parts[0].charAt(0)}`;

                return {
                    id: p.id,
                    nome: nomeStr,
                    status: p.registros_refeicoes?.length > 0 ? 'Existem registros' : 'Nenhum registro hoje',
                    badge: null,
                    initials: initials.toUpperCase(),
                    dados: p
                };
            });
            setClients(formatados);
        } catch (error) {
            console.error('Erro ao enviar feedback:', error);
        } finally {
            setSendingFeedbackId(null);
        }
    };

    const filteredClients = clients.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    const currentClient = clients.find(c => c.id === selectedClient);

    return (
        <div className="flex h-full w-full">

            {/* SIDEBAR (Lista de Clientes) */}
            <aside className={`w-full md:w-[320px] bg-white border-r border-brand-border flex flex-col shrink-0 ${isMobileSidebarOpen ? 'block absolute inset-0 z-40 pb-16' : 'hidden md:flex'}`}>

                {/* Cabeçalho da Sidebar indicando quem está logado */}
                <div className="p-5 border-b border-brand-border bg-brand-wine text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                    <h2 className="font-serif text-2xl font-semibold mb-1 relative z-10">Olá, {nomeUser}! 👋</h2>
                    <p className="text-sm text-white/80 relative z-10 mb-4">Painel Profissional</p>

                    {/* Bloco do Código de Convite */}
                    <div className="relative z-10 bg-black/20 rounded-xl p-3 backdrop-blur-sm border border-white/10 flex items-center justify-between group">
                        <div>
                            <div className="text-[0.6rem] uppercase tracking-wider text-white/70 font-bold mb-0.5">Seu Código de Convite</div>
                            <div className="font-mono text-sm tracking-wide font-semibold text-[#F6EDE8]">
                                {profile?.nutricionistas?.[0]?.codigo_convite || `NUTRI-${profile?.nutricionistas?.[0]?.id?.substring(0, 6) || "NOVO"}`}
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                const codigo = profile?.nutricionistas?.[0]?.codigo_convite || `NUTRI-${profile?.nutricionistas?.[0]?.id?.substring(0, 6) || "NOVO"}`;
                                navigator.clipboard.writeText(codigo);
                                const btn = e.currentTarget;
                                const originalHtml = btn.innerHTML;
                                btn.innerHTML = '<span class="text-[0.65rem] font-bold">Copiado!</span>';
                                setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-all active:scale-95 flex items-center justify-center shrink-0 h-8 min-w-[32px]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="p-5 border-b border-brand-border">
                    <h3 className="text-sm font-semibold tracking-wide mb-3">Meus Clientes</h3>
                    <div className="flex items-center gap-2 bg-brand-warm-white rounded-xl px-3 py-2.5">
                        <Search size={16} className="text-brand-muted shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-sm w-full outline-none text-brand-charcoal placeholder-brand-muted"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {isLoading ? (
                        <div className="text-center py-6 text-brand-muted text-sm">Carregando pacientes...</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <Users className="mx-auto text-brand-muted mb-3 opacity-30" size={32} />
                            <p className="text-sm text-brand-muted">Nenhum cliente encomtrado.</p>
                        </div>
                    ) : (
                        filteredClients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => { setSelectedClient(client.id); setIsMobileSidebarOpen(false); }}
                                className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors relative ${selectedClient === client.id ? 'bg-brand-wine-pale' : 'hover:bg-brand-warm-white'}`}
                            >
                                {selectedClient === client.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-wine rounded-r"></div>}

                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-wine to-brand-wine-light text-white flex items-center justify-center text-sm font-bold shrink-0">
                                    {client.initials}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-brand-charcoal truncate">{client.nome}</div>
                                    <div className="text-[0.7rem] text-brand-muted truncate mt-0.5">{client.status}</div>
                                </div>

                                {client.badge && (
                                    <div className="bg-brand-accent text-white text-[0.6rem] font-bold px-2 py-0.5 rounded-full shrink-0">
                                        {client.badge}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* FEED PRINCIPAL DO CLIENTE SELECIONADO */}
            <main className={`flex-1 flex justify-center bg-brand-cream overflow-y-auto ${!isMobileSidebarOpen ? 'block' : 'hidden md:block'}`}>
                {!currentClient ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-brand-muted p-6 text-center">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p>Selecione um cliente ao lado para ver o histórico de refeições.</p>
                    </div>
                ) : (
                    <div className="w-full max-w-3xl border-x border-brand-border/40 min-h-full bg-[#F8F2F0]">

                        {/* Cliente Header */}
                        <div className="bg-white border-b border-brand-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsMobileSidebarOpen(true)}
                                    className="md:hidden w-8 h-8 rounded-full bg-brand-warm-white flex items-center justify-center text-brand-charcoal"
                                >
                                    <ChevronRight size={18} className="rotate-180" />
                                </button>

                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-wine to-brand-wine-light text-white flex items-center justify-center text-lg font-bold shadow-sm">
                                    {currentClient.initials}
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl font-semibold leading-tight">{currentClient.nome}</h2>
                                    <div className="text-xs text-brand-muted mt-0.5">
                                        Membro desde {new Date(currentClient.dados.created_at).getFullYear()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate(`/nutricionista/historico?pacienteId=${currentClient.id}`)}
                                    className="hidden sm:block px-4 py-2 text-xs font-semibold bg-white border border-brand-border text-brand-charcoal rounded-lg hover:bg-brand-warm-white transition-colors shadow-sm"
                                >
                                    Histórico
                                </button>
                                <button
                                    onClick={() => navigate(`/nutricionista/planos?pacienteId=${currentClient.id}`)}
                                    className="hidden sm:block px-4 py-2 text-xs font-semibold bg-brand-wine text-white rounded-lg hover:bg-[#7A1212] transition-colors shadow-sm"
                                >
                                    Plano Alimentar
                                </button>
                            </div>
                        </div>

                        {/* Lista de Refeições */}
                        <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">

                            {(!currentClient.dados.registros_refeicoes || currentClient.dados.registros_refeicoes.length === 0) ? (
                                <div className="text-center py-12 px-4 bg-white rounded-2xl shadow-sm border border-brand-border/50">
                                    <p className="text-sm font-medium text-brand-muted">Nenhum registro de refeição encontrado para este paciente.</p>
                                </div>
                            ) : (
                                currentClient.dados.registros_refeicoes.map(ref => (
                                    <div key={ref.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-brand-border/40 transition-all hover:shadow-md">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="w-full sm:w-[180px] h-[180px] bg-brand-warm-white flex items-center justify-center text-brand-muted shrink-0 relative overflow-hidden">
                                                {ref.foto_url ? (
                                                    <img src={ref.foto_url} alt={ref.tipo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-xs flex flex-col items-center gap-2">📸 <span>Sem foto</span></div>
                                                )}
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="bg-brand-wine-pale text-brand-wine text-[0.65rem] font-bold px-2.5 py-0.5 rounded-full capitalize">
                                                            {ref.tipo.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-xs text-brand-muted">
                                                            {new Date(ref.created_at).toLocaleDateString()} {new Date(ref.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-medium text-sm leading-relaxed mb-3">
                                                        {ref.descricao || 'Nenhuma descrição fornecida pelo paciente.'}
                                                    </h3>
                                                </div>

                                                {/* Feedback Area */}
                                                <div className="pt-3 border-t border-brand-border mt-2">
                                                    {ref.feedbacks && ref.feedbacks.length > 0 ? (
                                                        <>
                                                            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-brand-muted mb-2 flex items-center gap-1.5"><MessageSquare size={12} /> Feedback enviado</p>
                                                            <div className="flex items-start gap-3 bg-[#FBEDEE] p-3 rounded-xl border border-[#EACACA]">
                                                                <div className="w-7 h-7 rounded-full bg-[#7A1D1D] text-white flex items-center justify-center text-[0.6rem] font-bold shrink-0">Nu</div>
                                                                <div className="text-xs leading-relaxed text-[#4A1A1A]">{ref.feedbacks[0].comentario}</div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-brand-muted mb-2 flex items-center gap-1.5"><MessageSquare size={12} /> Seu Feedback</p>
                                                            <div className="flex gap-2 items-end">
                                                                <textarea
                                                                    placeholder="Adicionar um comentário avaliativo..."
                                                                    value={feedbackDrafts[ref.id] || ''}
                                                                    onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [ref.id]: e.target.value }))}
                                                                    className="flex-1 bg-brand-warm-white border border-brand-border rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-brand-wine focus:ring-1 focus:ring-brand-wine h-10 transition-all font-sans"
                                                                ></textarea>
                                                                <button
                                                                    onClick={() => handleEnviarFeedback(ref.id)}
                                                                    disabled={sendingFeedbackId === ref.id}
                                                                    className="w-10 h-10 rounded-xl bg-brand-wine text-white flex items-center justify-center shrink-0 hover:bg-[#7A1212] transition-colors shadow-sm disabled:opacity-60"
                                                                >
                                                                    <Send size={16} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
