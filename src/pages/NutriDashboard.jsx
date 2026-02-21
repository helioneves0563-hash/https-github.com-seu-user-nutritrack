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
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [sendingFeedback, setSendingFeedback] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadBase = async () => {
    setLoading(true);
    setError('');
    try {
      const meData = await nutriApi.me();
      const patientData = await nutriApi.patients(meData?.id || null);
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
    const safety = setTimeout(() => setLoading(false), 12000);
    return () => clearTimeout(safety);
  }, [loading]);

  useEffect(() => {
    const onRefresh = () => loadBase();
    window.addEventListener('nt:refresh', onRefresh);
    return () => window.removeEventListener('nt:refresh', onRefresh);
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
  const filteredPatients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const nome = `${p.profiles?.nome || ''} ${p.profiles?.sobrenome || ''}`.toLowerCase();
      return nome.includes(q);
    });
  }, [patients, searchTerm]);

  const totalFeedback = useMemo(
    () => history.reduce((acc, r) => acc + (r.feedbacks?.length || 0), 0),
    [history]
  );

  const savePlan = async () => {
    if (!selectedId || !selectedPatient) return;
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

  const sendFeedback = async (registroId) => {
    const texto = (feedbackDrafts[registroId] || '').trim();
    if (!texto) return;
    setSendingFeedback(registroId);
    setError('');
    try {
      await nutriApi.sendFeedback(registroId, texto);
      setFeedbackDrafts((prev) => ({ ...prev, [registroId]: '' }));
      const hist = await nutriApi.history(selectedId);
      setHistory(hist || []);
    } catch (err) {
      setError(err.message || 'Falha ao enviar feedback.');
    } finally {
      setSendingFeedback('');
    }
  };

  return (
    <Shell>
      <div className="dash-grid">
        <aside className="nutri-sidebar">
          <div className="nutri-hero">
            <div className="nutri-avatar">
              {(me?.profiles?.nome?.[0] || 'N').toUpperCase()}
              {(me?.profiles?.sobrenome?.[0] || 'T').toUpperCase()}
            </div>
            <div>
              <h2 className="no-margin">Painel Nutri</h2>
              <p className="muted no-margin">{me?.profiles?.nome || 'Nutricionista'} {me?.profiles?.sobrenome || ''}</p>
            </div>
          </div>

          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">Pacientes</div>
              <div className="kpi-value">{patients.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Feedbacks</div>
              <div className="kpi-value">{totalFeedback}</div>
            </div>
          </div>

          <div className="invite-wrap">
            <div className="kpi-label">Código de convite</div>
            <div className="invite">{me?.codigo_convite || 'Sem código'}</div>
            <button type="button" className="btn ghost" onClick={() => navigator.clipboard.writeText(me?.codigo_convite || '')}>
              Copiar código
            </button>
          </div>

          <div className="patient-search-wrap">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente..."
            />
          </div>

          <div className="patient-list">
            {loading && <p className="muted">Carregando pacientes...</p>}
            {!loading && filteredPatients.length === 0 && <p className="muted">Nenhum paciente vinculado.</p>}
            {filteredPatients.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`patient-item ${selectedId === p.id ? 'active' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="patient-initial">
                  {(p.profiles?.nome?.[0] || 'P').toUpperCase()}
                </span>
                <span>
                  {(p.profiles?.nome || 'Paciente')} {(p.profiles?.sobrenome || '')}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="nutri-main">
          <div className="card card-elevated">
            <h2>Plano Alimentar</h2>
            {selectedPatient ? (
              <p>Paciente selecionado: <strong>{selectedPatient.profiles?.nome} {selectedPatient.profiles?.sobrenome}</strong></p>
            ) : (
              <p>Selecione um paciente na lateral.</p>
            )}

            <label className="field-label">Título do plano</label>
            <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} disabled={!selectedId} />

            <label className="field-label">Orientações da semana</label>
            <textarea value={planObs} onChange={(e) => setPlanObs(e.target.value)} disabled={!selectedId} rows={4} />

            <button className="btn" type="button" onClick={savePlan} disabled={!selectedId || !selectedPatient || saving}>
              {saving ? 'Salvando...' : 'Salvar plano'}
            </button>
          </div>

          <div className="card card-elevated">
            <h2>Histórico de refeições</h2>
            {!selectedPatient && <p className="muted">Selecione um paciente para visualizar o histórico.</p>}
            {selectedPatient && history.length === 0 && (
              <p className="muted">Sem registros de refeições desse paciente.</p>
            )}
            {selectedPatient && history.length > 0 && (
              <div className="history-list">
                {history.map((r) => (
                  <div key={r.id} className="history-item">
                    <div className="history-header">
                      <span className="meal-tag">{r.tipo || 'refeição'}</span>
                      <span className="meal-date">{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="meal-desc">{r.descricao || 'Sem descrição.'}</div>
                    {r.foto_url && (
                      <button type="button" className="meal-img-btn" onClick={() => setPreviewImage(r.foto_url)}>
                        <img src={r.foto_url} alt="Refeição" className="meal-img" />
                      </button>
                    )}
                    {(r.feedbacks?.length || 0) > 0 ? (
                      <div className="feedback-box">
                        <strong>Feedback:</strong> {r.feedbacks[0].comentario || r.feedbacks[0].texto}
                      </div>
                    ) : (
                      <div className="feedback-form">
                        <input
                          value={feedbackDrafts[r.id] || ''}
                          onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Comentário + emojis (ex: Ótimo prato 👏🥗)"
                        />
                        <button
                          className="btn"
                          type="button"
                          onClick={() => sendFeedback(r.id)}
                          disabled={sendingFeedback === r.id}
                        >
                          {sendingFeedback === r.id ? 'Enviando...' : 'Enviar'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPatient ? (
            null
          ) : null}
          {error && <div className="error-box">{error}</div>}
        </section>
      </div>

      {previewImage && (
        <div className="image-overlay" onClick={() => setPreviewImage('')}>
          <img src={previewImage} alt="Prévia ampliada" className="image-overlay-content" />
        </div>
      )}
    </Shell>
  );
}
