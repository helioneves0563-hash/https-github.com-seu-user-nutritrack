import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Sunrise, Sun, Sunset, Coffee, Moon, UtensilsCrossed, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContextObj';
import { refeicoes } from '../services/supabase';

export default function DashboardPaciente() {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const nomeUser = profile?.nome || user?.user_metadata?.nome || 'Paciente';

    // Estados do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [tipoRefeicao, setTipoRefeicao] = useState('almoco');
    const [descricao, setDescricao] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const [refeicoesList, setRefeicoesList] = useState([]);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);

    const fetchRefeicoes = async () => {
        setIsLoadingFeed(true);
        try {
            const data = await refeicoes.minhasRefeicoes({ limite: 10 });
            setRefeicoesList(data || []);
        } catch (err) {
            console.error("Erro ao buscar histórico:", err);
        } finally {
            setIsLoadingFeed(false);
        }
    };

    useEffect(() => {
        fetchRefeicoes();
    }, []);

    const getMealIcon = (tipo) => {
        const normalized = (tipo || '').toLowerCase();
        if (normalized.includes('cafe')) return Sunrise;
        if (normalized.includes('almoco')) return Sun;
        if (normalized.includes('lanche')) return Coffee;
        if (normalized.includes('jantar')) return Moon;
        return Sunset;
    };

    const formatMealType = (tipo) => {
        const normalized = (tipo || '').toLowerCase();
        if (normalized === 'cafe_da_manha') return 'Café da Manhã';
        if (normalized === 'almoco') return 'Almoço';
        if (normalized === 'lanche') return 'Lanche';
        if (normalized === 'jantar') return 'Jantar';
        return 'Refeição';
    };

    const handleImageChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) {
                setError('A foto deve ter no máximo 5MB');
                return;
            }
            setFile(selectedFile);
            setError('');
            // Cria object URL para o preview na tela
            setImagePreview(URL.createObjectURL(selectedFile));
        }
    };

    const fecharModal = () => {
        setIsModalOpen(false);
        setFile(null);
        setImagePreview(null);
        setDescricao('');
        setError('');
        setTipoRefeicao('almoco');
    };

    const handleRegistrar = async () => {
        if (!file) {
            setError('Você precisa anexar uma foto ou tirar uma nova.');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            await refeicoes.registrar({
                tipo: tipoRefeicao,
                descricao: descricao,
                arquivo: file
            });
            fecharModal();
            fetchRefeicoes(); // Atualiza a lista!
        } catch (err) {
            setError(err.message || 'Erro ao fazer upload da refeição.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 md:p-8 h-full overflow-y-auto pb-24 md:pb-8">

            {/* HEADER PACIENTE */}
            <div className="mb-8">
                <h1 className="font-serif text-3xl font-semibold text-brand-wine">Olá, {nomeUser.split(' ')[0]}!</h1>
                <p className="text-brand-muted mt-1">Como está sua alimentação hoje?</p>
            </div>

            {/* CTA UPLOAD */}
            <div
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-br from-brand-wine to-brand-wine-light rounded-2xl p-6 flex items-center gap-4 cursor-pointer mb-6 transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(158,11,15,0.30)]"
            >
                <div className="text-4xl filter drop-shadow-md">📸</div>
                <div>
                    <h3 className="font-semibold text-white mb-0.5">Registrar refeição</h3>
                    <p className="text-xs text-white/85">Envie para sua nutricionista avaliar</p>
                </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                    onClick={() => navigate('/plano-alimentar')}
                    className="bg-white rounded-[20px] p-5 shadow-custom border border-brand-border/40 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md hover:border-brand-wine"
                >
                    <div className="w-12 h-12 rounded-full bg-brand-warm-white text-[#B81A1F] flex items-center justify-center">
                        <UtensilsCrossed size={24} />
                    </div>
                    <span className="font-semibold text-sm text-brand-charcoal">Meu Plano</span>
                </button>
                <button
                    onClick={() => navigate('/evolucao')}
                    className="bg-white rounded-[20px] p-5 shadow-custom border border-brand-border/40 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md hover:border-brand-wine"
                >
                    <div className="w-12 h-12 rounded-full bg-brand-wine-pale text-brand-wine flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <span className="font-semibold text-sm text-brand-charcoal">Evolução</span>
                </button>
            </div>

            {/* FEED DE REFEIÇÕES */}
            <div>
                <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-brand-muted mb-4">Histórico recente</h4>
                {isLoadingFeed ? (
                    <div className="text-sm text-brand-muted py-6">Carregando refeições...</div>
                ) : refeicoesList.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 text-sm text-brand-muted border border-brand-border/40">
                        Nenhuma refeição registrada ainda. Toque em <strong>Registrar refeição</strong> para começar.
                    </div>
                ) : (
                    refeicoesList.map((registro) => {
                        const Icon = getMealIcon(registro.tipo);
                        const feedback = registro.feedbacks?.[0];
                        const criadoEm = new Date(registro.created_at);
                        return (
                            <div key={registro.id} className="bg-white rounded-[14px] mb-4 overflow-hidden shadow-custom">
                                <div className="w-full h-[180px] bg-brand-warm-white flex items-center justify-center text-6xl relative overflow-hidden">
                                    {registro.foto_url ? (
                                        <img src={registro.foto_url} alt={formatMealType(registro.tipo)} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-5xl">🍽️</div>
                                    )}
                                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[0.65rem] font-bold text-brand-charcoal flex items-center gap-1.5">
                                        <Icon size={12} className="text-[#B81A1F]" /> {formatMealType(registro.tipo)}
                                    </span>
                                </div>
                                <div className="p-4 md:p-5">
                                    <h3 className="font-serif text-lg font-semibold mb-0.5 leading-tight">
                                        {registro.descricao || 'Sem descrição'}
                                    </h3>
                                    <p className="text-xs text-brand-muted mb-4">
                                        {criadoEm.toLocaleDateString('pt-BR')} · {criadoEm.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>

                                    {feedback ? (
                                        <div className="bg-brand-wine-pale rounded-xl p-3 md:p-4 flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-wine flex items-center justify-center text-white text-[0.65rem] font-bold shrink-0">
                                                Dr
                                            </div>
                                            <div>
                                                <div className="text-[0.7rem] font-bold text-brand-wine mb-0.5">Feedback da Nutricionista</div>
                                                <div className="text-[0.8rem] leading-relaxed">{feedback.comentario || feedback.texto}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-brand-muted italic">
                                            <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0 animate-pulse"></span>
                                            Aguardando feedback da nutricionista...
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL REGISTRO DE REFEIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end justify-center sm:p-4 sm:items-center">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 sm:p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300">
                        <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-6 sm:hidden"></div>

                        <h2 className="font-serif text-2xl font-semibold mb-6 text-center">Registrar Refeição</h2>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-[0.7rem] font-bold text-brand-muted uppercase tracking-wider mb-2">Tipo de Refeição</label>
                            <select
                                value={tipoRefeicao}
                                onChange={(e) => setTipoRefeicao(e.target.value)}
                                className="w-full border border-brand-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-wine bg-brand-warm-white/30"
                            >
                                <option value="cafe_da_manha">Café da Manhã</option>
                                <option value="almoco">Almoço</option>
                                <option value="lanche">Lanche</option>
                                <option value="jantar">Jantar</option>
                            </select>
                        </div>

                        {/* UPLOAD FOTO */}
                        <label className="block mb-4 relative cursor-pointer">
                            <span className="block text-[0.7rem] font-bold text-brand-muted uppercase tracking-wider mb-2">Sua Foto</span>

                            {imagePreview ? (
                                <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-brand-wine">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-sm font-semibold">
                                        Trocar Foto
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-brand-border rounded-2xl p-8 text-center hover:border-brand-wine hover:bg-brand-wine-pale transition-all">
                                    <Camera size={40} className="mx-auto text-brand-muted mb-3" />
                                    <p className="text-sm font-medium text-brand-charcoal">Toque para abrir a câmera<br />ou galeria</p>
                                </div>
                            )}
                            {/* Input de arquivo escondido */}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </label>

                        <div className="mb-6">
                            <label className="block text-[0.7rem] font-bold text-brand-muted uppercase tracking-wider mb-2">Detalhes (Opcional)</label>
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder="Descreva o que você comeu..."
                                className="w-full border border-brand-border rounded-xl p-4 text-sm focus:outline-none focus:border-brand-wine transition-colors resize-none h-24"
                            ></textarea>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={fecharModal}
                                disabled={isUploading}
                                className="flex-1 py-3.5 border border-brand-border text-brand-charcoal rounded-xl font-semibold text-sm hover:bg-brand-warm-white transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRegistrar}
                                disabled={isUploading || !file}
                                className="flex-1 py-3.5 bg-brand-wine text-white rounded-xl font-semibold text-sm hover:bg-[#7A1212] shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar →'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
