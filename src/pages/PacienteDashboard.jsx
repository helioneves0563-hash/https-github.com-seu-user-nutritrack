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

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

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
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
