import React, { useEffect, useMemo, useState } from 'react';
import Shell from '../components/Shell';
import { pacienteApi, supabase } from '../services/supabase';

export default function PacienteDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const [nutri, setNutri] = useState(null);
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [tipo, setTipo] = useState('almoco');
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const linked = !!me?.id_nutricionista;

  const patientName = useMemo(() => {
    if (!me?.profiles) return 'Paciente';
    const full = `${me.profiles.nome || ''} ${me.profiles.sobrenome || ''}`.trim();
    return full || 'Paciente';
  }, [me]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const meData = await pacienteApi.me();
      setMe(meData);
      setSuccessMsg('');

      if (meData?.id_nutricionista) {
        const { data: nutriData, error: nutriErr } = await supabase
          .from('nutricionistas')
          .select('id, codigo_convite, profiles!inner(nome, sobrenome, email)')
          .eq('id', meData.id_nutricionista)
          .maybeSingle();
        if (nutriErr) throw new Error(nutriErr.message);
        setNutri(nutriData);
      } else {
        setNutri(null);
      }

      const [planData, histData] = await Promise.all([
        pacienteApi.myPlan(),
        pacienteApi.myHistory()
      ]);

      setPlan(planData);
      setHistory(histData || []);
    } catch (err) {
      setError(err.message || 'Falha ao carregar dados do paciente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onRefresh = () => loadData();
    window.addEventListener('nt:refresh', onRefresh);
    return () => window.removeEventListener('nt:refresh', onRefresh);
  }, []);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('A foto deve ter no máximo 5MB.');
      return;
    }
    setError('');
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setArquivo(f);
    setPreview(URL.createObjectURL(f));
  };

  const sendMeal = async () => {
    if (!me?.id) {
      setError('Perfil do paciente ainda está carregando. Tente novamente em alguns segundos.');
      return;
    }
    if (!me?.id_nutricionista) {
      setError('Seu perfil ainda não está vinculado a uma nutricionista.');
      return;
    }
    if (!arquivo) {
      setError('Selecione uma foto da refeição.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await pacienteApi.sendMeal({ tipo, descricao, arquivo });
      setDescricao('');
      setArquivo(null);
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setPreview('');
      setTipo('almoco');
    } catch (err) {
      setError(err.message || 'Falha ao enviar refeição.');
    } finally {
      setSending(false);
      Promise.race([
        loadData(),
        new Promise((resolve) => setTimeout(resolve, 8000))
      ]).catch(() => {});
    }
  };

  const linkNutri = async () => {
    setError('');
    setSuccessMsg('');
    setLinking(true);
    try {
      await pacienteApi.linkByInviteCode(inviteCode);
      setInviteCode('');
      setSuccessMsg('Vínculo realizado com sucesso.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Não foi possível vincular pelo código.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <Shell>
      <div className="paciente-grid">
        <section className="card card-hero paciente-summary">
          <div className="paciente-head">
            <div className="paciente-avatar">
              {(me?.profiles?.nome?.[0] || 'P').toUpperCase()}
              {(me?.profiles?.sobrenome?.[0] || '').toUpperCase()}
            </div>
            <div>
              <h2 className="no-margin">Olá, {patientName}</h2>
              <p className="muted no-margin">Seu painel de refeições e plano alimentar</p>
            </div>
          </div>

          <div className="kpi-row paciente-kpi">
            <div className="kpi-card kpi-card-light">
              <div className="kpi-label dark">Vínculo</div>
              <div className="kpi-value dark">{linked ? 'Ativo' : 'Pendente'}</div>
            </div>
            <div className="kpi-card kpi-card-light">
              <div className="kpi-label dark">Registros</div>
              <div className="kpi-value dark">{history.length}</div>
            </div>
          </div>

          {loading && <p>Carregando...</p>}
          {!loading && !me && <p>Perfil de paciente não encontrado.</p>}
          {!loading && me && (
            <>
              <p>Status de vínculo: <strong>{linked ? 'Vinculado' : 'Sem nutricionista'}</strong></p>
              {nutri ? (
                <p>Nutricionista: <strong>{nutri.profiles?.nome} {nutri.profiles?.sobrenome}</strong></p>
              ) : (
                <p className="muted">Nenhuma nutricionista vinculada ainda.</p>
              )}
            </>
          )}
          {successMsg && <div className="success-box">{successMsg}</div>}
          {error && <div className="error-box">{error}</div>}
        </section>

        <section className="card card-elevated">
          {!linked && (
            <div className="link-box">
              <h3>Vincular com código da nutricionista</h3>
              <p className="muted">Digite o código de convite para liberar envio e acompanhamento.</p>
              <div className="link-form">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ex: NUTRI-731B33"
                  maxLength={32}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={linkNutri}
                  disabled={linking || !inviteCode.trim()}
                >
                  {linking ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            </div>
          )}

          <h2>Enviar refeição para análise</h2>
          <p className="muted">Envie foto e descrição para receber comentário da sua nutricionista.</p>
          <label className="field-label">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="cafe_da_manha">Café da manhã</option>
            <option value="almoco">Almoço</option>
            <option value="lanche">Lanche</option>
            <option value="jantar">Jantar</option>
          </select>
          <label className="field-label">Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Ex: arroz, feijão, frango grelhado" />
          <label className="field-label">Foto</label>
          <input type="file" accept="image/*" capture="environment" onChange={onFileChange} />
          {preview && <img src={preview} alt="preview" className="meal-img" />}
          <button className="btn" onClick={sendMeal} disabled={sending || loading || !linked}>
            {sending ? 'Enviando...' : 'Enviar refeição'}
          </button>
          {sending && <p className="muted">Processando imagem e enviando para análise...</p>}
          {!linked && <p className="muted">Vincule-se a uma nutricionista para enviar análise.</p>}
        </section>

        <section className="card card-elevated">
          <h2>Meu plano</h2>
          {plan ? (
            <>
              <p><strong>{plan.titulo}</strong></p>
              <p>{plan.observacoes || 'Sem observações.'}</p>
            </>
          ) : (
            <p>Você ainda não possui plano alimentar ativo.</p>
          )}
        </section>

        <section className="card card-elevated">
          <h2>Meu histórico</h2>
          {history.length === 0 ? (
            <p>Nenhuma refeição registrada.</p>
          ) : (
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
                  {(r.feedbacks?.length || 0) > 0 && (
                    <div className="feedback-box">
                      <strong>Comentário da nutri:</strong> {r.feedbacks[0].comentario || r.feedbacks[0].texto}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
