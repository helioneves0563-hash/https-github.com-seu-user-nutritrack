import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { nutricionistas } from '../services/supabase';

function emptyMeal() {
  return {
    id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'Nova Refeição',
    time: '12:00',
    items: ['Novo alimento']
  };
}

export default function NutriPlanos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('Plano alimentar');
  const [goal, setGoal] = useState('');
  const [meals, setMeals] = useState([emptyMeal()]);

  useEffect(() => {
    async function loadPatients() {
      setIsLoading(true);
      try {
        const data = await nutricionistas.listarPacientes();
        const mapped = (data || []).map((p) => ({
          id: p.id,
          nome: `${p.profiles?.nome || 'Paciente'} ${p.profiles?.sobrenome || ''}`.trim()
        }));
        setPatients(mapped);

        const fromQuery = searchParams.get('pacienteId');
        const fallbackId = mapped[0]?.id || '';
        const id = mapped.some((p) => p.id === fromQuery) ? fromQuery : fallbackId;
        setSelectedPatientId(id);
      } finally {
        setIsLoading(false);
      }
    }

    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    setSearchParams({ pacienteId: selectedPatientId });

    async function loadPlan() {
      const plano = await nutricionistas.planoPaciente(selectedPatientId);
      if (!plano) {
        setTitle('Plano alimentar');
        setGoal('');
        setMeals([emptyMeal()]);
        return;
      }

      setTitle(plano.titulo || 'Plano alimentar');
      setGoal(plano.objetivo || '');
      setMeals(plano.meals?.length ? plano.meals : [emptyMeal()]);
    }

    loadPlan();
  }, [selectedPatientId]);

  const patientName = useMemo(
    () => patients.find((p) => p.id === selectedPatientId)?.nome || 'Paciente',
    [patients, selectedPatientId]
  );

  const handleMealChange = (mealId, field, value) => {
    setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, [field]: value } : m)));
  };

  const handleItemChange = (mealId, itemIdx, value) => {
    setMeals((prev) => prev.map((m) => {
      if (m.id !== mealId) return m;
      const next = [...m.items];
      next[itemIdx] = value;
      return { ...m, items: next };
    }));
  };

  const addMeal = () => setMeals((prev) => [...prev, emptyMeal()]);
  const removeMeal = (mealId) => setMeals((prev) => prev.filter((m) => m.id !== mealId));

  const addItem = (mealId) => {
    setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, items: [...m.items, 'Novo alimento'] } : m)));
  };

  const removeItem = (mealId, itemIdx) => {
    setMeals((prev) => prev.map((m) => {
      if (m.id !== mealId) return m;
      return { ...m, items: m.items.filter((_, idx) => idx !== itemIdx) };
    }));
  };

  const handleSave = async () => {
    if (!selectedPatientId) return;

    setIsSaving(true);
    try {
      await nutricionistas.salvarPlanoPaciente(selectedPatientId, {
        titulo: title,
        objetivo: goal,
        meals
      });
      alert('Plano salvo com sucesso.');
    } catch (error) {
      alert(error.message || 'Erro ao salvar plano.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-sm text-brand-muted">Carregando pacientes...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 h-full overflow-y-auto pb-24 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-brand-border text-sm"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="font-serif text-3xl font-semibold text-brand-wine">Plano do Paciente</h1>
      </div>

      <div className="bg-white border border-brand-border/50 rounded-2xl p-4 md:p-6 mb-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2">Paciente</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full border border-brand-border rounded-xl px-3 py-2.5 text-sm"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2">Título do plano</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-brand-border rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold mb-2">Objetivo / observações</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full border border-brand-border rounded-xl px-3 py-2.5 text-sm h-24 resize-none"
            placeholder="Ex.: foco em emagrecimento com alta ingestão proteica"
          />
        </div>
      </div>

      <div className="space-y-4">
        {meals.map((meal, idx) => (
          <div key={meal.id} className="bg-white border border-brand-border/50 rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex gap-3 mb-3">
              <input
                value={meal.type}
                onChange={(e) => handleMealChange(meal.id, 'type', e.target.value)}
                className="flex-1 border border-brand-border rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={meal.time}
                onChange={(e) => handleMealChange(meal.id, 'time', e.target.value)}
                className="w-36 border border-brand-border rounded-xl px-3 py-2 text-sm"
              />
              <button
                onClick={() => removeMeal(meal.id)}
                disabled={meals.length === 1}
                className="w-10 h-10 rounded-xl border border-brand-border text-brand-danger disabled:opacity-40"
                title="Remover refeição"
              >
                <Trash2 size={16} className="mx-auto" />
              </button>
            </div>

            <div className="space-y-2">
              {meal.items.map((item, itemIdx) => (
                <div key={`${meal.id}_${itemIdx}`} className="flex gap-2">
                  <input
                    value={item}
                    onChange={(e) => handleItemChange(meal.id, itemIdx, e.target.value)}
                    className="flex-1 border border-brand-border rounded-xl px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => removeItem(meal.id, itemIdx)}
                    disabled={meal.items.length === 1}
                    className="w-10 h-10 rounded-xl border border-brand-border text-brand-danger disabled:opacity-40"
                    title="Remover item"
                  >
                    <Trash2 size={14} className="mx-auto" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addItem(meal.id)}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs rounded-xl bg-brand-wine-pale text-brand-wine font-semibold"
            >
              <Plus size={14} /> Adicionar alimento
            </button>

            <div className="text-[11px] text-brand-muted mt-3">Refeição {idx + 1} do plano de {patientName}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={addMeal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm font-semibold"
        >
          <Plus size={16} /> Nova refeição
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || !selectedPatientId}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-wine text-white text-sm font-semibold disabled:opacity-50"
        >
          <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar plano'}
        </button>
      </div>
    </div>
  );
}
