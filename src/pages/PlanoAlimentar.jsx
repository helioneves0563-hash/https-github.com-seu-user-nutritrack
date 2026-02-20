import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextObj';
import { Plus, Clock, Edit2, Trash2, UtensilsCrossed, Save, ArrowLeft } from 'lucide-react';
import { pacientes } from '../services/supabase';

export default function PlanoAlimentar() {
    const { role } = useAuth();
    const navigate = useNavigate();
    const isNutri = role === 'nutricionista';

    const [isEditing, setIsEditing] = useState(false);
    const [tituloPlano, setTituloPlano] = useState('Meu Plano Alimentar');
    const [objetivo, setObjetivo] = useState('Emagrecimento');

    // Mockup Data convertido em Estado
    const [meals, setMeals] = useState([
        { id: 1, type: 'Café da Manhã', time: '08:00', items: ['2 fatias de pão integral', '2 ovos mexidos', '1 fatia de mamão (150g)', 'Café sem açúcar'] },
        { id: 2, type: 'Lanche da Manhã', time: '10:30', items: ['1 maçã', '15g de castanhas'] },
        { id: 3, type: 'Almoço', time: '13:00', items: ['120g de peito de frango grelhado', '100g de arroz integral', 'Salada verde à vontade', 'Colher de azeite extra virgem'] },
        { id: 4, type: 'Lanche da Tarde', time: '16:00', items: ['1 pote de iogurte natural', '30g de Whey Protein', 'Canela a gosto'] },
        { id: 5, type: 'Jantar', time: '19:30', items: ['120g de filé de tilápia', '150g de purê de abóbora', 'Brócolis no vapor'] },
    ]);

    // Funcoes de Edicao
    const handleMealChange = (id, field, value) => {
        setMeals(meals.map(m => (m.id === id ? { ...m, [field]: value } : m)));
    };

    const handleItemChange = (mealId, itemIdx, value) => {
        setMeals(meals.map(m => {
            if (m.id === mealId) {
                const newItems = [...m.items];
                newItems[itemIdx] = value;
                return { ...m, items: newItems };
            }
            return m;
        }));
    };

    const addItem = (mealId) => {
        setMeals(meals.map(m => (m.id === mealId ? { ...m, items: [...m.items, 'Novo alimento'] } : m)));
    };

    const removeItem = (mealId, itemIdx) => {
        setMeals(meals.map(m => {
            if (m.id === mealId) {
                return { ...m, items: m.items.filter((_, idx) => idx !== itemIdx) };
            }
            return m;
        }));
    };

    const removeMeal = (id) => {
        setMeals(meals.filter(m => m.id !== id));
    };

    const addMeal = () => {
        const newId = meals.length > 0 ? Math.max(...meals.map(m => m.id)) + 1 : 1;
        setMeals([...meals, { id: newId, type: 'Nova Refeição', time: '12:00', items: ['Alimento exemplo'] }]);
    };

    useEffect(() => {
        if (isNutri) return;
        async function loadPlanoPaciente() {
            try {
                const plano = await pacientes.meuPlano();
                if (!plano) return;

                setTituloPlano(plano.titulo || 'Meu Plano Alimentar');
                setObjetivo(plano.objetivo || 'Plano personalizado');
                if (Array.isArray(plano.meals) && plano.meals.length > 0) {
                    setMeals(plano.meals.map((m, idx) => ({
                        id: idx + 1,
                        type: m.type,
                        time: m.time,
                        items: m.items || []
                    })));
                }
            } catch (e) {
                console.error('Falha ao carregar plano do paciente:', e);
            }
        }
        loadPlanoPaciente();
    }, [isNutri]);

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 h-full overflow-y-auto pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-1 w-9 h-9 rounded-xl border border-brand-border bg-white flex items-center justify-center hover:bg-brand-warm-white"
                        title="Voltar"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                    <h1 className="font-serif text-3xl font-semibold text-brand-wine">
                        {isNutri ? 'Construtor de Plano' : tituloPlano}
                    </h1>
                    <p className="text-brand-muted mt-1">Plano atual focado em: <span className="font-medium text-brand-charcoal border-b border-brand-accent pb-0.5">{objetivo}</span></p>
                    </div>
                </div>

                {isNutri && (
                    <div className="flex gap-2 w-full sm:w-auto">
                        {isEditing ? (
                            <button onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none justify-center px-5 py-2.5 rounded-xl bg-brand-wine text-white font-semibold flex items-center gap-2 hover:bg-[#7A1212] transition-all shadow-md">
                                <Save size={18} /> Salvar Plano
                            </button>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none justify-center px-5 py-2.5 rounded-xl bg-white border border-brand-charcoal text-brand-charcoal font-semibold flex items-center gap-2 hover:bg-brand-warm-white transition-all shadow-sm">
                                <Edit2 size={18} /> Elaborar/Editar Plano
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Warning Paciente */}
            {!isNutri && (
                <div className="bg-brand-warm-white rounded-2xl p-4 flex gap-4 items-start mb-8 text-sm text-brand-charcoal/90 border border-brand-border/40 font-medium">
                    <div className="bg-white p-2 text-[#B81A1F] rounded-full shrink-0 shadow-sm"><UtensilsCrossed size={20} /></div>
                    <p className="leading-relaxed mt-1">
                        Siga o plano o mais próximo possível. Em caso de dúvidas sobre substituições, utilize o chat com sua nutricionista.
                    </p>
                </div>
            )}

            {/* DIAS DA SEMANA */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                {['Todos os dias', 'Dias de Treino', 'Fim de Semana'].map((dia, idx) => (
                    <button key={dia} className={`px-5 py-2 rounded-full whitespace-nowrap font-medium text-sm border transition-all ${idx === 0 ? 'bg-brand-wine text-white border-brand-wine shadow-md' : 'bg-white text-brand-charcoal border-brand-border/40 hover:border-brand-wine'}`}>
                        {dia}
                    </button>
                ))}
            </div>

            {/* TIMELINE DE REFEIÇÕES */}
            <div className="space-y-6">
                {meals.map((meal) => (
                    <div key={meal.id} className="relative group">

                        {/* Linha vertical timeline */}
                        <div className="absolute left-[33px] sm:left-[39px] top-12 bottom-[-24px] w-0.5 bg-brand-border/60 z-0 group-last:hidden"></div>

                        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-brand-border/40 hover:shadow-custom hover:border-brand-border transition-all flex flex-col sm:flex-row gap-4 relative z-10">

                            {/* Ícone e Hora */}
                            <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-1 sm:w-28 shrink-0">
                                <div className="w-16 h-16 sm:w-16 sm:h-16 rounded-2xl bg-[#FBEDEE] text-brand-wine flex items-center justify-center font-serif text-lg font-bold shadow-sm">
                                    {isEditing ? (
                                        <input
                                            type="time"
                                            value={meal.time}
                                            onChange={(e) => handleMealChange(meal.id, 'time', e.target.value)}
                                            className="w-full h-full bg-transparent text-center font-sans text-sm outline-none px-1"
                                        />
                                    ) : (
                                        <>
                                            {meal.time.split(':')[0]}
                                            <span className="text-[0.6rem] font-sans ml-0.5">{meal.time.split(':')[1]}</span>
                                        </>
                                    )}
                                </div>
                                {!isEditing && (
                                    <div className="flex items-center gap-1.5 text-xs text-brand-muted font-medium sm:mt-2">
                                        <Clock size={12} /> {meal.time}
                                    </div>
                                )}
                            </div>

                            {/* Detalhes / Alimentos */}
                            <div className="flex-1 flex justify-between items-start gap-4">
                                <div className="flex-1 w-full">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={meal.type}
                                            onChange={(e) => handleMealChange(meal.id, 'type', e.target.value)}
                                            className="text-lg font-semibold text-brand-charcoal mb-3 border-b border-brand-border/50 bg-transparent w-full pb-1 outline-none focus:border-brand-wine"
                                        />
                                    ) : (
                                        <h3 className="text-lg font-semibold text-brand-charcoal mb-3">{meal.type}</h3>
                                    )}

                                    <div className="space-y-2">
                                        {meal.items.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2.5 group/item w-full">
                                                <div className="mt-1 w-4 h-4 rounded border border-brand-border flex items-center justify-center bg-brand-warm-white shrink-0">
                                                    <div className="w-1.5 h-1.5 bg-brand-muted/40 rounded-sm"></div>
                                                </div>

                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => handleItemChange(meal.id, idx, e.target.value)}
                                                        className="text-sm text-brand-charcoal bg-transparent border-b border-transparent focus:border-brand-border/50 outline-none w-full"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-brand-charcoal leading-relaxed">{item}</span>
                                                )}

                                                {isEditing && (
                                                    <button onClick={() => removeItem(meal.id, idx)} className="opacity-0 group-hover/item:opacity-100 p-1 text-brand-danger hover:bg-brand-danger/10 rounded ml-auto transition-opacity shrink-0">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {isEditing && (
                                        <button onClick={() => addItem(meal.id)} className="mt-4 flex items-center gap-2 text-xs font-semibold text-brand-wine hover:underline px-2 py-1 bg-brand-wine-pale/30 rounded-lg">
                                            <Plus size={14} /> Adicionar Alimento
                                        </button>
                                    )}
                                </div>

                                {isEditing && (
                                    <div className="shrink-0 flex gap-2">
                                        <button onClick={() => removeMeal(meal.id)} className="p-2.5 bg-brand-danger/5 text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors shrink-0">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isEditing && (
                    <div className="pt-6">
                        <button onClick={addMeal} className="w-full border-2 border-dashed border-brand-border hover:border-brand-wine text-brand-muted hover:text-brand-wine rounded-[20px] p-6 flex flex-col items-center justify-center gap-2 bg-transparent transition-all hover:bg-[#FBEDEE]">
                            <Plus size={24} />
                            <span className="font-semibold text-sm">Adicionar Nova Refeição ao Plano</span>
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
}
