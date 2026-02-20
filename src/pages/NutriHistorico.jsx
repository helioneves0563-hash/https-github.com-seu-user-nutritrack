import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Clock3 } from 'lucide-react';
import { nutricionistas } from '../services/supabase';

function mealLabel(tipo) {
  const map = {
    cafe_da_manha: 'Café da manhã',
    almoco: 'Almoço',
    lanche: 'Lanche',
    jantar: 'Jantar'
  };
  return map[tipo] || (tipo || 'Refeição');
}

export default function NutriHistorico() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
      try {
        const data = await nutricionistas.listarPacientes();
        const mapped = (data || []).map((p) => ({
          id: p.id,
          nome: `${p.profiles?.nome || 'Paciente'} ${p.profiles?.sobrenome || ''}`.trim()
        }));
        setPatients(mapped);

        const fromQuery = searchParams.get('pacienteId');
        const fallback = mapped[0]?.id || '';
        const valid = mapped.some((p) => p.id === fromQuery) ? fromQuery : fallback;
        setSelectedPatientId(valid);
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    setSearchParams({ pacienteId: selectedPatientId });

    async function loadHistory() {
      const list = await nutricionistas.historicoPaciente(selectedPatientId);
      setHistorico(list || []);
    }

    loadHistory();
  }, [selectedPatientId]);

  const patientName = useMemo(
    () => patients.find((p) => p.id === selectedPatientId)?.nome || 'Paciente',
    [patients, selectedPatientId]
  );

  if (loading) {
    return <div className="p-8 text-sm text-brand-muted">Carregando histórico...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 h-full overflow-y-auto pb-24 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-brand-border text-sm"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="font-serif text-3xl font-semibold text-brand-wine">Histórico do Paciente</h1>
      </div>

      <div className="bg-white border border-brand-border/50 rounded-2xl p-4 md:p-6 mb-6 shadow-sm">
        <label className="block text-xs font-semibold mb-2">Paciente</label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="w-full md:max-w-md border border-brand-border rounded-xl px-3 py-2.5 text-sm"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <div className="text-xs text-brand-muted mt-2">Visualizando histórico de {patientName}.</div>
      </div>

      {historico.length === 0 ? (
        <div className="bg-white border border-brand-border/50 rounded-2xl p-6 text-sm text-brand-muted">
          Este paciente ainda não registrou refeições.
        </div>
      ) : (
        <div className="space-y-4">
          {historico.map((ref) => (
            <div key={ref.id} className="bg-white border border-brand-border/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-40 bg-brand-warm-white flex items-center justify-center text-brand-muted">
                  {ref.foto_url ? (
                    <img src={ref.foto_url} alt={mealLabel(ref.tipo)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-sm">Sem foto</div>
                  )}
                </div>
                <div className="flex-1 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-brand-wine-pale text-brand-wine font-semibold">{mealLabel(ref.tipo)}</span>
                    <span className="text-brand-muted inline-flex items-center gap-1"><Clock3 size={12} />{new Date(ref.created_at).toLocaleString('pt-BR')}</span>
                  </div>

                  <p className="text-sm text-brand-charcoal mb-3">{ref.descricao || 'Sem descrição informada.'}</p>

                  {ref.feedbacks?.[0] ? (
                    <div className="bg-[#FBEDEE] border border-[#EACACA] rounded-xl p-3 text-sm text-[#4A1A1A]">
                      <div className="text-xs font-semibold mb-1 inline-flex items-center gap-1"><MessageSquare size={12} /> Feedback enviado</div>
                      {ref.feedbacks[0].comentario || ref.feedbacks[0].texto}
                    </div>
                  ) : (
                    <div className="text-xs text-brand-muted italic">Sem feedback enviado para esta refeição.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
