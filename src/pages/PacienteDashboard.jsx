import React, { useEffect, useState } from 'react';
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
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const meData = await pacienteApi.me();
      setMe(meData);

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

  return (
    <Shell>
      <div className="grid-one">
        <section className="card">
          <h2>Painel do Paciente</h2>
          {loading && <p>Carregando...</p>}
          {!loading && !me && <p>Perfil de paciente não encontrado.</p>}
          {!loading && me && (
            <>
              <p>Status de vínculo: <strong>{me.id_nutricionista ? 'Vinculado' : 'Sem nutricionista'}</strong></p>
              {nutri ? (
                <p>Nutricionista: <strong>{nutri.profiles?.nome} {nutri.profiles?.sobrenome}</strong></p>
              ) : (
                <p className="muted">Nenhuma nutricionista vinculada ainda.</p>
              )}
            </>
          )}
          {error && <div className="error-box">{error}</div>}
        </section>

        <section className="card">
          <h2>Enviar refeição para análise</h2>
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="cafe_da_manha">Café da manhã</option>
            <option value="almoco">Almoço</option>
            <option value="lanche">Lanche</option>
            <option value="jantar">Jantar</option>
          </select>
          <label>Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Ex: arroz, feijão, frango grelhado" />
          <label>Foto</label>
          <input type="file" accept="image/*" capture="environment" onChange={onFileChange} />
          {preview && <img src={preview} alt="preview" className="meal-img" />}
          <button className="btn" onClick={sendMeal} disabled={sending || !me?.id_nutricionista}>
            {sending ? 'Enviando...' : 'Enviar refeição'}
          </button>
          {sending && <p className="muted">Processando imagem e enviando para análise...</p>}
          {!me?.id_nutricionista && <p className="muted">Vincule-se a uma nutricionista para enviar análise.</p>}
        </section>

        <section className="card">
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

        <section className="card">
          <h2>Meu histórico</h2>
          {history.length === 0 ? (
            <p>Nenhuma refeição registrada.</p>
          ) : (
            <div className="history-list">
              {history.map((r) => (
                <div key={r.id} className="history-item">
                  <div><strong>{r.tipo || 'refeição'}</strong> · {new Date(r.created_at).toLocaleString('pt-BR')}</div>
                  <div>{r.descricao || 'Sem descrição.'}</div>
                  {r.foto_url && <img src={r.foto_url} alt="Refeição" className="meal-img" />}
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
    </Shell>
  );
}
