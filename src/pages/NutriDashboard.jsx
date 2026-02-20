import React, { useEffect, useMemo, useState } from 'react';
import Shell from '../components/Shell';
import { nutriApi } from '../services/supabase';

export default function NutriDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [planTitle, setPlanTitle] = useState('Plano alimentar');
  const [planObs, setPlanObs] = useState('');
  const [history, setHistory] = useState([]);

  const loadBase = async () => {
    setLoading(true);
    setError('');
    try {
      const [meData, patientData] = await Promise.all([nutriApi.me(), nutriApi.patients()]);
      setMe(meData);
      setPatients(patientData || []);
      setSelectedId((prev) => prev || patientData?.[0]?.id || '');
    } catch (err) {
      setError(err.message || 'Falha ao carregar dados da nutricionista.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPlanTitle('Plano alimentar');
      setPlanObs('');
      setHistory([]);
      return;
    }

    (async () => {
      try {
        const [plan, hist] = await Promise.all([
          nutriApi.activePlan(selectedId),
          nutriApi.history(selectedId)
        ]);
        setPlanTitle(plan?.titulo || 'Plano alimentar');
        setPlanObs(plan?.observacoes || '');
        setHistory(hist || []);
      } catch (err) {
        setError(err.message || 'Falha ao carregar plano/histórico.');
      }
    })();
  }, [selectedId]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedId) || null,
    [patients, selectedId]
  );

  const savePlan = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      await nutriApi.savePlan(selectedId, planTitle, planObs);
      await loadBase();
      alert('Plano salvo com sucesso.');
    } catch (err) {
      setError(err.message || 'Falha ao salvar plano.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="grid-two">
        <section className="card">
          <h2>Painel da Nutricionista</h2>
          <p>Seu código de convite:</p>
          <div className="invite">{me?.codigo_convite || 'Sem código'}</div>
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(me?.codigo_convite || '')}>Copiar código</button>

          <hr />
          <h3>Pacientes</h3>

          {loading && <p>Carregando pacientes...</p>}
          {!loading && patients.length === 0 && <p>Nenhum paciente vinculado.</p>}

          <div className="list">
            {patients.map((p) => (
              <button
                key={p.id}
                className={`list-item ${selectedId === p.id ? 'active' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                {(p.profiles?.nome || 'Paciente')} {(p.profiles?.sobrenome || '')}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Plano e Histórico</h2>
          {selectedPatient ? (
            <p>Paciente selecionado: <strong>{selectedPatient.profiles?.nome} {selectedPatient.profiles?.sobrenome}</strong></p>
          ) : (
            <p>Selecione um paciente.</p>
          )}

          <label>Título do plano</label>
          <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} disabled={!selectedId} />

          <label>Orientações</label>
          <textarea value={planObs} onChange={(e) => setPlanObs(e.target.value)} disabled={!selectedId} rows={4} />

          <button className="btn" onClick={savePlan} disabled={!selectedId || saving}>
            {saving ? 'Salvando...' : 'Salvar plano'}
          </button>

          <hr />
          <h3>Histórico de refeições</h3>
          {history.length === 0 ? (
            <p>Sem registros de refeições desse paciente.</p>
          ) : (
            <div className="history-list">
              {history.map((r) => (
                <div key={r.id} className="history-item">
                  <div><strong>{r.tipo || 'refeição'}</strong> · {new Date(r.created_at).toLocaleString('pt-BR')}</div>
                  <div>{r.descricao || 'Sem descrição.'}</div>
                  <div className="muted">Feedbacks: {r.feedbacks?.length || 0}</div>
                </div>
              ))}
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </section>
      </div>
    </Shell>
  );
}
