import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { useAuth } from '../context/AuthContext';
import { pacienteApi, nutriApi } from '../services/supabase';

export default function Profile() {
  const { profile, role } = useAuth();
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (role === 'nutricionista') {
          const n = await nutriApi.me();
          setExtra(n);
        } else if (role === 'paciente') {
          const p = await pacienteApi.me();
          setExtra(p);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  return (
    <Shell>
      <section className="card max-700">
        <h2>Perfil</h2>
        <p><strong>Nome:</strong> {profile?.nome || '-'} {profile?.sobrenome || ''}</p>
        <p><strong>E-mail:</strong> {profile?.email || '-'}</p>
        <p><strong>Tipo:</strong> {role || '-'}</p>

        {role === 'nutricionista' && (
          <>
            <hr />
            <p><strong>CRN:</strong> {extra?.crn || 'Não informado'}</p>
            <p><strong>Especialidade:</strong> {extra?.especialidade || 'Não informado'}</p>
            <p><strong>Código de convite:</strong> {extra?.codigo_convite || 'Não informado'}</p>
          </>
        )}

        {role === 'paciente' && (
          <>
            <hr />
            <p><strong>Vínculo com nutricionista:</strong> {extra?.id_nutricionista ? 'Sim' : 'Não'}</p>
          </>
        )}

        {loading && <p className="muted">Carregando detalhes...</p>}
      </section>
    </Shell>
  );
}
